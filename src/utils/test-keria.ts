import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TestPaths } from './test-paths';
import { URL } from 'url';
import { runDockerCompose, stopDockerCompose } from './test-docker';
import axios from 'axios';
import minimist = require('minimist');
import * as dockerode from 'dockerode';
import Dockerode = require('dockerode');
import { DockerLock } from './docker-lock';

export const ARG_KERIA_ADMIN_PORT = 'keria-admin-port';
export const ARG_KERIA_HTTP_PORT = 'keria-http-port';
export const ARG_KERIA_BOOT_PORT = 'keria-boot-port';
export const ARG_KERIA_START_PORT = 'keria-start-port';

export interface KeriaConfig {
  dt?: string;
  keria?: {
    dt: string;
    curls: string[];
  };
  iurls?: string[];
  durls?: string[];
}
export class TestKeria {
  private static instance: TestKeria;
  public testPaths: TestPaths;
  public keriaAdminPort: number;
  public keriaAdminUrl: URL;
  public keriaHttpPort: number;
  public keriaHttpUrl: URL;
  public keriaBootPort: number;
  public keriaBootUrl: URL;
  public keriaConfig: KeriaConfig;
  public domain: string;
  public witnessHost: string;
  public host: string;
  public containers: Map<string, dockerode.Container> = new Map<
    string,
    dockerode.Container
  >();
  public docker = new Dockerode();
  private dockerLock = DockerLock.getInstance();
  private static readonly SERVICE_NAME = 'keria';

  private constructor(
    testPaths: TestPaths,
    domain: string,
    host: string,
    witnessHost: string,
    kAdminPort: number,
    kHttpPort: number,
    kBootPort: number
  ) {
    this.testPaths = testPaths;
    this.domain = domain;
    this.witnessHost = witnessHost;
    this.host = host;
    this.keriaAdminPort = kAdminPort;
    this.keriaAdminUrl = new URL(`http://${host}:${kAdminPort}`);
    this.keriaHttpPort = kHttpPort;
    this.keriaHttpUrl = new URL(`http://${host}:${kHttpPort}`);
    this.keriaBootPort = kBootPort;
    this.keriaBootUrl = new URL(`http://${host}:${kBootPort}`);
    this.keriaConfig = {
      dt: '2023-12-01T10:05:25.062609+00:00',
      keria: {
        dt: '2023-12-01T10:05:25.062609+00:00',
        curls: [`http://${host}:${this.keriaHttpPort}/`],
      },
      iurls: [
        `http://${witnessHost}:5642/oobi/BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha/controller`,
        `http://${witnessHost}:5643/oobi/BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM/controller`,
        `http://${witnessHost}:5644/oobi/BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX/controller`,
        `http://${witnessHost}:5645/oobi/BM35JN8XeJSEfpxopjn5jr7tAHCE5749f0OobhMLCorE/controller`,
        `http://${witnessHost}:5646/oobi/BIj15u5V11bkbtAxMA7gcNJZcax-7TgaBMLsQnMHpYHP/controller`,
        `http://${witnessHost}:5647/oobi/BF2rZTW79z4IXocYRQnjjsOuvFUQv-ptCf8Yltd7PfsM/controller`,
      ],
    };
  }
  public static getInstance(
    testPaths?: TestPaths,
    domain?: string,
    host?: string,
    containerLocalhost?: string,
    baseAdminPort?: number,
    baseHttpPort?: number,
    baseBootPort?: number,
    offset?: number
  ): TestKeria {
    if (!TestKeria.instance) {
      if (testPaths === undefined) {
        throw new Error(
          'TestKeria.getInstance() called without arguments means we expected it to be initialized earlier. This must be done with great care to avoid unexpected side effects.'
        );
      } else {
        const args = TestKeria.processKeriaArgs(
          baseAdminPort!,
          baseHttpPort!,
          baseBootPort!,
          offset
        );
        TestKeria.instance = new TestKeria(
          testPaths!,
          domain!,
          host!,
          containerLocalhost!,
          parseInt(args[ARG_KERIA_ADMIN_PORT], 10),
          parseInt(args[ARG_KERIA_HTTP_PORT], 10),
          parseInt(args[ARG_KERIA_BOOT_PORT], 10)
        );
      }
    } else if (testPaths !== undefined) {
      console.warn(
        'TestEnvironment.getInstance() called with arguments, but instance already exists. Overriding original config. This must be done with great care to avoid unexpected side effects.'
      );
    }
    return TestKeria.instance;
  }

