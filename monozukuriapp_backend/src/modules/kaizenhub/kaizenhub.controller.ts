import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { KaizenhubService } from "./kaizenhub.service";
import { User } from "src/decorators/user.decorator";
import { CreateImprovementDto } from "./dto/createImprovement.dto";
import { ListImprovementDto } from "./dto/improvementList.dto";
import { ActionEnum, User as UserPrisma } from "@prisma/client";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { UpdateUserInfoDto } from "./dto/updateUserInfo.dto";
import { LicenseGuard } from "../auth/license.guard";
import { Action } from "src/decorators/action.decorator";
import { ToggleImprovementActionDto } from "./dto/toggleImprovementActionDto.dto";
import { CreateReviewDto } from "./dto/createReview.dto";
import { ListImprovementSearchDto } from "./dto/listImprovementSearch.dto";
import { ListReviewDto } from "./dto/listReview.dto";
import { ExistImprovementDto } from "./dto/existImprovement.dto";

@Controller("kaizenhub")
@ApiTags("kaizenhub")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class KaizendhubController {
  constructor(private readonly kaizenhubService: KaizenhubService) {}

  @Post("validate-title")
  async validateTitle(@Body() payload: ExistImprovementDto) {
    await this.kaizenhubService.validateTitle(payload.title, payload.id);
  }

  @Post("create-improvement")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_POST_AND_VIEW)
  async createImprovement(@User() user, @Body() createImprovementDto: CreateImprovementDto) {
    return await this.kaizenhubService.createImprovement(+user.id, createImprovementDto);
  }

  @Get("label-list")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async getLabelList() {
    return await this.kaizenhubService.getLabelList();
  }

  @Get("improvement-list")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async getImprovementList(@Query() queries: ListImprovementSearchDto) {
    return await this.kaizenhubService.getImprovementList(queries);
  }

  @Get("my-improvement")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_POST_AND_VIEW)
  async getMyImprovement(@Query() queries: ListImprovementDto, @User() user: UserPrisma) {
    return await this.kaizenhubService.getMyImprovement(queries, user.id);
  }

  @Get("improvement-detail/:id")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_POST_AND_VIEW)
  @ApiQuery({ name: "isViewed", required: false, type: Boolean })
  async getImprovementDetail(@Param("id") id: number, @User() user: UserPrisma, @Query("isViewed") isViewed = false) {
    return await this.kaizenhubService.getImprovementDetail(+id, user.id, isViewed);
  }

  @Put("update-improvement/:id")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_POST_AND_VIEW)
  async updateImprovement(@User() user, @Param("id") id: number, @Body() updateImprovementDto: CreateImprovementDto) {
    return await this.kaizenhubService.updateImprovement(+user.id, id, updateImprovementDto);
  }

  @Get("my-favorite-improvements")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async getFavoriteImprovements(@User() user, @Query() queries: ListImprovementDto) {
    return await this.kaizenhubService.getFavoriteImprovements(+user.id, queries);
  }

  @Put("update-user-info")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_POST_AND_VIEW)
  async updateUserInfo(@User() user, @Body() updateUserInfoDto: UpdateUserInfoDto) {
    return await this.kaizenhubService.updateUserInfo(+user.id, updateUserInfoDto);
  }

  @Get("improvements-by-week")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async getImprovementsByWeek(@Query() queries: ListImprovementDto) {
    return await this.kaizenhubService.getImprovementsByWeek(queries);
  }

  @Get("largest-liked-improvements-by-week")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  @ApiQuery({ name: "size", required: true, type: Number, description: "Number of improvements to retrieve" })
  async getLargestLikedImprovementsByWeek(@Query() queries: { size: number }) {
    return await this.kaizenhubService.getLargestLikedImprovementsByWeek(+queries.size);
  }

  @Post("toggle-like-improvements")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async toggleLikePost(@User() user, @Body() body: ToggleImprovementActionDto) {
    return await this.kaizenhubService.toggleLikeImprovement(+user.id, +body.improvementId);
  }

  @Post("toggle-favorite-improvements")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async toggleFavoriteImprovement(@User() user, @Body() body: ToggleImprovementActionDto) {
    return await this.kaizenhubService.toggleFavoriteImprovement(+user.id, +body.improvementId);
  }

  @Post("create-review")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async createReview(@User() user, @Body() createReviewDto: CreateReviewDto) {
    return await this.kaizenhubService.createReview(+user.id, createReviewDto);
  }

  @Get("review-list/:improvementId")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.KAIZENHUB_MAIN_SCREEN)
  async getReviewListOfImprovement(@Param("improvementId") improvementId: number, @Query() queries: ListReviewDto) {
    return await this.kaizenhubService.getReviewListOfImprovement(+improvementId, queries);
  }

  @Get("user-posts/:userId")
  async getUserPosts(@Param("userId") userId: number, @Query() queries: ListImprovementDto) {
    return await this.kaizenhubService.getUserPosts(+userId, queries);
  }
}
