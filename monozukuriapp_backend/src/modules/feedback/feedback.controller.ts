import { User as UserPrisma } from "@prisma/client";
import { AddFeedbackDto } from "./dto/add-feedback.dto";
import { FeedbackService } from "./feedback.service";
import { User } from "src/decorators/user.decorator";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@Controller("feedback")
@UseGuards(CognitoGuard)
@ApiTags("feedback")
@ApiBearerAuth()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async addFeedback(@User() user: UserPrisma, @Body() addFeedbackDto: AddFeedbackDto) {
    return this.feedbackService.addFeedback(user, addFeedbackDto);
  }
}
