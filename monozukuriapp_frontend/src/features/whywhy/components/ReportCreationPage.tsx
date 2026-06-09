import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Clipboard, ArrowLeft, FileText, UploadCloud, Check, X, RefreshCw } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";

interface UploadedImage {
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  caption: string;
}

interface ThreadData {
  thread_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  state: {
    problem?: {
      title?: string;
      description?: string;
    };
    why_nodes?: any[];
    root_causes?: any[];
    chat_history?: any[];
  };
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const ReportCreationPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation() as any;
  // Thread data state
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);

  // State
  const [supplementText, setSupplementText] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [showDialogLog, setShowDialogLog] = useState(true);
  const [showRelatedData, setShowRelatedData] = useState(true);
  const [showFreeText, setShowFreeText] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "なぜなぜ分析レポート作成", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch thread data function
  const fetchThreadData = useCallback(async () => {
    if (!threadId) {
      setThreadError("Thread IDが無効です");
      setIsLoadingThread(false);
      return;
    }

    try {
      setIsLoadingThread(true);
      setThreadError(null);

      // Use prefetched state if present
      const pre = location?.state?.threadPrefetch;
      if (pre && pre.thread_id === threadId && pre.state) {
        setThreadData(pre);
        setIsLoadingThread(false);
        return;
      }
      // Retry a few times to avoid transient 0/empty responses after completion
      let lastData: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const noCache = attempt === 0;
        try {
          const response = await whyWhyApiClient.getThread(threadId, { noCache });
          if (response?.data?.data) {
            lastData = response.data.data;
            break;
          }
        } catch {}
        // small backoff
        await new Promise((r) => setTimeout(r, 400));
      }
      if (lastData) {
        setThreadData(lastData);
      } else {
        setThreadError("スレッドデータを取得できませんでした");
      }
    } catch (error) {
      console.error("Error fetching thread data:", error);
      setThreadError("スレッドデータの取得中にエラーが発生しました");
    } finally {
      setIsLoadingThread(false);
    }
  }, [threadId]);

  // Fetch thread data
  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  // Clear form data when threadId changes
  useEffect(() => {
    if (threadId) {
      // Clear form data when switching to a new thread
      setSupplementText("");
      setUploadedImages([]);
      setShowDialogLog(true);
      setShowRelatedData(true);
      setShowFreeText(true);
    }
  }, [threadId]);

  // Format analysis data for display
  const analysisSummary = useMemo(() => {
    if (!threadData?.state) return null;

    const chatHistory = threadData.state.chat_history || [];
    const whyNodes = threadData.state.why_nodes || [];
    const rootCauses = threadData.state.root_causes || [];

    return {
      dialogCount: chatHistory.length,
      whyNodeCount: whyNodes.length,
      rootCauseCount: rootCauses.length,
      mainRootCause: rootCauses.length > 0 ? rootCauses[0] : null,
      problem: threadData.state.problem,
    };
  }, [threadData]);

  // Handlers - Navigation
  const handleBackToChat = useCallback(() => {
    if (threadId) {
      // Pass origin state back to WhyWhyAnalysisView
      const originState = location.state?.originState;
      navigate(`/whywhy/view/${threadId}`, {
        state: originState || undefined,
      });
    }
  }, [navigate, threadId, location.state]);

  // Handlers - Toast
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    toast[type](message, {
      className: `${type === "error" ? "bg-red-600" : "bg-emerald-600"} text-white rounded-xl px-4 py-3 shadow-lg`,
      bodyClassName: "text-white font-medium p-0 m-0",
      autoClose: 3000,
      hideProgressBar: true,
      closeButton: false,
      position: "top-right",
      icon: false,
    });
  }, []);

  // Copy to clipboard
  const onCopyContent = useCallback(() => {
    const node = document.getElementById("analysis-content-copy");
    if (!node) {
      showToast("コピー対象が見つかりません", "error");
      return;
    }

    const text = node.innerText;

    // Modern clipboard API (HTTPS required)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("レポート内容をクリップボードにコピーしました", "success"))
        .catch(() => {
          // Fallback to old method
          fallbackCopyTextToClipboard(text);
        });
    } else {
      // Fallback for non-HTTPS or older browsers
      fallbackCopyTextToClipboard(text);
    }
  }, [showToast]);

  // Fallback copy method
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        showToast("レポート内容をクリップボードにコピーしました", "success");
      } else {
        showToast("コピーに失敗しました", "error");
      }
    } catch (err) {
      showToast("コピーに失敗しました", "error");
    }

    document.body.removeChild(textArea);
  };

  // File select trigger
  const onClickSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Files handling
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const newItems: UploadedImage[] = [];
      const listFile = [...uploadedImages, ...list];
      const totalSize = listFile.reduce((sum, img) => sum + img.size, 0);
      if (totalSize > 5 * 1024 * 1024) {
        showToast(`ファイルの合計サイズが5MBを超えています。`, "error");
        return;
      }
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          showToast(`画像ファイルのみ対応しています: ${file.name}`, "error");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          showToast(`ファイルサイズが5MBを超えています: ${file.name}`, "error");
          continue;
        }
        const previewUrl = await readFileAsDataUrl(file);
        newItems.push({ name: file.name, size: file.size, type: file.type, previewUrl, caption: "" });
      }
      setUploadedImages((prev) => [...prev, ...newItems]);
    },
    [showToast, uploadedImages],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
    },
    [handleFiles],
  );

  // Drag & drop
  const preventDefaults = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragEnterOver = useCallback(
    (e: React.DragEvent) => {
      preventDefaults(e);
      setIsDragOver(true);
    },
    [preventDefaults],
  );

  const onDragLeaveDrop = useCallback(
    (e: React.DragEvent) => {
      preventDefaults(e);
      setIsDragOver(false);
    },
    [preventDefaults],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      preventDefaults(e);
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    },
    [handleFiles, preventDefaults],
  );

  const onRemoveImage = useCallback(
    (name: string) => {
      setUploadedImages((prev) => prev.filter((f) => f.name !== name));
      showToast("画像を削除しました", "success");
    },
    [showToast],
  );

  // Generate report (store options)
  const onGenerateReport = useCallback(() => {
    const data = {
      threadId: threadId, // Add threadId to identify which thread this data belongs to
      supplement: supplementText,
      images: uploadedImages.map((u) => ({
        name: u.name,
        size: u.size,
        type: u.type,
        previewUrl: u.previewUrl,
        caption: u.caption,
      })),
      options: { dialogLog: showDialogLog, relatedData: showRelatedData, freeText: showFreeText },
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("reportData", JSON.stringify(data));
    showToast("レポートプレビューページに移動します...", "success");
    // Pass origin state to ReportPreviewExact
    const originState = location.state?.originState;
    if (threadId) {
      navigate(`/report-preview/${threadId}`, {
        state: {
          threadPrefetch: threadData,
          originState: originState,
        },
      });
    }
  }, [threadId, threadData, showDialogLog, showFreeText, showRelatedData, supplementText, uploadedImages, showToast, location.state]);

  // Restore previous settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("reportData");
      if (!raw) return;
      const data = JSON.parse(raw);

      // Check if the data is for the current threadId
      // If data doesn't have threadId (old data) or threadId doesn't match, clear everything
      if (!data.threadId || data.threadId !== threadId) {
        // Clear data if it's from a different thread or old data without threadId
        localStorage.removeItem("reportData");
        setSupplementText("");
        setUploadedImages([]);
        setShowDialogLog(true);
        setShowRelatedData(true);
        setShowFreeText(true);
        return;
      }

      // Only restore data if threadId matches
      if (typeof data.supplement === "string") setSupplementText(data.supplement);
      if (data.images && Array.isArray(data.images)) {
        setUploadedImages(
          data.images.map((img: any) => ({
            name: img.name,
            size: img.size,
            type: img.type,
            previewUrl: img.previewUrl || "",
            caption: img.caption || "",
          })),
        );
      }
      if (data.options) {
        setShowDialogLog(data.options.dialogLog !== false);
        setShowRelatedData(data.options.relatedData !== false);
        setShowFreeText(data.options.freeText !== false);
      }
    } catch {}
  }, [threadId]);

  const charCountColor = useMemo(() => {
    if (supplementText.length > 950) return "text-red-600";
    if (supplementText.length > 800) return "text-orange-600";
    return "text-gray-500";
  }, [supplementText.length]);

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      {/* Header */}
      <div className="bg-[#004D0D] from-indigo-500 to-purple-600 text-white p-8 rounded-2xl mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-light mb-2">📊 なぜなぜ分析レポート作成</h1>
            <p className="opacity-90 text-[1.1em]">AI分析結果を基に、カスタマイズ可能なレポートを作成できます</p>
            {/* {threadId && (
              <p className="mt-2 text-sm opacity-90">
                Thread ID: <span className="font-semibold">{threadId}</span>
              </p>
            )} */}
            {!isLoadingThread && !threadError && threadData && (
              <div className="mt-4 text-sm opacity-80">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="font-semibold">ステータス:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        threadData.status === "completed"
                          ? "bg-green-500"
                          : threadData.status === "in_progress"
                            ? "bg-blue-500"
                            : "bg-yellow-500"
                      }`}
                    >
                      {threadData.status === "completed"
                        ? "完了"
                        : threadData.status === "in_progress"
                          ? "進行中"
                          : threadData.status === "pending"
                            ? "待機中"
                            : threadData.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">作成日時:</span>
                    <span className="ml-2">{new Date(threadData.created_at).toLocaleString("ja-JP")}</span>
                  </div>
                  <div>
                    <span className="font-semibold">更新日時:</span>
                    <span className="ml-2">{new Date(threadData.updated_at).toLocaleString("ja-JP")}</span>
                  </div>
                </div>
              </div>
            )}
            {isLoadingThread && (
              <div className="mt-4 text-sm opacity-80">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="font-semibold">ステータス:</span>
                    <span className="ml-2 px-2 py-1 rounded text-xs bg-yellow-500">データを読み込み中...</span>
                  </div>
                </div>
              </div>
            )}
            {threadError && (
              <div className="mt-4 text-sm opacity-80">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="font-semibold">ステータス:</span>
                    <span className="ml-2 px-2 py-1 rounded text-xs bg-red-500">データの読み込みに失敗しました。</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={fetchThreadData}
            disabled={isLoadingThread}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white text-[14px] font-semibold transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingThread ? "animate-spin" : ""}`} />
            {isLoadingThread ? "更新中..." : "データを更新"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white rounded-2xl p-8 shadow-[0_5px_20px_rgba(0,0,0,0.08)] border border-[#e1e5e9] mb-8">
        <div className="mb-0">
          <div className="text-[1.4em] text-[#2c3e50] mb-5 pb-2 border-b-4 border-indigo-400 font-semibold">
            🔍 AI分析結果
          </div>

          {/* Loading state */}
          {isLoadingThread && (
            <div className="bg-[#f8f9fa] border-2 border-[#e9ecef] rounded-xl p-6 mb-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-600">分析データを読み込み中...</p>
            </div>
          )}

          {/* Error state */}
          {threadError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-center text-red-800 mb-2">
                <X className="w-5 h-5 mr-2" />
                <strong>エラー</strong>
              </div>
              <p className="text-red-700">{threadError}</p>
            </div>
          )}

          {/* Analysis content */}
          {!isLoadingThread && !threadError && analysisSummary && (
            <div className="bg-[#f8f9fa] border-2 border-[#e9ecef] rounded-xl p-6 mb-6 text-[14px] leading-8 relative">
              <button
                onClick={onCopyContent}
                className="absolute top-4 right-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md px-3 py-2 text-xs inline-flex items-center gap-1 shadow transition"
              >
                <Clipboard className="w-4 h-4" /> コピー
              </button>

              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-[#2c3e50] text-[1.1em]">
                  {analysisSummary.problem?.title || "なぜなぜ分析レポート"}
                </div>
              </div>

              <div
                id="analysis-content-copy"
                className="mt-4"
              >
                <strong>分析サマリー</strong>
                <br />• 対話回数：{analysisSummary.dialogCount}回<br />• 特定された真因数：
                {analysisSummary.whyNodeCount}個<br />
                {analysisSummary.mainRootCause && (
                  <>
                    • 最重要真因：
                    {analysisSummary.mainRootCause.cause || analysisSummary.mainRootCause.judgement_reason || "分析中"}
                  </>
                )}
                <strong>事前の現状把握情報</strong>
                <br />
                {analysisSummary.problem?.description ? (
                  <>
                    {analysisSummary.problem.description.split("\n").map((line, index) => (
                      <React.Fragment key={index}>
                        <p>{line}</p>
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  <>問題の詳細情報がありません</>
                )}
                {threadData?.state?.why_nodes && threadData.state.why_nodes.length > 0 && (
                  <>
                    <strong>要因の深堀</strong>
                    <br />
                    <strong>{threadData.state.problem?.title + "分析結果" || "なぜなぜ分析結果"}</strong>
                    <br />
                    {threadData.state.why_nodes.map((node: any, index: number) => (
                      <React.Fragment key={index}>
                        • {node.name || node.question || `要因 ${index + 1}`}:{" "}
                        {node.answer || node.supporting_facts || "詳細なし"}
                        <br />
                      </React.Fragment>
                    ))}
                  </>
                )}
                {/* 確信度スコア付き要因ランキング */}
                {threadData?.state?.why_nodes &&
                  threadData.state.why_nodes.filter((node: any) => node.is_root_cause).length > 0 && (
                    <>
                      <br />
                      <strong>確信度スコア付き要因ランキング</strong>
                      <br />
                      {threadData.state.why_nodes
                        .filter((node: any) => node.is_root_cause)
                        .slice(0, 5)
                        .map((node: any, index: number) => (
                          <React.Fragment key={index}>
                            {index + 1}. {node.name} - 確信度：
                            {node.root_cause_confidence ? (node.root_cause_confidence * 100).toFixed(0) : 0}%<br />
                          </React.Fragment>
                        ))}
                    </>
                  )}
                {/* 推奨する対策 */}
                {threadData?.state?.why_nodes &&
                  threadData.state.why_nodes.filter((node: any) => node.is_root_cause).length > 0 && (
                    <>
                      <br />
                      <strong>推奨する対策</strong>
                      <br />
                      {threadData.state.why_nodes
                        .filter((node: any) => node.is_root_cause)
                        .slice(0, 2)
                        .map((node: any, index: number) => (
                          <React.Fragment key={index}>
                            第{index + 1}位：{node.name}（確信度：
                            {node.root_cause_confidence ? (node.root_cause_confidence * 100).toFixed(0) : 0}%）
                            <br />
                            対策内容：{node.recurrence_prevention_measures || "対策未定"}
                            <br />
                            <br />
                          </React.Fragment>
                        ))}
                    </>
                  )}
                {threadData?.state?.root_causes && threadData.state.root_causes.length > 0 && (
                  <>
                    <br />
                    <strong>根本原因と対策</strong>
                    <br />
                    {threadData.state.root_causes.map((cause: any, index: number) => (
                      <React.Fragment key={index}>
                        • <strong>原因 {index + 1}:</strong> {cause.cause || cause.judgement_reason}
                        <br />• <strong>対策:</strong>{" "}
                        {cause.countermeasures || cause.recurrence_prevention_measures || "対策未定"}
                        <br />
                        {cause.confidence && (
                          <>
                            • <strong>信頼度:</strong> {(cause.confidence * 100).toFixed(1)}%<br />
                          </>
                        )}
                        <br />
                      </React.Fragment>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Supplement section - Only show if freeText option is enabled */}
          {showFreeText && (
            <div className="mt-6">
              <div className="text-[1.4em] text-[#2c3e50] mb-5 pb-2 border-b-4 border-indigo-400 font-semibold">
                📝 自由記述テキスト欄
              </div>
              <textarea
                value={supplementText}
                onChange={(e) => setSupplementText(e.target.value)}
                placeholder={`AI分析結果に対する補足情報、追加のコメント、対策の詳細など、自由に記載してください...

例：
・実際の現場確認結果
・追加で実施した検証内容
・対策の実施スケジュール
・関係者への連絡事項`}
                maxLength={1000}
                className="w-full min-h-[120px] p-4 border-2 border-[#e9ecef] rounded-xl text-[14px] leading-6 resize-y focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
              />
              <div className="text-right text-[0.9em] mt-1">
                <span className={charCountColor}>{supplementText.length}</span>
                /1000文字
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="bg-[#f8f9fa] rounded-2xl p-6 shadow-[0_5px_20px_rgba(0,0,0,0.08)] border border-[#e1e5e9] mb-8">
        <div className="text-[1.4em] text-[#2c3e50] mb-5 pb-2 border-b-4 border-indigo-400 font-semibold">
          ⚙️ レポート出力オプション
        </div>
        <p className="text-[#6c757d] mb-5">レポートに含める項目を選択してください</p>

        <div className="grid grid-cols-1 gap-4 mt-5">
          <label className="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-[#e9ecef] hover:border-indigo-500 hover:bg-indigo-50 transition cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-indigo-500 cursor-pointer"
              checked={showDialogLog}
              onChange={(e) => setShowDialogLog(e.target.checked)}
            />
            <div className="flex-1">
              <div className="font-medium text-[#2c3e50]">対話ログの詳細</div>
              <div className="text-sm text-[#6c757d] mt-1">ユーザーとAIの対話履歴を時系列で表示します</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-[#e9ecef] hover:border-indigo-500 hover:bg-indigo-50 transition cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-indigo-500 cursor-pointer"
              checked={showRelatedData}
              onChange={(e) => setShowRelatedData(e.target.checked)}
            />
            <div className="flex-1">
              <div className="font-medium text-[#2c3e50]">関連データ・画像</div>
              <div className="text-sm text-[#6c757d] mt-1">分析に使用したデータや補足画像を表示します</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-[#e9ecef] hover:border-indigo-500 hover:bg-indigo-50 transition cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-indigo-500 cursor-pointer"
              checked={showFreeText}
              onChange={(e) => setShowFreeText(e.target.checked)}
            />
            <div className="flex-1">
              <div className="font-medium text-[#2c3e50]">自由記述テキスト欄</div>
              <div className="text-sm text-[#6c757d] mt-1">上記で入力した追加情報を表示します</div>
            </div>
          </label>
        </div>

        {/* Dialog preview */}
        {showDialogLog && threadData?.state?.chat_history && threadData.state.chat_history.length > 0 && (
          <div className="bg-[#f1f3f4] border-2 border-[#e9ecef] rounded-lg p-4 mt-5 max-h-56 overflow-y-auto text-[0.95em]">
            <div className="font-semibold mb-4 text-[#2c3e50]">対話ログプレビュー</div>
            {threadData.state.chat_history?.map((chat: any, index: number) => (
              <div
                key={index}
                className={`mb-4 pb-3 ${index < (threadData.state.chat_history?.length || 0) - 1 ? "border-b border-[#dee2e6]" : ""}`}
              >
                <div className={`font-semibold ${chat.type === "human" ? "text-[#2c3e50]" : "text-indigo-600"}`}>
                  {chat.type === "human" ? "👤 ユーザー:" : "🤖 AI:"}
                </div>
                <div className="mt-1 leading-relaxed whitespace-pre-wrap">{chat.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom section - Images - Only show if relatedData option is enabled */}
      {showRelatedData && (
        <div className="bg-white rounded-2xl p-8 shadow-[0_5px_20px_rgba(0,0,0,0.08)] border border-[#e1e5e9] mb-8">
          <div className="text-[1.4em] text-[#2c3e50] mb-5 pb-2 border-b-4 border-indigo-400 font-semibold">
            🖼️ 画像の追加
          </div>

          <div
            onClick={onClickSelectFile}
            onDragEnter={onDragEnterOver}
            onDragOver={onDragEnterOver}
            onDragLeave={onDragLeaveDrop}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              isDragOver ? "border-indigo-500 bg-indigo-50 scale-[1.02]" : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="mx-auto mb-3 text-gray-400">
              <div className="w-12 h-12 mx-auto">
                <svg
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="text-gray-700 text-[16px] mb-2">このエリアに画像をドラッグ＆ドロップ</div>
            <div className="text-[14px] text-gray-500">
              または <span className="text-indigo-600 font-semibold">ファイルを選択</span>
            </div>
            <div className="mt-2 text-[12px] text-gray-400">JPG, PNG, GIF (最大 5MB)</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFileInputChange}
            />
          </div>

          {/* Uploaded images */}
          <div className="mt-5 space-y-4">
            {uploadedImages?.map((img, index) => (
              <div
                key={img.name + index}
                className="flex items-center gap-4 p-4 bg-[#f8f9fa] rounded-xl border border-[#e9ecef]"
              >
                <img
                  src={img.previewUrl}
                  alt={img.name}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-[#e9ecef]"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold mb-1 truncate">{img.name}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {formatFileSize(img.size)} • {img.type}
                  </div>
                  <input
                    type="text"
                    value={img.caption}
                    onChange={(e) =>
                      setUploadedImages((prev) =>
                        prev.map((f) => (f.name === img.name ? { ...f, caption: e.target.value } : f)),
                      )
                    }
                    placeholder="画像の説明を入力..."
                    className="w-full px-3 py-2 border border-[#e9ecef] rounded-md text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => onRemoveImage(img.name)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-md px-3 py-2 text-xs transition"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions - Always show */}
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={handleBackToChat}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-[16px] font-semibold transition"
        >
          <ArrowLeft className="w-5 h-5" /> 前のページに戻る
        </button>
        <button
          onClick={onGenerateReport}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[16px] font-semibold shadow hover:shadow-[0_10px_25px_rgba(102,126,234,0.3)] transition"
        >
          <FileText className="w-5 h-5" /> レポートプレビュー
        </button>
      </div>

      {/* Toast removed - using react-toastify */}
    </div>
  );
};

export default ReportCreationPage;
