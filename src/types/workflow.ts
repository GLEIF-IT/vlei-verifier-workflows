/**
 * Represents a workflow with steps for vLEI verification processes
 */
export interface Workflow {
  workflow: {
    steps: Record<string, WorkflowStep>;
  };
}

/**
 * Base interface for all workflow steps
 * This provides a generic structure that all steps must follow
 */
export interface WorkflowStep {
  id: string;
  type: string; // Using string instead of enum to allow for extensibility
  description?: string;
  [key: string]: any; // Allow for any additional properties
}

/**
 * Helper function to load a workflow from a file
 */
export function loadWorkflow(path: string): Workflow | null {
  const fs = require('fs');
  const yaml = require('js-yaml');

  try {
    const fileContents = fs.readFileSync(path, 'utf8');
    return yaml.load(fileContents) as Workflow;
  } catch (error) {
    console.error(`Failed to load workflow from ${path}: ${error}`);
    return null;
  }
}

/**
 * Helper function to get all available workflows from the workflows directory
 */
export function getAvailableWorkflows(): string[] {
  const fs = require('fs');
  const path = require('path');

  const workflowsDir = path.join(process.cwd(), 'src', 'workflows');

  try {
    return fs
      .readdirSync(workflowsDir)
      .filter((file: string) => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map((file: string) => path.join(workflowsDir, file));
  } catch (error) {
    console.error(`Failed to read workflows directory: ${error}`);
    return [];
  }
}
