import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { AddFeedbackDto } from "./dto/add-feedback.dto";
import { prismaClient } from "prisma/client/instance";
import { httpErrors } from "src/exceptions/index.exceptions";
import { FeedbackItem } from "src/types/interfaces/feedback";
import { AwsSESService } from "../ses/ses.service";

@Injectable()
export class FeedbackService {
  constructor(private readonly awsSESService: AwsSESService) {}

  async addFeedback(user: User, payload: AddFeedbackDto) {
    try {
      const feedbackExists = await prismaClient.feedback.findFirst({
        where: { userId: user.id },
      });

      let savedFeedback;

      if (!feedbackExists) {
        const newFeedbacks = [{ content: payload.feedback, createdAt: new Date() }];
        savedFeedback = await prismaClient.feedback.create({
          data: {
            userId: user.id,
            feedbacks: newFeedbacks,
          },
        });
      } else {
        const currentFeedback = feedbackExists.feedbacks;
        if (!Array.isArray(currentFeedback)) {
          throw new HttpException(httpErrors.ADD_FEEDBACK_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        (currentFeedback as unknown as FeedbackItem[]).push({ content: payload.feedback, createdAt: new Date() });

        savedFeedback = await prismaClient.feedback.update({
          where: { id: feedbackExists.id },
          data: { feedbacks: currentFeedback },
        });
      }

      const mailResponse = await this.awsSESService.sendImprovementRequestMail(user, payload.feedback);
      const mailSent = mailResponse === "SUCCESS";

      if (!mailSent) {
        console.error(`[FeedbackService] Feedback saved but improvement request email failed for user ${user.id}`);
      }

      return {
        feedback: savedFeedback,
        mailSent,
      };
    } catch (error) {
      console.error("[FeedbackService] Error adding feedback:", error);
      throw new HttpException(httpErrors.ADD_FEEDBACK_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
