import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Patch,
  Delete,
} from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { ApiTags, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { FishBoneService } from "./fishbone.service";
import { FishBoneQueueService, QueueItem } from "./fishbone-queue.service";
import { FishboneDto } from "./dto/createFishBone.dto";
import { ListFishBoneDto } from "./dto/listFishBone.dto";
import { AssistantFishBoneDto, FishBoneAssistantReviewDto } from "./dto/assistantFishBone.dto";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { LicenseGuard } from "../auth/license.guard";
import { Action } from "src/decorators/action.decorator";
import { ActionEnum } from "@prisma/client";
import { User } from "src/decorators/user.decorator";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { imageFileInterceptor } from "src/interceptor/imageFile.interceptor";
import { SVGFileInterceptor } from "src/interceptor/svgFile.interceptor";
import { ClientIP } from "src/decorators/client-ip.decorator";

@Controller("fishbone")
@ApiTags("fishbone")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class FishBoneController {
  constructor(
    private readonly fishboneService: FishBoneService,
    private readonly fishBoneQueueService: FishBoneQueueService,
  ) {}

  @Post("create")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "thumbnail", maxCount: 1 }], {
      fileFilter: imageFileInterceptor,
    }),
    SVGFileInterceptor,
  )
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.FISHBONE_SAVE_TYPED_DATA)
  async createFishbone(
    @User() user,
    @Body() createFishboneDto: FishboneDto,
    @UploadedFiles()
    { thumbnail }: { thumbnail?: Express.Multer.File[] },
    @ClientIP() ipAddress: string,
  ) {
    return await this.fishboneService.create(+user.id, createFishboneDto, { thumbnail }, ipAddress);
  }

  @Get("")
  async getListFishBone(@User() user, @Query() queries: ListFishBoneDto) {
    return await this.fishboneService.getFishBoneList(+user.id, queries);
  }

  @Post("fishbone-assistant")
  @Action(ActionEnum.FISHBONE_AI_TEST)
  async getFishBoneAssistantOpenAPI(
    @User() user,
    @Body() fishboneAssistant: AssistantFishBoneDto,
    @ClientIP() ipAddress: string,
  ) {
    // Create assistant record and call AI API immediately (original logic)
    const assistant = await this.fishboneService.getFishBoneAssistantOpenAPI(+user.id, fishboneAssistant, ipAddress);

    return assistant;
  }

  @Post("add-to-queue")
  @Action(ActionEnum.FISHBONE_AI_TEST)
  async addToQueue(@User() user, @Body() fishboneAssistant: AssistantFishBoneDto, @ClientIP() ipAddress: string) {
    // Add to queue (không gọi AI ngay lập tức)
    const result = await this.fishBoneQueueService.addToQueueFromRequest(+user.id, fishboneAssistant, ipAddress);

    return result;
  }

  @Get("queue-status")
  async getQueueStatus(@User() user): Promise<{ data: QueueItem[]; remainingFishboneAssistantThisMonth: number }> {
    return await this.fishBoneQueueService.getQueueStatus(+user.id);
  }

  @Post("process-pending")
  async processPendingItems(@User() user) {
    return await this.fishBoneQueueService.processPendingItems(+user.id);
  }

  @Post("trigger-processing")
  async triggerProcessing(@User() user) {
    // Trigger processing of next item in queue
    await this.fishBoneQueueService.processNextInQueue(+user.id);
    return { success: true, message: "Processing triggered" };
  }

  @Post("cancel-queue")
  async cancelQueue(@User() user, @Body("assistantId") assistantId: number) {
    return await this.fishBoneQueueService.cancelQueue(+user.id, assistantId);
  }

  @Get("debug-all-assistants")
  async debugAllAssistants(@User() user) {
    // Debug endpoint to see all FishBoneAssistant records
    const allAssistants = await prismaClient.fishBoneAssistant.findMany({
      where: { userId: +user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return allAssistants.map((assistant) => {
      let response: any = {};
      try {
        response = assistant.response ? JSON.parse(assistant.response as string) : {};
      } catch (error) {
        response = {};
      }
      return {
        id: assistant.id,
        problem: assistant.problem,
        status: response.status || "pending",
        queued: response.queued || false,
        createdAt: assistant.createdAt,
        response: assistant.response,
      };
    });
  }

  @Post("retry-item/:assistantId")
  async retrySpecificItem(@User() user, @Param("assistantId") assistantId: number) {
    return await this.fishBoneQueueService.retrySpecificItem(+user.id, +assistantId);
  }

  @Get("ai-generated")
  async getAIGeneratedFishbones(@User() user, @Query() queries: ListFishBoneDto) {
    return await this.fishboneService.getAIGeneratedFishBones(+user.id, queries);
  }

  @Get("by-source/:source")
  async getFishbonesBySource(
    @User() user,
    @Param("source") source: "MANUAL" | "AI_GENERATED",
    @Query() queries: ListFishBoneDto,
  ) {
    return await this.fishboneService.getFishBoneListBySource(+user.id, source, queries);
  }

  @Get(":id")
  async getFishBoneDetail(@User() user, @Param("id") id: number) {
    return await this.fishboneService.getFishBoneDetail(+user.id, id);
  }

  @Patch("update/:id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "thumbnail", maxCount: 1 }], {
      fileFilter: imageFileInterceptor,
    }),
    SVGFileInterceptor,
  )
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.FISHBONE_SAVE_TYPED_DATA)
  async updateFishbone(
    @User() user,
    @Param("id") id: number,
    @Body() updateFishboneDto: FishboneDto,
    @UploadedFiles()
    { thumbnail }: { thumbnail?: Express.Multer.File[] },
    @ClientIP() ipAddress: string,
  ) {
    return await this.fishboneService.updateFishBone(+user.id, id, updateFishboneDto, { thumbnail }, ipAddress);
  }

  @Delete(":id")
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.FISHBONE_SAVE_TYPED_DATA)
  async deleteFishbone(@User() user, @Param("id") id: number, @ClientIP() ipAddress: string) {
    return await this.fishboneService.deleteFishBone(+user.id, id, ipAddress);
  }

  @Post("review-assistant")
  async createFishBoneAssistantReview(@User() user, @Body() fishBoneAssistantReviewDto: FishBoneAssistantReviewDto) {
    return await this.fishboneService.createFishBoneAssistantReview(+user.id, fishBoneAssistantReviewDto);
  }
}
