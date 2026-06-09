import { Module } from "@nestjs/common";
import { RelatedDocumentsController } from "./related-document.controller";
import { RelatedDocumentsService } from "./related-document.service";
import { AwsS3Service } from "../s3/s3.service";

@Module({
  controllers: [RelatedDocumentsController],
  providers: [RelatedDocumentsService, AwsS3Service],
})
export class RelatedDocumentsModule {}
