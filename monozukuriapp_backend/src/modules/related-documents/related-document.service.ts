import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { httpErrors } from "src/exceptions/index.exceptions";
import { AwsS3Service } from "../s3/s3.service";
import { prismaClient } from "prisma/client/instance";
import { STATUS_SUCCESS } from "src/constants/response.constant";
import { toUtf8 } from "src/helpers/toUtf8.helper";

@Injectable()
export class RelatedDocumentsService {
  constructor(private readonly awsS3Service: AwsS3Service) {}
  private readonly logger = new Logger(RelatedDocumentsService.name);

  async createRelatedDocument(file: Express.Multer.File) {
    let url: string;
    try {
      url = await this.awsS3Service.uploadFile(file);
      if (!url) {
        throw new Error("Failed to get upload URL");
      }
    } catch (error) {
      this.logger.error("Error uploading file to S3", error);
      throw new HttpException(httpErrors.CAN_NOT_UPLOAD_IMAGE, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      return await prismaClient.relatedDocuments.create({
        data: {
          name: toUtf8(file.originalname),
          url,
          size: file.size,
        },
      });
    } catch (error) {
      this.logger.error("Error creating related document", error);
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_RELATED_DOCUMENTS,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createRelatedDocuments(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new HttpException(httpErrors.INVALID_FILE, HttpStatus.BAD_REQUEST);
    }

    try {
      const createPromises = [];
      for (const file of files) {
        createPromises.push(this.createRelatedDocument(file));
      }

      return await Promise.all(createPromises);
    } catch (error) {
      this.logger.error("Error creating related documents", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_CREATE_RELATED_DOCUMENTS,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteRelatedDocuments(id: number) {
    try {
      const document = await prismaClient.relatedDocuments.findUnique({
        where: { id },
      });

      if (!document) {
        throw new HttpException(httpErrors.DELETE_RELATED_DOCUMENT_FAILED, HttpStatus.NOT_FOUND);
      }

      await prismaClient.relatedDocuments.delete({
        where: { id },
      });

      if (document.url) {
        try {
          await this.awsS3Service.deleteFile(document.url);
        } catch (error) {
          this.logger.warn("Failed to delete file from S3", error);
        }
      }

      return STATUS_SUCCESS;
    } catch (error) {
      this.logger.error("Error deleting related document", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_DELETING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
