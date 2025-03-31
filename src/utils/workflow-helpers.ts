import path from 'path';
import fs from 'fs';
import { Workflow } from '../types/workflow.js';
import yaml from 'js-yaml';

/**
 * Gets the path to a specific workflow file in the package
 * @param workflowName The name of the workflow file (with or without .yaml extension)
 * @returns The full path to the workflow file
 */
export function getWorkflowPath(workflowName: string): string {
  const fileName = workflowName.endsWith('.yaml')
    ? workflowName
    : `${workflowName}.yaml`;

  // Try multiple possible locations
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, 'dist', 'esm', 'workflows', fileName),
    path.join(cwd, 'dist', 'cjs', 'workflows', fileName),
    path.join(__dirname, '..', 'workflows', fileName),
    path.join(cwd, 'src', 'workflows', fileName),
    path.join(cwd, 'workflows', fileName),
  ];

  const existingPath = possiblePaths.find((p) => fs.existsSync(p));
  if (!existingPath) {
    throw new Error(`Could not find workflow file: ${fileName}`);
  }

  return existingPath;
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
  let workflowsDir: string;

  try {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(__dirname, '..', 'workflows'),
      path.join(process.cwd(), 'dist', 'esm', 'workflows'),
      path.join(process.cwd(), 'dist', 'cjs', 'workflows'),
      path.join(process.cwd(), 'src', 'workflows'),
      path.join(process.cwd(), 'workflows'),
    ];

    workflowsDir = possiblePaths.find((p) => fs.existsSync(p)) || '';

    if (!workflowsDir) {
      console.warn('Could not find workflows directory');
      return [];
    }

    return fs
      .readdirSync(workflowsDir)
      .filter(
        (file: string) => file.endsWith('.yaml') || file.endsWith('.yml')
      );
  } catch (e) {
    console.error('Error listing workflows:', e);
    return [];
  }
}

export function loadWorkflow(workflowPath: string): Workflow | null {
  try {
    const fileContents = fs.readFileSync(workflowPath, 'utf8');
    const workflow = yaml.parse(fileContents) as Workflow;

    if (!workflow || !workflow.workflow || !workflow.workflow.steps) {
      throw new Error('Invalid workflow format');
    }

    return workflow;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load workflow file: ${error.message}`);
    }
    throw error;
  }
}
