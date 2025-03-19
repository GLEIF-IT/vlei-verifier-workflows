export type TestEnvironmentPreset =
  | 'local'
  | 'docker'
  | 'rootsid_dev'
  | 'rootsid_test'
  | string; // Allow for extension with custom presets

export interface TestEnvironment {
  preset: TestEnvironmentPreset;
  keriaAdminUrl: string;
  keriaBootUrl: string;
  vleiServerUrl: string;
  witnessUrls: string[];
  witnessIds: string[];
  verifierBaseUrl: string;
  workflow: string;
  configuration: string;
  [key: string]: any; // Allow for extension with additional properties
}

export const WAN = 'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha';
export const WIL = 'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM';
export const WES = 'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX';

// Registry to store environment configurations
export class EnvironmentRegistry {
  private static instance: EnvironmentRegistry;
  private environments: Map<string, (overrides?: any) => any>;
  public static ENVIRONMENT_CONTEXT = 'environmentContext';
  private constructor() {
    this.environments = new Map();

    // Register default environments
    this.register('docker', (overrides?: Partial<TestEnvironment>) => ({
      preset: 'docker',
      keriaAdminUrl: process.env.KERIA || 'http://127.0.0.1:3901',
      keriaBootUrl: process.env.KERIA_BOOT || 'http://127.0.0.1:3903',
      witnessUrls:
        process.env.WITNESS_URLS === ''
          ? []
          : process.env.WITNESS_URLS?.split(',') || [
              'http://localhost:5642',
              'http://localhost:5643',
              'http://localhost:5644',
            ],
      witnessIds:
        process.env.WITNESS_IDS === ''
          ? []
          : process.env.WITNESS_IDS?.split(',') || [WAN, WIL, WES],
      vleiServerUrl: process.env.VLEI_SERVER || 'http://localhost:7723',
      verifierBaseUrl: process.env.VLEI_VERIFIER || 'http://localhost:7676',
      workflow: process.env.WORKFLOW || 'singlesig-single-user-light.yaml',
      configuration:
        process.env.CONFIGURATION ||
        'configuration-singlesig-single-user-light.json',
      ...overrides,
    }));

    this.register('local', (overrides?: Partial<TestEnvironment>) => ({
      preset: 'local',
      keriaAdminUrl: process.env.KERIA || 'http://127.0.0.1:3901',
      keriaBootUrl: process.env.KERIA_BOOT || 'http://127.0.0.1:3903',
      vleiServerUrl: process.env.VLEI_SERVER || 'http://localhost:7723',
      witnessUrls:
        process.env.WITNESS_URLS === ''
          ? []
          : process.env.WITNESS_URLS?.split(',') || [
              'http://localhost:5642',
              'http://localhost:5643',
              'http://localhost:5644',
            ],
      witnessIds:
        process.env.WITNESS_IDS === ''
          ? []
          : process.env.WITNESS_IDS?.split(',') || [WAN, WIL, WES],
      verifierBaseUrl: process.env.VLEI_VERIFIER || 'http://localhost:7676',
      workflow: process.env.WORKFLOW || 'singlesig-single-user.yaml',
      configuration:
        process.env.CONFIGURATION || 'configuration-singlesig-single-user.json',
      ...overrides,
    }));

    this.register('rootsid_dev', (overrides?: Partial<TestEnvironment>) => ({
      preset: 'rootsid_dev',
      keriaAdminUrl:
        process.env.KERIA || 'https://keria-dev.rootsid.cloud/admin',
      keriaBootUrl: process.env.KERIA_BOOT || 'https://keria-dev.rootsid.cloud',
      witnessUrls:
        process.env.WITNESS_URLS === ''
          ? []
          : process.env.WITNESS_URLS?.split(',') || [
              'https://witness-dev01.rootsid.cloud',
              'https://witness-dev02.rootsid.cloud',
              'https://witness-dev03.rootsid.cloud',
            ],
      witnessIds:
        process.env.WITNESS_IDS === ''
          ? []
          : process.env.WITNESS_IDS?.split(',') || [WAN, WIL, WES],
      vleiServerUrl: process.env.VLEI_SERVER || 'http://schemas.rootsid.cloud',
      verifierBaseUrl:
        process.env.VLEI_VERIFIER || 'RootsID dev verifier not set',
      workflow: process.env.WORKFLOW || 'singlesig-single-user-light.yaml',
      configuration:
        process.env.CONFIGURATION ||
        'configuration-singlesig-single-user-light.json',
      ...overrides,
    }));

    this.register('rootsid_test', (overrides?: Partial<TestEnvironment>) => ({
      preset: 'rootsid_test',
      keriaAdminUrl:
        process.env.KERIA || 'https://keria-test.rootsid.cloud/admin',
      keriaBootUrl:
        process.env.KERIA_BOOT || 'https://keria-test.rootsid.cloud',
      witnessUrls:
        process.env.WITNESS_URLS === ''
          ? []
          : process.env.WITNESS_URLS?.split(',') || [
              'http://wit1.rootsid.cloud:5501',
              'http://wit2.rootsid.cloud:5503',
              'http://wit3.rootsid.cloud:5505',
            ],
      witnessIds:
        process.env.WITNESS_IDS === ''
          ? []
          : process.env.WITNESS_IDS?.split(',') || [
              'BNZBr3xjR0Vtat_HxFJnfBwQcpDj3LGl4h_MCQdmyN-r',
              'BH_XYb3mBmRB1nBVl8XrKjtuQkcIWYKALY4ZWLVOZjKg',
              'BAPWdGXGfiFsi3sMvSCPDnoPnEhPp-ZWxK9RYrqCQTa_',
            ],
      vleiServerUrl: process.env.VLEI_SERVER || 'http://schemas.rootsid.cloud',
      verifierBaseUrl:
        process.env.VLEI_VERIFIER || 'RootsID demo verifier not set',
      workflow: process.env.WORKFLOW || 'singlesig-single-user.yaml',
      configuration:
        process.env.CONFIGURATION || 'configuration-singlesig-single-user.json',
      ...overrides,
    }));
  }

  public static getInstance(): EnvironmentRegistry {
    if (!EnvironmentRegistry.instance) {
      EnvironmentRegistry.instance = new EnvironmentRegistry();
    }
    return EnvironmentRegistry.instance;
  }

  public register<T extends TestEnvironment>(
    preset: string,
    configFn: (overrides: Partial<TestEnvironment>) => TestEnvironment
  ): void {
    this.environments.set(preset, configFn);
  }

  public getEnvironment<T extends TestEnvironment>(
    preset: string,
    overrides?: Partial<T>
  ): T {
    const configFn = this.environments.get(preset);
    if (!configFn) {
      throw new Error(`Unknown test environment preset '${preset}'`);
    }
    return configFn(overrides);
  }

  public hasEnvironment(preset: string): boolean {
    return this.environments.has(preset);
  }

  public getAvailablePresets(): string[] {
    return Array.from(this.environments.keys());
  }
}

export function resolveEnvironment<T extends TestEnvironment = TestEnvironment>(
  envPreset?: string,
  overrides?: Partial<T>
): T {
  const preset = envPreset ?? process.env.TEST_ENVIRONMENT ?? 'docker';
  const registry = EnvironmentRegistry.getInstance();
  const env = registry.getEnvironment<T>(preset, overrides);
  console.log(`Environment preset '${preset}':`, JSON.stringify(env));
  return env;
}
