/**
 * Base class for all workflow step runners
 */
export abstract class StepRunner {
  type: string = '';

  /**
   * Run the step
   * @param stepName Name of the step
   * @param step Step configuration
   * @param config Configuration object
   * @param workflow Optional workflow object
   * @returns Result of running the step
   */
  public abstract run(stepName: string, step: any, config: any): Promise<any>;
}
