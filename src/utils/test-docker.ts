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
    if (this.isRunning) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize(file, command, service);
    try {
      await this.initializationPromise;
      this.isRunning = true;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _initialize(
    file: string,
    command: string,
    service?: string
  ): Promise<void> {
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
    
    console.log(`Running docker compose command: docker compose ${args.join(' ')}`);
    
    // Add --wait flag to ensure containers are healthy
    if (command === 'up') {
      args.push('--wait');
    }

    const process = exec(`docker compose ${args.join(' ')}`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }, (error, stdout, stderr) => {
      if (error && (!service || service !== 'verify' || error.code !== 1)) {
        console.error('Docker compose error:', {
          error: error.message,
          stdout,
          stderr,
          code: error.code,
          signal: error.signal
        });
        
        // Check if containers are running but unhealthy
        exec('docker ps --format "{{.Names}}: {{.Status}}"', (err, containersOutput) => {
          if (!err) {
            console.log('Container statuses:', containersOutput);
          }
          reject(error);
        });
        return;
      }
      console.log('Docker compose output:', stdout);
      resolve();
    });

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

export async function startDockerServices(file: string, maxRetries = 3): Promise<void> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // Clean up any existing containers first
      await stopDockerCompose(file, 'down', 'verify');
      
      // Start services with health check
      console.log(`Starting Docker services (attempt ${attempt + 1}/${maxRetries})...`);
      await runDockerCompose(file, 'up', 'verify', ['-d']);
      
      // Wait for services to be healthy
      await waitForHealthyServices();
      console.log('All services started successfully');
      return;
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw new Error(`Failed to start Docker services after ${maxRetries} attempts`);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function waitForHealthyServices(timeout = 60000): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const { stdout } = await exec('docker ps --format "{{.Names}}: {{.Status}}"');
      const output = stdout?.toString() || '';
      console.log('Current container statuses:', output);
      
      if (!output.includes('unhealthy') && !output.includes('starting')) {
        return;
      }
    } catch (error) {
      console.error('Error checking container health:', error);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Timeout waiting for services to be healthy');
}

export async function stopDockerCompose(
  file: string,
  command: string,
  service: string
): Promise<boolean> {
  const running = await isDockerComposeRunning(file);
  if (running) {
    console.log(
      `Stopping docker compose command: ${file} ${command} ${service}`
    );
    return new Promise((resolve, reject) => {
      const cmd = `docker compose -f ${file} ${command} ${service} -v --remove-orphans`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error stopping docker compose command: ${stderr}`);
          return reject(error);
        }
        DockerComposeState.getInstance().stop();
        console.log(stdout);
        resolve(true);
      });
    });
  } else {
    console.log(
      `Docker compose is already stopped: ${file} ${command} ${service}`
    );
    return running;
  }
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
