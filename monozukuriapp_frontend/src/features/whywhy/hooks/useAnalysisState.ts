import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeError, mapErrorToUi, type NormalizedError } from "@/utils/errorHandling";
import event from "@/utils/eventEmitter";
import { EventType } from "@/constant/enum";
import { useSSE } from "@/hooks/useSSE";
import { processChatHistory, processThreadData, normalizeWhyNodes, mapRootCauses } from "../utils/dataProcessing";
import type { AnalysisState, ChatMessage, RetrievedChunk, ThreadState, ThreadStatus } from "../types";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { toast } from "react-toastify";

// Throttle duplicate cooldown toasts
let lastCooldownToastAt = 0;
const COOLDOWN_TOAST_WINDOW_MS = 5000;
function maybeToastCooldown(action: ReturnType<typeof mapErrorToUi>) {
  if (action.kind !== "cooldown") return;
  const now = Date.now();
  if (now - lastCooldownToastAt < COOLDOWN_TOAST_WINDOW_MS) return;
  lastCooldownToastAt = now;
  const ms = action.retryAfterMs ? ` (${Math.round(action.retryAfterMs / 1000)}s)` : "";
  toast.warn(`Too many requests. Please wait${ms}.`);
}

const COMPLETION_SYSTEM_MESSAGE = "分析が完了しました。追加の質問はありません。右側のツリー図をご確認ください。";

const PROGRESS_COPY: Record<string, string> = {
  analysis_started: "分析を開始しています...",
  initial_analysis: "初期分析を実行中...",
  deep_analysis: "深掘り分析を実施中...",
  root_cause_analysis: "根本原因を特定中...",
  info_request: "追加情報を確認中...",
  countermeasure_planning: "再発防止策を検討中...",
  verification: "分析結果を検証中...",
  retrieve_context: "関連する過去事例を検索しました",
  thought: "AIが思考中...",
};

/**
 * Infer progress message from thought content
 * Analyzes the thought text to determine which phase of analysis is occurring
 */
function inferProgressMessage(thought: string): string {
  const patterns: [RegExp, string][] = [
    [/なぜ|原因|要因|発生理由/i, "原因を分析中..."],
    [/根本|真因|コア|本質/i, "根本原因を特定中..."],
    [/対策|再発防止|措置|改善/i, "対策を検討中..."],
    [/4M|Man|Machine|Material|Method|人|機械|材料|方法/i, "4M分析を実施中..."],
    [/検証|確認|チェック|精査/i, "情報を確認中..."],
    [/深掘り|詳細|細部|掘り下げ/i, "詳細分析を実施中..."],
  ];

  for (const [pattern, message] of patterns) {
    if (pattern.test(thought)) return message;
  }

  return "AIが思考中...";
}

const initialState: AnalysisState = {
  session: null,
  chatHistory: [],
  analysisNodes: [],
  retrievedContext: undefined,
  status: "idle",
  loading: { session: false, analysis: false, message: false },
  ui: {
    hasParent: false,
    chatMessage: "",
    hasAutoStarted: false,
    isThinking: false,
    progressMessage: undefined,
    connectionMessage: undefined,
    canRetry: false,
    treeWarning: undefined,
  },
  lastError: undefined,
  messageErrorById: {},
};

const createMessageKey = (message: Pick<ChatMessage, "type" | "content">) => `${message.type}::${message.content}`;

const mergeChatMessages = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  if (!incoming.length) return existing;
  const merged = [...existing];

  incoming.forEach((incomingMessage) => {
    const key = createMessageKey(incomingMessage);
    const existingIndex = merged.findIndex((msg) => createMessageKey(msg) === key);

    if (existingIndex >= 0) {
      const prev = merged[existingIndex];
      merged[existingIndex] = {
        ...prev,
        content: incomingMessage.content,
        timestamp: incomingMessage.timestamp,
        status: prev.status === "failed" ? prev.status : "sent",
        error: prev.status === "failed" ? prev.error : undefined,
      };
    } else {
      merged.push({ ...incomingMessage, status: incomingMessage.status ?? "sent" });
    }
  });

  return merged;
};

const appendSystemOnce = (messages: ChatMessage[], key: string, content: string): ChatMessage[] => {
  if (messages.some((msg) => msg.type === "system" && msg.id === key)) {
    return messages;
  }

  const systemMessage: ChatMessage = {
    id: key,
    type: "system",
    content,
    timestamp: new Date().toISOString(),
    status: "sent",
  };

  return [...messages, systemMessage];
};

const markMessagesAsSent = (messages: ChatMessage[]): ChatMessage[] =>
  messages.map((msg) => (msg.status && msg.status !== "failed" ? { ...msg, status: "sent" as const } : msg));

const hasRawWhyNodes = (state?: ThreadState): boolean => {
  if (!state?.why_nodes) return false;
  if (Array.isArray(state.why_nodes)) {
    return state.why_nodes.filter(Boolean).length > 0;
  }
  return Object.values(state.why_nodes).filter(Boolean).length > 0;
};

