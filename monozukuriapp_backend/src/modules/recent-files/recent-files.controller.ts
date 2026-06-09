import { Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiTags } from "@nestjs/swagger";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { ListRecentFileDto } from "./dto/list-recent-file.dto";
import { RecentFilesService } from "./recent-files.service";
import { User } from "src/decorators/user.decorator";
import { Request } from "express";

@Controller("recent-files")
@ApiTags("Recent Files")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class RecentFilesController {
  constructor(private readonly recentFilesService: RecentFilesService) {}

  @Get("")
  async getRecentFiles(@User() user, @Query() queries: ListRecentFileDto) {
    return await this.recentFilesService.getRecentFiles(user.id, queries);
  }

  @Post("async-data")
  @ApiHeader({ name: "x-async-data-key", required: true, description: "Key to access async data" })
  async asyncData(@Req() req: Request) {
    return await this.recentFilesService.asyncData(req);
  }
}
