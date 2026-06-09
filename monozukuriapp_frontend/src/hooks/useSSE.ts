import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AES } from "crypto-js";
import { fetchAuthSession } from "aws-amplify/auth";
import { normalizeError } from "@/utils/errorHandling";

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === "true";
import type {
  FinalResultData,
  InfoRequestData,
  ProgressData,
  ErrorData,
  AnalysisEventData,
  ConnectionEventData,
  GenericEventData,
  RetrieveContextData,
} from "@/features/whywhy/types";

/**
 * Base type for all SSE events
 */
type SSEEventBase = {
  id: string;
  timestamp: string;
  session_id: string;
};

/**
 * Discriminated union for SSE message types
 * Enables type-safe exhaustive checking and prevents invalid state combinations
 */
export type SSEMessage =
  | (SSEEventBase & { type: "final_result"; data: FinalResultData })
  | (SSEEventBase & { type: "info_request"; data: InfoRequestData })
  | (SSEEventBase & { type: "progress"; data: ProgressData })
  | (SSEEventBase & { type: "error" | "analysis_error"; data: ErrorData })
  | (SSEEventBase & { type: "analysis_started" | "root_cause_analysis"; data: AnalysisEventData })
  | (SSEEventBase & { type: "analysis_progress" | "node_updated" | "chat_message"; data: ProgressData })
  | (SSEEventBase & { type: "connection_start" | "connection_end"; data: ConnectionEventData })
  | (SSEEventBase & { type: "retrieve_context"; data: RetrieveContextData })
  | (SSEEventBase & { type: "others"; data: GenericEventData });

const extractEventType = (data: unknown, fallback?: string): string => {
  const payload = data as Record<string, unknown> | undefined;
  const eventType = typeof payload?.event_type === "string" ? (payload.event_type as string) : undefined;
  if (eventType) {
    console.log("[extractEventType] Found event_type:", eventType);
    return eventType;
  }

  const type = typeof payload?.type === "string" ? (payload.type as string) : undefined;
  if (type) {
    console.log("[extractEventType] Found type:", type);
    return type;
  }

  // Check for state object first - info_request and final_result have state
  // This must come before thought check because info_request can contain both thought and state
  const hasState = payload && typeof (payload as any)?.state === "object" && (payload as any).state !== null;

  if (hasState) {
    const status = typeof (payload as any)?.state?.status === "string" ? (payload as any).state.status : undefined;

    if (status === "waiting_for_input") {
      console.log("[extractEventType] Status-based info_request detected");
      return "info_request";
    }
    if (status === "completed") {
      console.log("[extractEventType] Status-based final_result detected");
      return "final_result";
    }

    // If has state with chat_history but no explicit status, infer from chat_history
    if (Array.isArray((payload as any)?.state?.chat_history) && (payload as any).state.chat_history.length > 0) {
      const lastChat = (payload as any).state.chat_history[(payload as any).state.chat_history.length - 1];
      if (lastChat?.type === "ai") {
        console.log("[extractEventType] Info request inferred from chat_history (AI message present)");
        return "info_request";
      }
    }
  }

  // Only treat as "thought" if it has thought but no state
  // This prevents info_request events (which have both thought and state) from being misclassified
  if (typeof payload?.thought === "string" && !hasState) {
    console.log("[extractEventType] Thought event detected (progress indicator)");
    return "thought";
  }

  console.log("[extractEventType] Using fallback:", fallback || "others");
  return fallback || "others";
};

interface UseSSEProps {
  sessionId?: string;
  onEnvelope?: (kind: string, data: unknown) => void;
  onStreamEnd?: (lastEnvelope: { kind: string; data: unknown } | null) => void;
  onError?: (error: string) => void;
}

