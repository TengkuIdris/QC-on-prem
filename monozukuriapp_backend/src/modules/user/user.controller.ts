import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { User } from "src/decorators/user.decorator";
import { CognitoGuard } from "../auth/jwt-auth.guard";
@Controller("user")
@ApiTags("User")
@ApiBearerAuth()
@UseGuards(CognitoGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  async getMe(@User() user) {
    return await this.userService.getMe(+user.id);
  }
}
