import { useState, useEffect, useCallback } from "react";
import { useFishboneSocket } from "./useFishboneSocket";
import chatService, { QueueStatusResponse } from "@/services/apis/chatService";
import { toast } from "react-toastify";

interface QueueItem {
  id: number;
  assistantId: number;
  problem: string;
  status: "pending" | "processing" | "completed" | "error";
  createdAt: string;
  fishboneId?: number;
  error?: string;
}

interface UseFishboneQueueReturn {
  queue: QueueItem[];
  isProcessing: boolean;
  remainingFishboneAssistantThisMonth: number;
  addToQueue: (problem: string) => Promise<QueueItem | null>;
  refreshQueue: () => Promise<void>;
  clearCompleted: () => void;
}

export const useFishboneQueue = (): UseFishboneQueueReturn => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [remainingFishboneAssistantThisMonth, setRemainingFishboneAssistantThisMonth] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, subscribeToStatus, unsubscribeFromStatus, onStatusUpdate } = useFishboneSocket();

  // Load initial queue status
  const loadQueueStatus = useCallback(async () => {
    try {
      const response = await chatService.getQueueStatus();

      const payload = response?.data?.data?.data;

      const items: QueueStatusResponse[] = Array.isArray(payload) ? payload : [];

      const queueItems: QueueItem[] = items.map((item) => ({
        id: item.id,
        assistantId: item.assistantId,
        problem: item.problem,
        status: item.status,
        createdAt: item.createdAt,
        fishboneId: item.fishboneId,
        error: item.error,
      }));

      setQueue(queueItems);
      setRemainingFishboneAssistantThisMonth(response?.data?.data?.remainingFishboneAssistantThisMonth ?? null);
      const hasProcessing = queueItems.some((item) => item.status === "processing");
      setIsProcessing(hasProcessing);
    } catch (error: any) {
      console.error("Error loading queue status:", error);
      console.error("Error details:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      if (error?.response?.status === 401) {
        console.error("Authentication failed - user may need to login");
        toast.error("認証に失敗しました。ログインしてください。");
      } else {
        toast.error("キュー状態の読み込みに失敗しました");
      }
    }
  }, []);

  // Handle real-time status updates
  useEffect(() => {
    if (isConnected) {
      subscribeToStatus();

      onStatusUpdate((update) => {
        setQueue((prev) => {
          const updated = prev.map((item) =>
            item.assistantId === update.assistantId
              ? {
                  ...item,
                  status: update.status,
                  fishboneId: update.fishboneId,
                  error: update.error,
                }
              : item,
          );

          const hasProcessing = updated.some((item) => item.status === "processing");
          const allCompleted = updated.length > 0 && updated.every((item) => item.status === "completed");

          setIsProcessing(hasProcessing);

          // Stop socket calls when all items are completed
          if (allCompleted) {
            unsubscribeFromStatus();
          }

          return updated;
        });

        if (update.status === "completed") {
          toast.success(`AI生成が完了しました: ${update.fishboneId ? `Fishbone #${update.fishboneId}` : ""}`);
        } else if (update.status === "error") {
          toast.error(`AI生成に失敗しました: ${update.error || "不明なエラー"}`);
        }
      });

      return () => {
        unsubscribeFromStatus();
      };
    } else {
      // Socket not connected, skipping status subscription
    }
  }, [isConnected, subscribeToStatus, unsubscribeFromStatus, onStatusUpdate]);

  // Load initial queue on mount
  useEffect(() => {
    loadQueueStatus();
  }, [loadQueueStatus]);

  // Poll for queue updates if socket is not connected
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        loadQueueStatus();
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, loadQueueStatus]);

  const addToQueue = async (problem: string): Promise<QueueItem | null> => {
    try {
      // Re-enable socket subscription if it was stopped due to all completed items
      if (isConnected && queue.length > 0 && queue.every((item) => item.status === "completed")) {
        subscribeToStatus();
      }

      const response = await chatService.addToQueue({
        diagrams: "{}",
        problem: problem.trim(),
        numberNode: 3,
        lang: "Japanese",
        source: "ai-fishbone-diagram", // Thêm source để phân biệt
      });

      const data = response?.data?.data ?? response?.data;
      if (data && typeof data === "object") {
        const newItem: QueueItem = {
          id: data.id,
          assistantId: data.id,
          problem: problem.trim(),
          status: "pending",
          createdAt: new Date().toISOString(),
        };

        setQueue((prev) => {
          const updated = [...prev, newItem];
          const hasProcessing = updated.some((item) => item.status === "processing");
          setIsProcessing(hasProcessing);
          return updated;
        });

        return newItem;
      } else {
        toast.error("AI生成の追加に失敗しました");
        return null;
      }
    } catch (error: any) {
      console.error("Error adding to queue:", error);
      toast.error("AI生成の追加に失敗しました");
      // Không cần set isProcessing = false vì nó sẽ được tính toán từ queue
      throw error;
    }
  };

  const refreshQueue = async () => {
    await loadQueueStatus();
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status === "pending"));
  };

  return {
    queue,
    remainingFishboneAssistantThisMonth,
    isProcessing,
    addToQueue,
    refreshQueue,
    clearCompleted,
  };
};
