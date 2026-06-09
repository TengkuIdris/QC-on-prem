import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/core/hooks";
import { RootState } from "@/store/store";
import authService from "@/services/apis/authService";

interface FishboneStatusUpdate {
  assistantId: number;
  status: "pending" | "processing" | "completed" | "error";
  fishboneId?: number;
  error?: string;
  timestamp: string;
}

interface UseFishboneSocketReturn {
  isConnected: boolean;
  subscribeToStatus: () => void;
  unsubscribeFromStatus: () => void;
  onStatusUpdate: (callback: (update: FishboneStatusUpdate) => void) => void;
  offStatusUpdate: () => void;
}

export const useFishboneSocket = (): UseFishboneSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const statusCallbackRef = useRef<((update: FishboneStatusUpdate) => void) | null>(null);
  const user = useAppSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      try {
        if (!user || !user.id) {
          return;
        }

        // Get auth tokens from authService
        const res = await authService.me();
        if (!res) {
          return;
        }

        // Create socket connection
        const socket = io(process.env.REACT_APP_BACKEND_URL || "http://localhost:3003", {
          auth: {
            userId: user.id,
            email: user.email,
          },
          transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
          setIsConnected(true);
        });

        socket.on("disconnect", () => {
          setIsConnected(false);
        });

        socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setIsConnected(false);
        });

        socket.on("fishbone_status_update", (update: FishboneStatusUpdate) => {
          if (statusCallbackRef.current) {
            statusCallbackRef.current(update);
          }
        });

        socketRef.current = socket;

        return () => {
          socket.disconnect();
        };
      } catch (error) {
        console.error("Error initializing socket:", error);
      }
    };

    if (user && user.id) {
      initSocket();
    }

    // Ensure cleanup on unmount or user change
    return () => {
      try {
        socketRef.current?.off("fishbone_status_update");
        socketRef.current?.off("connect");
        socketRef.current?.off("disconnect");
        socketRef.current?.off("connect_error");
        socketRef.current?.disconnect();
      } finally {
        socketRef.current = null;
        statusCallbackRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user]);

  const subscribeToStatus = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("subscribe_fishbone_status");
    }
  };

  const unsubscribeFromStatus = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("unsubscribe_fishbone_status");
    }
  };

  const onStatusUpdate = (callback: (update: FishboneStatusUpdate) => void) => {
    statusCallbackRef.current = callback;
  };

  const offStatusUpdate = () => {
    statusCallbackRef.current = null;
  };

  return {
    isConnected,
    subscribeToStatus,
    unsubscribeFromStatus,
    onStatusUpdate,
    offStatusUpdate,
  };
};
