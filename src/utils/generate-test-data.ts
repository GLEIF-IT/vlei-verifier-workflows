const testDataDir = 'test_data';
import * as fs from 'fs';
import * as path from 'path';

export async function buildTestData(
  testData: EcrTestData,
  testName: string,
  issueName: string,
  fileNamePrefix = ''
): Promise<string> {
  const testDataDirPrefixed = path.join(
    __dirname,
    '../../test',
    'data',
    testDataDir,
    testName
  );
  if (!fs.existsSync(testDataDirPrefixed)) {
    fs.mkdirSync(testDataDirPrefixed);
  }
  testData.credential['issueName'] = issueName;
  const testDataJson = JSON.stringify(testData);
  const fileName = `${fileNamePrefix}${testData.lei}_${testData.aid}_${testData.engagementContextRole}.json`;
  await fs.writeFile(
    `${testDataDirPrefixed}/${fileName}`,
    testDataJson,
    'utf8',
    () => ({})
  );
  return testDataDirPrefixed;
}

export interface EcrTestData {
  aid: string;
  credential: any;
  lei: string;
  engagementContextRole: string;
}
