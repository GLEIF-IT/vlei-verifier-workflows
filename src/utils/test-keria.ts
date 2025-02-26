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

  async beforeAll(
    imageName: string,
    containerName: string = 'keria',
    pullImage: boolean = false
  ) {
    process.env.DOCKER_HOST = process.env.DOCKER_HOST
      ? process.env.DOCKER_HOST
      : 'localhost';
    if (
      process.env.START_TEST_KERIA === undefined ||
      process.env.START_TEST_KERIA === 'true'
    ) {
      console.log(
        `Starting local services using ${this.testPaths.dockerComposeFile} up -d verify`
      );
      if (process.env.DOCKER_USER && process.env.DOCKER_PASSWORD) {
        await dockerLogin(process.env.DOCKER_USER, process.env.DOCKER_PASSWORD);
      } else {
        console.info(
          'Docker login credentials not provided, skipping docker login'
        );
      }
      await runDockerCompose(
        this.testPaths.dockerComposeFile,
        'up -d',
        'verify'
      );

      const keriaContainer = await this.launchTestKeria(
        imageName,
        containerName,
        pullImage
      );
      this.containers.set(containerName, keriaContainer);
    }
  }

  async afterAll(clean = true) {
    if (clean) {
      console.log('Cleaning up test data');
      for (const container of this.containers) {
        await container[1].stop();
        await container[1].remove();
        // await container.remove();
        // await testKeria.containers.delete();
      }
      console.log(
        `Stopping local services using ${this.testPaths.dockerComposeFile}`
      );
      await stopDockerCompose(
        this.testPaths.dockerComposeFile,
        'down -v',
        'verify'
      );
    }
  }

  async createTempKeriaConfigFile(kConfig: KeriaConfig): Promise<string> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keria-config-'));
    const tempFilePath = path.join(tempDir, 'keria.json');
    const configStr = JSON.stringify(kConfig);
    fs.writeFileSync(tempFilePath, configStr);
    return tempFilePath;
  }

  async startContainerWithConfig(
    imageName: string,
    containerName: string
  ): Promise<dockerode.Container> {
    // const networkName = "vlei-verifier-workflows_default"; // Replace with your actual network name

    let containerOptions: dockerode.ContainerCreateOptions;
    containerOptions = {
      name: containerName,
      Image: imageName,
      ExposedPorts: {
        [`${this.keriaAdminPort}/tcp`]: {},
        [`${this.keriaHttpPort}/tcp`]: {},
        [`${this.keriaBootPort}/tcp`]: {},
      },
      HostConfig: {
        // PortBindings: {
        //   "3901/tcp": [{ HostPort: `${this.keriaAdminPort}` }],
        //   "3902/tcp": [{ HostPort: `${this.keriaHttpPort}` }],
        //   "3903/tcp": [{ HostPort: `${this.keriaBootPort}` }],
        // },
        NetworkMode: 'host', // Connect to the Docker Compose network
      },
    };

    if (this.keriaConfig) {
      const tempConfigPath = await this.createTempKeriaConfigFile(
        this.keriaConfig
      );
      containerOptions['HostConfig']!['Binds'] = [
        `${tempConfigPath}:/usr/local/var/keri/cf/keria.json`,
      ];
      containerOptions['Entrypoint'] = [
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
      console.log(
        `Container started with configuration: ${JSON.stringify(this.keriaConfig)} at ${tempConfigPath}}`
      );
    }

    // Create and start the container
    let container;
    try {
      container = await this.docker.createContainer(containerOptions);
      await container.start();
      console.log(
        `Container started with name: ${containerName}, image: ${imageName}`
      );
    } catch (error) {
      console.warn(
        `Error startContainerWithConfig container with name: ${containerName}, image: ${imageName}`,
        error
      );
      const cont = await this.docker.listContainers({ all: true });
      const found = cont.find((c) => {
        return c.Names.includes(`/${containerName}`);
      });
      container = this.docker.getContainer(found!.Id);
      try {
        await container.start();
      } catch (error) {
        console.warn(
          `Error starting existing container with name: ${containerName}, image: ${imageName}`,
          error
        );
      }
    }
    // Inspect the container to verify network mode and port bindings
    const containerInfo = await container.inspect();
    console.log(
      `Container NetworkMode: ${containerInfo.HostConfig.NetworkMode}`
    );
    console.log(
      `Container PortBindings: ${JSON.stringify(containerInfo.HostConfig.PortBindings)}`
    );
    console.log(
      `Container ExposedPorts: ${JSON.stringify(containerInfo.Config.ExposedPorts)}`
    );
    return container!;
  }

  public async launchTestKeria(
    kimageName: string,
    kontainerName: string,
    pullImage: boolean = false
  ): Promise<dockerode.Container> {
    // Check if the container is already running
    const containers = await this.docker.listContainers({ all: true });
    let container: dockerode.Container | undefined;

    const existingContainer = containers.find((c) => {
      return c.Names.includes(`/${kontainerName}`);
    });
    // Check if any container is using the specified ports
    const portInUse = containers.find((c) => {
      const ports = c.Ports.map((p) => p.PublicPort);
      return (
        ports.includes(this.keriaAdminPort) ||
        ports.includes(this.keriaHttpPort) ||
        ports.includes(this.keriaBootPort)
      );
    });
    if (portInUse) {
      const pContainer = this.docker.getContainer(portInUse.Id);
      console.warn(
        `Warning: One of the specified ports (${this.keriaAdminPort}, ${this.keriaHttpPort}, ${this.keriaBootPort}) is already in use. Stopping that one\n` +
          `Container ID: ${portInUse.Id}\n` +
          `Container Names: ${portInUse.Names.join(', ')}\n` +
          `Container Image: ${portInUse.Image}\n` +
          `Container State: ${portInUse.State}\n` +
          `Container Status: ${portInUse.Status}`
      );
      if (pullImage) {
        console.log(
          `Existing container running on ${JSON.stringify(portInUse)}, stopping that one`
        );
        await pContainer.stop();
      } else {
        console.log(
          `Existing container running on ${JSON.stringify(portInUse)}, using that one`
        );
        container = pContainer;
      }
    }
    if (existingContainer && existingContainer.State === 'running') {
      console.warn(
        `Warning: Container with name ${kontainerName} is already running.\n` +
          `Container ID: ${existingContainer.Id}\n` +
          `Container Names: ${existingContainer.Names.join(', ')}\n` +
          `Container Image: ${existingContainer.Image}\n` +
          `Container State: ${existingContainer.State}\n` +
          `Container Status: ${existingContainer.Status}`
      );
      container = this.docker.getContainer(existingContainer.Id);
    } else {
      if (existingContainer) {
        console.info(
          `TestKeria: Older container with name ${kontainerName} exists but is not running.\n` +
            `Container ID: ${existingContainer.Id}\n` +
            `Container Names: ${existingContainer.Names.join(', ')}\n` +
            `Container Image: ${existingContainer.Image}\n` +
            `Container State: ${existingContainer.State}\n` +
            `Container Status: ${existingContainer.Status}`
        );
        if (pullImage) {
          console.info(
            `TestKeria: Pulling new image for existing/runner container.\n`
          );
          await this.docker.getContainer(existingContainer.Id).remove();
        } else {
          console.info(`TestKeria: Running existing/runner container.\n`);
          container = this.docker.getContainer(existingContainer.Id);
          await container.start();
        }
      }
    }

    if (!container || pullImage) {
      console.info(
        `Docker pull: Either existing container doesn't exist or refreshing it.\n`
      );
      if (container) {
        console.info(
          `Launch Test Keria: pullImage is ${pullImage}, stopping and removing pre-existing test keria ${kontainerName}.`
        );
        try {
          await container.stop();
          await container.remove();
        } catch (e) {
          console.warn(
            `Unable to stop/remove pre-existing test keria ${kontainerName}: ${e}`
          );
        }
      }
      try {
        await pullContainer(this.docker, kimageName);
      } catch (error) {
        console.warn(
          `Error pulling container with name: ${kontainerName}, image: ${kimageName}`,
          error
        );
      }
      container = await this.startContainerWithConfig(
        kimageName,
        kontainerName
      );
    }

    await performHealthCheck(
      `http://${this.domain}:${this.keriaHttpPort}/spec.yaml`
    );
    return container;
  }
}

function dockerLogin(DOCKER_USER: string, DOCKER_PASSWORD: string) {
  throw new Error('Function not implemented.');
}

// Function to perform health check
export async function performHealthCheck(
  url: string,
  timeout: number = 12000,
  interval: number = 1000
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        console.log('Service is healthy');
        return;
      }
    } catch (error) {
      console.log(`Waiting for service to be healthy ${url}: ${error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Service at ${url} did not become healthy in time`);
}

export async function pullContainer(
  docker: dockerode,
  kimageName: string
): Promise<void> {
  // Pull Docker image
  await new Promise<void>((resolve, reject) => {
    docker.pull(kimageName, (err: any, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, onFinished, onProgress);

      function onFinished(err: any, output: any) {
        if (err) return reject(err);
        resolve();
      }

      function onProgress(event: any) {
        console.log(event);
      }
    });
  });
}
