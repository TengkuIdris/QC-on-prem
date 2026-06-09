import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Query,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FTADto } from "./dto/createFta.dto";
import { FTAService } from "./fta.service";
import { User } from "src/decorators/user.decorator";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { ListFTADto } from "./dto/listFta.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { imageFileInterceptor } from "src/interceptor/imageFile.interceptor";
import { LicenseGuard } from "../auth/license.guard";
import { Action } from "src/decorators/action.decorator";
import { ActionEnum } from "@prisma/client";
import { SVGFileInterceptor } from "src/interceptor/svgFile.interceptor";

@Controller("fta")
@ApiTags("fta")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class FTAController {
  constructor(private readonly ftaService: FTAService) {}

  @Post("create")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "thumbnail", maxCount: 1 }], {
      fileFilter: imageFileInterceptor,
    }),
    SVGFileInterceptor,
  )
  @UseGuards(LicenseGuard)
  @Action(ActionEnum.FTA_SAVE_TYPED_DATA)
  async createFTA(
    @User() user,
    @Body() createFTA: FTADto,
    @UploadedFiles()
    { thumbnail }: { thumbnail?: Express.Multer.File[] },
  ) {
    return await this.ftaService.create(+user.id, createFTA, { thumbnail });
  }

  @Get("")
  async getListFTA(@User() user, @Query() queries: ListFTADto) {
    return await this.ftaService.getFTAList(+user.id, queries);
  }

  @Get(":id")
  async getFTADetail(@User() user, @Param("id") id: number) {
    return await this.ftaService.getFTADetail(+user.id, +id);
  }

  @Patch("update/:id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "thumbnail", maxCount: 1 }], {
      fileFilter: imageFileInterceptor,
    }),
    SVGFileInterceptor,
  )
  async updateFTA(
    @User() user,
    @Param("id") id: number,
    @Body() updateFTA: FTADto,
    @UploadedFiles()
    { thumbnail }: { thumbnail?: Express.Multer.File[] },
  ) {
    return await this.ftaService.updateFTA(+user.id, +id, updateFTA, { thumbnail });
  }

  @Delete("delete/:id")
  async delete(@User() user, @Param("id") id: number) {
    return await this.ftaService.deleteFTA(+user.id, +id);
  }
}
