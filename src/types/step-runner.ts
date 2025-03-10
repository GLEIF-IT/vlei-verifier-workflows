import { Workflow } from './workflow';

export abstract class StepRunner {
  type: string = '';
  public abstract run(stepName: string, step: any, config: any): Promise<any>;
}
