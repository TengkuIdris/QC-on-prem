import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { Prisma, Notification } from "@prisma/client";
import { prismaClient } from "prisma/client/instance";
import { SocketService } from "../socket/socket.service";

@Injectable()
export class NotificationService {
  constructor(private readonly socketService: SocketService) {}

  async findAll(query: { page?: number; pageSize?: number; status?: string }, userId?: number) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const status = query.status || "published";

    const where: { status?: string } = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prismaClient.notification.findMany({
        where,
        orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
        skip,
        take: pageSize,
      }),
      prismaClient.notification.count({ where }),
    ]);

    // For each item, check if user has read it
    let itemsWithRead: (Notification & { isRead: boolean })[];
    if (userId) {
      const readIds = await prismaClient.notificationRead.findMany({
        where: {
          user_id: userId,
          notification_id: { in: items.map((i) => i.id) },
        },
        select: { notification_id: true },
      });
      const readSet = new Set(readIds.map((r) => r.notification_id));
      itemsWithRead = items.map((item) => ({
        ...item,
        isRead: readSet.has(item.id),
      }));
    } else {
      itemsWithRead = items.map((item) => ({ ...item, isRead: false }));
    }

    return {
      data: itemsWithRead,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: number, userId?: number) {
    const notification = await prismaClient.notification.findFirst({
      where: { id, status: "published" },
    });
    if (!notification) {
      throw new HttpException("Notification not found", HttpStatus.NOT_FOUND);
    }

    let isRead = false;
    if (userId) {
      const read = await prismaClient.notificationRead.findUnique({
        where: {
          notification_id_user_id: { notification_id: id, user_id: userId },
        },
      });
      isRead = !!read;
    }

    return { ...notification, isRead };
  }

  async getUnreadCount(userId: number): Promise<number> {
    const publishedCount = await prismaClient.notification.count({
      where: { status: "published" },
    });
    const reads = await prismaClient.notificationRead.findMany({
      where: { user_id: userId },
      select: { notification_id: true },
    });
    const readCount = new Set(reads.map((r) => r.notification_id)).size;
    return Math.max(0, publishedCount - readCount);
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await prismaClient.notification.findFirst({
      where: { id: notificationId, status: "published" },
    });
    if (!notification) {
      throw new HttpException("Notification not found", HttpStatus.NOT_FOUND);
    }

    await prismaClient.notificationRead.upsert({
      where: {
        notification_id_user_id: { notification_id: notificationId, user_id: userId },
      },
      create: { notification_id: notificationId, user_id: userId },
      update: {},
    });

    return { success: true };
  }

  async broadcast(notificationId: number) {
    const notification = await prismaClient.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new HttpException("Notification not found", HttpStatus.NOT_FOUND);
    }

    const payload = {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      tag: notification.tag,
      createdAt: notification.created_at,
    };

    const io = this.socketService.getIO();
    if (io) {
      io.emit("notification", payload);
    }

    return { success: true };
  }
}