  public static processKeriaArgs(
    baseAdminPort: number,
    baseHttpPort: number,
    baseBootPort: number,
    offset = 0
  ): minimist.ParsedArgs {
    // Parse command-line arguments using minimist
    const args = minimist(process.argv.slice(process.argv.indexOf('--') + 1), {
      alias: {
        [ARG_KERIA_ADMIN_PORT]: 'kap',
        [ARG_KERIA_HTTP_PORT]: 'khp',
        [ARG_KERIA_BOOT_PORT]: 'kbp',
      },
      default: {
        [ARG_KERIA_ADMIN_PORT]: process.env.KERIA_ADMIN_PORT
          ? parseInt(process.env.KERIA_ADMIN_PORT)
          : baseAdminPort + offset,
        [ARG_KERIA_HTTP_PORT]: process.env.KERIA_HTTP_PORT
          ? parseInt(process.env.KERIA_HTTP_PORT)
          : baseHttpPort + offset,
        [ARG_KERIA_BOOT_PORT]: process.env.KERIA_BOOT_PORT
          ? parseInt(process.env.KERIA_BOOT_PORT)
          : baseBootPort + offset,
      },
      '--': true,
      unknown: (arg) => {
        console.info(`Unknown keria argument, skipping: ${arg}`);
        return false;
      },
    });

    return args;
  }

  public async beforeAll(
    imageName: string,
    containerName: string = 'keria',
    pullImage: boolean = false
  ) {
    runDockerCompose(this.testPaths.dockerComposeFile, 'up', 'verify');

    console.log('Starting beforeAll execution...');
    await this.dockerLock.acquireForService(TestKeria.SERVICE_NAME);

    console.log(`Checking if service ${TestKeria.SERVICE_NAME} is running...`);
    const isRunning = this.dockerLock.isServiceRunning(TestKeria.SERVICE_NAME);
    console.log(`Service running status: ${isRunning}`);

    // Force container creation regardless of service status
    console.log(
      `Starting Keria container ${containerName} with image ${imageName}`
    );
    try {
      await this.startContainer(imageName, containerName, pullImage);

      // Wait for container to be ready
      await this.waitForContainer(containerName);

      // Store container reference
      const container = await this.docker.getContainer(containerName);
      this.containers.set(containerName, container);

      console.log(`Keria container ${containerName} started successfully`);
    } catch (error) {
      console.error('Error starting Keria container:', error);
      throw error;
    }
  }

  private async startContainer(
    imageName: string,
    containerName: string,
    pullImage: boolean,
    useHostNetwork: boolean = true
  ): Promise<dockerode.Container> {
    try {
      console.log(`Creating container ${containerName}...`);
      const containerOptions: dockerode.ContainerCreateOptions = {
        Image: imageName,
        name: containerName,
        platform: 'linux/amd64',
        ExposedPorts: {
          [`${this.keriaAdminPort}/tcp`]: {},
          [`${this.keriaHttpPort}/tcp`]: {},
          [`${this.keriaBootPort}/tcp`]: {},
        },
        HostConfig: useHostNetwork
          ? {
              NetworkMode: 'host',
            }
          : {
              PortBindings: {
                [`${this.keriaAdminPort}/tcp`]: [
                  { HostPort: this.keriaAdminPort.toString() },
                ],
                [`${this.keriaHttpPort}/tcp`]: [
                  { HostPort: this.keriaHttpPort.toString() },
                ],
                [`${this.keriaBootPort}/tcp`]: [
                  { HostPort: this.keriaBootPort.toString() },
                ],
              },
            },
      };

      if (this.keriaConfig) {
        const tempConfigPath = await this.createTempKeriaConfigFile(
          this.keriaConfig
        );
        containerOptions.HostConfig!.Binds = [
          `${tempConfigPath}:/usr/local/var/keri/cf/keria.json`,
        ];
        containerOptions.Entrypoint = [
          'keria',
          'start',
          '--config-dir',
          '/usr/local/var/',
          '--config-file',
          'keria',
          '--name',
          'agent',
          '--loglevel',
          'DEBUG',
          '-a',
          '20001',
          '-H',
          '20002',
          '-B',
          '20003',
        ];
      }

      if (pullImage) {
        console.log(`Pulling image ${imageName}...`);
        await this.docker.pull(imageName);
      }

      // Remove existing container if it exists
      try {
        const existingContainer = await this.docker.getContainer(containerName);
        console.log('Found existing container, removing it...');
        await existingContainer.remove({ force: true });
      } catch (e) {
        // Container doesn't exist, which is fine
      }

      const container = await this.docker.createContainer(containerOptions);
      console.log(`Starting container ${containerName}...`);
      await container.start();

      return container;
    } catch (error) {
      console.error('Error in startContainer:', error);
      throw error;
    }
  }

