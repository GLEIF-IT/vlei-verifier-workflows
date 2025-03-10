import { exec } from 'child_process';
import * as net from 'net';

export class DockerComposeState {
  private static instance: DockerComposeState;
  private isRunning: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private activeProcesses: Set<import('child_process').ChildProcess> =
    new Set();

  private constructor() {
    // Handle cleanup on process exit
    process.on('beforeExit', async () => {
      await this.cleanup();
    });
  }

  private async cleanup(): Promise<void> {
    // Cleanup all active processes
    for (const proc of this.activeProcesses) {
      try {
        proc.kill();
      } catch (e) {
        console.warn(`Error cleaning up process: ${e}`);
      }
    }
    this.activeProcesses.clear();
    this.isRunning = false;
  }

  public static getInstance(): DockerComposeState {
    if (!DockerComposeState.instance) {
      DockerComposeState.instance = new DockerComposeState();
    }
    return DockerComposeState.instance;
  }

  public async initialize(
    file: string,
    command: string,
    service?: string
  ): Promise<void> {
    if (this.isRunning && command === 'up') {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize(file, command, service);
    try {
      await this.initializationPromise;
      // Only set isRunning to true if the command is 'up'
      if (command === 'up') {
        this.isRunning = true;
      } else if (command === 'down') {
        this.isRunning = false;
      }
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _initialize(
    file: string,
    command: string,
    service?: string
  ): Promise<void> {
    // Check if the service is already running when command is 'up'
    if (command === 'up' && service) {
      const isServiceRunning = await this.isServiceRunning(service);
      if (isServiceRunning) {
        console.log(
          `Service ${service} is already running. Skipping initialization.`
        );
        return;
      }
    }

    // Skip cleanup on initialization to reuse containers
    const cmd = service
      ? `docker compose -f ${file} ${command} ${service}`
      : `docker compose -f ${file} ${command}`;

    return new Promise((resolve, reject) => {
      const process = exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running docker compose command: ${stderr}`);
          return reject(error);
        }
        console.log(stdout);
        resolve();
      });

      // Track active process
      this.activeProcesses.add(process);
      process.on('exit', () => {
        this.activeProcesses.delete(process);
      });
    });
  }

  // Add a new method to check if a specific service is running
  private async isServiceRunning(serviceName: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`docker compose ps --format json`, (error, stdout) => {
        if (error || !stdout) {
          console.log(
            `Error checking service status or no services running: ${error?.message}`
          );
          return resolve(false);
        }

        try {
          // Parse the JSON output from docker compose ps
          const services = stdout
            .trim()
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line));

          // Check if our service is running and healthy
          const serviceRunning = services.some(
            (service) =>
              service.Service === serviceName &&
              service.State === 'running' &&
              (!service.Health || service.Health === 'healthy')
          );

          console.log(
            `Service ${serviceName} running status: ${serviceRunning}`
          );
          resolve(serviceRunning);
        } catch (e) {
          console.error(`Error parsing docker compose output: ${e}`);
          resolve(false);
        }
      });
    });
  }

  public async stop(): Promise<void> {
    await this.cleanup();
  }

  public addProcess(process: import('child_process').ChildProcess): void {
    this.activeProcesses.add(process);
  }

  public removeProcess(process: import('child_process').ChildProcess): void {
    this.activeProcesses.delete(process);
  }
}

export async function runDockerCompose(
  file: string,
  command: string = 'up',
  service?: string,
  options: string[] = []
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['-f', file, command];
    if (service) {
      args.push(service);
    }
    args.push(...options);

    console.log(
      `Running docker compose command: docker compose ${args.join(' ')}`
    );

    // Add --wait flag to ensure containers are healthy
    if (command === 'up') {
      args.push('--wait');
    }

    const process = exec(
      `docker compose ${args.join(' ')}`,
      {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      },
      (error, stdout, stderr) => {
        if (error && (!service || service !== 'verify' || error.code !== 1)) {
          console.error('Docker compose error:', {
            error: error.message,
            stdout,
            stderr,
            code: error.code,
            signal: error.signal,
          });

          // Check if containers are running but unhealthy
          exec(
            'docker ps --format "{{.Names}}: {{.Status}}"',
            (err, containersOutput) => {
              if (!err) {
                console.log('Container statuses:', containersOutput);
              }
              reject(error);
            }
          );
          return;
        }
        console.log('Docker compose output:', stdout);
        resolve();
      }
    );

    // Track active process
    DockerComposeState.getInstance().addProcess(process);
    process.on('exit', (code, signal) => {
      DockerComposeState.getInstance().removeProcess(process);
      if (code !== 0) {
        console.log(`Process exited with code ${code} and signal ${signal}`);
      }
    });
  });
}

export async function startDockerServices(
  file: string,
  maxRetries = 3
): Promise<boolean> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      if (await isHealthyServices()) {
        console.log('All services started successfully');
        return true;
      } else {
        console.log(
          'Services are not healthy, waiting 3 seconds before retrying...'
        );
        // Start services with health check
        console.log(
          `Starting Docker services (attempt ${attempt + 1}/${maxRetries})...`
        );
        if (attempt === 0) {
          await runDockerCompose(file, 'up', 'verify', ['-d']);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to start Docker services after ${maxRetries} attempts`
        );
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  return false;
}

async function isHealthyServices(): Promise<boolean> {
  return new Promise((resolve) => {
    exec(
      'docker ps --format "{{.Names}}: {{.Status}}"',
      (error, stdout, stderr) => {
        if (error) {
          console.error('Error checking container health:', error);
          return resolve(false);
        }

        console.log('Current container statuses:', stdout);

        if (stdout.includes('healthy')) {
          return resolve(true);
        }

        resolve(false);
      }
    );
  });
}

export function stopDockerCompose(composePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = `docker compose -f ${composePath} down -v --remove-orphans`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error stopping docker compose command: ${stderr}`);
        return reject(error);
      }
      DockerComposeState.getInstance().stop();
      resolve();
    });
  });
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port);
  });
}

export async function isDockerComposeRunning(
  file: string,
  vleiServerPort: number = 7723,
  witnessPort: number = 5642,
  verifierPort: number = 7676,
  apiPort: number = 8000
): Promise<boolean> {
  const ports = [
    { name: 'vleiServerPort', port: vleiServerPort },
    { name: 'witnessPort', port: witnessPort },
    { name: 'verifierPort', port: verifierPort },
    // { name: 'filerPort', port: filerPort },
    { name: 'apiPort', port: apiPort },
  ];

  const portsInUse = await Promise.all(
    ports.map(async ({ name, port }) => {
      const inUse = await isPortInUse(port);
      return inUse ? name : null;
    })
  );

  const inUsePorts = portsInUse.filter(Boolean);

  if (inUsePorts.length === ports.length) {
    console.log(
      'All specified ports are in use. Skipping docker compose check.'
    );
    return true;
  } else if (inUsePorts.length > 0) {
    console.log(`The following ports are in use: ${inUsePorts.join(', ')}`);
    return true;
  }

  return new Promise((resolve, reject) => {
    exec(`docker compose -f ${file} ps`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error checking docker compose status: ${stderr}`);
        return reject(error);
      }
      // Check if the output contains only headers and no running services
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) {
        console.log(`docker compose status: ${lines}\n Service is not running`);
        resolve(false);
      } else {
        // Check if the service is listed as running
        const isRunning = stdout.includes('Up');
        console.log(`docker compose status: ${lines}\n Service is running`);
        resolve(isRunning);
      }
    });
  });
}
