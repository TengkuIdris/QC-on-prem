import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { NotificationService } from "./notification.service";
import { InternalApiGuard } from "./internal-api.guard";
import { Public } from "src/decorators/public.decorator";

@Controller("internal/notifications")
@ApiTags("internal")
@Public()
@UseGuards(InternalApiGuard)
export class InternalNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post("broadcast")
  async broadcast(@Body() body: { notificationId: number }) {
    return this.notificationService.broadcast(body.notificationId);
  }
}
