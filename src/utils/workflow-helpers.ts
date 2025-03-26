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
  return path.join(__dirname, '../../src/workflows', fileName);
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
  let workflowsDir;
  try {
    workflowsDir = path.join(__dirname, '../../src/workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      workflowsDir = path.join(process.cwd(), 'node_modules/vlei-verifier-workflows/src/workflows');
      
      if (!fs.existsSync(workflowsDir)) {
        workflowsDir = require.resolve('vlei-verifier-workflows/dist/cjs/utils/workflow-helpers.js');
        workflowsDir = path.join(path.dirname(workflowsDir), '../../src/workflows');
      }
    }
  } catch (error) {
    console.error('Error resolving workflows directory:', error);
    return [];
  }
  
  try {
    return fs
      .readdirSync(workflowsDir)
      .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));
  } catch (error) {
    console.error(`Error reading workflows directory at ${workflowsDir}:`, error);
    return [];
  }
}
