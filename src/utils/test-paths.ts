import { path } from '../node-modules.js';

export class TestPaths {
  private static instance: TestPaths;
  dockerComposeFile: string;
  maxReportMb: number;
  refreshTestData: boolean;
  testDir: string;
  testDataDir: string;
  tmpReportsDir: string;
  testUserConfigFile: string;
  testUsersDir: string;
  testUserDir: string;
  testUserName: string;
  testUserNum: number;
  testFailReports: string;
  testSignedReports: string;
  testTmpFailReports: string;
  testTmpSignedReports: string;
  testOrigReportsDir: string;
  testDataEbaDir: string;
  testReportUnsigned: string; //TODO we should generate all test data, but still allow a specific zip to be pointed to
  testReportGeneratedUnsignedZip: string;
  testReportGeneratedSignedZip: string;
  workflowsDir: string;
  // origReportsDir: string;
  // configDir: string;

  private constructor(
    userName: string,
    dockerComposeFile: string,
    userNum = 1,
    maxReportMb = 0
  ) {
    this.dockerComposeFile =
      process.env.DOCKER_COMPOSE_FILE || dockerComposeFile;
    this.maxReportMb = process.env.MAX_REPORT_MB
      ? parseInt(process.env.MAX_REPORT_MB)
      : maxReportMb;
    this.refreshTestData = process.env.REFRESH_TEST_DATA === 'true';
    this.testDir = process.env.TEST_DIR
      ? process.env.TEST_DIR
      : path.join(process.cwd(), `test`);
    this.testDataDir = process.env.TEST_DATA_DIR
      ? process.env.TEST_DATA_DIR
      : path.join(this.testDir, `data`);
    this.testOrigReportsDir = process.env.TEST_ORIG_REPORTS_DIR
      ? process.env.TEST_ORIG_REPORTS_DIR
      : path.join(this.testDataDir, `orig_reports`);
    this.tmpReportsDir = process.env.TEST_TEMP_REPORTS_DIR
      ? process.env.TEST_TEMP_REPORTS_DIR
      : path.join(this.testDataDir, `tmp_reports`, userName);
    this.testFailReports = process.env.TEST_FAIL_REPORTS
      ? process.env.TEST_FAIL_REPORTS
      : path.join(this.testDataDir, `fail_reports`);
    this.testSignedReports = process.env.TEST_SIGNED_REPORTS
      ? process.env.TEST_SIGNED_REPORTS
      : path.join(this.testDataDir, `signed_reports`);
    this.testUsersDir = process.env.TEST_USERS_DIR
      ? process.env.TEST_USERS_DIR
      : path.join(this.testDataDir, `600-banks-test-data`);
    this.testUserName = process.env.TEST_USER_NAME
      ? process.env.TEST_USER_NAME
      : userName;
    this.testUserNum = process.env.TEST_USER_NUM
      ? parseInt(process.env.TEST_USER_NUM)
      : userNum;
    this.testUserDir = process.env.TEST_USER_DIR
      ? process.env.TEST_USER_DIR
      : path.join(this.testUsersDir, this.testUserName);
    this.testUserConfigFile = process.env.TEST_USER_CONFIG_FILE
      ? process.env.TEST_USER_CONFIG_FILE
      : path.join(this.testUserDir, `config.json`);
    this.testTmpFailReports = process.env.TEST_TEMP_FAIL_REPORTS
      ? process.env.TEST_TEMP_FAIL_REPORTS
      : path.join(this.testUserDir, `/reports/signed_reports`);
    this.testTmpSignedReports = process.env.TEST_TEMP_SIGNED_REPORTS
      ? process.env.TEST_TEMP_SIGNED_REPORTS
      : path.join(this.testUserDir, `/reports/signed_reports`);
    this.testDataEbaDir = process.env.TEST_DATA_EBA_DIR
      ? process.env.TEST_DATA_EBA_DIR
      : path.join(this.testDataDir, `eba_reports`);
    this.testReportUnsigned = process.env.TEST_REPORT_UNSIGNED
      ? process.env.TEST_REPORT_UNSIGNED
      : path.join(
          this.testDataEbaDir,
          `237932ALYUME7DQDC2D7.CON_GR_PILLAR3010000_P3REMDISDOCS_2023-12-31_202401113083647123.pdf`
        );
    this.testReportGeneratedUnsignedZip = process.env
      .TEST_REPORT_GENERATED_UNSIGNED
      ? process.env.TEST_REPORT_GENERATED_UNSIGNED
      : path.join(
          this.testDataEbaDir,
          this.testUserName,
          `237932ALYUME7DQDC2D7.CON_GR_PILLAR3010000_P3REMDISDOCS_2023-12-31_202401113083647123.zip`
        );
    this.testReportGeneratedSignedZip = process.env.TEST_REPORT_GENERATED_SIGNED
      ? process.env.TEST_REPORT_GENERATED_SIGNED
      : path.join(
          this.testSignedReports,
          this.testUserName,
          `237932ALYUME7DQDC2D7.CON_GR_PILLAR3010000_P3REMDISDOCS_2023-12-31_202401113083647123_signed.zip`
        );
    this.workflowsDir = process.env.WORKFLOWS_DIR
      ? process.env.WORKFLOWS_DIR
      : path.join(process.cwd(), 'src/workflows');
  }

  public static getInstance(
    userName = 'Bank_1',
    dockerComposeFile = path.join(process.cwd(), 'docker-compose.yaml')
  ): TestPaths {
    if (!TestPaths.instance) {
      TestPaths.instance = new TestPaths(userName, dockerComposeFile);
    }
    return TestPaths.instance;
  }
}
