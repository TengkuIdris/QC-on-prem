import { Module } from "@nestjs/common";
import { AwsSESController } from "./ses.controller";
import { AwsSESService } from "./ses.service";

@Module({
  controllers: [AwsSESController],
  providers: [AwsSESService],
  exports: [AwsSESService],
})
export class AwsSESModule {}
