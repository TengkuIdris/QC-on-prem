import { Controller, Get, UseGuards } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CognitoGuard } from "../auth/jwt-auth.guard";

@Controller("categories")
@ApiTags("Categories")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get("/")
  async getCategories() {
    return await this.categoryService.getCategories();
  }
}
