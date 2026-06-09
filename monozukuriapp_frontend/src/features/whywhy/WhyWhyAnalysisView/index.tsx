import React, { useState, useEffect, useRef, useMemo, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { Button } from "@/components/whywhy/ui/button";
import { ArrowLeft, MessageSquare, BarChart3, Send, Loader2, Download } from "lucide-react";
import { toast } from "react-toastify";
import { WhyWhyTreeVisualization } from "../components/WhyWhyTreeVisualization";
import { useAppSelector } from "@/store/redux";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import ChatMessage from "../components/ChatMessage";
import { RootState } from "@/store/store";
import { ImperativePanelGroupHandle, Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import ProblemInfo from "../components/ProblemInfo";
import ReferenceCasesPanel from "../components/ReferenceCasesPanel";
import { useAnalysisState } from "../hooks/useAnalysisState";
import LoadingState from "@/components/LoadingState";
import type { WhyNode } from "../types";
import { mapErrorToUi, type NormalizedError } from "@/utils/errorHandling";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThinkingIndicator } from "../components/ThinkingIndicator";
import { StageIndicator, inferCurrentStage } from "../components/StageIndicator";
import { exportWhyWhyToExcel } from "../utils/exportWhyWhyToExcel";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Button as MuiButton, Box, CircularProgress, Typography } from "@mui/material";
import VisibilitySettingsDialog from "../components/VisibilitySettingsDialog";
import RootCauseVisibilityDialog from "../components/RootCauseVisibilityDialog";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import event from "@/utils/eventEmitter";
import { EventType } from "@/constant/enum";

