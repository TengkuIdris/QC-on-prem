import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CreateParetoDto } from "./dto/createPareto.dto";
import { prismaClient } from "prisma/client/instance";
import { httpErrors } from "src/exceptions/index.exceptions";
import { ActionEnum, ParetoMode } from "@prisma/client";
import { ListParetoDto } from "./dto/listPareto.dto";
import { pagination } from "src/helpers/pagination.helper";
import { UpdateUserInforDto } from "./dto/updateUser.dto";
import { UpdateParetoDto } from "./dto/updatePareto.dto";
import { AwsS3Service } from "../s3/s3.service";
import { UserService } from "../user/user.service";
import { RecentFilesService } from "../recent-files/recent-files.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
@Injectable()
export class ParetoService {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly userService: UserService,
    private readonly recentFilesService: RecentFilesService,
    private readonly auditLogService: AuditLogService,
  ) {}
  async createPareto(
    id: number,
    { single, after, before, mode, name }: CreateParetoDto,
    {
      afterImage,
      beforeImage,
      singleImage,
    }: { afterImage?: Express.Multer.File[]; beforeImage?: Express.Multer.File[]; singleImage?: Express.Multer.File[] },
    ipAddress?: string,
  ) {
    if (
      (mode === ParetoMode.SINGLE && (!single || after || before || !singleImage || afterImage || beforeImage)) ||
      (mode === ParetoMode.AFTER && (!after || single || before || !afterImage || singleImage || beforeImage)) ||
      (mode === ParetoMode.BEFORE && (after || single || !before || afterImage || singleImage || !beforeImage)) ||
      (mode === ParetoMode.COMPARE && (!before || !after || single || !beforeImage || !afterImage || singleImage))
    ) {
      throw new HttpException(httpErrors.MODE_AND_DATA_HAVE_DIFFERENT, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const limitedRecords = await this.userService.getLimitedRecordsInPlan(id, ActionEnum.PARENTO_SAVE_TYPED_DATA);
    const currentRecordsOfUser = await prismaClient.parento.count({
      where: { userId: id },
    });

    if (limitedRecords != null && currentRecordsOfUser >= limitedRecords) {
      throw new HttpException(httpErrors.LIMITED_RECORDS_OF_USER, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let afterImageLink: string, beforeImageLink: string, singleImageLink: string;
    try {
      if (singleImage && singleImage[0]) {
        singleImageLink = await this.awsS3Service.uploadFile(singleImage[0]);
      }
      if (beforeImage && beforeImage[0]) {
        beforeImageLink = await this.awsS3Service.uploadFile(beforeImage[0]);
      }
      if (afterImage && afterImage[0]) {
        afterImageLink = await this.awsS3Service.uploadFile(afterImage[0]);
      }
    } catch {
      throw new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const data: any = {
        mode,
        user: {
          connect: {
            id,
          },
        },
        name,
      };
      const include: any = {};
      if (single) {
        const { records: recordsSingle, ...resSingle } = single;
        data.singlePareto = {
          create: {
            ...resSingle,
            image: singleImageLink,
            size: singleImage[0].size,
            paretoItem: {
              create: recordsSingle,
            },
          },
        };
        include.singlePareto = {
          include: {
            paretoItem: true,
          },
        };
      }
      if (after) {
        const { records: recordsAfter, ...resAfter } = after;
        data.afterPareto = {
          create: {
            ...resAfter,
            image: afterImageLink,
            size: afterImage[0].size,
            paretoItem: {
              create: recordsAfter,
            },
          },
        };
        include.afterPareto = {
          include: {
            paretoItem: true,
          },
        };
      }
      if (before) {
        const { records: recordsBefore, ...resBefore } = before;
        data.beforePareto = {
          create: {
            ...resBefore,
            image: beforeImageLink,
            size: beforeImage[0].size,
            paretoItem: {
              create: recordsBefore,
            },
          },
        };
        include.beforePareto = {
          include: {
            paretoItem: true,
          },
        };
      }
      const result = await prismaClient.parento.create({
        data,
        include,
      });
      // Log audit
      await this.auditLogService.logAction({
        userId: id,
        actionType: "PARETO_CREATED",
        resourceType: "pareto",
        resourceId: result.id,
        newValues: {
          mode,
          name,
        },
        metadata: { source: "pareto_service", action: "create" },
        ipAddress,
      });
      // Add to recent files
      await this.recentFilesService.updateRecentFile(id, result.id, "parento");
      return result;
    } catch (e) {
      console.log(e);

      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_CREATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getParetoList(userId, queries: ListParetoDto) {
    const { page, size, orderBy } = queries;
    const [skip, take, _orderBy] = pagination(page, size, orderBy);
    const paretos = await prismaClient.parento.findMany({
      where: { userId },
      take,
      skip,
      orderBy: {
        createdAt: _orderBy,
      },
      include: {
        beforePareto: true,
        afterPareto: true,
        singlePareto: true,
      },
    });
    const count = await prismaClient.parento.count({
      where: { userId },
    });
    return {
      data: paretos,
      totalPage: Math.ceil(count / size),
    };
  }

  async getParetoById(id: number) {
    const pareto = await prismaClient.parento.findUnique({
      where: { id },
      include: {
        afterPareto: {
          include: {
            paretoItem: true,
          },
        },
        singlePareto: {
          include: {
            paretoItem: true,
          },
        },
        beforePareto: {
          include: {
            paretoItem: true,
          },
        },
        user: true,
      },
    });
    return pareto;
  }

  async getParetoDetail(userId: number, id: number) {
    const pareto = await this.getParetoById(id);

    if (!pareto) {
      throw new HttpException(httpErrors.PARETO_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (pareto.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    try {
      await this.recentFilesService.updateRecentFile(userId, id, "parento");
    } catch (error) {
      throw error;
    }

    return pareto;
  }

  async updateUserInfo(userId: number, id: number, { from, end }: UpdateUserInforDto) {
    const pareto = await prismaClient.parento.findFirst({
      where: {
        userId,
        OR: [{ singleId: id }, { afterId: id }, { beforeId: id }],
      },
    });

    if (!pareto) {
      throw new HttpException(httpErrors.PARETO_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (pareto.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }
    try {
      return await prismaClient.paretoRecord.update({
        where: { id },
        data: { startTime: new Date(from), endTime: new Date(end), createdTime: new Date() },
      });
    } catch {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deletePareto(userId: number, id: number, ipAddress?: string) {
    const pareto = await prismaClient.parento.findUnique({
      where: { id },
    });

    if (!pareto) {
      throw new HttpException(httpErrors.PARETO_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (pareto.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    try {
      await prismaClient.$transaction(async (tx) => {
        if (pareto.singleId) await tx.paretoRecord.delete({ where: { id: pareto.singleId } });
        if (pareto.afterId) await tx.paretoRecord.delete({ where: { id: pareto.afterId } });
        if (pareto.beforeId) await tx.paretoRecord.delete({ where: { id: pareto.beforeId } });
        await tx.parento.delete({
          where: { id },
        });
      });
      // Thêm log audit sau khi xóa thành công
      let actionType = "";
      if (pareto.mode === "SINGLE") actionType = "PARETO_DELETED_SINGLE";
      else if (pareto.mode === "COMPARE") actionType = "PARETO_DELETED_COMPARE";
      else actionType = "PARETO_DELETED";
      await this.auditLogService.logAction({
        userId: userId,
        actionType,
        resourceType: "pareto",
        resourceId: id,
        oldValues: {
          name: pareto.name,
          mode: pareto.mode,
        },
        metadata: { source: "pareto_service", action: "delete" },
        ipAddress,
      });
    } catch {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_DELETING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async updatePareto(
    userId: number,
    id: number,
    { single, after, before, name }: UpdateParetoDto,
    {
      afterImage,
      beforeImage,
      singleImage,
    }: { afterImage?: Express.Multer.File[]; beforeImage?: Express.Multer.File[]; singleImage?: Express.Multer.File[] },
    ipAddress?: string,
  ) {
    const pareto = await prismaClient.parento.findUnique({
      where: { id },
    });

    if (!pareto) {
      throw new HttpException(httpErrors.PARETO_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (pareto.userId !== userId) {
      throw new HttpException(httpErrors.YOU_DONT_HAVE_PERMISSION_TO_PERFORM_THIS_ACTION, HttpStatus.FORBIDDEN);
    }

    if (
      (pareto.mode === ParetoMode.SINGLE &&
        (!single || after || before || !singleImage || afterImage || beforeImage)) ||
      (pareto.mode === ParetoMode.AFTER && (!after || single || before || !afterImage || singleImage || beforeImage)) ||
      (pareto.mode === ParetoMode.BEFORE &&
        (after || single || !before || afterImage || singleImage || !beforeImage)) ||
      (pareto.mode === ParetoMode.COMPARE &&
        (!before || !after || single || !beforeImage || !afterImage || singleImage))
    ) {
      throw new HttpException(httpErrors.MODE_AND_DATA_HAVE_DIFFERENT, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    let afterImageLink: string, beforeImageLink: string, singleImageLink: string;
    try {
      if (singleImage && singleImage[0]) {
        singleImageLink = await this.awsS3Service.uploadFile(singleImage[0]);
      }
      if (beforeImage && beforeImage[0]) {
        beforeImageLink = await this.awsS3Service.uploadFile(beforeImage[0]);
      }
      if (afterImage && afterImage[0]) {
        afterImageLink = await this.awsS3Service.uploadFile(afterImage[0]);
      }
    } catch {
      throw new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    try {
      await prismaClient.$transaction(async (tx) => {
        await tx.parento.update({
          where: { id },
          data: {
            name,
            updatedAt: new Date(),
          },
        });
        if (pareto.mode === ParetoMode.SINGLE) {
          await tx.paretoItem.deleteMany({ where: { paretoId: pareto.singleId } });
          const { records: recordsSingle, ...resSingle } = single;
          await tx.paretoRecord.update({
            where: { id: pareto.singleId },
            data: {
              ...resSingle,
              image: singleImageLink,
              size: singleImage[0].size,
              updatedAt: new Date(),
              paretoItem: {
                create: recordsSingle,
              },
            },
          });
        }
        if (pareto.mode === ParetoMode.AFTER || pareto.mode === ParetoMode.COMPARE) {
          await tx.paretoItem.deleteMany({ where: { paretoId: pareto.afterId } });
          const { records: recordsAfter, ...resAfter } = after;
          await tx.paretoRecord.update({
            where: { id: pareto.afterId },
            data: {
              ...resAfter,
              image: afterImageLink,
              size: afterImage[0].size,
              updatedAt: new Date(),
              paretoItem: {
                create: recordsAfter,
              },
            },
          });
        }
        if (pareto.mode === ParetoMode.BEFORE || pareto.mode === ParetoMode.COMPARE) {
          await tx.paretoItem.deleteMany({ where: { paretoId: pareto.beforeId } });
          const { records: recordsBefore, ...resBefore } = before;
          await tx.paretoRecord.update({
            where: { id: pareto.beforeId },
            data: {
              ...resBefore,
              image: beforeImageLink,
              size: beforeImage[0].size,
              updatedAt: new Date(),
              paretoItem: {
                create: recordsBefore,
              },
            },
          });
        }
      });
      const updatedPareto = await this.getParetoById(id);
      // Log audit
      await this.auditLogService.logAction({
        userId: userId,
        actionType: "PARETO_UPDATED",
        resourceType: "pareto",
        resourceId: id,
        oldValues: {
          name: pareto.name,
          mode: pareto.mode,
        },
        newValues: {
          name,
        },
        metadata: { source: "pareto_service", action: "update" },
        ipAddress,
      });
      return updatedPareto;
    } catch {
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  injectFontFace(html: string, fontKey: string): string {
    const fontMap: Record<string, { family: string; path?: string }> = {
      Arial: {
        family: "Arial",
        path: "public/fonts/Arial.ttf",
      },
      Meiryo: {
        family: "Meiryo",
        path: "public/fonts/Meiryo.ttf",
      },
      MSMINCHO: {
        family: "MS Mincho",
        path: "public/fonts/MSMINCHO.ttf",
      },
      Georgia: {
        family: "Georgia",
        path: "public/fonts/Georgia.ttf",
      },
      Tahoma: {
        family: "Tahoma",
        path: "public/fonts/Tahoma.ttf",
      },
      "Courier-New": {
        family: "Courier New",
        path: "public/fonts/Courier-New.ttf",
      },
      "Trebuchet-MS": {
        family: "Trebuchet MS",
        path: "public/fonts/Trebuchet-MS.ttf",
      },
      "MS Gothic": {
        family: "MS Gothic",
        path: "public/fonts/MS Gothic.ttf",
      },
      TimesNewRoman: {
        family: "Times New Roman",
        path: "public/fonts/TimesNewRoman.ttf",
      },
      Verdana: {
        family: "Verdana",
        path: "public/fonts/Verdana.ttf",
      },
      Helvetica: {
        family: "Helvetica",
        path: "public/fonts/Helvetica.ttf",
      },
      Calibri: {
        family: "Calibri",
        path: "public/fonts/Calibri.ttf",
      },
      "NotoSansJP-Regular": {
        family: "Noto Sans JP",
        path: "public/fonts/NotoSansJP-Regular.ttf",
      },
    };

    const font = fontMap[fontKey];
    if (!font) return html;

    let fontFace = "";

    if (font.path) {
      const fontPath = path.join(process.cwd(), font.path);
      const base64Font = fs.readFileSync(fontPath).toString("base64");

      fontFace = `
        @font-face {
          font-family: '${font.family}';
          src: url(data:font/ttf;base64,${base64Font}) format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8" />
      <style>
      ${fontFace}

      html, body {
        font-family: '${font.family}', Arial, sans-serif;
      }

      /* override SVG inline style */
      svg text {
        font-family: '${font.family}' !important;
      }
      </style>
      </head>
      <body>
      ${html}
      </body>
      </html>
      `;
  }

  async renderHtmlToImage(html: string, fontName?: string, imageFormat: "png" | "jpeg" = "png"): Promise<Buffer> {
    if (!fontName) {
      const fontFamilyMatch = html.match(/font-family:\s*['"]?([^'";,]+)['"]?/i);
      if (fontFamilyMatch) {
        fontName = fontFamilyMatch[1].trim();
      }
    }

    const htmlWithFont = fontName ? this.injectFontFace(html, fontName) : html;
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1000 });

    await page.setContent(htmlWithFont, {
      waitUntil: "domcontentloaded",
    });

    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    await page.evaluate(() => {
      console.log(
        "Loaded fonts:",
        Array.from(document.fonts).map((f) => ({
          family: f.family,
          status: f.status,
        })),
      );
    });

    const element = await page.$("body");
    const screenshot = await element.screenshot({ type: imageFormat });

    await browser.close();
    return Buffer.from(screenshot);
  }
}
