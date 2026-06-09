import { HttpException, HttpStatus, Injectable, forwardRef, Inject } from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { FishboneDto } from "./dto/createFishBone.dto";
import { AwsS3Service } from "../s3/s3.service";
import { GoogleApiService } from "../googleApi/googleApi.service";
import { UserService } from "../user/user.service";
import { RecentFilesService } from "../recent-files/recent-files.service";
import { AssistantFishBoneDto, FishBoneAssistantReviewDto } from "./dto/assistantFishBone.dto";
import { ActionEnum } from "@prisma/client";
import { httpErrors } from "src/exceptions/index.exceptions";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FishBoneQueueService } from "./fishbone-queue.service";
import { ListFishBoneDto } from "./dto/listFishBone.dto";
import { pagination } from "src/helpers/pagination.helper";

@Injectable()
export class FishBoneService {
  constructor(
    private readonly googleApiService: GoogleApiService,
    private readonly awsS3Service: AwsS3Service,
    private readonly userService: UserService,
    private readonly recentFilesService: RecentFilesService,
    private readonly auditLogService: AuditLogService,
    @Inject(forwardRef(() => FishBoneQueueService))
    private readonly fishBoneQueueService: FishBoneQueueService,
  ) {}
  async create(
    id: number,
    createFishboneDto: FishboneDto,
    { thumbnail }: { thumbnail?: Express.Multer.File[] },
    ipAddress?: string,
  ) {
    const limitedRecords = await this.userService.getLimitedRecordsInPlan(id, ActionEnum.FISHBONE_SAVE_TYPED_DATA);
    const currentRecordsOfUser = await prismaClient.fishBone.count({
      where: { userId: id },
    });

    if (limitedRecords != null && currentRecordsOfUser >= limitedRecords) {
      throw new HttpException(httpErrors.LIMITED_RECORDS_OF_USER, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let thumbnailLink: string;

    try {
      if (thumbnail && thumbnail[0]) {
        thumbnailLink = await this.awsS3Service.uploadFile(thumbnail[0]);
      }
    } catch {
      throw new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const fishBone = await prismaClient.fishBone.create({
      data: {
        userId: id,
        parameters: createFishboneDto.parameters,
        fontFamily: createFishboneDto.fontFamily,
        image: thumbnailLink,
        size: thumbnail[0].size,
        rootFontSize: createFishboneDto.rootFontSize,
        firstLevelFontSize: createFishboneDto.firstLevelFontSize,
        otherLevelFontSize: createFishboneDto.otherLevelFontSize,
        source: createFishboneDto.source || "MANUAL",
        aiAssistantId: createFishboneDto.aiAssistantId,
      } as any,
    });

    // Extract filename from parameters for audit log
    const parameters = createFishboneDto.parameters as any;
    const fileName = JSON.parse(parameters)?.name || "フィッシュボーン図";
    // Audit log
    await this.auditLogService.logAction({
      userId: id,
      actionType: "FISHBONE_CREATED",
      resourceType: "fishbone",
      resourceId: fishBone.id,
      newValues: {
        ...createFishboneDto,
        fileName: fileName,
      },
      metadata: { source: "fishbone_service", action: "create" },
      ipAddress,
    });
    // Add to recent files
    await this.recentFilesService.updateRecentFile(id, fishBone.id, "fishBone");

    return fishBone;
  }

  // Add new method for AI-generated fishbone
  async createFromAI(userId: number, aiAssistantId: number, fishboneData: any, ipAddress?: string) {
    const aiAssistant = await prismaClient.fishBoneAssistant.findUnique({
      where: { id: aiAssistantId, userId },
    });

    if (!aiAssistant) {
      throw new HttpException(httpErrors.FISHBONE_ASSISTANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // Create fishbone from AI response
    const fishBone = await prismaClient.fishBone.create({
      data: {
        userId,
        parameters: fishboneData,
        fontFamily: "MSGothic", // Default font for AI-generated
        image: "", // Will be generated later
        size: 0,
        rootFontSize: 16, // Default root font size
        firstLevelFontSize: 14, // Default first level font size
        otherLevelFontSize: 12, // Default other level font size
        source: "AI_GENERATED" as any, // Use string literal with type assertion
        aiAssistantId: aiAssistantId,
      } as any, // Type assertion for the entire data object
    });

    // Update FishBoneAssistant with fishBoneId
    await prismaClient.fishBoneAssistant.update({
      where: { id: aiAssistantId },
      data: { fishBoneId: fishBone.id },
    });
    // Add to recent files
    await this.recentFilesService.updateRecentFile(userId, fishBone.id, "fishBone");

    return fishBone;
  }

  async getFishBoneDetail(userId: number, id: number) {
    const fishBone = await this.getFishBoneById(id);

    if (!fishBone) {
      throw new HttpException(httpErrors.FISHBONE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (fishBone.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    try {
      await this.recentFilesService.updateRecentFile(userId, id, "fishBone");
    } catch (error) {
      throw error;
    }

    return fishBone;
  }

  async getFishBoneById(id: number) {
    const fishBone = await prismaClient.fishBone.findFirst({
      where: { id: Number(id) },
      include: {
        user: true,
      },
    });
    return fishBone;
  }

  async getFishBoneList(userId, queries: ListFishBoneDto) {
    const { page, size, orderBy } = queries;
    const [skip, take, _orderBy] = pagination(page, size, orderBy);
    const fishBones = await prismaClient.fishBone.findMany({
      where: { userId },
      take,
      skip,
      orderBy: { createdAt: _orderBy },
    });
    const count = await prismaClient.fishBone.count({
      where: { userId },
    });
    return {
      data: fishBones,
      totalPage: Math.ceil(count / size),
    };
  }

  async getAIGeneratedFishBones(userId: number, queries: ListFishBoneDto) {
    const { page = 1, size = 10, orderBy = "desc" } = queries;
    const skip = (page - 1) * size;

    // Get all AI-generated fishbones
    const allAIFishbones = await prismaClient.fishBone.findMany({
      where: {
        userId,
        source: "AI_GENERATED" as any,
      } as any,
      include: {
        aiAssistant: true,
      } as any,
      orderBy: { createdAt: orderBy as "asc" | "desc" },
    });

    // Filter only those created from queue (aiAssistant has queued: true)
    const queuedFishbones = allAIFishbones.filter((fishbone: any) => {
      if (!fishbone.aiAssistant) return false;

      try {
        const response = fishbone.aiAssistant.response ? JSON.parse(fishbone.aiAssistant.response as string) : {};
        return response.queued === true;
      } catch (error) {
        return false;
      }
    });

    // Apply pagination
    const totalCount = queuedFishbones.length;
    const startIndex = skip;
    const endIndex = skip + size;
    const paginatedFishbones = queuedFishbones.slice(startIndex, endIndex);

    return {
      data: paginatedFishbones,
      metadata: {
        total: totalCount,
        page,
        size,
        totalPages: Math.ceil(totalCount / size),
      },
    };
  }

  async getFishBoneListBySource(userId: number, source: "MANUAL" | "AI_GENERATED", queries: ListFishBoneDto) {
    const { page, size, orderBy } = queries;
    const [skip, take, _orderBy] = pagination(page, size, orderBy);
    const fishBones = await prismaClient.fishBone.findMany({
      where: {
        userId,
        source: source as any,
      } as any,
      include:
        source === "AI_GENERATED"
          ? ({
              aiAssistant: {
                select: {
                  id: true,
                  problem: true,
                  createdAt: true,
                },
              },
            } as any)
          : undefined,
      take,
      skip,
      orderBy: { createdAt: _orderBy },
    });
    const count = await prismaClient.fishBone.count({
      where: {
        userId,
        source: source as any,
      } as any,
    });
    return {
      data: fishBones,
      totalPage: Math.ceil(count / size),
    };
  }

  async updateFishBone(
    userId: number,
    id: number,
    updateFishBoneDto: FishboneDto,
    { thumbnail }: { thumbnail?: Express.Multer.File[] },
    ipAddress?: string,
  ) {
    let thumbnailLink: string;

    try {
      if (thumbnail && thumbnail[0]) {
        thumbnailLink = await this.awsS3Service.uploadFile(thumbnail[0]);
      }
    } catch {
      throw new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const fishBone = await prismaClient.fishBone.findFirst({
      where: {
        id: Number(id),
      },
    });

    if (!fishBone) {
      throw new HttpException(httpErrors.FISHBONE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (fishBone.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }
    try {
      const previousImageLink = fishBone.image;
      const fishBoneUpdated = await prismaClient.fishBone.update({
        where: {
          id: Number(id),
        },
        data: {
          parameters: updateFishBoneDto.parameters,
          updatedAt: new Date(),
          image: thumbnailLink,
          size: thumbnail[0].size,
          fontFamily: updateFishBoneDto.fontFamily,
          rootFontSize: updateFishBoneDto.rootFontSize,
          firstLevelFontSize: updateFishBoneDto.firstLevelFontSize,
          otherLevelFontSize: updateFishBoneDto.otherLevelFontSize,
        },
      });

      if (previousImageLink) {
        await this.awsS3Service.deleteFile(previousImageLink);
      }

      // Extract filename for audit log
      const oldParameters = fishBone.parameters as any;
      const newParameters = updateFishBoneDto.parameters as any;
      const oldFileName =
        (typeof oldParameters === "string" ? JSON.parse(oldParameters)?.name : oldParameters?.name) ||
        "フィッシュボーン図";
      const newFileName = JSON.parse(newParameters)?.name || "フィッシュボーン図";
      // Audit log
      await this.auditLogService.logAction({
        userId: userId,
        actionType: "FISHBONE_UPDATED",
        resourceType: "fishbone",
        resourceId: id,
        oldValues: {
          ...fishBone,
          fileName: oldFileName,
        },
        newValues: {
          ...updateFishBoneDto,
          fileName: newFileName,
        },
        metadata: { source: "fishbone_service", action: "update" },
        ipAddress,
      });

      return fishBoneUpdated;
    } catch (error) {
      console.error("Error updating fishbone:", error);
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFishBone(userId: number, id: number, ipAddress?: string) {
    const fishBone = await prismaClient.fishBone.findUnique({
      where: { id: Number(id) },
    });

    if (!fishBone) {
      throw new HttpException(httpErrors.FISHBONE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (fishBone.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    try {
      await prismaClient.$transaction(async (tx) => {
        await tx.recentFiles.deleteMany({
          where: { fishBoneId: Number(id) },
        });

        await tx.fishBoneAssistant.deleteMany({
          where: { fishBoneId: Number(id) },
        });

        await tx.fishBone.delete({
          where: { id: Number(id) },
        });

        if (fishBone.image) {
          const s3DeleteResult = await this.awsS3Service.deleteFile(fishBone.image);

          if (!s3DeleteResult.success) {
            throw new HttpException(httpErrors.DELETE_FILE_FROM_S3_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
          }
        }
      });

      // Extract filename for audit log
      const parameters = fishBone.parameters as any;
      const fileName = parameters?.name || "フィッシュボーン図";

      // Add audit log after successful deletion
      try {
        await this.auditLogService.logAction({
          userId: userId,
          actionType: "FISHBONE_DELETED",
          resourceType: "fishbone",
          resourceId: id,
          oldValues: {
            ...fishBone,
            fileName: fileName,
          },
          metadata: { source: "fishbone_service", action: "delete" },
          ipAddress,
        });
      } catch (auditError) {
        console.error("Error creating audit log:", auditError);
        // Don't throw error because fishbone has been successfully deleted
      }
    } catch (error) {
      console.error("Error deleting fishbone:", error);
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_DELETING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFishBoneAssistantOpenAPI(userId: number, fishboneAssistant: AssistantFishBoneDto, ipAddress?: string) {
    const limitedRecords = await this.userService.getLimitedRecordsInPlan(userId, ActionEnum.FISHBONE_AI_TEST);

    const monthNow = new Date().getMonth();
    const yearNow = new Date().getFullYear();

    const sumTokens = await prismaClient.fishBoneAssistant.aggregate({
      where: { userId, month: monthNow, year: yearNow },
      _sum: {
        tokens: true,
      },
    });

    const recentTokens = await this.googleApiService.countTokensGeminiAPIFromText(fishboneAssistant.problem);

    if (limitedRecords != null && sumTokens._sum.tokens + recentTokens > limitedRecords) {
      throw new HttpException(httpErrors.LIMITED_QUANTITY_OF_TOKENS_ARE_REACHED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (fishboneAssistant.fishboneId) {
      const fishBone = await prismaClient.fishBone.findUnique({
        where: { id: fishboneAssistant.fishboneId },
      });
      if (!fishBone) {
        throw new HttpException(httpErrors.FISHBONE_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
    }

    let queryAssistantId: number;
    try {
      const queryAssistant = await prismaClient.fishBoneAssistant.create({
        data: {
          userId,
          diagrams: fishboneAssistant.diagrams,
          problem: fishboneAssistant.problem,
          numberNode: fishboneAssistant.numberNode,
          fishBoneId: fishboneAssistant.fishboneId,
          language: fishboneAssistant.lang || "en",
          year: new Date().getFullYear(),
          month: new Date().getMonth(),
          tokens: recentTokens,
        },
      });
      queryAssistantId = queryAssistant.id;

      // Audit log for AI request
      await this.auditLogService.logAction({
        userId,
        actionType: "FISHBONE_AI_REQUESTED",
        resourceType: "fishbone_assistant",
        resourceId: queryAssistantId,
        newValues: { ...fishboneAssistant },
        metadata: { source: "fishbone_service", action: "ai_request" },
        ipAddress,
      });
    } catch (error) {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_CREATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Call AI API immediately (original logic)
    const fishboneAssistantResponse = await this.googleApiService.getFishboneAssistantResponse(
      queryAssistantId.toString(),
      userId,
      fishboneAssistant.diagrams,
      fishboneAssistant.problem,
      fishboneAssistant.lang,
    );

    try {
      const fishBoneAssistantResponse = await prismaClient.fishBoneAssistant.update({
        where: { id: queryAssistantId },
        data: {
          response: fishboneAssistantResponse.output.diagram,
        },
      });
      return fishBoneAssistantResponse;
    } catch (error) {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_CREATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createFishBoneAssistantReview(userId: number, fishBoneAssistantReviewDto: FishBoneAssistantReviewDto) {
    const fishBoneAssistant = await prismaClient.fishBoneAssistant.findUnique({
      where: { id: fishBoneAssistantReviewDto.assistantId },
    });

    if (!fishBoneAssistant || fishBoneAssistant.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    try {
      const fishBoneAssistantReview = await prismaClient.fishBoneAssistantReview.create({
        data: {
          userId,
          fishBoneAssistantId: fishBoneAssistantReviewDto.assistantId,
          review: fishBoneAssistantReviewDto.review,
          reason: fishBoneAssistantReviewDto.reason,
        },
      });

      return fishBoneAssistantReview;
    } catch {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_CREATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
