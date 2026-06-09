import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { httpErrors } from "src/exceptions/index.exceptions";

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);
  async getCategories() {
    try {
      return await prismaClient.categories.findMany();
    } catch (error) {
      this.logger.error("Error occurred while fetching categories", error);
      throw new HttpException(httpErrors.CAN_NOT_GET_CATEGORIES, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
