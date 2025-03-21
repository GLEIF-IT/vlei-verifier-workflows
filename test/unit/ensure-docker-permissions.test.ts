import { ensureDockerPermissions } from '../../src/utils/docker-permissions.js';

describe('Docker Permissions Check', () => {
  test('Check Docker permissions before running tests', async () => {
    const result = await ensureDockerPermissions();
    if (!result) {
      console.log('\nPlease fix Docker permissions before running tests.');
      console.log('After fixing permissions, you may need to restart your terminal session.');
      process.exit(1); // This will exit the test process if permissions aren't set up
    }
    console.log('Docker permissions are correctly configured. You can run tests now.');
    expect(result).toBe(true);
  });
}); 