  private async waitForContainer(containerName: string, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(
          `http://${this.host}:${this.keriaHttpPort}/spec.yaml`
        );
        if (response.ok) {
          console.log(`Container ${containerName} is ready`);
          return;
        }
      } catch (e) {
        // Container not ready yet, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error(
      `Container ${containerName} failed to become ready within ${timeout}ms`
    );
  }

  async afterAll(clean = true) {
    const shouldStop = await this.dockerLock.releaseService(
      TestKeria.SERVICE_NAME
    );

    if (shouldStop && clean) {
      console.log('Starting afterAll cleanup...');
      try {
        console.log('Cleaning up test data');

        // Clean up containers with force option
        for (const [name, container] of this.containers) {
          try {
            console.log(`Stopping container ${name}...`);
            try {
              await Promise.race([
                container.stop(),
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error('Container stop timeout')),
                    5000
                  )
                ),
              ]);
            } catch (error) {
              const stopError = error as Error;
              console.log(
                `Warning: Error stopping container ${name}, proceeding with force remove:`,
                stopError?.message || 'Unknown error'
              );
            }

            console.log(`Force removing container ${name}...`);
            await Promise.race([
              container.remove({ force: true }), // Add force: true option
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Container remove timeout')),
                  5000
                )
              ),
            ]).catch(async (error) => {
              const removeError = error as Error;
              console.log(
                `Warning: Error removing container ${name}:`,
                removeError?.message || 'Unknown error'
              );
              // Try one more time with force and v option
              try {
                await container.remove({ force: true, v: true });
              } catch (error) {
                const finalError = error as Error;
                console.log(
                  `Final attempt to remove container ${name} failed:`,
                  finalError?.message || 'Unknown error'
                );
              }
            });

            console.log(`Container ${name} cleanup attempted`);
          } catch (error) {
            console.error(
              `Error in container cleanup for ${name}:`,
              (error as Error)?.message || 'Unknown error'
            );
          }
        }
        this.containers.clear();

        // Clean up docker compose with force
        console.log(
          `Stopping local services using ${this.testPaths.dockerComposeFile}`
        );
        try {
          await Promise.race([
            stopDockerCompose(
              this.testPaths.dockerComposeFile,
              'down -v --remove-orphans -f',
              'verify'
            ),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Docker compose stop timeout')),
                10000
              )
            ),
          ]);
        } catch (composeError) {
          console.error('Error stopping docker compose:', composeError);
        }

        // Release lock
        if (this.dockerLock) {
          console.log('Releasing docker lock...');
          this.dockerLock.release();
        }

        // Clean up Docker connection
        if (this.docker) {
          console.log('Closing Docker connection...');
          try {
            const modem = (this.docker as any).modem;
            if (modem) {
              if (modem.socket) {
                modem.socket.destroy();
              }
              if (modem.agents) {
                Object.values(modem.agents).forEach((agent: any) => {
                  if (agent && typeof agent.destroy === 'function') {
                    agent.destroy();
                  }
                });
              }
            }
          } catch (error) {
            console.log('Error cleaning up Docker connection:', error);
          }
        }

        // Force cleanup any remaining handles
        process.removeAllListeners();
      } catch (error) {
        console.error(
          'Error in afterAll:',
          (error as Error)?.message || 'Unknown error'
        );
      } finally {
        console.log('afterAll cleanup completed');
      }
    }
  }

  async createTempKeriaConfigFile(kConfig: KeriaConfig): Promise<string> {
    console.log('Starting temp config file creation...');
    try {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keria-config-'));
      console.log('Created temp directory:', tempDir);

      const tempFilePath = path.join(tempDir, 'keria.json');
      console.log('Writing config to:', tempFilePath);

      const configStr = JSON.stringify(kConfig, null, 2);
      console.log('Config to write:', configStr);

      fs.writeFileSync(tempFilePath, configStr);
      console.log('Config file written successfully');

      return tempFilePath;
    } catch (error) {
      console.error('Error creating temp config file:', error);
      throw error;
    }
  }

  async startContainerWithConfig(
    imageName: string,
    containerName: string,
    alreadyLocked: boolean = false
  ): Promise<dockerode.Container> {
    if (!alreadyLocked) {
      await this.dockerLock.acquire();
    }

    try {
      return await this.startContainer(imageName, containerName, false, true);
    } finally {
      if (!alreadyLocked) {
        this.dockerLock.release();
      }
    }
  }

  public async launchTestKeria(
    kimageName: string,
    kontainerName: string,
    pullImage: boolean = false
  ): Promise<dockerode.Container> {
    console.log(
      `Starting launchTestKeria for ${kontainerName} with image ${kimageName}`
    );

    // Check if container exists and is running (no lock needed)
    try {
      console.log(`Checking for existing container ${kontainerName}`);
      const container = await this.docker.getContainer(kontainerName);
      const containerInfo = await container.inspect();

      if (containerInfo.State.Running) {
        console.log(`Found running container ${kontainerName}, reusing it`);
        return container;
      }
    } catch (containerError: any) {
      console.log(`No existing container found: ${containerError.message}`);
    }

    // If we get here, we need to create a new container
    console.log(`Creating new container ${kontainerName}`);
    await this.dockerLock.acquire();
    try {
      if (pullImage) {
        console.log(`Pulling image ${kimageName}`);
        await this.docker.pull(kimageName);
      }

      const container = await this.startContainerWithConfig(
        kimageName,
        kontainerName,
        true
      );
      console.log(
        `Successfully created and started new container ${kontainerName}`
      );
      return container;
    } finally {
      this.dockerLock.release();
      console.log('Docker lock released');
    }
  }
}