export function useSSE({ sessionId, onEnvelope, onStreamEnd, onError }: UseSSEProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "connection_start" | "running" | "completed" | "error" | "waiting_for_input" | "connection_end"
  >("idle");
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isClosingRef = useRef(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const parseErrorCountRef = useRef(0);
  const lastUserMessageRef = useRef<string>("");
  const lastIsRetryRef = useRef<boolean | undefined>(undefined);
  const lastEnvelopeRef = useRef<{ kind: string; data: unknown } | null>(null);
  const keepaliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const keepaliveFailureCountRef = useRef(0);

  const stopKeepalive = () => {
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }
    keepaliveFailureCountRef.current = 0;
  };

  const startKeepalive = (sessionId: string, authHeader: string) => {
    stopKeepalive();

    // Use a dedicated lightweight ping endpoint instead of creating new SSE streams
    const isProduction = window.location.hostname === "kznhub.com" || window.location.hostname.includes("kznhub.com");
    const baseUrl = isProduction
      ? "https://alb.phase-1.kznhub.com/api/v1"
      : import.meta.env.VITE_BACKEND_URL_V1 || "/api/v1";
    // const keepaliveUrl = `${baseUrl}/threads/${sessionId}/ping`;

    keepaliveIntervalRef.current = setInterval(async () => {
      try {
        const keepaliveResponse = await fetch(keepaliveUrl, {
          method: "GET",
          headers: {
            Authorization: authHeader,
          },
        });

        if (keepaliveResponse.ok) {
          lastEventTimeRef.current = Date.now();
          keepaliveFailureCountRef.current = 0;
          console.log("[SSE Keepalive] Ping successful");
        } else if (keepaliveResponse.status === 404) {
          // Ping endpoint not implemented on backend - silently continue
          // Backend should implement GET /api/v1/threads/{sessionId}/ping
          console.log("[SSE Keepalive] Ping endpoint not available (404), skipping");
          lastEventTimeRef.current = Date.now(); // Assume connection is still alive
        } else {
          keepaliveFailureCountRef.current += 1;
          console.warn(
            "[SSE Keepalive] Ping failed:",
            keepaliveResponse.status,
            `(${keepaliveFailureCountRef.current} consecutive failures)`,
          );

          // After 3 consecutive failures, trigger reconnection
          if (keepaliveFailureCountRef.current >= 3) {
            console.error("[SSE Keepalive] Too many failures, stopping keepalive and triggering reconnect");
            stopKeepalive();
            setConnectionError("Keepalive failed - connection may be stale");
          }
        }
      } catch (err) {
        keepaliveFailureCountRef.current += 1;
        console.warn("[SSE Keepalive] Error:", err, `(${keepaliveFailureCountRef.current} consecutive failures)`);

        // After 3 consecutive failures, trigger reconnection
        if (keepaliveFailureCountRef.current >= 3) {
          console.error("[SSE Keepalive] Too many errors, stopping keepalive and triggering reconnect");
          stopKeepalive();
          setConnectionError("Keepalive error - connection may be stale");
        }
      }
    }, 45000);
  };

  // KHÔNG tự động tạo SSE connection khi có sessionId
  // Chỉ tạo khi gọi startAnalysis() hoặc sendChatMessage()

  useEffect(() => {
    return () => {
      isClosingRef.current = true;

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear keepalive interval
      stopKeepalive();

      // Abort and cleanup
      try {
        controllerRef.current?.abort();
      } catch (_) { }
      try {
        readerRef.current?.cancel();
      } catch (_) { }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      controllerRef.current = null;
      readerRef.current = null;
    };
  }, []);

  // Auto-reconnect logic with intelligent error classification
  useEffect(() => {
    if (!isConnected && connectionError && sessionId && !isClosingRef.current) {
      // Normalize error for consistent classification
      const normalizedSource = typeof connectionError === "string" ? new Error(connectionError) : connectionError;
      const nerr = normalizeError(normalizedSource);
      const lowercaseRawError = typeof connectionError === "string" ? connectionError.toLowerCase() : "";

      // Classify error types
      const lowerMessage = (nerr.message || "").toLowerCase();

      // Rate limiting: 429 status code
      const isRateLimited = nerr.httpStatus === 429;

      // Fatal auth errors: 401/403
      const isFatalError = nerr.httpStatus === 401 || nerr.httpStatus === 403;

      // Idle timeout: no status code + network-related message OR time since last event > 60s
      const isIdleTimeout =
        !isRateLimited &&
        !isFatalError &&
        (((!nerr.httpStatus || nerr.httpStatus === 0) &&
          (lowerMessage.includes("timeout") ||
            lowerMessage.includes("connection") ||
            lowerMessage.includes("network") ||
            lowerMessage.includes("fetch"))) ||
          Date.now() - lastEventTimeRef.current > 60000); // No events for >60s

      // Recoverable network errors (not idle, not fatal, not rate limited)
      const isNetworkError =
        !isFatalError &&
        !isIdleTimeout &&
        !isRateLimited &&
        (lowercaseRawError.includes("bad gateway") || (nerr.httpStatus && nerr.httpStatus >= 500));

      // Dynamic retry strategy based on error type
      let maxAttempts: number;
      let delay: number;

      if (isFatalError) {
        // Fatal errors: don't retry
        maxAttempts = 0;
        delay = 0;
      } else if (isRateLimited) {
        // Rate limited: retry with delay from Retry-After header or default 60s
        maxAttempts = Infinity;
        delay = nerr.retryAfterMs || 60000;
      } else if (isIdleTimeout) {
        // Idle timeouts: retry indefinitely with short delay
        maxAttempts = Infinity;
        delay = 2000;
      } else {
        // Network errors: retry with exponential backoff
        maxAttempts = 5;
        delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      }

      // Log error details for debugging
      console.warn("[SSE Auto-reconnect] Error details:", {
        normalized: nerr,
        raw: connectionError,
        isIdleTimeout,
        isFatalError,
        isRateLimited,
        isNetworkError,
        lastEventTime: new Date(lastEventTimeRef.current).toISOString(),
        timeSinceLastEvent: Date.now() - lastEventTimeRef.current,
        attempt: reconnectAttemptsRef.current + 1,
        maxAttempts: maxAttempts === Infinity ? "∞" : maxAttempts,
        retryDelay: delay,
      });

      if ((isIdleTimeout || isNetworkError || isRateLimited) && reconnectAttemptsRef.current < maxAttempts) {
        const errorType = isRateLimited ? "Rate limited" : isIdleTimeout ? "Idle timeout" : "Network error";
        console.log(
          `[SSE] ${errorType} - Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxAttempts === Infinity ? "∞" : maxAttempts})`,
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isClosingRef.current) {
            // Guard against overlapping attempts - only proceed if safe
            if (!isConnected && !controllerRef.current && !readerRef.current) {
              reconnectAttemptsRef.current += 1;
              setConnectionError(null);
              // Actively reopen the stream with the last payload
              // Fire and forget; errors will be routed to onError and setConnectionError
              createSSEConnection(lastUserMessageRef.current, lastIsRetryRef.current).catch(() => { });
            }
          }
        }, delay);

        return () => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };
      } else if (isFatalError || reconnectAttemptsRef.current >= maxAttempts) {
        // Permanent error - stop retrying
        console.error(
          `[SSE] ${isFatalError ? "Fatal error" : "Max reconnection attempts reached"}: ${connectionError}`,
        );
        onError?.(connectionError);
      }
    }
  }, [isConnected, connectionError, sessionId, onError]);

  // Auto-close connection after 5 minutes (increase from 30s to reduce premature disconnects)
  useEffect(() => {
    if (isConnected && !isClosingRef.current) {
      const timeout = setTimeout(() => {
        if (eventSourceRef.current && !isClosingRef.current) {
          eventSourceRef.current.close();
          setIsConnected(false);
        }
      }, 300000); // 5 minutes

      return () => clearTimeout(timeout);
    }
  }, [isConnected]);

  // Function để tạo SSE connection với message
  const createSSEConnection = async (userMessage: string, is_retry?: boolean) => {
    if (!sessionId) return;

    console.log("[createSSEConnection] Starting SSE connection:", {
      sessionId,
      userMessage: userMessage ? "provided" : "empty",
      isRetry: is_retry,
      isClosing: isClosingRef.current,
    });

    try {
      // VALIDATE AUTH FIRST - before any state changes or cleanup
      // This prevents partial state corruption if auth fails
      let accessToken: any;
      let idToken: any;
      let indenty: string | null = null;

      if (AUTH_DISABLED) {
        // On-prem dev: no Cognito session; backend's CognitoGuard short-circuits
        // when DISABLE_AUTH=true and ignores this header.
        accessToken = "dev";
      } else {
        const authSession = await fetchAuthSession({ forceRefresh: true });
        accessToken = authSession.tokens?.accessToken;
        idToken = authSession.tokens?.idToken;
        indenty = localStorage.getItem("indenty");

        if (!accessToken || !idToken || !indenty || !import.meta.env.VITE_SECRET_KEY) {
          const error = new Error("Missing authentication tokens");
          console.error("[SSE] Auth validation failed:", {
            hasAccessToken: !!accessToken,
            hasIdToken: !!idToken,
            hasIndenty: !!indenty,
            hasSecretKey: !!import.meta.env.VITE_SECRET_KEY,
          });
          throw error;
        }
      }

      // NOW safe to proceed with connection setup
      // Close existing connection if any (abort fetch stream if present)

      // Clear any existing keepalive to prevent timer leaks
      stopKeepalive();

      // Set closing flag and perform cleanup atomically
      isClosingRef.current = true;

      // Abort existing controller
      if (controllerRef.current) {
        try {
          controllerRef.current.abort();
        } catch (err) {
          console.warn("[SSE] Error aborting controller:", err);
        }
        controllerRef.current = null;
      }

      // Cancel existing reader
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
        } catch (err) {
          console.warn("[SSE] Error canceling reader:", err);
        }
        readerRef.current = null;
      }

      // Close EventSource if exists
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Wait a tick to ensure all async cleanup completes
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Memorize last payload for auto-reconnect
      lastUserMessageRef.current = userMessage || "";
      lastIsRetryRef.current = is_retry;

      // Reset state for new connection (cleanup complete, ready for new connection)
      isClosingRef.current = false;
      currentSessionIdRef.current = sessionId;
      parseErrorCountRef.current = 0; // Reset parse error count

      // Use real endpoint with authentication - SSE goes directly to ALB
      const isProduction = window.location.hostname === "kznhub.com" || window.location.hostname.includes("kznhub.com");
      const baseUrl = isProduction
        ? "https://alb.phase-1.kznhub.com/api/v1" // Production: direct to ALB
        : import.meta.env.VITE_BACKEND_URL_V1 || "/api/v1"; // Dev/Staging: use env or fallback to relative path
      const url = `${baseUrl}/threads/${sessionId}/stream`;

      const authHeader = AUTH_DISABLED
        ? `Bearer dev`
        : (() => {
            const encryptIdToken = AES.encrypt(idToken!.toString(), import.meta.env.VITE_SECRET_KEY).toString();
            const encryptIndenty = AES.encrypt(indenty!, import.meta.env.VITE_SECRET_KEY).toString();
            return `Bearer ${accessToken} ${encryptIdToken} ${encryptIndenty}`;
          })();

      const controller = new AbortController();
      controllerRef.current = controller;
      lastEnvelopeRef.current = null;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_message: userMessage,
          is_retry: is_retry,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Preserve HTTP status and Retry-After so upstream can classify 429 properly
        let text: string | undefined;
        try {
          text = await response.text();
        } catch (_) { }
        const retryAfter = response.headers.get("Retry-After") || response.headers.get("retry-after") || undefined;
        // Throw an object shaped like an axios error enough for normalizeError()
        throw {
          status: response.status,
          statusText: response.statusText,
          headers: { "Retry-After": retryAfter },
          data: { message: text || `${response.status} ${response.statusText}` },
          message: text || `SSE connection failed: ${response.status} ${response.statusText}`,
        } as any;
      }

      // Connection successful - reset reconnection attempts and activity tracker
      reconnectAttemptsRef.current = 0;
      lastEventTimeRef.current = Date.now();
      setIsConnected(true);
      setConnectionError(null);
      console.log("[SSE] Connection established successfully");

      // Start keepalive to prevent ALB idle timeout before the 60s threshold
      startKeepalive(sessionId, authHeader);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body not available");
      }
      readerRef.current = reader;

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const readStream = () => {
        if (isClosingRef.current) {
          console.log("[SSE] Stream read cancelled - isClosing is true");
          return;
        }

        console.log("[SSE] Reading from stream...");
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              // Flush any remaining decoded bytes to string
              const remainder = decoder.decode();
              let lastType: SSEMessage["type"] | null = null;
              if (remainder && remainder.length > 0) {
                buffer += remainder;
                const finalMessages = parseSSEMessages(buffer, sessionId);
                finalMessages.completeMessages.forEach((message) => {
                  // Track activity for idle timeout detection
                  lastEventTimeRef.current = Date.now();

                  const kind = extractEventType(message.data, message.type);
                  lastType = kind as SSEMessage["type"];
                  lastEnvelopeRef.current = { kind, data: message.data };
                  setMessages((prev: SSEMessage[]) => [...prev, { ...message, type: kind as SSEMessage["type"] }]);
                  onEnvelope?.(kind, message.data);
                });
                buffer = finalMessages.remainingBuffer;
              }
              setIsConnected(false);
              setIsLoading(false); // Tắt loading khi stream kết thúc
              if (lastType === "info_request") {
                setAnalysisStatus("waiting_for_input");
              } else if (lastType === "final_result") {
                setAnalysisStatus("completed");
              }
              const lastEnvelope = lastEnvelopeRef.current;
              if (lastEnvelope) {
                const shouldFinalize =
                  lastEnvelope.kind === "final_result" || (lastEnvelope.data as any)?.state?.status === "completed";
                onStreamEnd?.(shouldFinalize ? lastEnvelope : null);
              } else {
                onStreamEnd?.(null);
              }
              lastEnvelopeRef.current = null;
              // cleanup reader/controller after completion
              try {
                readerRef.current?.cancel();
              } catch (_) { }
              readerRef.current = null;
              controllerRef.current = null;
              stopKeepalive();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            console.log("[SSE] Received chunk:", chunk.length, "bytes");

            buffer += chunk;

            try {
              const messages = parseSSEMessages(buffer, sessionId);
              buffer = messages.remainingBuffer;
              console.log("[SSE] Parsed messages:", messages.completeMessages.length, "complete");

              if (isClosingRef.current) {
                console.log("[SSE] Stream processing cancelled - isClosing is true");
                return;
              }

              // Reset parse error count on successful parse
              if (messages.completeMessages.length > 0) {
                parseErrorCountRef.current = 0;
              }

              messages.completeMessages.forEach((message) => {
                // Track activity for idle timeout detection
                lastEventTimeRef.current = Date.now();

                const kind = extractEventType(message.data, message.type);
                console.log("[useSSE] Processing message:", {
                  originalType: message.type,
                  extractedKind: kind,
                  hasData: !!message.data,
                  dataKeys: message.data ? Object.keys(message.data) : [],
                });
                lastEnvelopeRef.current = { kind, data: message.data };
                setMessages((prev: SSEMessage[]) => [...prev, { ...message, type: kind as SSEMessage["type"] }]);
                onEnvelope?.(kind, message.data);

                if (kind === "final_result") {
                  console.log("[useSSE] Final result detected");
                  setAnalysisStatus("completed");
                } else if (kind === "info_request") {
                  console.log("[useSSE] Info request detected");
                  setAnalysisStatus("waiting_for_input");
                } else if (kind === "analysis_started" || kind === "root_cause_analysis") {
                  console.log("[useSSE] Analysis started/root cause analysis");
                  setAnalysisStatus("running");
                } else if (kind === "analysis_error" || kind === "error") {
                  console.log("[useSSE] Error detected");
                  setAnalysisStatus("error");
                } else if (kind === "connection_end") {
                  console.log("[useSSE] Connection end detected");
                  isClosingRef.current = true;
                  setIsConnected(false);
                  setAnalysisStatus("connection_end");
                  stopKeepalive();
                  // Call onStreamEnd with connection_end envelope before returning
                  onStreamEnd?.(lastEnvelopeRef.current);
                  return;
                }
              });
            } catch (parseError) {
              parseErrorCountRef.current += 1;
              console.error("[SSE] Parse error:", parseError, "Buffer:", buffer.substring(0, 200));

              // If too many consecutive parse errors, reconnect
              if (parseErrorCountRef.current > 3) {
                console.error("[SSE] Too many parse errors, closing connection");
                setConnectionError("Stream parsing failed repeatedly");
                try {
                  readerRef.current?.cancel();
                } catch (_) { }
                return;
              }
              // Continue reading despite parse error
            }

            if (!isClosingRef.current) {
              readStream();
            }
          })
          .catch((error) => {
            // Handle AbortError gracefully - user intentionally cancelled
            if (error.name === "AbortError") {
              console.log("[SSE] Stream aborted by user");
              return;
            }

            console.error("[SSE] Stream read error:", error);
            if (!isClosingRef.current) {
              setIsLoading(false);
              setConnectionError(error.message || "Stream read failed");
              onError?.(error);
              onStreamEnd?.(null);
              stopKeepalive();
            }
            // cleanup on error
            try {
              readerRef.current?.cancel();
            } catch (_) { }
            readerRef.current = null;
            controllerRef.current = null;
          });
      };

      readStream();
    } catch (error: any) {
      // Handle AbortError gracefully - user intentionally cancelled
      if (error?.name === "AbortError") {
        console.log("[SSE] Connection aborted by user");
        return;
      }

      const errorMessage = error instanceof Error ? error.message : "Failed to create SSE connection";
      console.error("[SSE] Connection error:", errorMessage, error);
      setConnectionError(errorMessage);
      setIsLoading(false);
      setIsConnected(false);
      stopKeepalive();

      // Pass the full error object so upstream can handle it properly
      onError?.(error);
    }
  };

  // Manual methods
  const startAnalysis = async () => {
    if (!sessionId) return;

    try {
      await createSSEConnection("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start analysis";
      setConnectionError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const sendChatMessage = async (message: string, is_retry?: boolean) => {
    if (!sessionId) return;

    try {
      await createSSEConnection(message, is_retry);
    } catch (error) {
      // Error handling is done in createSSEConnection
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const reconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setConnectionError(null);
    // The useEffect will handle reconnection
  };

  // Cleanup function to stop all operations
  const cleanup = useCallback(() => {
    console.log("[SSE] Cleaning up connection");
    console.log("[SSE] Current state:", {
      isClosing: isClosingRef.current,
      hasController: !!controllerRef.current,
      hasReader: !!readerRef.current,
      isConnected: isConnected,
    });
    isClosingRef.current = true;
    lastEnvelopeRef.current = null;

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear keepalive interval
    stopKeepalive();

    // Abort controller
    if (controllerRef.current) {
      try {
        controllerRef.current.abort();
      } catch (err) {
        console.warn("[SSE] Error aborting in cleanup:", err);
      }
      controllerRef.current = null;
    }

    // Cancel reader
    if (readerRef.current) {
      try {
        readerRef.current.cancel();
      } catch (err) {
        console.warn("[SSE] Error canceling reader in cleanup:", err);
      }
      readerRef.current = null;
    }

    // Close EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Reset state
    setIsConnected(false);
    setConnectionError(null);
    setMessages([]);
    setAnalysisStatus("idle");
    setIsLoading(false);

    // Reset refs
    currentSessionIdRef.current = null;
    reconnectAttemptsRef.current = 0;
    parseErrorCountRef.current = 0;
    isClosingRef.current = false;
  }, []);

  // Memoize return object to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      isConnected,
      connectionError,
      messages,
      analysisStatus,
      isLoading,
      setIsLoading,
      // Actions
      startAnalysis,
      sendChatMessage,
      clearMessages,
      reconnect,
      cleanup,
    }),
    [
      isConnected,
      connectionError,
      messages,
      analysisStatus,
      isLoading,
      setIsLoading,
      startAnalysis,
      sendChatMessage,
      clearMessages,
      reconnect,
      cleanup,
    ],
  );

  return returnValue;
}

