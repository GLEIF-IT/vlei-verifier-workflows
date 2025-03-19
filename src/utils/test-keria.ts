import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TestPaths } from './test-paths.js';
import { URL } from 'url';
import minimist = require('minimist');
import * as dockerode from 'dockerode';
import Dockerode = require('dockerode');
import { exec } from 'child_process';

export const ARG_KERIA_DOMAIN = 'keria_domain'; //external domain for keria
export const ARG_WITNESS_HOST = 'witness_host'; //docker domain for witness
export const ARG_KERIA_HOST = 'keria_host'; //docker domain for witness
export const ARG_KERIA_NUM = 'keria_num';
export const ARG_REFRESH = 'refresh';

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
  public static instances: Map<string, TestKeria> = new Map<
    string,
    TestKeria
  >();
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
  public keriaImage: string;
  private containers: Map<string, dockerode.Container> = new Map<
    string,
    dockerode.Container
  >();
  private docker = new Dockerode();
  public static AGENT_CONTEXT = 'agentContext';

  private constructor(
    testPaths: TestPaths,
    domain: string,
    host: string,
    witnessHost: string,
    kAdminPort: number,
    kHttpPort: number,
    kBootPort: number,
    keriaImage: string
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
    this.keriaImage = keriaImage;
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
    instanceOffset?: number,
    keriaImage = `weboftrust/keria:0.2.0-dev4`,
    platform = 'linux/amd64'
  ): Promise<TestKeria> {
    if (!TestKeria.instances) {
      TestKeria.instances = new Map<string, TestKeria>();
    }

    if (!instanceName) {
      throw new Error(
        'TestKeria.getInstance(instanceName) must be called with an instanceName'
      );
    }

    if (!TestKeria.instances.get(instanceName)) {
      if (testPaths === undefined) {
        throw new Error(
          `TestKeria.getInstance() called for agent "${instanceName}" without required parameters. You must initialize it with all parameters first.`
        );
      } else {
        if (!instanceOffset) {
          instanceOffset = TestKeria.getUniqueOffsetForInstance(instanceName);
        }

        const args = TestKeria.processKeriaArgs(
          basePort! + 1 + instanceOffset,
          basePort! + 2 + instanceOffset,
          basePort! + 3 + instanceOffset
        );
        TestKeria.instances.set(
          instanceName,
          new TestKeria(
            testPaths!,
            domain!,
            host!,
            containerLocalhost!,
            parseInt(args[ARG_KERIA_ADMIN_PORT], 10),
            parseInt(args[ARG_KERIA_HTTP_PORT], 10),
            parseInt(args[ARG_KERIA_BOOT_PORT], 10),
            keriaImage
          )
        );
        const keria = TestKeria.instances.get(instanceName);
        await keria!.startupInstance(keriaImage, instanceName, false, platform);
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
    baseBootPort: number
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
        // console.info(`Unknown keria argument, skipping: ${arg}`);
        return false;
      },
    });

    return args;
  }

  async startupInstance(
    keriaImage: string,
    containerPostfix: string,
    refresh: boolean,
    platform: string
  ) {
    console.log('Starting keria instance...');
    try {
      // Check if service is running
      console.log('Checking if service keria is running...');
      const isRunning = await this.checkServiceRunning();
      console.log('Is keria service running?', isRunning);

      if (!isRunning) {
        const containerName = `keria-${containerPostfix}`;
        console.log(
          `Starting Keria container ${containerName} with image ${keriaImage}`
        );
        await this.startContainer(keriaImage, containerName, refresh, platform);
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
    platform = 'linux/amd64',
    useHostNetwork: boolean = true
  ): Promise<dockerode.Container> {
    try {
      console.log(`Creating container ${containerName}...`);
      const containerOptions: dockerode.ContainerCreateOptions = {
        Image: imageName,
        name: containerName,
        platform: platform,
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

      // Add container to the containers map for cleanup
      this.containers.set(containerName, container);

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

  public static async cleanupInstances(testContexts: string[]): Promise<void> {
    console.log('Running workflow-steps test cleanup...');
    try {
      // Use Promise.all to wait for all cleanup operations to complete
      await Promise.all(
        testContexts.map(async (contextId) => {
          try {
            console.log('Cleaning up Keria instance', contextId);
            const testKeria = await TestKeria.getInstance(contextId);
            if (testKeria) {
              await testKeria.cleanupInstance(contextId);
              console.log('Successfully cleaned up Keria instance', contextId);
            }
          } catch (error) {
            console.warn(
              `Warning: Failed to clean up Keria instance ${contextId}:`,
              error
            );
          }
        })
      );

      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Cleans up a specific instance
   */
  async cleanupInstance(instanceId: string): Promise<void> {
    console.log(`Cleanup for keria instance ${instanceId}...`);
    try {
      // Clean up test data
      console.log(`Cleaning up keria test instance ${instanceId}`);

      // Get the container name based on the instance ID
      const containerName = `keria-${instanceId}`;

      // Stop and remove container
      if (containerName && this.containers.has(containerName)) {
        console.log(`Stopping container ${containerName}...`);
        try {
          await this.containers!.get(containerName)!.stop({ t: 10 });
        } catch (error) {
          console.log(
            `Warning: Error stopping container ${containerName}, proceeding with force remove: ${error instanceof Error ? error.message : 'unknown error'}`
          );
        }

        console.log(`Force removing container ${containerName}...`);
        try {
          await this.containers!.get(containerName)!.remove({ force: true });
          // Remove from containers map after successful removal
          this.containers.delete(containerName);
        } catch (error) {
          console.log(
            `Warning: Error removing container ${containerName}: ${error instanceof Error ? error.message : 'unknown error'}`
          );
        }

        console.log(`Container ${containerName} cleanup attempted`);
      } else {
        console.log(`No container found for instance ${instanceId}`);
      }

      // Remove this instance from the instances map
      TestKeria.instances.delete(instanceId);
      console.log(`Removed instance ${instanceId} from instances map`);

      console.log(`afterAll cleanup for instance ${instanceId} completed`);
    } catch (error) {
      console.error(`Error in afterAll for instance ${instanceId}:`, error);
      throw error;
    }
  }

  async createTempKeriaConfigFile(kConfig: KeriaConfig): Promise<string> {
    console.log('Create temp config file...');
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

  /**
   * Static method to clean up all Keria instances and shut down Docker Compose
   */
  public static async cleanupAllInstances(): Promise<void> {
    console.log('Cleanup of all Keria instances...');

    // Create a copy of the instances to avoid modification during iteration
    const instanceNames = Array.from(TestKeria.instances.keys());

    // Clean up each instance
    for (const instanceName of instanceNames) {
      try {
        const instance = TestKeria.instances.get(instanceName);
        if (instance) {
          await instance.cleanupInstance(instanceName);
        }
      } catch (error) {
        console.error(`Error cleaning up instance ${instanceName}:`, error);
      }
    }

    // Force cleanup any containers that might have been missed
    try {
      const docker = new Dockerode();

      // Get all containers
      const containers = await docker.listContainers({ all: true });

      // Find any keria containers that might have been missed
      for (const containerInfo of containers) {
        const containerName = containerInfo.Names[0].substring(1); // Remove leading slash
        if (containerName.startsWith('keria-')) {
          console.log(
            `Found leftover container ${containerName}, cleaning up...`
          );
          try {
            const container = docker.getContainer(containerInfo.Id);
            await container.stop({ t: 5 }).catch(() => {}); // Ignore errors if already stopped
            await container.remove({ force: true });
            console.log(
              `Successfully removed leftover container ${containerName}`
            );
          } catch (error) {
            console.error(
              `Error removing leftover container ${containerName}:`,
              error
            );
          }
        }
      }

      // If all instances are cleaned up, shut down Docker Compose
      if (TestKeria.instances.size === 0) {
        console.log(
          'All Keria instances cleaned up, shutting down Docker Compose...'
        );

        // Get the Docker Compose file path from TestPaths
        const testPaths = TestPaths.getInstance();
        const dockerComposeFile = testPaths.dockerComposeFile;

        if (dockerComposeFile) {
          try {
            console.log(
              `Running docker-compose down with file: ${dockerComposeFile}`
            );
            await stopDockerComposeServices(dockerComposeFile);
            console.log('Docker Compose services successfully shut down');
          } catch (error) {
            console.error('Error shutting down Docker Compose:', error);
          }
        } else {
          console.log('No Docker Compose file found, skipping shutdown');
        }
      } else {
        console.log(
          `Skipping Docker Compose shutdown as ${TestKeria.instances.size} instances are still running`
        );
      }
    } catch (error) {
      console.error('Error during force cleanup:', error);
    }

    console.log('All Keria instances cleanup completed');
  }

  private static getUniqueOffsetForInstance(instanceName: string): number {
    if (!TestKeria._instanceOffsets) {
      TestKeria._instanceOffsets = new Map<string, number>();
    }

    if (!TestKeria._instanceOffsets.has(instanceName)) {
      const nextOffset = TestKeria._instanceOffsets.size * 10;
      TestKeria._instanceOffsets.set(instanceName, nextOffset);
    }

    return TestKeria._instanceOffsets.get(instanceName)!;
  }

  private static _instanceOffsets: Map<string, number>;
}

/**
 * Helper function to stop Docker Compose services
 */
async function stopDockerComposeServices(
  dockerComposeFile: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `docker-compose -f ${dockerComposeFile} down`;
    console.log(`Executing: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing docker-compose down: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }

      console.log(`docker-compose down output: ${stdout}`);
      resolve();
    });
  });
}
