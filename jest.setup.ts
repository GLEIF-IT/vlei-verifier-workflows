import { ensureDockerPermissions } from './src/utils/docker-permissions';

// This will run before Jest starts running tests
export default async function () {
  const permissionsOk = await ensureDockerPermissions();
  if (!permissionsOk) {
    console.error(
      'Docker permissions are not properly configured. Tests may fail.'
    );
    // Optionally, you could throw an error here to prevent tests from running
    // throw new Error('Docker permissions not configured correctly');
  }
  jest.setTimeout(300000);
}