// Helper function to parse SSE messages
function parseSSEMessages(
  buffer: string,
  sessionId: string,
): { completeMessages: SSEMessage[]; remainingBuffer: string } {
  const completeMessages: SSEMessage[] = [];
  let remainingBuffer = buffer;

  // Split by double newlines to find complete SSE messages
  const messageParts = buffer.split("\n\n");

  // Process all but the last part (which might be incomplete)
  for (let i = 0; i < messageParts.length - 1; i++) {
    const messagePart = messageParts[i];
    if (messagePart.trim()) {
      const parsedMessage = parseSingleSSEMessage(messagePart, sessionId);
      if (parsedMessage) {
        completeMessages.push(parsedMessage);
      }
    }
  }

  // Keep the last part as remaining buffer
  remainingBuffer = messageParts[messageParts.length - 1] || "";

  return { completeMessages, remainingBuffer };
}

function parseSingleSSEMessage(messageText: string, sessionId: string): SSEMessage | null {
  try {
    const lines = messageText.split("\n");
    let currentEvent = "others";
    let currentData: any = null;
    let plainTextData: string | null = null;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.substring(7).trim();
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.substring(6));
      }
    }

    // Join multi-line data payloads as per SSE spec
    if (dataLines.length > 0) {
      const dataText = dataLines.join("\n");
      try {
        currentData = JSON.parse(dataText);

        const effectiveEvent = extractEventType(currentData, currentEvent);
        currentEvent = effectiveEvent as any;

        // Keep backward compatibility: if server wraps payload under .data, flatten it
        if (currentData && (currentData as any).data) currentData = (currentData as any).data;
      } catch (_) {
        plainTextData = dataText;
        if (currentEvent === "error") {
          currentEvent = "analysis_error" as any;
          currentData = { message: dataText, error: "AIサービスエラー" };
        }
      }
    }

    // Create message with either JSON data or plain text
    if (currentData || plainTextData) {
      const message: SSEMessage = {
        id: `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: currentEvent as any,
        data: currentData || { message: plainTextData },
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      };

      return message;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}
