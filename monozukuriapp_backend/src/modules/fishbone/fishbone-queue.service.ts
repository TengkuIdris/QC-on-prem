import { Injectable, Logger, forwardRef, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { prismaClient } from "prisma/client/instance";
import { GoogleApiService } from "../googleApi/googleApi.service";
import { FishBoneService } from "./fishbone.service";
import { Server } from "socket.io";

export type QueueStatus = "pending" | "processing" | "completed" | "error" | "deleted";

export interface QueueItem {
  id: number;
  userId: number;
  assistantId: number;
  status: QueueStatus;
  problem: string;
  createdAt: Date;
  fishboneId?: number;
  error?: string;
}

@Injectable()
export class FishBoneQueueService {
  private readonly logger = new Logger(FishBoneQueueService.name);
  private processingQueue: Map<number, boolean> = new Map();
  private io: Server | null = null;
  private processingLock: Map<number, boolean> = new Map(); // Lock per user

  constructor(
    private readonly googleApiService: GoogleApiService,
    @Inject(forwardRef(() => FishBoneService))
    private readonly fishBoneService: FishBoneService,
  ) {}

  setSocketIO(io: Server) {
    this.io = io;
  }

  async addToQueue(userId: number, assistantId: number, problem: string): Promise<void> {
    this.logger.log(`Adding assistant ${assistantId} to queue for user ${userId}`);

    // Assistant already has pending status from creation, no need to update
    this.emitStatusUpdate(userId, assistantId, "pending");

    // Mark this assistant as queued
    await this.markAsQueued(assistantId);

    // Always try to process next item if not already processing
    const processingCount = await this.getProcessingCount(userId);
    const isLocked = this.processingLock.get(userId) || false;

    this.logger.log(`User ${userId}: processing=${processingCount}, locked=${isLocked}`);

    if (processingCount === 0 && !isLocked) {
      this.logger.log(`Starting to process queue for user ${userId}`);
      // Use setTimeout to ensure this runs after all items are added
      setTimeout(() => {
        this.processNextInQueue(userId);
      }, 100);
    } else {
      this.logger.log(`Assistant ${assistantId} added to queue, waiting for previous items to complete`);
    }
  }

  async addToQueueFromRequest(userId: number, fishboneAssistant: any, ipAddress?: string): Promise<any> {
    this.logger.log(`Adding to queue from request for user ${userId}, problem: "${fishboneAssistant.problem}"`);

    const remainingFishboneAssistantThisMonth = await this.getRemainingFishboneAssistantThisMonth(userId);

    if (remainingFishboneAssistantThisMonth <= 0) {
      this.logger.warn(`User ${userId} has exceeded their monthly Fishbone Assistant limit`);
      throw new HttpException(
        "You have exceeded your monthly Fishbone Assistant limit. Please upgrade your plan.",
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      // Create FishBoneAssistant record with queued: true
      const assistant = await prismaClient.fishBoneAssistant.create({
        data: {
          userId,
          diagrams: fishboneAssistant.diagrams || "{}",
          problem: fishboneAssistant.problem,
          numberNode: fishboneAssistant.numberNode || 0,
          fishBoneId: fishboneAssistant.fishboneId,
          language: fishboneAssistant.lang || "en",
          year: new Date().getFullYear(),
          month: new Date().getMonth(),
          tokens: 0, // Will be calculated after calling AI
          response: JSON.stringify({
            status: "pending",
            queued: true,
            queuedAt: new Date().toISOString(),
          }),
        },
      });

      this.logger.log(
        `Successfully created FishBoneAssistant with ID: ${assistant.id} for problem: "${fishboneAssistant.problem}"`,
      );

      // Add to queue for processing
      await this.addToQueue(userId, assistant.id, fishboneAssistant.problem);

      return assistant;
    } catch (error) {
      this.logger.error(`Failed to add to queue for problem "${fishboneAssistant.problem}":`, error);
      throw error;
    }
  }

  private async processQueueItem(userId: number, assistantId: number, problem: string): Promise<void> {
    this.logger.log(`Processing assistant ${assistantId} for user ${userId}`);

    try {
      // 1. Update status to "processing"
      await this.updateStatus(assistantId, "processing");
      this.emitStatusUpdate(userId, assistantId, "processing");

      // 2. Get assistant info
      const assistant = await prismaClient.fishBoneAssistant.findUnique({
        where: { id: assistantId, userId: userId },
      });

      if (!assistant) {
        throw new Error("Assistant not found");
      }

      // 3. Call AI service
      const aiResponse = await this.googleApiService.getFishboneAssistantResponse(
        assistantId.toString(),
        userId,
        "{}", // Empty diagrams for new generation
        problem,
        "Japanese",
      );

      // 4. Parse AI response to fishbone structure
      const fishboneData = this.parseAIResponseToFishbone(aiResponse.output.diagram, problem);

      // 5. Create fishbone chart
      const fishbone = await this.fishBoneService.createFromAI(userId, assistantId, fishboneData);

      // 6. Update status to "completed"
      await this.updateStatus(assistantId, "completed", fishbone.id);
      this.emitStatusUpdate(userId, assistantId, "completed", fishbone.id);

      this.logger.log(`Successfully processed assistant ${assistantId}, created fishbone ${fishbone.id}`);
    } catch (error) {
      this.logger.error(`Error processing assistant ${assistantId}:`, error);

      // Update status to "error"
      await this.updateStatus(assistantId, "error", undefined, error.message);
      this.emitStatusUpdate(userId, assistantId, "error", undefined, error.message);
    } finally {
      // Release lock
      this.processingLock.delete(userId);

      // Process next item in queue if any
      this.processNextInQueue(userId);
    }
  }

  async processNextInQueue(userId: number): Promise<void> {
    this.logger.log(`Checking for next items in queue for user ${userId}`);

    // Check if already processing
    const isLocked = this.processingLock.get(userId) || false;
    if (isLocked) {
      this.logger.log(`User ${userId} is already processing, skipping`);
      return;
    }

    // Find all assistants for the user
    const allAssistants = await prismaClient.fishBoneAssistant.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // Find the first pending item
    const pendingAssistants = allAssistants.filter((assistant) => {
      try {
        const response = assistant.response ? JSON.parse(assistant.response as string) : {};
        const isPending = response.status === "pending";
        const isQueued = response.queued === true;
        this.logger.log(
          `Assistant ${assistant.id}: status=${response.status}, queued=${response.queued}, isPending=${isPending}, isQueued=${isQueued}`,
        );
        return isPending && isQueued; // Only process queued items
      } catch (error) {
        return false;
      }
    });

    this.logger.log(
      `Found ${pendingAssistants.length} pending assistants:`,
      pendingAssistants.map((a) => ({ id: a.id, problem: a.problem })),
    );

    // Check if any items are currently processing
    const processingCount = await this.getProcessingCount(userId);
    this.logger.log(`Currently processing: ${processingCount} items`);

    // If no items are processing and there are pending items, process the first one
    if (processingCount === 0 && pendingAssistants.length > 0) {
      const nextAssistant = pendingAssistants[0];
      this.logger.log(`Processing next pending item in queue: assistant ${nextAssistant.id}`);
      this.processingLock.set(userId, true);
      this.processQueueItem(userId, nextAssistant.id, String(nextAssistant.problem || ""));
    } else {
      this.logger.log(`No pending items to process or already processing`);
    }
  }

  private async updateStatus(
    assistantId: number,
    status: QueueStatus,
    fishboneId?: number,
    error?: string,
  ): Promise<void> {
    // Get current response to preserve queued flag
    const assistant = await prismaClient.fishBoneAssistant.findUnique({
      where: { id: assistantId },
    });

    if (!assistant) {
      this.logger.error(`Assistant ${assistantId} not found for updateStatus`);
      return;
    }

    let currentResponse: any = {};
    try {
      currentResponse = assistant.response ? JSON.parse(assistant.response as string) : {};
    } catch (error) {
      this.logger.error(`Error parsing response for assistant ${assistantId}:`, error);
    }

    // Preserve queued flag and other existing data
    const updatedResponse = {
      ...currentResponse,
      status,
      fishboneId,
      error,
      updatedAt: new Date().toISOString(),
    };

    await prismaClient.fishBoneAssistant.update({
      where: { id: assistantId },
      data: {
        response: JSON.stringify(updatedResponse),
      },
    });

    this.logger.log(`Updated assistant ${assistantId} status to ${status} with response:`, updatedResponse);
  }

  private async markAsQueued(assistantId: number): Promise<void> {
    // Get current response to preserve queued flag
    const assistant = await prismaClient.fishBoneAssistant.findUnique({
      where: { id: assistantId },
    });

    if (!assistant) {
      this.logger.error(`Assistant ${assistantId} not found for markAsQueued`);
      return;
    }

    let currentResponse: any = {};
    try {
      currentResponse = assistant.response ? JSON.parse(assistant.response as string) : {};
    } catch (error) {
      this.logger.error(`Error parsing response for assistant ${assistantId}:`, error);
    }

    // Preserve queued flag if it exists
    const updatedResponse = {
      ...currentResponse,
      status: "pending",
      queued: true,
      queuedAt: new Date().toISOString(),
    };

    await prismaClient.fishBoneAssistant.update({
      where: { id: assistantId },
      data: {
        response: JSON.stringify(updatedResponse),
      },
    });

    this.logger.log(`Marked assistant ${assistantId} as queued with response:`, updatedResponse);
  }

  private emitStatusUpdate(
    userId: number,
    assistantId: number,
    status: QueueStatus,
    fishboneId?: number,
    error?: string,
  ): void {
    if (this.io) {
      this.io.to(`fishbone_status_${userId}`).emit("fishbone_status_update", {
        assistantId,
        status,
        fishboneId,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private parseAIResponseToFishbone(aiResponse: string, problem: string): any {
    try {
      const parsed = JSON.parse(aiResponse);
      // Ensure it has the correct structure
      if (Array.isArray(parsed)) {
        return {
          name: problem,
          level: 0,
          children: parsed,
        };
      }

      return parsed;
    } catch (error) {
      this.logger.error("Error parsing AI response:", error);
      throw new Error("Invalid AI response format");
    }
  }

  private async getRemainingFishboneAssistantThisMonth(userId: number) {
    const [planUser, countFishboneAssistantThisMonth] = await Promise.all([
      prismaClient.plan.findFirst({
        where: {
          userPlans: {
            some: {
              isActive: true,
              userId,
            },
          },
          isActive: true,
        },
      }),
      prismaClient.fishBoneAssistant.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
    ]);

    const remainingFishboneAssistantThisMonth = planUser
      ? planUser.api_call_limit - countFishboneAssistantThisMonth
      : 0;

    return remainingFishboneAssistantThisMonth;
  }

  async getQueueStatus(userId: number): Promise<{ data: QueueItem[]; remainingFishboneAssistantThisMonth: number }> {
    this.logger.log(`Getting queue status for user ${userId}`);

    const [remainingFishboneAssistantThisMonth, assistants] = await Promise.all([
      this.getRemainingFishboneAssistantThisMonth(userId),
      prismaClient.fishBoneAssistant.findMany({
        where: { userId },
      }),
    ]);

    this.logger.log(`Found ${assistants.length} total assistants for user ${userId}`);

    const queueItems = assistants
      .map((assistant) => {
        let response: any = {};
        try {
          response = assistant.response ? JSON.parse(assistant.response as string) : {};
        } catch (error) {
          this.logger.error(`Error parsing response for assistant ${assistant.id}:`, error);
          response = {};
        }

        const item = {
          id: assistant.id,
          userId: assistant.userId,
          assistantId: assistant.id,
          status: response.status || "pending",
          problem: String(assistant.problem || ""),
          createdAt: assistant.createdAt,
          fishboneId: response.fishboneId,
          error: response.error,
          queued: response.queued || false,
        };

        this.logger.log(
          `Assistant ${assistant.id}: status=${item.status}, queued=${item.queued}, problem="${item.problem}"`,
        );
        return item;
      })
      .filter((item) => {
        // Only return items that were added to queue (queued: true)
        const isQueued = item.queued === true;
        const isValidStatus = ["pending", "processing", "completed", "error"].includes(item.status);
        this.logger.log(
          `Filtering item ${item.id}: status=${item.status}, queued=${item.queued}, isValidStatus=${isValidStatus}, isQueued=${isQueued}`,
        );
        return isQueued && isValidStatus && item.status !== "completed";
      });

    this.logger.log(`Returning ${queueItems.length} items for user ${userId}`);

    // Debug: Log all items before filtering
    const allItems = assistants.map((assistant) => {
      let response: any = {};
      try {
        response = assistant.response ? JSON.parse(assistant.response as string) : {};
      } catch (error) {
        response = {};
      }
      return {
        id: assistant.id,
        problem: String(assistant.problem || ""),
        status: response.status || "pending",
        queued: response.queued || false,
        response: assistant.response,
      };
    });
    this.logger.log(`All items before filtering:`, allItems);

    return { data: queueItems, remainingFishboneAssistantThisMonth };
  }

  async processPendingItems(userId: number): Promise<{ processed: number; errors: string[] }> {
    this.logger.log(`Processing pending items for user ${userId}`);

    // Check if already processing
    const isLocked = this.processingLock.get(userId) || false;
    if (isLocked) {
      this.logger.log(`User ${userId} is already processing, skipping`);
      return { processed: 0, errors: [] };
    }

    const allAssistants = await prismaClient.fishBoneAssistant.findMany({
      where: { userId },
    });

    this.logger.log(`Found ${allAssistants.length} total assistants for user ${userId}`);

    const pendingAssistants = allAssistants.filter((assistant) => {
      try {
        const response = assistant.response ? JSON.parse(assistant.response as string) : {};
        const isPending = response.status === "pending";
        const isQueued = response.queued === true;
        this.logger.log(
          `Assistant ${assistant.id}: status = ${response.status}, queued = ${response.queued}, isPending = ${isPending}, isQueued = ${isQueued}`,
        );
        return isPending && isQueued; // Only process queued items
      } catch (error) {
        this.logger.log(`Assistant ${assistant.id}: parsing failed, skipping`);
        return false; // Skip if parsing fails
      }
    });

    this.logger.log(`Found ${pendingAssistants.length} pending queued assistants`);

    const errors: string[] = [];
    let processed = 0;

    // Only process the first pending item to ensure sequential processing
    if (pendingAssistants.length > 0) {
      const firstAssistant = pendingAssistants[0];
      try {
        this.logger.log(`Processing first pending assistant ${firstAssistant.id}`);
        await this.processQueueItem(userId, firstAssistant.id, String(firstAssistant.problem || ""));
        processed++;
        this.logger.log(`Successfully processed assistant ${firstAssistant.id}`);
      } catch (error: any) {
        this.logger.error(`Error processing assistant ${firstAssistant.id}:`, error);
        errors.push(`Assistant ${firstAssistant.id}: ${error.message}`);
      }
    }

    this.logger.log(`Processed ${processed} items, errors: ${errors.length}`);
    return { processed, errors };
  }

  async retrySpecificItem(userId: number, assistantId: number): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Retrying specific item ${assistantId} for user ${userId}`);

    try {
      // Check if item exists
      const assistant = await prismaClient.fishBoneAssistant.findUnique({
        where: { id: assistantId, userId: userId },
      });

      if (!assistant) {
        throw new Error("Assistant not found");
      }

      // Reset status to pending and add to queue
      await this.updateStatus(assistantId, "pending");
      this.emitStatusUpdate(userId, assistantId, "pending");

      // Add to queue for processing
      await this.addToQueue(userId, assistantId, String(assistant.problem || ""));

      this.logger.log(`Successfully retried assistant ${assistantId}`);
      return { success: true, message: `Successfully retried assistant ${assistantId}` };
    } catch (error: any) {
      this.logger.error(`Error retrying assistant ${assistantId}:`, error);
      // Update status to error if retry fails
      await this.updateStatus(assistantId, "error", undefined, error.message);
      this.emitStatusUpdate(userId, assistantId, "error", undefined, error.message);
      return { success: false, message: error.message };
    }
  }

  async isProcessing(assistantId: number): Promise<boolean> {
    const assistant = await prismaClient.fishBoneAssistant.findUnique({
      where: { id: assistantId },
    });

    if (!assistant) return false;

    try {
      const response = assistant.response ? JSON.parse(assistant.response as string) : {};
      return response.status === "processing";
    } catch (error) {
      return false;
    }
  }

  async getProcessingCount(userId: number): Promise<number> {
    const allAssistants = await prismaClient.fishBoneAssistant.findMany({
      where: { userId },
    });

    const processingCount = allAssistants.filter((assistant) => {
      try {
        const response = assistant.response ? JSON.parse(assistant.response as string) : {};
        return response.status === "processing";
      } catch (error) {
        return false;
      }
    }).length;

    this.logger.log(`User ${userId}: found ${processingCount} items with processing status`);
    return processingCount;
  }

  /**
   * Cancel a specific queue item by assistantId and userId
   */
  async cancelQueue(userId: number, assistantId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Remove processing lock so no new items are processed for this user if this item is processing
      this.processingLock.delete(userId);

      // Find the assistant item
      const assistant = await prismaClient.fishBoneAssistant.findUnique({
        where: { id: assistantId },
      });
      if (!assistant || assistant.userId !== userId) {
        throw new HttpException("Queue item not found or does not belong to user", HttpStatus.NOT_FOUND);
      }
      // Update status to 'deleted' in response
      let currentResponse: any = {};
      try {
        currentResponse = assistant.response ? JSON.parse(assistant.response as string) : {};
      } catch (error) {
        this.logger.error(`Error parsing response for assistant ${assistantId}:`, error);
      }
      const updatedResponse = {
        ...currentResponse,
        status: "deleted",
        updatedAt: new Date().toISOString(),
      };
      await prismaClient.fishBoneAssistant.update({
        where: { id: assistantId },
        data: {
          response: JSON.stringify(updatedResponse),
        },
      });
      this.emitStatusUpdate(userId, assistantId, "deleted");
      return { success: true, message: `Cancelled queue item ${assistantId}` };
    } catch (error: any) {
      this.logger.error(`Error when cancelQueue assistantId=${assistantId}:`, error);
      throw new HttpException(error?.message || "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
