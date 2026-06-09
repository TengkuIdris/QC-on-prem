import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { ListRecentFileDto } from "./dto/list-recent-file.dto";
import { pagination } from "src/helpers/pagination.helper";
import { Request } from "express";
import { httpErrors } from "src/exceptions/index.exceptions";

@Injectable()
export class RecentFilesService {
  async getRecentFiles(userId: number, queries: ListRecentFileDto) {
    const { page, size, orderBy, type } = queries;
    const [skip, take, _orderBy] = pagination(page, size, orderBy);

    const include = {};

    if (type) {
      include[type] = true;
    } else {
      include["fishBone"] = true;
      include["fta"] = true;
      include["parento"] = {
        include: {
          beforePareto: true,
          afterPareto: true,
          singlePareto: true,
        },
      };
    }

    const [recentFiles, count] = await Promise.all([
      prismaClient.recentFiles.findMany({
        where: {
          userId,
          OR: [{ fishBoneId: { not: null } }, { parentoId: { not: null } }, { ftaId: { not: null } }],
        },
        include,
        take,
        skip,
        orderBy: { recentlyAt: _orderBy },
      }),
      prismaClient.recentFiles.count({
        where: { userId, OR: [{ fishBoneId: { not: null } }, { parentoId: { not: null } }, { ftaId: { not: null } }] },
      }),
    ]);

    return {
      data: recentFiles,
      totalPage: Math.ceil(count / size),
    };
  }

  async updateRecentFile(userId: number, typeId: number, type: "fishBone" | "parento" | "fta") {
    const recentFile = await prismaClient.recentFiles.findFirst({ where: { [type]: { id: typeId, userId }, userId } });

    try {
      if (recentFile) {
        await prismaClient.recentFiles.update({
          where: {
            id: recentFile.id,
          },
          data: {
            recentlyAt: new Date(),
          },
        });
      } else {
        await prismaClient.recentFiles.create({
          data: {
            userId,
            [`${type}Id`]: typeId,
            recentlyAt: new Date(),
          },
        });
      }
    } catch (error) {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async asyncData(req: Request) {
    const key = req.headers["x-async-data-key"];

    if (key !== process.env.ASYNC_DATA_KEY) {
      throw new Error("Invalid async data key");
    }

    try {
      const [fishBones, parentos, fTAs] = await Promise.all([
        prismaClient.fishBone.findMany(),
        prismaClient.parento.findMany(),
        prismaClient.fTA.findMany(),
      ]);

      const recentFilesData = [];

      for (const fishBone of fishBones) {
        recentFilesData.push({
          userId: fishBone.userId,
          fishBoneId: fishBone.id,
        });
      }

      for (const parento of parentos) {
        recentFilesData.push({
          userId: parento.userId,
          parentoId: parento.id,
        });
      }

      for (const fta of fTAs) {
        recentFilesData.push({
          userId: fta.userId,
          ftaId: fta.id,
        });
      }

      await Promise.all([prismaClient.recentFiles.createMany({ data: recentFilesData })]);

      return true;
    } catch (error) {
      console.error("Error in asyncData:", error);
      throw new Error("Failed to initialize recent files data");
    }
  }
}
