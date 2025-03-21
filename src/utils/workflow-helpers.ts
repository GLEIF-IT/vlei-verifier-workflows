import path from 'path';
import fs from 'fs';
import { Workflow, loadWorkflow } from '../types/workflow.js';

/**
 * Gets the path to a specific workflow file in the package
 * @param workflowName The name of the workflow file (with or without .yaml extension)
 * @returns The full path to the workflow file
 */
export function getWorkflowPath(workflowName: string): string {
  const fileName = workflowName.endsWith('.yaml')
    ? workflowName
    : `${workflowName}.yaml`;
  return path.join(__dirname, '../../src/examples/workflows', fileName);
}

/**
 * Loads a specific workflow from the package
 * @param workflowName The name of the workflow file (with or without .yaml extension)
 * @returns The loaded workflow or null if it couldn't be loaded
 */
export function loadPackagedWorkflow(workflowName: string): Workflow | null {
  return loadWorkflow(getWorkflowPath(workflowName));
}

/**
 * Lists all available packaged workflows
 * @returns Array of workflow file names
 */
export function listPackagedWorkflows(): string[] {
  const workflowsDir = path.join(__dirname, '../../src/workflows');
  try {
    return fs
      .readdirSync(workflowsDir)
      .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));
  } catch (error) {
    console.error(`Failed to read workflows directory: ${error}`);
    return [];
  }
}
