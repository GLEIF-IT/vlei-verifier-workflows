import { TestKeria } from "../src/utils/test-keria";

   // jest.setup.ts
   afterAll(async () => {
    await TestKeria.cleanupAllInstances();
  }, 60000);