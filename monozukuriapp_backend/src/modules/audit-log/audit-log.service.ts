import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuditLogData {
  userId?: number | string;
  actionType: string;
  resourceType: string;
  resourceId?: number | string;
  oldValues?: any;
  newValues?: any;
  reason?: string;
  metadata?: any;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  async logAction(auditData: AuditLogData) {
    try {
      console.log("[AuditLogService] Attempting to log action:", auditData);
      const result = await prisma.auditLog.create({
        data: {
          user_id: auditData.userId ? Number(auditData.userId) : undefined,
          action_type: auditData.actionType,
          action_details: {
            resource_type: auditData.resourceType,
            resource_id: auditData.resourceId,
            old_values: auditData.oldValues,
            new_values: auditData.newValues,
            reason: auditData.reason,
            metadata: auditData.metadata,
          },
          ip_address: auditData.ipAddress,
          created_at: new Date(),
        },
      });
      console.log("[AuditLogService] Successfully created audit log:", result);
    } catch (error) {
      // Không throw để không ảnh hưởng logic chính
      // Có thể log ra file nếu cần
      console.error("[AuditLogService] Failed to log action:", error);
      console.error("[AuditLogService] Error details:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
      });
    }
  }
}
