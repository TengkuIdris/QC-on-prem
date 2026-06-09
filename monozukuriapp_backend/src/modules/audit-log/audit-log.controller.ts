import { Body, Controller, Post } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { prismaClient } from "prisma/client/instance";
import { ClientIP } from "src/decorators/client-ip.decorator";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@Controller("audit-log")
@ApiTags("Audit Log")
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post("password-changed")
  async passwordChanged(
    @Body() body: { userId?: number | string; email?: string; metadata?: any },
    @ClientIP() ipAddress: string,
  ) {
    console.log("[AuditLogController] Received password-changed request:", body);

    let userId = body.userId;
    let email = body.email;

    // Nếu không có email trong body, thử lấy từ metadata
    if (!email && body.metadata?.email) {
      email = body.metadata.email;
      console.log("[AuditLogController] Found email in metadata:", email);
    }

    if (!userId && email) {
      // Tìm userId theo email nếu không truyền userId
      console.log("[AuditLogController] Looking up user by email:", email);
      const user = await prismaClient.user.findFirst({ where: { email: email } });
      userId = user?.id;
      console.log("[AuditLogController] Found user:", user);
    }
    if (!userId) {
      console.log("[AuditLogController] User not found for email:", email);
      return { success: false, message: "User not found" };
    }

    console.log("[AuditLogController] Calling auditLogService.logAction with userId:", userId);
    await this.auditLogService.logAction({
      userId,
      actionType: "USER_PASSWORD_CHANGED",
      resourceType: "user",
      resourceId: userId,
      metadata: { source: "frontend", ...body.metadata },
      ipAddress,
    });
    console.log("[AuditLogController] Audit log created successfully");
    return { success: true };
  }
}
