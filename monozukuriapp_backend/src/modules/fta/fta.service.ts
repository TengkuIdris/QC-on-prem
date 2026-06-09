import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { FTADto } from "./dto/createFta.dto";
import { httpErrors } from "src/exceptions/index.exceptions";
import { pagination } from "src/helpers/pagination.helper";
import { AwsS3Service } from "../s3/s3.service";
import { ActionEnum } from "@prisma/client";
import { UserService } from "../user/user.service";
import { ListFTADto } from "./dto/listFta.dto";
import { RecentFilesService } from "../recent-files/recent-files.service";

@Injectable()
export class FTAService {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly userService: UserService,
    private readonly recentFilesService: RecentFilesService,
  ) {}
  async create(id: number, createFTA: FTADto, { thumbnail }: { thumbnail?: Express.Multer.File[] }) {
    const limitedRecords = await this.userService.getLimitedRecordsInPlan(id, ActionEnum.FTA_SAVE_TYPED_DATA);
    const currentRecordsOfUser = await prismaClient.fTA.count({
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

    const fta = await prismaClient.fTA.create({
      data: {
        userId: id,
        parameters: createFTA.parameters,
        fontFamily: createFTA.fontFamily,
        image: thumbnailLink,
        size: thumbnail[0].size,
      },
    });
    // Add to recent files
    await this.recentFilesService.updateRecentFile(id, fta.id, "fta");
    return fta;
  }

  async getFTADetail(userId: number, id: number) {
    const fta = await this.getFTAById(id);

    if (!fta) {
      throw new HttpException(httpErrors.FTA_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (fta.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    try {
      await this.recentFilesService.updateRecentFile(userId, id, "fta");
    } catch (error) {
      throw error;
    }

    return fta;
  }

  async getFTAById(id: number) {
    const fta = await prismaClient.fTA.findFirst({
      where: { id },
    });
    return fta;
  }

  async getFTAList(userId, queries: ListFTADto) {
    const { page, size, orderBy } = queries;
    const [skip, take, _orderBy] = pagination(page, size, orderBy);
    const ftas = await prismaClient.fTA.findMany({
      where: { userId },
      take,
      skip,
      orderBy: {
        createdAt: _orderBy,
      },
    });
    const count = await prismaClient.fTA.count({
      where: { userId },
    });
    return {
      data: ftas,
      totalPage: Math.ceil(count / size),
    };
  }

  async updateFTA(userId: number, id: number, updateFTA: FTADto, { thumbnail }: { thumbnail?: Express.Multer.File[] }) {
    let thumbnailLink: string;

    try {
      if (thumbnail && thumbnail[0]) {
        thumbnailLink = await this.awsS3Service.uploadFile(thumbnail[0]);
      }
    } catch {
      throw new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const fta = await this.getFTAById(id);

    if (!fta) {
      throw new HttpException(httpErrors.FTA_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (fta.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }
    try {
      const previousImageLink = fta.image;
      const ftaUpdated = await prismaClient.fTA.update({
        where: {
          id,
        },
        data: {
          parameters: updateFTA.parameters,
          updatedAt: new Date(),
          image: thumbnailLink,
          size: thumbnail[0].size,
          fontFamily: updateFTA.fontFamily,
        },
      });

      if (previousImageLink) {
        await this.awsS3Service.deleteFile(previousImageLink);
      }

      return ftaUpdated;
    } catch {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFTA(userId: number, id: number) {
    const fta = await this.getFTAById(id);

    if (!fta) {
      throw new HttpException(httpErrors.FTA_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (fta.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    try {
      await prismaClient.fTA.delete({
        where: {
          id,
        },
      });

      if (fta.image) {
        await this.awsS3Service.deleteFile(fta.image);
      }
    } catch {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_DELETING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
