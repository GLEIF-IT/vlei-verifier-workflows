import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TestPaths } from './test-paths';
import { URL } from 'url';
import { runDockerCompose, stopDockerCompose } from './test-docker';
import minimist = require('minimist');
import * as dockerode from 'dockerode';
import Dockerode = require('dockerode');
import { DockerLock } from './docker-lock';
import { Workflow } from '../types/workflow';

export const ARG_KERIA_ADMIN_PORT = 'keria-admin-port';
export const ARG_KERIA_HTTP_PORT = 'keria-http-port';
export const ARG_KERIA_BOOT_PORT = 'keria-boot-port';
export const ARG_KERIA_START_PORT = 'keria-start-port';

const keriaImage = `weboftrust/keria:0.2.0-dev4`;

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
  private static instances: Map<string, TestKeria> = new Map<string, TestKeria>();
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
  public static async getInstance(
    instanceName: string,
    testPaths?: TestPaths,
    domain?: string,
    host?: string,
    containerLocalhost?: string,
    basePort?: number,
    offset?: number
  ): Promise<TestKeria> {
    if (!TestKeria.instances) {
      TestKeria.instances = new Map<string, TestKeria>();
    }
    
    if (!instanceName) {
      throw new Error('TestKeria.getInstance(instanceName) must be called with an instanceName');
    }

    if (!TestKeria.instances.get(instanceName)) {
      if (testPaths === undefined) {
        throw new Error(
          `TestKeria.getInstance() called for agent "${instanceName}" without required parameters. You must initialize it with all parameters first.`
        );
      } else {
        const args = TestKeria.processKeriaArgs(
          basePort!+1+offset!,
          basePort!+2+offset!,
          basePort!+3+offset!,
        );
        TestKeria.instances.set(instanceName, new TestKeria(
          testPaths!,
          domain!,
          host!,
          containerLocalhost!,
          parseInt(args[ARG_KERIA_ADMIN_PORT], 10),
          parseInt(args[ARG_KERIA_HTTP_PORT], 10),
          parseInt(args[ARG_KERIA_BOOT_PORT], 10)
        ));
        const keria = TestKeria.instances.get(instanceName);
        await keria!.beforeAll(keriaImage, instanceName, false);
      }
    } else if (testPaths !== undefined) {
      console.warn(
        `TestKeria.getInstance() called with arguments for "${instanceName}", but instance already exists. Overriding original config. This must be done with great care to avoid unexpected side effects.`
      );
    }
    return TestKeria.instances.get(instanceName)!;
  }

  public static processKeriaArgs(
    baseAdminPort: number,
    baseHttpPort: number,
    baseBootPort: number,
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
          : baseAdminPort,
        [ARG_KERIA_HTTP_PORT]: process.env.KERIA_HTTP_PORT
          ? parseInt(process.env.KERIA_HTTP_PORT)
          : baseHttpPort,
        [ARG_KERIA_BOOT_PORT]: process.env.KERIA_BOOT_PORT
          ? parseInt(process.env.KERIA_BOOT_PORT)
          : baseBootPort,
      },
      '--': true,
      unknown: (arg) => {
        console.info(`Unknown keria argument, skipping: ${arg}`);
        return false;
      },
    });

    return args;
  }

  async beforeAll(keriaImage: string, containerPostfix: string, refresh: boolean) {
    console.log('Starting beforeAll execution...');
    try {
      // Check if service is running
      console.log('Checking if service keria is running...');
      const isRunning = await this.checkServiceRunning();
      console.log('Service running status:', isRunning);

      if (!isRunning) {
        const containerName = `keria-${containerPostfix}`;
        console.log(`Starting Keria container ${containerName} with image ${keriaImage}`);
        await this.startContainer(keriaImage, containerName, refresh);
        await this.waitForContainer(containerName);
        console.log(`Keria container ${containerName} started successfully`);
      }
    } catch (error) {
      console.error('Error in beforeAll:', error);
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
          `${this.keriaAdminPort}`,
          '-H',
          `${this.keriaHttpPort}`,
          '-B',
          `${this.keriaBootPort}`,
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
        const response = await this.checkServiceRunning();
        if (response) {
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

  async afterAll(containerName: string) {
    console.log('Starting afterAll cleanup...');
    try {
      // Clean up test data
      console.log('Cleaning up test data');

      // Stop and remove container
      if (containerName) {
        console.log(`Stopping container ${containerName}...`);
        try {
          await this.docker.getContainer(containerName).stop({ t: 10 });
        } catch (error) {
          if (error instanceof Error) {
            console.log(`Warning: Error stopping container ${containerName}, proceeding with force remove: ${error.message}`);
          } else {
            console.log(`Warning: Error stopping container ${containerName}, proceeding with force remove`);
          }
        }

        console.log(`Force removing container ${containerName}...`);
        try {
          await this.docker.getContainer(containerName).remove({ force: true });
        } catch (error) {
          if (error instanceof Error) {
            console.log(`Warning: Error removing container ${containerName}: ${error.message}`);
          } else {
            console.log(`Warning: Error removing container ${containerName}`);
          }
        }
        
        console.log(`Container ${containerName} cleanup attempted`);
      }

      // Stop local services
      console.log(`Stopping local services using ${this.testPaths.dockerComposeFile}`);
      try {
        await stopDockerCompose(this.testPaths.dockerComposeFile);
      } catch (error) {
        console.error('Error stopping docker compose:', error);
      }

      // Close Docker connection
      console.log('Closing Docker connection...');

      console.log('afterAll cleanup completed');
    } catch (error) {
      console.error('Error in afterAll:', error);
      throw error;
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

  private async checkServiceRunning(): Promise<boolean> {
    try {
      const response = await fetch(
        `http://${this.host}:${this.keriaHttpPort}/spec.yaml`
      );
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  // Add a helper method to get all instances
  public static getAllInstances(): Map<string, TestKeria> {
    if (!TestKeria.instances) {
      TestKeria.instances = new Map<string, TestKeria>();
    }
    return TestKeria.instances;
  }

  public static calcOffset(keriaNum: number): number {
    const offset = 10 * (keriaNum - 1);
    return offset;
  }
}