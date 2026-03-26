import { execSync, spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export type SinglesigInceptAttributes = Record<string, any>;

export type MultisigInceptAttributes = Record<string, any>;

export type IssueCredentialAttributes = Record<string, any>;

export type Edges = Record<string, any>;
export type Rules = Record<string, any>;

function copyFile(tmpFilePah: string, localFilePath: string): void {
  // Ensure the local file exists before copying
  if (!tmpFilePah) {
    throw new Error(`Temp file path is not provided: ${tmpFilePah}`);
  }
  const command = `cp ${tmpFilePah} ${localFilePath}`;
  execSync(command, { encoding: 'utf-8' });
}

function executeKliCommand(command: string, promptAnswer?: string): string {
  try {
    if (promptAnswer) {
      command = `sh -c "echo ${promptAnswer} | ${command}"`;
    }
    const result = spawnSync('sh', ['-c', command], {
      encoding: 'utf-8',
      timeout: 10000,
    });

    if (
      result.error &&
      (result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'
    ) {
      console.log(
        `Command timed out but will be considered successful: ${command}`
      );
      return ''; // Return an empty string or handle as needed
    }
    if (result.error) {
      throw result.error;
    }
    console.log(`Command executed: ${command}`);
    console.log(`Command output: ${result.stdout}`);
    return result.stdout;
  } catch (error) {
    console.error(`Error ${error}`);
    throw new Error(`Command failed: ${command}\nError: ${error.message}`);
  }
}

export function init(name: string, passcode: string): string {
  const command = `kli init --name ${name} --passcode ${passcode}`;
  return executeKliCommand(command);
}

export function incept(
  name: string,
  passcode: string,
  alias: string,
  attributes: SinglesigInceptAttributes
): string {
  const tempFilePath = resolve(__dirname, 'temp-attributes.json');
  writeFileSync(tempFilePath, JSON.stringify(attributes, null, 2));

  const resultFilePath = `/tmp/${alias}.json`;
  copyFile(tempFilePath, resultFilePath);
  // setTimeout(() => { }, 2000); // Wait for the file to be copied
  const command = `kli incept --name ${name} --passcode ${passcode} --alias ${alias} --file ${resultFilePath}`;
  const result = executeKliCommand(command);
  const aidPrefixRegex = /Prefix\s+([A-Za-z0-9_-]+)/;
  const match = result.match(aidPrefixRegex);
  if (!match) {
    throw new Error('Failed to extract AID prefix from the command output.');
  }
  const aidPrefix = match[1];
  return aidPrefix;
}

export function multisigIncept(
  name: string,
  passcode: string,
  alias: string,
  group: string,
  attributes: MultisigInceptAttributes
): string {
  const tempFilePath = resolve(__dirname, `temp-attributes.json`);
  writeFileSync(tempFilePath, JSON.stringify(attributes, null, 2));

  const resultFilePath = `/tmp/${group}.json`;
  copyFile(tempFilePath, resultFilePath);
  // setTimeout(() => { }, 2000); // Wait for the file to be copied
  const command = `kli multisig incept --name ${name} --passcode ${passcode} --alias ${alias} --group ${group} --file ${resultFilePath}`;
  const result = executeKliCommand(command);
  return result;
}

export function resolveOobi(
  name: string,
  passcode: string,
  oobi: string
): string {
  const command = `kli oobi resolve --name ${name} --passcode ${passcode} --oobi ${oobi}`;
  return executeKliCommand(command);
}

export function confirmDelegation(
  name: string,
  passcode: string,
  alias: string
): string {
  const command = `kli delegate confirm --name ${name} --passcode ${passcode} --alias ${alias} --auto --interact`;
  return executeKliCommand(command);
}

export function createRegistry(
  name: string,
  passcode: string,
  alias: string,
  registryName: string
): string {
  const command = `kli vc registry incept --name ${name} --passcode ${passcode} --alias ${alias} --registry-name ${registryName}`;
  const result = executeKliCommand(command);
  const registryPrefixRegex = /Registry\(([A-Za-z0-9_-]+)\)/;
  const match = result.match(registryPrefixRegex);
  if (!match) {
    throw new Error('Failed to extract registry prefix from the command output.');
  }
  const registryPrefix = match[1];
  return registryPrefix;
}

export function issueCredential(
  name: string,
  passcode: string,
  alias: string,
  recipientAidPrefix: string,
  registryName: string,
  schemaSaid: string,
  rules: Rules,
  edges: Edges,
  attributes: IssueCredentialAttributes
): string {
  const tempFilePath = resolve(__dirname, `temp-data.json`);
  writeFileSync(tempFilePath, JSON.stringify(attributes, null, 2));
  const dataFilePath = `/tmp/${recipientAidPrefix}-data.json`;
  copyFile(tempFilePath, dataFilePath);

  if (rules != undefined) {
    const tempRulesFilePath = resolve(__dirname, `temp-rules.json`);
    writeFileSync(tempRulesFilePath, JSON.stringify(rules, null, 2));
    const rulesFilePath = `/tmp/${recipientAidPrefix}-rules.json`;
    copyFile(tempRulesFilePath, rulesFilePath);
  }

  if (edges != undefined) {
    const tempEdgesFilePath = resolve(__dirname, `temp-edges.json`);
    writeFileSync(tempEdgesFilePath, JSON.stringify(edges, null, 2));
    const edgesFilePath = `/tmp/${recipientAidPrefix}-edges.json`;
    copyFile(tempEdgesFilePath, edgesFilePath);
  }
  let command = `kli vc create --name ${name} --passcode ${passcode} --alias ${alias} --recipient ${recipientAidPrefix} --registry-name ${registryName} --schema ${schemaSaid}`;
  if (rules != undefined) {
    const tempRulesFilePath = resolve(__dirname, `temp-rules.json`);
    writeFileSync(tempRulesFilePath, JSON.stringify(rules, null, 2));
    const rulesFilePath = `/tmp/${recipientAidPrefix}-rules.json`;
    copyFile(tempRulesFilePath, rulesFilePath);
    command += ` --rules @${rulesFilePath}`;
  }
  if (edges != undefined) {
    const tempEdgesFilePath = resolve(__dirname, `temp-edges.json`);
    writeFileSync(tempEdgesFilePath, JSON.stringify(edges, null, 2));
    const edgesFilePath = `/tmp/${recipientAidPrefix}-edges.json`;
    copyFile(tempEdgesFilePath, edgesFilePath);
    command += ` --edges @${edgesFilePath}`;
  }
  command += ` --data @${dataFilePath} `;
  const result = executeKliCommand(command);
  return result;
}
