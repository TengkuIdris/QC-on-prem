import { ServiceBase } from "./baseService";

export interface AddFeedback {
  feedback: string;
}

class FeedbackService extends ServiceBase {
  private readonly baseUrl = "/feedback";

  async addFeedback(data: AddFeedback) {
    return await this.post(`${this.baseUrl}`, data);
  }
}

const feedbackService = new FeedbackService();

export default feedbackService;
