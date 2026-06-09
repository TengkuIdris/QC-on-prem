import { Module } from "@nestjs/common";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { AwsSESModule } from "../ses/ses.module";

@Module({ imports: [AwsSESModule], controllers: [FeedbackController], providers: [FeedbackService] })
export class FeedbackModule {}
