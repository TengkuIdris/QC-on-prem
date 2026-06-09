import { Module } from "@nestjs/common";
import { ImplementationStepsService } from "./implementation-steps.service";
import { ImplementationStepsController } from "./implementation-steps.controller";
import { AwsS3Service } from "../s3/s3.service";

@Module({
  controllers: [ImplementationStepsController],
  providers: [ImplementationStepsService, AwsS3Service],
})
export class ImplementationStepsModule {}
