import { ServiceBase } from "./baseService";

export interface Message {
  diagrams: string;
  problem: string;
  numberNode?: number;
  fishBoneId?: number;
  lang?: string;
  source?: string;
}

export interface QueueStatusResponse {
  id: number;
  userId: number;
  assistantId: number;
  status: "pending" | "processing" | "completed" | "error";
  problem: string;
  createdAt: string;
  fishboneId?: number;
  error?: string;
}

class ChatService extends ServiceBase {
  postNewMessage = async (body: Message) => {
    return this.post("/fishbone/fishbone-assistant", body);
  };

  postMessageFromAIToServer = async (body: Omit<Message, "problem">) => {
    return this.post("/fishbone/create-assistant-response", body);
  };

  getListMessage = async (id: number | string, params: any) => {
    return this.get(`/fishbone/fishbone-assistant-response/${id}`, {
      params: {
        size: 10,
        orderBy: "desc",
        ...params,
      },
    });
  };

  // New methods for queue management
  getQueueStatus = async () => {
    return this.get("/fishbone/queue-status");
  };

  addToQueue = async (body: Message) => {
    return this.post("/fishbone/add-to-queue", body);
  };

  cancelQueue = async ({ assistantId }: { assistantId: number }) => {
    return this.post("/fishbone/cancel-queue", { assistantId });
  };

  processPendingItems = async () => {
    return this.post("/fishbone/process-pending");
  };

  triggerProcessing = async () => {
    return this.post("/fishbone/trigger-processing");
  };

  retrySpecificItem = async (assistantId: number) => {
    return this.post(`/fishbone/retry-item/${assistantId}`);
  };

  // Method to reset item status to pending (for old items)
  resetItemStatus = async (assistantId: number) => {
    return this.patch(`/fishbone/reset-status/${assistantId}`);
  };

  getAIGeneratedFishbones = async (params?: any) => {
    return this.get("/fishbone/ai-generated", { params });
  };

  getFishbonesBySource = async (source: "MANUAL" | "AI_GENERATED", params?: any) => {
    return this.get(`/fishbone/by-source/${source}`, { params });
  };
}

const chatService = new ChatService();
export default chatService;
