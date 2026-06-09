import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Res,
} from "@nestjs/common";
import { ParetoService } from "./pareto.service";
import { User } from "src/decorators/user.decorator";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { CreateParetoDto } from "./dto/createPareto.dto";
import { ListParetoDto } from "./dto/listPareto.dto";
import { UpdateUserInforDto } from "./dto/updateUser.dto";
import { UpdateParetoDto } from "./dto/updatePareto.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { imageFileInterceptor } from "src/interceptor/imageFile.interceptor";
import { LicenseGuard } from "../auth/license.guard";
import { Action } from "src/decorators/action.decorator";
import { ActionEnum } from "@prisma/client";
import { SVGFileInterceptor } from "src/interceptor/svgFile.interceptor";
import { ClientIP } from "src/decorators/client-ip.decorator";
import { Response } from "express";
import { ApiBody } from "@nestjs/swagger";

@Controller("pareto")
@ApiTags("pareto")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class ParetoController {
  constructor(private readonly paretoService: ParetoService) {}

  @Post("create-pareto")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "afterImage", maxCount: 1 },
        { name: "beforeImage", maxCount: 1 },
        { name: "singleImage", maxCount: 1 },
      ],
      {
        fileFilter: imageFileInterceptor,
      },
    ),
    SVGFileInterceptor,
  )
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.PARENTO_SAVE_TYPED_DATA)
  async createPareto(
    @User() user,
    @Body() createParentoDto: CreateParetoDto,
    @UploadedFiles()
    {
      afterImage,
      beforeImage,
      singleImage,
    }: { afterImage?: Express.Multer.File[]; beforeImage?: Express.Multer.File[]; singleImage?: Express.Multer.File[] },
    @ClientIP() ipAddress: string,
  ) {
    return await this.paretoService.createPareto(
      +user.id,
      createParentoDto,
      { afterImage, beforeImage, singleImage },
      ipAddress,
    );
  }

  @Get("")
  async getListPareto(@User() user, @Query() queries: ListParetoDto) {
    return await this.paretoService.getParetoList(+user.id, queries);
  }
  @Get(":id")
  async getImprovementDetail(@User() user, @Param("id") id: number) {
    return await this.paretoService.getParetoDetail(+user.id, +id);
  }

  @Patch("update-user/:id")
  async updateUserInfo(@User() user, @Param("id") id: number, @Body() updateUserInforDto: UpdateUserInforDto) {
    return await this.paretoService.updateUserInfo(+user.id, +id, updateUserInforDto);
  }

  @Delete("delete/:id")
  async delete(@User() user, @Param("id") id: number, @ClientIP() ipAddress: string) {
    return await this.paretoService.deletePareto(+user.id, +id, ipAddress);
  }

  @Put("update/:id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "afterImage", maxCount: 1 },
        { name: "beforeImage", maxCount: 1 },
        { name: "singleImage", maxCount: 1 },
      ],
      {
        fileFilter: imageFileInterceptor,
      },
    ),
    SVGFileInterceptor,
  )
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.PARENTO_SAVE_TYPED_DATA)
  async updatePareto(
    @User() user,
    @Param("id") id: number,
    @Body() updateParetoDto: UpdateParetoDto,
    @UploadedFiles()
    {
      afterImage,
      beforeImage,
      singleImage,
    }: { afterImage?: Express.Multer.File[]; beforeImage?: Express.Multer.File[]; singleImage?: Express.Multer.File[] },
    @ClientIP() ipAddress: string,
  ) {
    return await this.paretoService.updatePareto(
      +user.id,
      +id,
      updateParetoDto,
      {
        afterImage,
        beforeImage,
        singleImage,
      },
      ipAddress,
    );
  }
  @Post("render-image")
  @ApiBody({
    schema: {
      properties: { html: { type: "string" }, format: { type: "string", enum: ["png", "jpeg"], default: "png" } },
    },
  })
  async renderImage(@Body("html") html: string, @Body("format") format: string, @Res() res: Response) {
    const imageFormat = ["png", "jpeg"].includes((format || "").toLowerCase()) ? format.toLowerCase() : "png";
    const buffer = await this.paretoService.renderHtmlToImage(html, undefined, imageFormat as "png" | "jpeg");
    res.set({
      "Content-Type": `image/${imageFormat}`,
      "Content-Disposition": `attachment; filename=pareto.${imageFormat}`,
    });
    res.end(buffer);
  }
}
