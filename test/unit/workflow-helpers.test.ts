import {
  loadPackagedWorkflow,
  listPackagedWorkflows,
} from '../../src/utils/workflow-helpers';
import fs from 'fs';
import path from 'path';

describe('workflow-helpers', () => {
  describe('loadPackagedWorkflow', () => {
    it('should load a workflow from dist directory', () => {
      // Attempt to load a known workflow
      const workflow = loadPackagedWorkflow('singlesig-single-user-light');

      // Verify the workflow was loaded successfully
      expect(workflow).toBeDefined();
      expect(workflow).not.toBeNull();
      expect(workflow?.workflow).toBeDefined();
      expect(workflow?.workflow.steps).toBeDefined();

      // Verify some expected content
      expect(Object.keys(workflow?.workflow.steps || {})).toContain('ecr_aid');
    });

    it('should list available workflows', () => {
      const workflows = listPackagedWorkflows();

      // Verify we can find our test workflow
      expect(workflows).toContain('singlesig-single-user-light.yaml');

      // Verify we got multiple workflows
      expect(workflows.length).toBeGreaterThan(0);

      // Verify they all end in .yaml
      expect(workflows.every((w) => w.endsWith('.yaml'))).toBe(true);
    });

    it('should throw error for non-existent workflow', () => {
      // Test for specific error message
      expect(() => loadPackagedWorkflow('non-existent-workflow')).toThrow(
        'Could not find workflow file: non-existent-workflow.yaml'
      );
    });

    it('should throw error for invalid workflow file', () => {
      // Create a temporary invalid workflow file for testing
      const tempDir = path.join(process.cwd(), 'dist', 'esm', 'workflows');
      const tempFile = path.join(tempDir, 'invalid.yaml');

      // Ensure directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create invalid YAML file
      fs.writeFileSync(tempFile, '{ invalid: yaml: content }');

      try {
        expect(() => loadPackagedWorkflow('invalid')).toThrow(
          /Failed to load workflow file/
        );
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });
  });
});
