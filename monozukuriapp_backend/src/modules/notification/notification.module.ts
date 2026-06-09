import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { InternalNotificationController } from "./internal-notification.controller";
import { SocketModule } from "../socket/socket.module";

@Module({
  imports: [SocketModule],
  controllers: [NotificationController, InternalNotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
