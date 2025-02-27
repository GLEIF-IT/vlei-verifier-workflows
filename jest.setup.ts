// Increase the default timeout
jest.setTimeout(90000);

// Add a global teardown with proper logging
afterAll(async () => {
  console.log('Starting global Jest cleanup...');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log('Global Jest cleanup completed...');
});
