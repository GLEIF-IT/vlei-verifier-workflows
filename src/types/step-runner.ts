export abstract class StepRunner {
  type = '';
  public abstract run(stepName: string, step: any, config: any): Promise<any>;
}
