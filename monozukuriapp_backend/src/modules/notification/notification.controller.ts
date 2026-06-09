import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { User } from "src/decorators/user.decorator";
import { CognitoGuard } from "../auth/jwt-auth.guard";

@Controller("notifications")
@ApiTags("notifications")
@UseGuards(CognitoGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Query() query: any, @User() user: any) {
    const userId = user?.id ? Number(user.id) : undefined;
    return this.notificationService.findAll(query, userId);
  }

  @Get("unread-count")
  async getUnreadCount(@User() user: any) {
    const userId = Number(user?.id);
    if (!userId) return { count: 0 };
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Get(":id")
  async findById(@Param("id") id: string, @User() user: any) {
    const userId = user?.id ? Number(user.id) : undefined;
    return this.notificationService.findById(Number(id), userId);
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @User() user: any) {
    const userId = Number(user?.id);
    return this.notificationService.markAsRead(Number(id), userId);
  }
}
