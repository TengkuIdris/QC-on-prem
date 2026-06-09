import { Module } from "@nestjs/common";
import { FTAService } from "./fta.service";
import { FTAController } from "./fta.controller";
import { AwsS3Service } from "../s3/s3.service";
import { UserService } from "../user/user.service";
import { RecentFilesModule } from "../recent-files/recent-files.module";

@Module({
  imports: [RecentFilesModule],
  providers: [FTAService, AwsS3Service, UserService],
  controllers: [FTAController],
})
export class FTAModule {}
