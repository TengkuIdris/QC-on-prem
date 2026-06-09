import { ServiceBase } from "./baseService";

export class ImplementationStepsService extends ServiceBase {
  private readonly baseUrl = "/implementation-steps";

  createStep(data: FormData) {
    return this.post(`${this.baseUrl}`, data);
  }

  deleteStep(id: number) {
    return this.delete(`${this.baseUrl}`, id);
  }

  updateSteps(payload: { id: number; stepNumber: number; title: string; description: string; url?: string }[]) {
    return this.put(`${this.baseUrl}`, { implementationSteps: payload });
  }
}

export const implementationStepsService = new ImplementationStepsService();
