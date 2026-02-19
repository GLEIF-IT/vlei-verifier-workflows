export type TestEnvironmentPreset =
  | 'local'
  | 'docker'
  | 'rootsid_dev'
  | 'rootsid_test'
  | 'bank_test'
  | 'nordlei_dev'
  | 'nordlei_demo'
  | 'nordlei_dry';

export interface TestEnvironment {
  preset: TestEnvironmentPreset;
  url: string;
  bootUrl: string;
  vleiServerUrl: string;
  witnessUrls: string[];
  witnessIds: string[];
  verifierBaseUrl: string;
  workflow: string;
  configuration: string;
  keriContainerName?: string;
}

const WAN = 'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha';
const WIL = 'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM';
const WES = 'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX';

export function resolveEnvironment(
  input?: TestEnvironmentPreset
): TestEnvironment {
  const preset = input ?? process.env.TEST_ENVIRONMENT ?? 'docker';
  let env;
  switch (preset) {
    case 'docker':
      env = {
        preset: preset,
        url: process.env.KERIA || 'http://127.0.0.1:3901',
        bootUrl: process.env.KERIA_BOOT || 'http://127.0.0.1:3903',
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
        vleiServerUrl: process.env.VLEI_SERVER || 'http://vlei-server:7723',
        verifierBaseUrl: process.env.VLEI_VERIFIER || 'http://localhost:7676',
        workflow: process.env.WORKFLOW || 'create-aid-kli.yaml',
        configuration:
          process.env.CONFIGURATION ||
          'configuration-create-aid-kli.json',
      };
      break;
    case 'local':
      env = {
        preset: preset,
        url: process.env.KERIA || 'http://127.0.0.1:3901',
        bootUrl: process.env.KERIA_BOOT || 'http://127.0.0.1:3903',
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
          process.env.CONFIGURATION ||
          'configuration-singlesig-single-user.json',
      };
      break;
    case 'rootsid_dev':
      env = {
        preset: preset,
        url: process.env.KERIA || 'https://keria-dev.rootsid.cloud/admin',
        bootUrl: process.env.KERIA_BOOT || 'https://keria-dev.rootsid.cloud',
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
        vleiServerUrl:
          process.env.VLEI_SERVER || 'http://schemas.rootsid.cloud',
        verifierBaseUrl:
          process.env.VLEI_VERIFIER || 'RootsID dev verifier not set',
        workflow: process.env.WORKFLOW || 'singlesig-single-user-light.yaml',
        configuration:
          process.env.CONFIGURATION ||
          'configuration-singlesig-single-user-light.json',
      };
      break;
    case 'rootsid_test':
      env = {
        preset: preset,
        url: process.env.KERIA || 'https://keria-test.rootsid.cloud/admin',
        bootUrl: process.env.KERIA_BOOT || 'https://keria-test.rootsid.cloud',
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
        vleiServerUrl:
          process.env.VLEI_SERVER || 'http://schemas.rootsid.cloud',
        verifierBaseUrl:
          process.env.VLEI_VERIFIER || 'RootsID demo verifier not set',
        workflow: process.env.WORKFLOW || 'singlesig-single-user.yaml',
        configuration:
          process.env.CONFIGURATION ||
          'configuration-singlesig-single-user.json',
      };
      break;
    default:
      throw new Error(`Unknown test environment preset '${preset}'`);
  }
  // this is an unwanted side effect.
  // it results in output to the console as a result of simply importing the vlei-verifier-workflow package.
  // console.log('Test environment preset: ', JSON.stringify(env));
  return env;
}
