import { Module, forwardRef } from "@nestjs/common";
import { FishBoneController } from "./fishbone.controller";
import { FishBoneService } from "./fishbone.service";
import { FishBoneQueueService } from "./fishbone-queue.service";
import { AwsS3Service } from "../s3/s3.service";
import { UserService } from "../user/user.service";
import { GoogleApiModule } from "../googleApi/googleApi.modute";
import { RecentFilesModule } from "../recent-files/recent-files.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [RecentFilesModule, AuditLogModule, GoogleApiModule],
  controllers: [FishBoneController],
  providers: [
    FishBoneService, 
    FishBoneQueueService, 
    AwsS3Service, 
    UserService
  ],
  exports: [FishBoneService, FishBoneQueueService],
})
export class FishBoneModule {}
