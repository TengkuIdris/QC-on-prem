import { Module } from "@nestjs/common";
import { KaizendhubController } from "./kaizenhub.controller";
import { KaizenhubService } from "./kaizenhub.service";
import { AwsS3Service } from "../s3/s3.service";

@Module({
  controllers: [KaizendhubController],
  providers: [KaizenhubService, AwsS3Service],
  exports: [KaizenhubService],
})
export class KaizendhubModule {}
