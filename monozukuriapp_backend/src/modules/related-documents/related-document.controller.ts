import { Controller, Delete, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { RelatedDocumentsService } from "./related-document.service";
import { CognitoGuard } from "../auth/jwt-auth.guard";
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiOperation } from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { FileValidationPipe } from "src/pipes/file-size-validation.pipe";

@Controller("related-documents")
@ApiTags("Related Documents")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class RelatedDocumentsController {
  constructor(private readonly relatedDocumentsService: RelatedDocumentsService) {}

  @Post("")
  @ApiOperation({ summary: "Upload multiple related documents" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("files", 10))
  async createRelatedDocuments(@UploadedFiles(new FileValidationPipe()) files: Express.Multer.File[]) {
    return await this.relatedDocumentsService.createRelatedDocuments(files);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a related document" })
  async deleteRelatedDocument(@Param("id") id: number) {
    return await this.relatedDocumentsService.deleteRelatedDocuments(+id);
  }
}