const WhyWhyAnalysisView: React.FC = () => {
  const { sessionId: rawSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const createdFromChild = location.state?.createdFromChild || false;
  // Check both direct state and originState (from report pages)
  const fromInternalCases =
    location.state?.fromInternalCases || location.state?.originState?.fromInternalCases || false;

  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const userId = useAppSelector((state: RootState) => state.auth.user.id);
  const usingWhyWhy = (userRole?.WHYWHY_CREATE_PAGE && userRole?.WHYWHY_DOWNLOAD_TEMPLATE_FILE) || false;

  // Stabilize sessionId to prevent unnecessary re-renders
  const sessionId = useMemo(() => {
    return rawSessionId;
  }, [rawSessionId]);

  const { state, actions, derived } = useAnalysisState(sessionId);
  const cleanupRef = useRef(actions.cleanup);
  const fetchSessionRef = useRef(actions.fetchSession);
  // Keep latest handlers without causing effects to re-run on actions identity changes
  useEffect(() => {
    cleanupRef.current = actions.cleanup;
    fetchSessionRef.current = actions.fetchSession;
  }, [actions.cleanup, actions.fetchSession]);
  const isLoadingSSE = !!(state.loading.analysis || state.loading.message);
  const analysisStatus = state.status as any;

  // Check if there is any node with is_root_cause === true
  const hasRootCause = useMemo(() => {
    return state.analysisNodes.some((node: WhyNode) => node.is_root_cause === true);
  }, [state.analysisNodes]);

  // Dialog state for export confirmation
  const [openExportDialog, setOpenExportDialog] = useState(false);

  // Visibility settings dialog state
  const [openVisibilityDialog, setOpenVisibilityDialog] = useState(false);
  const [openRootCauseDialog, setOpenRootCauseDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [pendingNavigationState, setPendingNavigationState] = useState<any>(null);
  const visibilitySettingsSavedRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const pageRef = useRef<string | null>(null);

  // Rely on centralized hook loading state; avoid local duplicates that can drift
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const processedSessionIdRef = useRef<string | null>(null);
  const componentMountedRef = useRef(false);
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mountAtRef = useRef<number | null>(null);

  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  // Handle global events (e.g., visibility changed redirect)
  useEffect(() => {
    const handler = () => {
      toast.error("この記事は公開範囲が変更されました。もう一度お試しください。");
      navigate("/whywhy");
    };

    event.on(EventType.WHYWHY_THREAD_VISIBILITY_CHANGED, handler);

    return () => {
      event.off(EventType.WHYWHY_THREAD_VISIBILITY_CHANGED, handler);
    };
  }, [navigate]);

  useEffect(() => {
    setBreadcrumbItems([
      {
        label: "なぜなぜ分析",
        href: "#",
        onClick: () => {
          const sessionData = state.session as any;
          const sessionOwnerId =
            sessionData?.ownerId || (typeof sessionData?.owner === "object" ? sessionData?.owner?.id : undefined);
          const requiresVisibilityConfig =
            sessionData?.requiresVisibilityConfig ?? sessionData?.requires_visibility_config ?? false;
          const isOwner = sessionOwnerId === userId;

          if (isOwner && requiresVisibilityConfig) {
            setPendingNavigation("/whywhy");
            setOpenRootCauseDialog(true);
          } else {
            navigate("/whywhy");
          }
        },
      },
      { label: "分析チャット", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate, state.session, userId]);

  // Render chat directly from centralized state
  const chatMessages = state.chatHistory as any[];
  // Backward-compat: provide a setChatMessages alias that proxies to actions.setChatHistory
  const setChatMessages = React.useCallback(
    (updater: any) => {
      if (typeof updater === "function") {
        actions.setChatHistory((prev: any[]) => updater(prev));
      } else {
        actions.setChatHistory(() => updater);
      }
    },
    [actions],
  );
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const isAnchorVisibleRef = useRef(true);

  // Helper function to stop all loading states
  const stopAllLoading = () => {
    actions.setHasAutoStarted(false);
    actions.setIsThinking(false);
    processedSessionIdRef.current = null;
    componentMountedRef.current = false;
  };

  // Helper function to stop loading states immediately
  // const stopLoadingStates = () => {
  //   actions.setHasAutoStarted(false);
  //   actions.setIsThinking(false);
  // };

  // diagnostics: log initial load timing
  useEffect(() => {
    if (state.session && mountAtRef.current) {
      mountAtRef.current = null;
    }
  }, [state.session]);

  // Setup IntersectionObserver to track bottom anchor visibility
  // This replaces the old scroll event listener for better performance and accuracy
  useEffect(() => {
    const anchor = bottomAnchorRef.current;
    const container = chatScrollRef.current;

    if (!anchor || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isAnchorVisibleRef.current = entry.isIntersecting;
      },
      {
        root: container, // Observe within the scroll container
        threshold: 0, // Trigger when any part of anchor is visible
        rootMargin: "0px",
      },
    );

    observer.observe(anchor);

    // Initialize as visible (assume user starts at bottom)
    isAnchorVisibleRef.current = true;

    return () => {
      observer.disconnect();
    };
  }, []);

  // Auto-scroll when new messages arrive, only if anchor is visible (user at bottom)
  // Using 'auto' behavior instead of 'smooth' to prevent jitter during rapid streaming
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    // Only auto-scroll if user is at bottom (anchor visible)
    if (isAnchorVisibleRef.current) {
      // Use instant scroll during streaming for smoother experience
      // 'auto' behavior prevents jitter during rapid message updates
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "auto",
      });
    }
  }, [chatMessages.length, chatMessages]);

  useEffect(() => {
    if (sessionId && processedSessionIdRef.current !== sessionId && !componentMountedRef.current) {
      processedSessionIdRef.current = sessionId;
      componentMountedRef.current = true;
      actions.setHasAutoStarted(false);
      mountAtRef.current = Date.now();

      // Add a small delay to prevent rapid re-renders
      setTimeout(() => {
        if (processedSessionIdRef.current === sessionId) {
          fetchSessionRef.current?.();
        }
      }, 100);
    }
  }, [sessionId]);

  // Initial loading aggregation and long-wait timeout
  // Be defensive: hide overlay if session data is already present
  const isInitialLoading = state.loading.session && !state.session;
  useEffect(() => {
    let timer: any;
    if (isInitialLoading) {
      setWaitedTooLong(false);
      timer = setTimeout(() => setWaitedTooLong(true), 8000);
    } else {
      setWaitedTooLong(false);
    }
    return () => timer && clearTimeout(timer);
  }, [isInitialLoading]);

  // Reset visibilitySettingsSavedRef when sessionId changes (component remount or new session)
  useEffect(() => {
    visibilitySettingsSavedRef.current = false;
    isNavigatingRef.current = false;
  }, [sessionId]);

  // Auto-open visibility dialog when analysis is completed
  useEffect(() => {
    // Check if analysis is completed
    if (state.status !== "completed" || !state.session?.id) {
      return;
    }

    // Don't show if already saved
    if (visibilitySettingsSavedRef.current) {
      return;
    }

    // Don't show if dialog is already open
    if (openVisibilityDialog) {
      return;
    }

    // Don't show if there's a pending navigation (user is trying to navigate away)
    if (pendingNavigation || isNavigatingRef.current) {
      return;
    }

    // Check if publicScope is not set or is "private" (default)
    const sessionData = state.session as any;
    const publicScope = sessionData.publicScope || sessionData.public_scope || "private";

    // Only show if not already set to a non-private value
    if (publicScope === "private" || !publicScope || publicScope === null) {
      // Add a small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setOpenVisibilityDialog(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [state.status, state.session?.id, state.session, openVisibilityDialog, sessionId, pendingNavigation]);

  // Check if navigation should be intercepted: requiresVisibilityConfig === true && user is owner
  const sessionData = state.session as any;
  const sessionOwnerId =
    sessionData?.ownerId || (typeof sessionData?.owner === "object" ? sessionData?.owner?.id : undefined);
  const requiresVisibilityConfig =
    sessionData?.requiresVisibilityConfig ?? sessionData?.requires_visibility_config ?? false;
  const isOwner = sessionOwnerId === userId;
  const shouldInterceptNavigation = isOwner && requiresVisibilityConfig;

  // Intercept navigation/close tab when requiresVisibilityConfig = true (only for owner)
  useEffect(() => {
    if (!state.session?.id || !userId) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show browser prompt if shouldInterceptNavigation is true
      if (shouldInterceptNavigation) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    // Push state to enable popstate interception (only if shouldInterceptNavigation is true)
    if (shouldInterceptNavigation) {
      window.history.pushState(null, "", window.location.href);
    }

    const handlePopState = (e: PopStateEvent) => {
      // Only intercept if shouldInterceptNavigation is true
      if (shouldInterceptNavigation) {
        // Prevent navigation and show modal
        window.history.pushState(null, "", window.location.href);
        setPendingNavigation(window.location.pathname);
        setOpenRootCauseDialog(true);
      }
    };

    // Listen for navigation events from Sidebar (similar to SingleMode)
    const handleNavigationEvent = (path: string) => {
      // If already navigating after save, navigate directly without intercepting
      if (isNavigatingRef.current) {
        navigate(path);
        return;
      }
      // Only intercept if shouldInterceptNavigation is true
      if (shouldInterceptNavigation) {
        pageRef.current = path;
        setPendingNavigation(path);
        setOpenRootCauseDialog(true);
      } else {
        // If not intercepting, navigate directly
        navigate(path);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    if (shouldInterceptNavigation) {
      window.addEventListener("popstate", handlePopState);
    }
    event.on(EventType.PARETO_CHECK_SAVE_DATA, handleNavigationEvent);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      event.removeListener(EventType.PARETO_CHECK_SAVE_DATA, handleNavigationEvent);
    };
  }, [state.session?.id, userId, shouldInterceptNavigation, navigate]);

  // Cleanup when component unmounts or sessionId changes
  useEffect(() => {
    return () => {
      stopAllLoading();
      cleanupRef.current?.();
    };
  }, [sessionId]);

  // const handleStartAnalysis = async () => {
  //   if (!sessionId) {
  //     return;
  //   }

  //   if (processedSessionIdRef.current && processedSessionIdRef.current !== sessionId) {
  //     return;
  //   }

  //   // Additional check to prevent duplicate calls
  //   if (state.ui.hasAutoStarted && state.status !== "idle") {
  //     return;
  //   }

  //   // Additional check for session status
  //   if (state.status === "completed") {
  //     return;
  //   }

  //   // Additional check for waiting status
  //   if (state.status === "waiting_for_input") {
  //     return;
  //   }

  //   // Allow child threads with in_progress status to start analysis
  //   if (
  //     (state.session?.status as string) === "in_progress" &&
  //     !state.session?.analysisData?.chat_history?.length &&
  //     !state.session?.analysisData?.why_nodes?.length
  //   ) {
  //     // New child thread; allow start
  //   } else if ((state.session?.status as string) === "in_progress") {
  //     return;
  //   }

  //   try {
  //     await actions.startAnalysis();
  //     toast.info("分析を開始しました");
  //   } catch (error) {
  //     toast.error("分析の開始に失敗しました");
  //     stopAllLoading();
  //   }
  // };

  const handleReconnectStream = async () => {
    if (!state.ui.canRetry) return;
    try {
      if (state.status === "waiting_for_input") {
        await actions.fetchSession();
      } else {
        await actions.startAnalysis();
      }
      toast.info("再接続を試みています...");
    } catch (error) {
      toast.error("再接続に失敗しました");
    }
  };

  const handleSendChatMessage = async () => {
    if (state.status === "completed") return;
    if (!state.ui.chatMessage.trim()) return;
    // Prevent multiple simultaneous sends
    if (derived.isSending || derived.isThinking) return;

    const messageToSend = state.ui.chatMessage;
    try {
      actions.setChatMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      // Ensure the latest message and loader are visible
      // Scroll to bottom - IntersectionObserver will automatically update isAnchorVisibleRef
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }
      await actions.sendMessage(messageToSend);
    } catch (error) {
      toast.error("メッセージの送信に失敗しました");
      stopAllLoading();
    }
  };

  const handleAskNodeQuestion = async (node: WhyNode) => {
    if (state.status === "completed") return;
    const question = `「${node.name}」の原因について詳しく教えてください。`;
    try {
      await actions.sendMessage(question);
    } catch (error) {
      toast.error("メッセージの送信に失敗しました");
      stopAllLoading();
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    actions.setChatHistory((prev: any[]) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, content: newContent } : msg)),
    );
    if (newContent.trim() !== "") {
      await handleAskCustomQuestion(newContent.trim());
    }
  };

  const handleAskCustomQuestion = async (question: string) => {
    if (state.status === "completed") return;
    try {
      await actions.sendMessage(question, true);
    } catch (error) {
      toast.error("メッセージの送信に失敗しました");
      // Chat history is managed in the hook; nothing to rollback here as sendMessage handles it
      stopAllLoading();
    }
  };

  const goBack = () => {
    // Check if navigation should be intercepted
    if (shouldInterceptNavigation) {
      setPendingNavigation("/whywhy");
      setOpenRootCauseDialog(true);
      return;
    }

    stopAllLoading();
    cleanupRef.current?.();

    // If coming from internal cases, return to search page with saved state
    // Check both direct state and originState (from report pages)
    const returnPath = location.state?.returnPath || location.state?.originState?.returnPath;
    const searchState = location.state?.searchState || location.state?.originState?.searchState;
    if (fromInternalCases && returnPath) {
      navigate(returnPath, {
        state: searchState ? { searchState } : undefined,
      });
      return;
    }

    // If has problem data, go to create page (初期情報インプット)
    if (state.session?.analysisData?.problem) {
      navigate(`/whywhy/create`, {
        state: {
          prefillData: {
            title: state.session.analysisData.problem.title,
            description: state.session.analysisData.problem.description,
            process: state.session.analysisData.problem.process,
            location: state.session.analysisData.problem.location,
            severity: state.session.analysisData.problem.severity,
            frequency: state.session.analysisData.problem.frequency,
            impact: state.session.analysisData.problem.impact,
            product_name: state.session.analysisData.problem.product_name,
            occurrence_date: state.session.analysisData.problem.occurrence_date,
            man_details: state.session.analysisData.problem.man_details,
            machine_details: state.session.analysisData.problem.machine_details,
            material_details: state.session.analysisData.problem.material_details,
            method_details: state.session.analysisData.problem.method_details,
            measurement_details: state.session.analysisData.problem.measurement_details,
            environment_details: state.session.analysisData.problem.environment_details,
            timeline_analysis: state.session.analysisData.problem.timeline_analysis,
            defect_types: state.session.analysisData.problem.defect_types,
            frequency_percentage: state.session.analysisData.problem.frequency_percentage,
            investigations: state.session.analysisData.problem.investigations,
            direct_cause: state.session.analysisData.problem.direct_cause,
            verification: state.session.analysisData.problem.verification,
            language: state.session.analysisData.problem.language,
          },
          goToStep: 3,
        },
      });
    } else {
      window.history.back();
    }
  };

  // Single hook already updates state.chatHistory; no duplicate hook or interleaving here

  return (
    <LoadingState
      isLoading={isInitialLoading}
      overlay
      message={waitedTooLong ? "処理を実行中です。しばらくお待ちください..." : "セッションを読み込み中..."}
    >
      <div className="flex bg-gray-50 h-[calc(100vh-88px)]">
        <PanelGroup
          autoSaveId="whywhy-panel-group"
          direction="horizontal"
          ref={panelGroupRef}
        >
          {/* Left Panel - Chat/Analysis */}
          <Panel
            defaultSize={35}
            minSize={20}
            className="flex flex-col p-4 min-w-[220px]"
          >
            <div className="flex h-full flex-col bg-white shadow-lg rounded-xl">
              <div className="border-b p-6">
                <div className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                  <span>分析チャット</span>
                </div>
              </div>

              {/* Inline standardized error banner */}
              {state.lastError && (
                <div className="px-6 pt-4">
                  {(() => {
                    const action = mapErrorToUi(state.lastError as NormalizedError);
                    if (action.kind === "promptRelogin") {
                      return (
                        <div className="rounded-md border border-red-200 bg-red-50 text-red-800 p-3 text-sm flex items-center justify-between">
                          <span>セッションの有効期限が切れました。再ログインしてください。</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/login")}
                            aria-label="再ログインへ移動"
                          >
                            ログイン
                          </Button>
                        </div>
                      );
                    }
                    if (action.kind === "cooldown") {
                      return (
                        <div className="rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800 p-3 text-sm">
                          リクエストが多すぎます。しばらく待ってから再試行してください
                          {action.retryAfterMs ? `（約${Math.round((action.retryAfterMs || 0) / 1000)}秒）` : ""}。
                        </div>
                      );
                    }
                    if (action.kind === "link") {
                      return (
                        <div className="rounded-md border border-gray-200 bg-gray-50 text-gray-800 p-3 text-sm flex items-center justify-between">
                          <span>{action.label}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(action.to)}
                            aria-label="詳細ページへ移動"
                          >
                            開く
                          </Button>
                        </div>
                      );
                    }
                    // transient or others
                    return (
                      <div className="rounded-md border border-gray-200 bg-gray-50 text-gray-800 p-3 text-sm">
                        {(state.lastError as NormalizedError).message}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex-1 flex flex-col p-6 pb-0 overflow-y-auto">
                <div className="space-y-4 flex flex-col h-full">
                  {/* Stage Progress Indicator - shows analysis phase */}
                  {state.status === "running" && state.ui.progressMessage && (
                    <StageIndicator
                      currentStage={inferCurrentStage(state.ui.progressMessage)}
                      className="mb-4"
                    />
                  )}

                  {state.ui.connectionMessage && (
                    <div className="rounded-md border border-red-200 bg-red-50 text-red-800 p-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>{state.ui.connectionMessage}</span>
                      {state.ui.canRetry && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-100"
                          onClick={handleReconnectStream}
                          disabled={derived.isSending || derived.isThinking || isInitialLoading}
                        >
                          再接続
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Chat Messages */}
                  <div
                    ref={chatScrollRef}
                    className="relative flex-1 overflow-y-auto space-y-2 min-h-64 lg:min-h-0 py-2"
                    role="log"
                    aria-live="polite"
                    aria-label="分析チャット履歴"
                  >
                    {isInitialLoading ? (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse"
                          >
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        ))}
                      </>
                    ) : state.analysisNodes.length > 0 && chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-8">
                        <div className="text-center">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            チャット履歴の取得中にエラーが発生しました
                          </h3>
                          <p className="text-gray-500">
                            チャット履歴を取得できませんでした。ページをリロードして再試行してください。
                          </p>
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((message, index) => (
                        <ChatMessage
                          key={message.id || index}
                          message={message}
                          onEditMessage={handleEditMessage}
                          setChatMessages={setChatMessages}
                          index={index}
                          onAskQuestion={state.status === "completed" ? undefined : handleAskCustomQuestion}
                          onRetry={actions.retryMessage}
                          willCreateFork={index < chatMessages.length - 1}
                          chatDisabled={isInitialLoading || derived.isSending || !usingWhyWhy || !isOwner}
                        />
                      ))
                    )}

                    {/* AI Thinking Indicator - shows real-time thought process */}
                    {!isInitialLoading && (
                      <ThinkingIndicator
                        isThinking={
                          (derived.isStarting || derived.isSending || isLoadingSSE || derived.isThinking) &&
                          state.status !== "waiting_for_input" &&
                          state.status !== "completed" &&
                          state.status !== "error" &&
                          state.status !== "connection_end"
                        }
                        progressMessage={derived.progressMessage}
                        className="mx-2 mb-4"
                      />
                    )}

                    {/* ARIA Live Region for screen readers - accessibility enhancement */}
                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      className="sr-only"
                    >
                      {state.ui.progressMessage
                        ? `現在の状態: ${state.ui.progressMessage}${
                            state.ui.currentThought && state.ui.currentThought.length <= 100
                              ? `. 詳細: ${state.ui.currentThought}`
                              : ""
                          }`
                        : ""}
                    </div>

                    {/* Anchor element for IntersectionObserver - MUST be last element */}
                    <div
                      ref={bottomAnchorRef}
                      style={{ height: "1px", visibility: "hidden" }}
                      aria-hidden="true"
                    />
                  </div>
                  {/* Chat Input */}
                  <div className="flex space-x-2 !mb-3">
                    <textarea
                      ref={textareaRef}
                      value={state.ui.chatMessage}
                      rows={1}
                      aria-label="メッセージ入力"
                      onChange={(e) => {
                        actions.setChatMessage(e.target.value);
                        const textarea = e.target;
                        textarea.style.height = "auto";
                        const maxHeight = 128;
                        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
                        textarea.style.height = `${newHeight}px`;

                        if (textarea.scrollHeight > maxHeight) {
                          textarea.style.overflowY = "auto";
                        } else {
                          textarea.style.overflowY = "hidden";
                        }
                      }}
                      placeholder={
                        !isOwner
                          ? "このスレッドの編集はオーナーのみ可能です"
                          : state.status === "completed"
                            ? "分析完了 - チャットは無効です"
                            : derived.isSending
                              ? "送信中..."
                              : "メッセージを入力..."
                      }
                      disabled={
                        isInitialLoading ||
                        derived.isSending ||
                        state.status === "completed" ||
                        !usingWhyWhy ||
                        !isOwner
                      }
                      className={`max-h-32 min-h-[38px] overflow-y-hidden flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        state.status === "completed" || !isOwner ? "bg-gray-100 cursor-not-allowed" : ""
                      }  !bg-[unset]`}
                    />

                    <Button
                      className="mt-auto"
                      onClick={handleSendChatMessage}
                      disabled={
                        isInitialLoading ||
                        !state.ui.chatMessage.trim() ||
                        derived.isSending ||
                        isLoadingSSE ||
                        state.status === "completed" ||
                        !isOwner
                      }
                      size="sm"
                      aria-label="メッセージを送信"
                      aria-disabled={
                        isInitialLoading ||
                        !state.ui.chatMessage.trim() ||
                        derived.isSending ||
                        isLoadingSSE ||
                        state.status === "completed" ||
                        !isOwner
                      }
                    >
                      <Loader2 className={`${derived.isSending ? "" : "hidden"} w-4 h-4 animate-spin`} />
                      <Send className={`${derived.isSending ? "hidden" : ""} w-4 h-4`} />
                    </Button>
                  </div>
                </div>
              </div>

              {/*
            <div className="border-t bg-gray-50 p-4">
              <Button
                onClick={handleStartAnalysis}
                disabled={isStartingAnalysis}
                className={`w-full transition-all duration-200 ${
                  state.status === "waiting_for_input"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : isStartingAnalysis
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Loader2 className={`${isStartingAnalysis ? "" : "hidden"} w-5 h-5 animate-spin`} />
                <div className={`${isStartingAnalysis ? "hidden" : "flex"} justify-center items-center`}>
                  <Play className="w-4 h-4 mr-2" />
                  <span>AI分析開始</span>
                </div>
              </Button>

              {!isStartingAnalysis && state.status === "waiting_for_input" && (
                <p className="text-xs text-gray-500 mt-2 text-center">AIからの質問に回答してください</p>
              )}
            </div>
            */}
            </div>
          </Panel>

          <PanelResizeHandle className="w-[5px] h-full bg-gray-300 cursor-col-resize hover:bg-gray-400 mx-[2.5px]" />

          {/* Right Panel - Tree Visualization */}
          <Panel
            defaultSize={65}
            minSize={14}
            className="p-4 space-y-4 !overflow-y-auto "
          >
            {/* Header */}
            <div className="flex items-center justify-between w-full flex-wrap">
              <div
                className={`flex items-center space-x-4 w-[calc(100%-200px)] min-w-[200px] max-w-[82%] ${
                  (analysisStatus === "running" || isLoadingSSE || state.ui.isThinking) &&
                  analysisStatus !== "completed" &&
                  "max-w-[70%]"
                }`}
              >
                <Button
                  onClick={goBack}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>戻る</span>
                </Button>
                <div className="flex w-[calc(100%-100px)]">
                  <h1 className="text-3xl font-bold text-gray-900 min-w-0 break-words whitespace-normal">
                    {state.session?.title || (location.state as any)?.preTitle}
                  </h1>
                  {/* <p className="text-gray-600">セッションID: {state.session?.id}</p> */}
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-3">
                {(analysisStatus === "running" || isLoadingSSE || state.ui.isThinking) &&
                  analysisStatus !== "completed" && (
                    <div className="flex items-center text-sm text-blue-600 min-w-[75px]">
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" /> 分析中…
                    </div>
                  )}
                {state.session?.analysisData?.problem && !createdFromChild && !state.ui.hasParent && (
                  <Button
                    onClick={() => {
                      if (state.session?.id) {
                        const targetPath = `/whywhy/create?parentId=${state.session.id}`;
                        const navigationState = {
                          prefillData: {
                            title: state?.session?.analysisData?.problem?.title,
                            description: state?.session?.analysisData?.problem?.description,
                            process: state?.session?.analysisData?.problem?.process,
                            location: state?.session?.analysisData?.problem?.location,
                            severity: state?.session?.analysisData?.problem?.severity,
                            frequency: state?.session?.analysisData?.problem?.frequency,
                            impact: state?.session?.analysisData?.problem?.impact,
                          },
                          goToStep: 3,
                        };

                        // Check if navigation should be intercepted
                        if (shouldInterceptNavigation) {
                          setPendingNavigation(targetPath);
                          setPendingNavigationState(navigationState);
                          setOpenRootCauseDialog(true);
                          return;
                        }

                        // Navigate to step 1 with pre-filled data
                        navigate(targetPath, {
                          state: navigationState,
                        });
                      }
                    }}
                    variant="outline"
                    className="bg-green-600 text-white  hover:bg-green-700"
                    size="sm"
                  >
                    再生成
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (state.session?.id) {
                      const targetPath = `/report-creation-page/${state.session.id}`;
                      // Pass origin state if coming from internal cases
                      const originState =
                        fromInternalCases && location.state?.returnPath
                          ? {
                              fromInternalCases: true,
                              returnPath: location.state.returnPath,
                              searchState: location.state?.searchState,
                            }
                          : undefined;

                      const navigationState = {
                        threadPrefetch: {
                          thread_id: state.session.id,
                          status: state.session.status,
                          created_at: state.session.createdAt,
                          updated_at: state.session.updatedAt,
                          state: state.session.analysisData,
                        },
                        originState: originState,
                      };

                      // Check if navigation should be intercepted
                      if (shouldInterceptNavigation) {
                        setPendingNavigation(targetPath);
                        setPendingNavigationState(navigationState);
                        setOpenRootCauseDialog(true);
                        return;
                      }

                      navigate(targetPath, {
                        state: navigationState,
                      });
                    }
                  }}
                  variant="outline"
                  className="bg-blue-600 text-white "
                  size="sm"
                >
                  レポート
                </Button>
              </div>
            </div>
            <ProblemInfo
              session={state.session}
              fromInternalCases={fromInternalCases}
            />
            <ReferenceCasesPanel chunks={state.retrievedContext} />
            {/* Tree Visualization */}
            <div className="flex-grow">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex justify-between flex-wrap gap-2">
                    <CardTitle>Why-Why分析ツリー</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenExportDialog(true)}
                      disabled={!hasRootCause}
                      className="!break-words !whitespace-normal"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      エクセルファイル出力
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="h-full">
                  {isInitialLoading ? (
                    <div className="h-full flex flex-col">
                      <div className="animate-pulse w-full flex-1 bg-gray-100 rounded" />
                      {waitedTooLong && (
                        <div className="mt-4 text-center flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setWaitedTooLong(false);
                              fetchSessionRef.current?.();
                            }}
                          >
                            再試行
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : state.analysisNodes.length > 0 ? (
                    <WhyWhyTreeVisualization
                      nodes={state.analysisNodes as any}
                      className="h-[calc(100vh-220px)]"
                      onAskNodeQuestion={state.status === "completed" ? undefined : handleAskNodeQuestion}
                      isCompleted={state.status === "completed"}
                    />
                  ) : (
                    <div className="border-dashed border-2 border-gray-300 h-full flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">分析データがありません</h3>
                        <p className="text-gray-500">分析を開始すると、ここにWhy-Why分析ツリーが表示されます</p>
                        {state.ui.treeWarning && <p className="text-amber-600 text-sm mt-2">{state.ui.treeWarning}</p>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Problem Info Card */}
          </Panel>
        </PanelGroup>
      </div>
      {/* Export Confirmation Dialog */}
      <Dialog
        open={openExportDialog}
        onClose={() => setOpenExportDialog(false)}
      >
        <DialogTitle>確認</DialogTitle>
        <DialogContent>
          <DialogContentText>なぜなぜ分析をエクセルファイルとして出力してもよろしいでしょうか？</DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton
            onClick={() => setOpenExportDialog(false)}
            color="primary"
            className="focus:outline-none"
          >
            いいえ
          </MuiButton>
          <MuiButton
            onClick={async () => {
              setOpenExportDialog(false);
              try {
                await exportWhyWhyToExcel(state.analysisNodes as any);
              } catch (error) {
                console.error("Error exporting to Excel:", error);
                toast.error("エクセルファイルの出力に失敗しました");
              }
            }}
            color="primary"
            className="focus:outline-none"
            autoFocus
          >
            はい
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Visibility Settings Dialog */}
      {state.session?.id && (
        <VisibilitySettingsDialog
          open={openVisibilityDialog}
          threadId={state.session.id}
          currentPublicScope={(state.session as any).publicScope || (state.session as any).public_scope}
          currentHideAuthorName={(state.session as any).hideAuthorName || (state.session as any).hide_author_name}
          onClose={() => {
            // Don't allow closing without saving if visibility settings not saved
            if (!visibilitySettingsSavedRef.current) {
              // If user tries to close without saving, save with default settings
              const defaultScope = "company";
              const defaultHideAuthor = false;
              whyWhyApiClient
                .updateVisibilitySettings(state.session!.id, defaultScope, defaultHideAuthor)
                .then(async () => {
                  // Fetch session to update state after save
                  await fetchSessionRef.current?.();
                  visibilitySettingsSavedRef.current = true;
                  setOpenVisibilityDialog(false);
                  // If there was a pending navigation, execute it
                  if (pendingNavigation) {
                    const navPath = pendingNavigation;
                    setPendingNavigation(null);
                    isNavigatingRef.current = true;
                    // Wait a bit for state to update and useEffect to re-run
                    setTimeout(() => {
                      navigate(navPath);
                      setTimeout(() => {
                        isNavigatingRef.current = false;
                      }, 100);
                    }, 100);
                  }
                })
                .catch((error) => {
                  console.error("Error auto-saving visibility settings:", error);
                  setOpenVisibilityDialog(false);
                  if (pendingNavigation) {
                    const navPath = pendingNavigation;
                    setPendingNavigation(null);
                    isNavigatingRef.current = true;
                    setTimeout(() => {
                      navigate(navPath);
                      setTimeout(() => {
                        isNavigatingRef.current = false;
                      }, 100);
                    }, 100);
                  }
                });
            } else {
              setOpenVisibilityDialog(false);
              // If there was a pending navigation, execute it
              if (pendingNavigation) {
                const navPath = pendingNavigation;
                setPendingNavigation(null);
                isNavigatingRef.current = true;
                setTimeout(() => {
                  navigate(navPath);
                  setTimeout(() => {
                    isNavigatingRef.current = false;
                  }, 100);
                }, 100);
              }
            }
          }}
          onSave={async (publicScope, hideAuthorName) => {
            // Visibility settings are saved via API, fetch session to update state
            await fetchSessionRef.current?.();
            visibilitySettingsSavedRef.current = true;
            setOpenVisibilityDialog(false);
            // If there was a pending navigation, execute it
            if (pendingNavigation) {
              const navPath = pendingNavigation;
              setPendingNavigation(null);
              isNavigatingRef.current = true;
              // Wait a bit for state to update and useEffect to re-run with new shouldInterceptNavigation
              setTimeout(() => {
                navigate(navPath);
                // Clear flag after navigation
                setTimeout(() => {
                  isNavigatingRef.current = false;
                }, 100);
              }, 100);
            }
          }}
        />
      )}

      {/* Root Cause Visibility Dialog - Only show for owner */}
      {state.session?.id && isOwner && (
        <RootCauseVisibilityDialog
          open={openRootCauseDialog}
          threadId={state.session.id}
          currentPublicScope={state.session.publicScope || "private"}
          currentHideAuthorName={state.session.hideAuthorName ?? false}
          onClose={() => {
            setOpenRootCauseDialog(false);
          }}
          onSave={async (publicScope, hideAuthorName) => {
            setOpenRootCauseDialog(false);

            // If there was a pending navigation, execute it immediately
            // Don't wait for fetchSession as it can take 1-30s, and API already updated the settings
            if (pendingNavigation) {
              const navPath = pendingNavigation;
              const navState = pendingNavigationState;

              // Clear pending navigation first
              setPendingNavigation(null);
              setPendingNavigationState(null);

              // Set flag to bypass intercept during navigation (API already saved, so shouldInterceptNavigation will be false after fetchSession)
              isNavigatingRef.current = true;

              // Navigate immediately - don't wait for fetchSession
              navigate(navPath, {
                state: navState || undefined,
              });

              // Clear flag after navigation completes
              setTimeout(() => {
                isNavigatingRef.current = false;
              }, 200);
            }

            // Fetch session in background to update state (non-blocking)
            // This ensures UI is updated but doesn't block navigation
            fetchSessionRef.current?.().catch((error) => {
              console.error("Error fetching session after save:", error);
            });
          }}
        />
      )}

      {/* Chat Loading Dialog - Blocks interaction while chat is processing */}
      <Dialog
        open={state.loading.message || (state.status === "running" && state.loading.analysis && !state.ui.isThinking)}
        disableEscapeKeyDown
        disableAutoFocus
        onClose={(e, reason) => {
          // Prevent closing by clicking backdrop or pressing ESC
          if (reason === "backdropClick" || reason === "escapeKeyDown") {
            return;
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            padding: 3,
            minWidth: 320,
            textAlign: "center",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
          },
        }}
        sx={{
          zIndex: 9999,
        }}
      >
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 2,
            }}
          >
            <CircularProgress
              size={48}
              sx={{ color: "#4B73FF" }}
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#2A4073",
                fontSize: "18px",
              }}
            >
              分析を実行中...
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#5F6D7E",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              AIが回答を生成しています。
              <br />
              しばらくお待ちください。
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </LoadingState>
  );
};

// Wrap with ErrorBoundary to prevent white screen on render errors
const WhyWhyAnalysisViewWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary>
      <WhyWhyAnalysisView />
    </ErrorBoundary>
  );
};

export default WhyWhyAnalysisViewWithErrorBoundary;