const hasRootCause = (state?: ThreadState): boolean => {
  if (!state?.why_nodes) return false;
  const nodes = Array.isArray(state.why_nodes)
    ? state.why_nodes
    : Object.values(state.why_nodes).filter(Boolean);
  return nodes.some((node: any) => node?.is_root_cause === true);
};

/**
 * Replace the last AI message with a completion message ("分析完了")
 * when a root cause has been detected.
 */
const applyCompletionMessageIfNeeded = (
  threadState: ThreadState | undefined,
  messages: ChatMessage[],
): ChatMessage[] => {
  if (!threadState || !hasRootCause(threadState)) return messages;

  const completionMessage: ChatMessage = {
    id: `ai-completion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "ai",
    content: "分析完了",
    timestamp: new Date().toISOString(),
    status: "sent",
  };

  // Bước 1: Xóa câu trả lời cuối cùng của AI nếu:
  // - lastMessage.type === "ai"
  // - lastMessage.content !== "分析完了"
  // - hasRootCause(threadState) === true (đã check ở trên)
  let messagesAfterStep1 = messages;
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage.type === "ai" &&
      lastMessage.content !== "分析完了"
    ) {
      // Xóa câu trả lời AI cuối cùng
      messagesAfterStep1 = messages.slice(0, -1);
    }
  }

  // Bước 2: Kiểm tra câu trả lời cuối cùng hiện tại
  if (messagesAfterStep1.length === 0) {
    // Không có message nào -> thêm completion vào cuối
    return [completionMessage];
  }

  const lastMessageAfterStep1 = messagesAfterStep1[messagesAfterStep1.length - 1];

  // 2.1.1: Nếu cuối cùng đã là completion -> không làm gì
  if (lastMessageAfterStep1.type === "ai" && lastMessageAfterStep1.content === "分析完了") {
    return messagesAfterStep1;
  }

  // 2.1.2: Nếu cuối cùng không phải AI hoặc không phải completion -> thêm completion vào cuối
  return [...messagesAfterStep1, completionMessage];
};

const buildTreeMeta = (threadState?: ThreadState) => {
  const nodes = normalizeWhyNodes(threadState);
  const treeWarning =
    hasRawWhyNodes(threadState) && nodes.length === 0
      ? "Why-Whyツリーを描画できませんでした。再接続して再取得してください。"
      : undefined;
  return { nodes, treeWarning };
};

/**
 * Helper function to process thread state and create state update
 * Used for both info_request from SSE and getThread API response
 *
 * Note: API has two status fields - thread.status (top-level) and thread.state.status.
 * For old threads, thread.state.status may be undefined while thread.status is "completed".
 * Use threadLevelStatus as fallback when threadState.status is missing.
 */
const processThreadStateUpdate = (
  threadState: ThreadState,
  prevState: AnalysisState,
  options?: {
    processedSession?: ReturnType<typeof processThreadData>["session"];
    isConnectionEnd?: boolean;
    /** Fallback when thread.state.status is undefined (e.g. old API responses) */
    threadLevelStatus?: string;
  }
) => {
  const chatHistory = Array.isArray(threadState.chat_history) ? threadState.chat_history : [];
  const latestChat = chatHistory[chatHistory.length - 1];
  const aiFollowUp = latestChat?.type === "ai";

  // Build tree meta from thread state
  const treeMeta = buildTreeMeta(threadState);

  // Use thread.state.status first, fallback to thread.status (top-level) for old threads
  const rawStatus = threadState.status ?? options?.threadLevelStatus;

  // Normalize API values: "in_progress" -> "running"
  const normalizedStatus = rawStatus === "in_progress" ? "running" : rawStatus;

  // Determine final status
  const finalStatus: AnalysisState["status"] =
    normalizedStatus === "completed"
      ? "completed"
      : normalizedStatus === "waiting_for_input" || aiFollowUp
        ? "waiting_for_input"
        : options?.isConnectionEnd
          ? "connection_end"
          : normalizedStatus === "error"
            ? "error"
            : normalizedStatus === "running"
              ? "running"
              : hasRootCause(threadState)
                ? "completed"
                : "running";

  const serverChat = processChatHistory(chatHistory);
  // For waiting_for_input status, use server chat as source of truth (don't merge) to avoid duplicates
  // For other statuses, merge to preserve any local messages
  let finalChatHistory = finalStatus === "waiting_for_input"
    ? serverChat
    : mergeChatMessages(prevState.chatHistory, serverChat);

  // If root cause detected and last message is AI, replace it with completion message
  finalChatHistory = applyCompletionMessageIfNeeded(threadState, finalChatHistory);

  return {
    chatHistory: finalChatHistory,
    analysisNodes: treeMeta.nodes,
    rootCauses: mapRootCauses(threadState.root_causes),
    status: finalStatus,
    session: options?.processedSession || prevState.session,
    loading: { session: false, analysis: false, message: false },
    ui: {
      ...prevState.ui,
      isThinking: false,
      progressMessage: undefined,
      currentThought: undefined,
      connectionMessage: undefined,
      canRetry: false,
      treeWarning: treeMeta.treeWarning,
    },
  };
};

export function useAnalysisState(sessionId?: string) {
  const [state, setState] = useState<AnalysisState>(initialState);
  const hasFinalizedRef = useRef(false);
  const optimisticIdRef = useRef(0);
  const infoRequestProcessedRef = useRef(false); // Track if info_request with complete data was already processed

  useEffect(() => {
    hasFinalizedRef.current = false;
    optimisticIdRef.current = 0;
    infoRequestProcessedRef.current = false;
  }, [sessionId]);

  const updateFromSSE = useCallback(
    (kind: string, data: unknown, options?: { source?: "message" | "stream-end" }) => {

      if (!data) {
        return;
      }

      if (hasFinalizedRef.current && kind !== "error" && kind !== "analysis_error") {
        return;
      }

      const payload = data as { state?: ThreadState; thought?: string; message?: string };



      // Handle thought events - enable AI thinking process visualization
      if (kind === "thought") {

        const thoughtContent = typeof payload.thought === "string" ? payload.thought : "AIが考えています...";
        const progressMessage = inferProgressMessage(thoughtContent);

        setState((prev) => ({
          ...prev,
          ui: {
            ...prev.ui,
            isThinking: true,
            currentThought: thoughtContent,
            progressMessage,
            lastThoughtTime: Date.now(),
          },
          loading: { ...prev.loading, analysis: true },
        }));

        return;
      }

      if (kind === "error" || kind === "analysis_error") {
        setState((prev) => ({
          ...prev,
          status: "error",
          loading: { session: false, analysis: false, message: false },
          ui: { ...prev.ui, isThinking: false, progressMessage: undefined },
        }));
        return;
      }

      // Handle connection_end - clear everything immediately and update status
      if (kind === "connection_end") {
        setState((prev) => ({
          ...prev,
          status: "connection_end",
          loading: { session: false, analysis: false, message: false },
          ui: {
            ...prev.ui,
            isThinking: false,
            progressMessage: undefined,
            currentThought: undefined,
            connectionMessage: undefined,
            canRetry: false,
          },
        }));
        return;
      }

      // Handle retrieve_context — the agent's RAG node emits this once early
      // in the run, between set_initial_cause and joint. Payload shape per
      // agent SSE contract: { thought, state: { retrieved_context: [...] } }.
      if (kind === "retrieve_context") {
        const rawChunks = (payload as { state?: { retrieved_context?: unknown } }).state?.retrieved_context;
        const chunks: RetrievedChunk[] = Array.isArray(rawChunks)
          ? (rawChunks.filter((c) => c && typeof c === "object") as RetrievedChunk[])
          : [];
        setState((prev) => ({
          ...prev,
          retrievedContext: chunks,
          status: prev.status === "idle" ? "running" : prev.status,
          loading: { ...prev.loading, analysis: true },
          ui: {
            ...prev.ui,
            isThinking: true,
            progressMessage: PROGRESS_COPY.retrieve_context ?? "関連する過去事例を検索しました",
          },
        }));
        return;
      }

      const threadState = payload.state;
      const hasThreadState = !!threadState && typeof threadState === "object";
      const statusFromState = threadState?.status;
      const rootCauses = threadState?.root_causes;

      const finalDetected =
        kind === "final_result" ||
        statusFromState === "completed" ||
        (Array.isArray(rootCauses) && rootCauses.length > 0);

      const infoRequestDetected = kind === "info_request" || statusFromState === "waiting_for_input";

      // Only validate threadState for operations that actually need it
      if (finalDetected && !hasThreadState) {
        console.warn("[updateFromSSE] Terminal event missing threadState, awaiting fallback fetch.", {
          kind,
          statusFromState,
          payloadKeys: Object.keys(payload ?? {}),
        });
        return;
      }

      if (finalDetected && threadState) {
        // why_nodes can be array or object, so check before using reduce
        const finalWhyNodesArray = Array.isArray(threadState.why_nodes)
          ? threadState.why_nodes
          : threadState.why_nodes
            ? Object.values(threadState.why_nodes).filter(Boolean)
            : [];

        const treeMeta = buildTreeMeta(threadState);

        setState((prev) => {
          if (hasFinalizedRef.current) return prev;

          const serverChat = processChatHistory(threadState.chat_history);
          let mergedChat = markMessagesAsSent(mergeChatMessages(prev.chatHistory, serverChat));

          // If root cause detected and last message is AI, replace it with completion message
          mergedChat = applyCompletionMessageIfNeeded(threadState, mergedChat);

          const completionKey = `system-completed-${prev.session?.id ?? sessionId ?? "unknown"}`;
          const chatWithSystem = appendSystemOnce(mergedChat, completionKey, COMPLETION_SYSTEM_MESSAGE);

          hasFinalizedRef.current = true;

          return {
            ...prev,
            chatHistory: chatWithSystem,
            analysisNodes: treeMeta.nodes,
            rootCauses: mapRootCauses(threadState.root_causes),
            status: "completed",
            session: prev.session
              ? {
                ...prev.session,
                status: "completed",
                analysisData: threadState,
              }
              : prev.session,
            loading: { ...prev.loading, analysis: false, message: false },
            ui: {
              ...prev.ui,
              isThinking: false,
              currentThought: undefined,
              progressMessage: undefined,
              connectionMessage: undefined,
              canRetry: false,
              treeWarning: treeMeta.treeWarning,
            },
            messageErrorById: {},
          };
        });
        return;
      }

      if (infoRequestDetected && threadState) {
        // Mark that info_request was processed to prevent connection_end from calling getThread
        infoRequestProcessedRef.current = true;

        // Clear loading immediately to prevent UI from showing loading state
        setState((prev) => ({
          ...prev,
          loading: { session: false, analysis: false, message: false },
          ui: {
            ...prev.ui,
            isThinking: false,
            progressMessage: undefined,
            currentThought: undefined,
          },
        }));

        const treeMeta = buildTreeMeta(threadState);
        // why_nodes can be array or object, so check before using reduce
        const whyNodesArray = Array.isArray(threadState.why_nodes)
          ? threadState.why_nodes
          : threadState.why_nodes
            ? Object.values(threadState.why_nodes).filter(Boolean)
            : [];

        setState((prev) => {
          const serverChat = processChatHistory(threadState.chat_history);
          // For info_request, use server chat as source of truth (don't merge)
          // This prevents accumulation of multiple AI questions
          return {
            ...prev,
            chatHistory: serverChat,
            analysisNodes: treeMeta.nodes,
            rootCauses: mapRootCauses(threadState.root_causes),
            status: "waiting_for_input",
            session: prev.session
              ? {
                ...prev.session,
                status: "waiting_for_input",
                analysisData: threadState,
              }
              : prev.session,
            loading: { session: false, analysis: false, message: false },
            ui: {
              ...prev.ui,
              isThinking: false,
              currentThought: undefined,
              progressMessage: undefined,
              connectionMessage: undefined,
              canRetry: false,
              treeWarning: treeMeta.treeWarning,
            },
          };
        });
        return;
      }

      // B) Ensure info_request content shows in Chat (even without threadState)
      if (infoRequestDetected && !threadState) {
        // Extract message from state.chat_history if available, otherwise from payload
        const textFromState = Array.isArray((payload as any)?.state?.chat_history)
          ? [...((payload as any).state.chat_history as any[])].reverse().find((c: any) => c.type === "ai")?.content
          : undefined;
        const text = textFromState || (typeof payload.message === "string" ? payload.message : undefined);

        if (text && text.trim()) {
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: "ai",
            content: text,
            timestamp: new Date().toISOString(),
            status: "sent",
          };
          setState((prev) => ({
            ...prev,
            chatHistory: mergeChatMessages(prev.chatHistory, [aiMsg]),
            status: "waiting_for_input",
            loading: { ...prev.loading, analysis: false, message: false },
            ui: {
              ...prev.ui,
              isThinking: false,
              progressMessage: undefined,
              connectionMessage: undefined,
              canRetry: false,
            },
          }));
        } else {
          console.log("[updateFromSSE] Info request detected but no message found, will fetch from API");
        }
        return;
      }

      const progressMessage =
        PROGRESS_COPY[kind] ?? (typeof payload.message === "string" ? payload.message : undefined);

      // For progress events that include state with chat_history, update it
      if (threadState?.chat_history && !finalDetected && !infoRequestDetected) {
        const treeMeta = buildTreeMeta(threadState);
        // why_nodes can be array or object, so check before using reduce
        const progressWhyNodesArray = Array.isArray(threadState.why_nodes)
          ? threadState.why_nodes
          : threadState.why_nodes
            ? Object.values(threadState.why_nodes).filter(Boolean)
            : [];
        setState((prev) => {
          const serverChat = processChatHistory(threadState.chat_history);
          const mergedChat = mergeChatMessages(prev.chatHistory, serverChat);
          return {
            ...prev,
            chatHistory: mergedChat,
            analysisNodes: treeMeta.nodes,
            status: prev.status === "idle" ? "running" : prev.status,
            loading: { ...prev.loading, analysis: true },
            ui: {
              ...prev.ui,
              isThinking: true,
              progressMessage,
              connectionMessage: undefined,
              canRetry: false,
              treeWarning: treeMeta.treeWarning,
            },
          };
        });
      } else {
        setState((prev) => ({
          ...prev,
          status: prev.status === "idle" ? "running" : prev.status,
          loading: { ...prev.loading, analysis: true },
          ui: {
            ...prev.ui,
            isThinking: true,
            progressMessage,
            connectionMessage: undefined,
            canRetry: false,
          },
        }));
      }

      if (options?.source === "stream-end") {
        console.debug("[SSE] Stream ended without completion, awaiting further input.");
      }
    },
    [sessionId],
  );

  const handleStreamEnd = useCallback(
    async (envelope?: { kind: string; data: unknown } | null) => {

      // Track if this is connection_end to handle it specially
      const isConnectionEnd = envelope?.kind === "connection_end";

      // Clear thinking state immediately when stream ends
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, analysis: false, message: false },
        ui: {
          ...prev.ui,
          isThinking: false,
          progressMessage: undefined,
          currentThought: undefined,
        },
      }));

      if (envelope) {
        const threadState = (envelope.data as any)?.state;
        const hasThreadState = !!threadState && typeof threadState === "object";
        const isTerminalKind = envelope.kind === "final_result" || envelope.kind === "info_request";
        const needsFallbackFetch = isTerminalKind && !hasThreadState;


        // If info_request has complete data, use it and skip getThread call
        // This must be checked BEFORE connection_end handling to prevent unnecessary API calls
        if (envelope.kind === "info_request" && hasThreadState) {

          // Mark that info_request was processed to prevent connection_end from overwriting
          infoRequestProcessedRef.current = true;

          // Use shared helper function to process thread state
          setState((prev) => ({
            ...prev,
            ...processThreadStateUpdate(threadState, prev),
          }));
          return;
        }

        // For connection_end, check if info_request was already processed
        // If so, skip all further processing to avoid unnecessary getThread call
        if (isConnectionEnd && infoRequestProcessedRef.current) {
          return;
        }

        // For connection_end, updateFromSSE already cleared loading, just fetch latest data
        if (!isConnectionEnd) {
          updateFromSSE(envelope.kind, envelope.data, { source: "stream-end" });
        }

        // If we have a complete threadState with terminal status, no need to fetch
        if (hasThreadState && isTerminalKind) {
          const status = threadState.status;
          if (status === "completed" || status === "waiting_for_input") {
            // Process chat history for all statuses and replace last AI message if needed
            setState((prev) => {
              const serverChat = processChatHistory(threadState.chat_history);
              let mergedChat = markMessagesAsSent(mergeChatMessages(prev.chatHistory, serverChat));

              // If root cause detected and last message is AI, replace it with completion message
              mergedChat = applyCompletionMessageIfNeeded(threadState, mergedChat);

              const treeMeta = buildTreeMeta(threadState);
              const finalStatus: AnalysisState["status"] =
                status === "completed" ? "completed" : "waiting_for_input";

              // Only add system completion message for completed status
              let finalChatHistory = mergedChat;
              if (status === "completed") {
                const completionKey = `system-completed-${prev.session?.id ?? sessionId ?? "unknown"}`;
                finalChatHistory = appendSystemOnce(mergedChat, completionKey, COMPLETION_SYSTEM_MESSAGE);
              }

              return {
                ...prev,
                chatHistory: finalChatHistory,
                analysisNodes: treeMeta.nodes,
                rootCauses: mapRootCauses(threadState.root_causes),
                status: finalStatus,
                session: prev.session
                  ? {
                    ...prev.session,
                    status: finalStatus,
                    analysisData: threadState,
                  }
                  : prev.session,
                loading: { ...prev.loading, analysis: false, message: false },
                ui: {
                  ...prev.ui,
                  isThinking: false,
                  currentThought: undefined,
                  progressMessage: undefined,
                  connectionMessage: undefined,
                  canRetry: false,
                  treeWarning: treeMeta.treeWarning,
                },
                messageErrorById: status === "completed" ? {} : prev.messageErrorById,
              };
            });
            return;
          }
        }

        // If not a terminal event, clear progressMessage after updateFromSSE
        // This prevents progressMessage from persisting after stream ends
        if (!isTerminalKind) {
          setState((prev) => ({
            ...prev,
            ui: {
              ...prev.ui,
              progressMessage: undefined,
              isThinking: false,
            },
          }));
        }

      }

      if (!sessionId) {
        return;
      }

      // Skip getThread if info_request already processed (to prevent connection_end from overwriting)
      // This ensures that if info_request had complete data, we don't call getThread after connection_end
      // Note: This check is also done earlier in the function, but kept here as a safety net
      if (infoRequestProcessedRef.current) {

        return;
      }


      try {
        const response = await whyWhyApiClient.getThread(sessionId, { noCache: true });
        const thread = response?.data?.data;


        if (thread?.state) {
          const chatHistory = Array.isArray(thread.state.chat_history) ? thread.state.chat_history : [];
          const latestChat = chatHistory[chatHistory.length - 1];
          const aiFollowUp = latestChat?.type === "ai";

          // Process thread data to get full session metadata (owner, requiresVisibilityConfig, etc.)
          const processed = processThreadData(thread);
          const treeMeta = buildTreeMeta(thread.state);

          // Update with the complete thread state
          // If connection_end, update state directly without calling updateFromSSE to avoid setting loading back
          if (isConnectionEnd) {
            // Use shared helper function to process thread state
            const threadState = thread.state;
            if (threadState) {
              setState((prev) => ({
                ...prev,
                ...processThreadStateUpdate(threadState, prev, {
                  processedSession: processed.session,
                  isConnectionEnd: true,
                }),
              }));
            }
          } else if (thread.state.status === "completed") {
            // Use processThreadStateUpdate instead of updateFromSSE to ensure state is updated
            // even if hasFinalizedRef.current is true (prevents early return)
            const threadState = thread.state;
            if (threadState) {
              setState((prev) => {
                const update = processThreadStateUpdate(threadState, prev, {
                  processedSession: processed.session,
                });
                // Add completion system message
                const completionKey = `system-completed-${prev.session?.id ?? sessionId ?? "unknown"}`;
                const chatWithSystem = appendSystemOnce(update.chatHistory, completionKey, COMPLETION_SYSTEM_MESSAGE);
                return {
                  ...prev,
                  ...update,
                  chatHistory: chatWithSystem,
                  status: "completed",
                  session: processed.session,
                };
              });
            }
          } else if (thread.state.status === "waiting_for_input" || aiFollowUp) {
            updateFromSSE("info_request", { state: thread.state }, { source: "stream-end" });
          } else {
            // For other statuses (running, error, or undefined), still update the chat history and status
            // At this point, thread.state.status can only be: "running" | "error" | undefined
            // (completed and waiting_for_input are handled above)
            // thread.state is guaranteed to exist here due to the if check above
            const threadState = thread.state;
            const threadStatus = threadState.status;
            const inferredStatus: AnalysisState["status"] =
              threadStatus === "error"
                ? "error"
                : threadStatus === "running"
                  ? "running"
                  : "idle"; // Default to idle if status is undefined

            setState((prev) => {
              const serverChat = processChatHistory(threadState.chat_history);
              const mergedChat = mergeChatMessages(prev.chatHistory, serverChat);
              return {
                ...prev,
                chatHistory: mergedChat,
                analysisNodes: treeMeta.nodes,
                status: inferredStatus,
                session: processed.session, // Use processed session to get full metadata (owner, requiresVisibilityConfig, etc.)
                loading: { ...prev.loading, message: false, analysis: false },
                ui: {
                  ...prev.ui,
                  isThinking: false,
                  progressMessage: undefined,
                  connectionMessage: undefined,
                  canRetry: false,
                  treeWarning: treeMeta.treeWarning,
                },
              };
            });
          }
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, analysis: false, message: false },
          ui: {
            ...prev.ui,
            isThinking: false,
            progressMessage: undefined,
            connectionMessage: "最新の回答を取得できませんでした。再接続をお試しください。",
            canRetry: true,
          },
        }));
      }
    },
    [sessionId, updateFromSSE],
  );

  const {
    startAnalysis: rawStartAnalysis,
    sendChatMessage,
    cleanup: cleanupSSE,
  } = useSSE({
    sessionId,
    onEnvelope: updateFromSSE,
    onStreamEnd: handleStreamEnd,
    onError: (e?: unknown) => {
      const nerr = normalizeError(e ?? new Error("SSE connection error"));
      const action = mapErrorToUi(nerr);

      // Classify error types for smart recovery
      // Idle timeout: no status code + network-related message
      const isIdleTimeout =
        action.kind === "transient" &&
        (!nerr.httpStatus || nerr.httpStatus === 0) &&
        (nerr.message.toLowerCase().includes("timeout") ||
          nerr.message.toLowerCase().includes("connection") ||
          nerr.message.toLowerCase().includes("network"));

      // Fatal auth errors
      const isFatalError = action.kind === "promptRelogin";

      const uiMessage =
        action.kind === "cooldown"
          ? "リクエストが多すぎます。しばらく待ってから再試行してください。"
          : action.kind === "promptRelogin"
            ? "セッションが切れました。再度ログインしてください。"
            : isIdleTimeout
              ? "接続が切断されました。自動的に再接続します..."
              : "接続エラーが発生しました。もう一度お試しください。";

      setState((prev) => ({
        ...prev,
        // Only set "error" status for fatal failures
        // Preserve current status for idle timeouts to allow automatic recovery
        status: isFatalError ? "error" : prev.status,
        lastError: nerr,
        loading: { session: false, analysis: false, message: false },
        ui: {
          ...prev.ui,
          isThinking: false,
          progressMessage: isIdleTimeout ? "接続が切断されました。再接続中..." : undefined,
          connectionMessage: uiMessage,
          canRetry: true, // Always allow manual retry
        },
      }));

      // Only show toasts for non-idle-timeout errors
      if (!isIdleTimeout) {
        if (action.kind === "promptRelogin") {
          toast.error("Session expired. Please sign in again.");
        } else if (action.kind === "cooldown") {
          maybeToastCooldown(action);
        } else if (action.kind === "link") {
          toast.error(action.label);
        } else if (action.kind === "transient") {
          toast.error(action.message);
        }
      }
    },
  });

  const startAnalysis = useCallback(async () => {
    // Reset flag when starting new analysis stream
    infoRequestProcessedRef.current = false;

    setState((prev) => ({
      ...prev,
      status: prev.status === "idle" ? "running" : prev.status,
      loading: { ...prev.loading, analysis: true },
      ui: {
        ...prev.ui,
        isThinking: true,
        progressMessage: PROGRESS_COPY.analysis_started,
        connectionMessage: undefined,
        canRetry: false,
      },
    }));
    await rawStartAnalysis();
  }, [rawStartAnalysis]);

  const sendMessage = useCallback(
    async (msg: string, is_retry?: boolean) => {
      const trimmed = msg.trim();
      if (!trimmed || hasFinalizedRef.current) return;

      // Reset flag when sending new message (starting new stream)
      infoRequestProcessedRef.current = false;

      const optimisticId = `optimistic-${sessionId ?? "session"}-${optimisticIdRef.current++}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        type: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
        status: "pending",
      };

      // Store previous state for rollback on auth failure
      let previousStatus: AnalysisState["status"] | null = null;

      setState((prev) => {
        previousStatus = prev.status;
        return {
          ...prev,
          status: prev.status === "waiting_for_input" || prev.status === "idle" ? "running" : prev.status,
          loading: { ...prev.loading, message: true },
          chatHistory: [...prev.chatHistory, optimisticMessage],
          ui: {
            ...prev.ui,
            connectionMessage: undefined,
            canRetry: false,
          },
        };
      });

      setState((prev) => ({
        ...prev,
        chatHistory: prev.chatHistory.map((m) => (m.id === optimisticId ? { ...m, status: "sending" as const } : m)),
      }));

      try {
        await sendChatMessage(trimmed, is_retry);
        setState((prev) => {
          const { [optimisticId]: _removed, ...restErrors } = prev.messageErrorById ?? {};
          return {
            ...prev,
            chatHistory: prev.chatHistory.map((m) => (m.id === optimisticId ? { ...m, status: "sent" as const } : m)),
            messageErrorById: restErrors,
          };
        });
      } catch (error) {
        const nerr = (error as any)?.normalized ?? normalizeError(error);
        const isAuthError = nerr.message?.includes("authentication") || nerr.message?.includes("token");

        // If auth error, remove optimistic message; otherwise mark as failed
        setState((prev) => {
          const updatedHistory = isAuthError
            ? prev.chatHistory.filter((m) => m.id !== optimisticId)
            : prev.chatHistory.map((m) =>
              m.id === optimisticId ? { ...m, status: "failed" as const, error: nerr.message } : m,
            );

          return {
            ...prev,
            chatHistory: updatedHistory,
            messageErrorById: isAuthError
              ? prev.messageErrorById
              : { ...(prev.messageErrorById ?? {}), [optimisticId]: nerr as NormalizedError },
            lastError: nerr as NormalizedError,
            status: isAuthError && previousStatus ? previousStatus : prev.status,
            loading: { ...prev.loading, message: false, analysis: false },
            ui: { ...prev.ui, isThinking: false, progressMessage: undefined },
          };
        });

        const action = mapErrorToUi(nerr);
        if (action.kind === "promptRelogin") {
          toast.error("セッションの有効期限が切れました。再度ログインしてください。");
        } else if (action.kind === "cooldown") {
          maybeToastCooldown(action);
        } else if (action.kind === "link") {
          toast.error(action.label);
        } else if (action.kind === "transient") {
          toast.error(action.message);
        } else if (isAuthError) {
          toast.error("認証エラーが発生しました。再度ログインしてください。");
        }
        throw error;
      }
    },
    [sendChatMessage, sessionId],
  );

  const retryMessage = useCallback(
    (messageId: string) => {
      if (hasFinalizedRef.current) return;
      setState((prev) => {
        const message = prev.chatHistory.find((m) => m.id === messageId);
        if (message && message.status === "failed") {
          return {
            ...prev,
            chatHistory: prev.chatHistory.filter((m) => m.id !== messageId),
          };
        }
        return prev;
      });

      const message = state.chatHistory.find((m) => m.id === messageId);
      if (message && message.status === "failed") {
        sendMessage(message.content);
      }
    },
    [sendMessage, state.chatHistory],
  );

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    setState((prev) => ({ ...prev, loading: { ...prev.loading, session: true } }));
    try {
      const res = await whyWhyApiClient.getThread(sessionId);
      const thread = res?.data?.data;
      if (thread) {
        const processed = processThreadData(thread);
        const threadState = thread.state;

        // If thread has state, use processThreadStateUpdate to handle chat history and apply completion logic
        // Pass thread.status as fallback - for old threads, thread.state.status may be undefined
        if (threadState) {
          setState((prev) => {
            const update = processThreadStateUpdate(threadState, prev, {
              processedSession: processed.session,
              threadLevelStatus: thread.status,
            });
            return {
              ...prev,
              ...update,
              ui: {
                ...update.ui,
                hasParent: !!thread.parent_id,
              },
              loading: { ...prev.loading, session: false },
            };
          });
        } else {
          // Fallback: if no state, just update basic info
          const treeMeta = buildTreeMeta(thread.state);
          setState((prev) => ({
            ...prev,
            ...processed,
            analysisNodes: treeMeta.nodes,
            ui: {
              ...prev.ui,
              hasParent: !!thread.parent_id,
              connectionMessage: undefined,
              canRetry: false,
              treeWarning: treeMeta.treeWarning,
            },
            loading: { ...prev.loading, session: false },
          }));
        }
      } else {
        setState((prev) => ({ ...prev, loading: { ...prev.loading, session: false } }));
      }
    } catch (error) {
      const nerr = (error as any)?.normalized ?? normalizeError(error);
      setState((prev) => ({
        ...prev,
        lastError: nerr,
        loading: { ...prev.loading, session: false },
      }));

      // Special case: visibility of this article/thread has changed (backend returns 400 with this message)
      if (nerr.httpStatus === 400 && nerr.message === "THREAD_VISIBILITY_CHANGED") {
        // Let top-level component handle toast and navigation (to avoid window.location + setTimeout here)
        event.emit(EventType.WHYWHY_THREAD_VISIBILITY_CHANGED);
        return;
      }

      const action = mapErrorToUi(nerr);
      if (action.kind === "promptRelogin") {
        toast.error("Session expired. Please sign in again.");
      } else if (action.kind === "cooldown") {
        maybeToastCooldown(action);
      } else if (action.kind === "link") {
        toast.error(action.label);
      } else if (action.kind === "transient") {
        toast.error(action.message);
      }
    }
  }, [sessionId]);

  const derived = useMemo(
    () => ({
      hasParent: !!state.ui.hasParent,
      isStarting: state.status === "running" && state.loading.analysis,
      isSending: state.loading.message,
      isThinking: state.ui.isThinking,
      isAnyLoading: state.loading.session || state.loading.analysis || state.loading.message,
      progressMessage: state.ui.progressMessage,
    }),
    [
      state.loading.analysis,
      state.loading.message,
      state.loading.session,
      state.status,
      state.ui.hasParent,
      state.ui.isThinking,
      state.ui.progressMessage,
    ],
  );

  const actions = useMemo(
    () => ({
      startAnalysis: () => startAnalysis(),
      sendMessage: (msg: string, is_retry?: boolean) => sendMessage(msg, is_retry),
      retryMessage: (messageId: string) => retryMessage(messageId),
      fetchSession,
      updateFromSSE,
      appendSystemOnce: (key: string, content: string) =>
        setState((prev) => ({
          ...prev,
          chatHistory: appendSystemOnce(prev.chatHistory, key, content),
        })),
      handleNodeQuestion: (nodeName: string) => sendMessage(`「${nodeName}」の詳細について教えてください。`),
      setChatHistory: (updater: (prev: ChatMessage[]) => ChatMessage[]) =>
        setState((prev) => ({ ...prev, chatHistory: updater(prev.chatHistory) })),
      setChatMessage: (msg: string) => setState((prev) => ({ ...prev, ui: { ...prev.ui, chatMessage: msg } })),
      setHasAutoStarted: (val: boolean) => setState((prev) => ({ ...prev, ui: { ...prev.ui, hasAutoStarted: val } })),
      setHasParent: (val: boolean) => setState((prev) => ({ ...prev, ui: { ...prev.ui, hasParent: val } })),
      setIsThinking: (val: boolean) => setState((prev) => ({ ...prev, ui: { ...prev.ui, isThinking: val } })),
      cleanup: () => {
        hasFinalizedRef.current = false;
        optimisticIdRef.current = 0;
        setState((prev) => ({
          ...prev,
          ui: {
            ...prev.ui,
            isThinking: false,
            progressMessage: undefined,
            connectionMessage: undefined,
            canRetry: false,
          },
          loading: { ...prev.loading, analysis: false, message: false },
        }));
        cleanupSSE();
      },
    }),
    [cleanupSSE, fetchSession, retryMessage, sendMessage, startAnalysis, updateFromSSE],
  );

  return { state, actions, derived } as const;
}
