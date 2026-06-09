import { Module } from "@nestjs/common";
import { RecentFilesController } from "./recent-files.controller";
import { RecentFilesService } from "./recent-files.service";

@Module({
  controllers: [RecentFilesController],
  providers: [RecentFilesService],
  exports: [RecentFilesService],
})
export class RecentFilesModule {}
