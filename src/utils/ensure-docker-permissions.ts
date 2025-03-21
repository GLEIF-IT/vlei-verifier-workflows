import { ensureDockerPermissions } from './docker-permissions.js';

async function main() {
  const result = await ensureDockerPermissions();
  if (!result) {
    console.log('\nPlease fix Docker permissions before running tests.');
    console.log('After fixing permissions, you may need to restart your terminal session.');
    process.exit(1);
  }
  console.log('Docker permissions are correctly configured. You can run tests now.');
}

main().catch(console.error); 