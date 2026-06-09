import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { WhyWhyTreeVisualization } from "./WhyWhyTreeVisualization";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { Files } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { normalizeWhyNodes } from "../utils/dataProcessing";

interface ThreadData {
  thread_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  state: {
    problem?: { title?: string; description?: string };
    why_nodes?: any[];
    root_causes?: any[];
    chat_history?: any[];
  };
}

interface ReportFormData {
  threadId?: string;
  supplement: string;
  images: Array<{
    name: string;
    size: number;
    type: string;
    previewUrl: string;
    caption?: string;
  }>;
  options: {
    dialogLog: boolean;
    relatedData: boolean;
    freeText: boolean;
  };
  timestamp: string;
}

function ReportPreviewExact(): JSX.Element {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const mountedRef = useRef(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportFormData, setReportFormData] = useState<ReportFormData | null>(null);
  const [edgeTypeForExport, setEdgeTypeForExport] = useState<"step" | "smoothstep" | undefined>(undefined);
  const [exportMode, setExportMode] = useState(false);

  const contentThreadRef = useRef<HTMLDivElement>(null);
  const { copyToClipboard } = useCopyToClipboard();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "レポートプレビュー", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  const fetchThread = useCallback(async () => {
    if (!threadId) {
      setError("Thread IDが無効です");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      // Use prefetched state if present
      const pre = location?.state?.threadPrefetch;
      if (pre && pre.thread_id === threadId && pre.state) {
        setThreadData(pre);
        setIsLoading(false);
        return;
      }
      // Retry a few times to avoid transient 0/empty responses after completion
      let lastData: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const noCache = attempt === 0;
        try {
          const res = await whyWhyApiClient.getThread(threadId, { noCache });
          if (res?.data?.data) {
            lastData = res.data.data;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 400));
      }
      if (lastData) setThreadData(lastData);
      else setError("スレッドデータを取得できませんでした");
    } catch (e) {
      setError("スレッドデータの取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  // Load form data from localStorage
  const loadFormData = useCallback(() => {
    try {
      const raw = localStorage.getItem("reportData");
      if (raw) {
        const data = JSON.parse(raw) as ReportFormData;
        setReportFormData(data);
      }
    } catch (error) {
      console.error("Error loading form data:", error);
    }
  }, []);

  useEffect(() => {
    fetchThread();
    loadFormData();
  }, [fetchThread, loadFormData]);

  const vizNodes = useMemo(() => {
    if (!threadData?.state) return [];
    // Use the centralized normalizeWhyNodes function from dataProcessing
    return normalizeWhyNodes(threadData.state);
  }, [threadData]);

  const summary = useMemo(() => {
    if (!threadData?.state) return null;
    const chatHistory = threadData.state.chat_history || [];
    const whyNodes = threadData.state.why_nodes || [];
    const rootCauses = threadData.state.root_causes || [];

    // Find all nodes with highest root_cause_confidence from why_nodes
    const nodesWithConfidence = whyNodes
      .filter((node) => node.root_cause_confidence !== undefined && node.root_cause_confidence !== null)
      .sort((a, b) => (b.root_cause_confidence || 0) - (a.root_cause_confidence || 0));

    const highestConfidence = nodesWithConfidence[0]?.root_cause_confidence || 0;
    const topNodes = nodesWithConfidence.filter((node) => node.root_cause_confidence === highestConfidence);

    const mainRootCause =
      topNodes.length > 0
        ? {
            cause: topNodes.map((node) => node.name).join(", "),
            judgement_reason: topNodes.map((node) => node.root_cause_judgement).join("\n\n"),
            confidence: highestConfidence,
            countermeasures: topNodes.map((node) => node.recurrence_prevention_measures).join("\n\n"),
          }
        : null;

    // Count nodes with is_root_cause = true
    const rootCauseCount = whyNodes.filter((node) => node.is_root_cause === true).length;

    return {
      dialogCount: chatHistory.length,
      whyNodeCount: whyNodes.length,
      rootCauseCount,
      mainRootCause,
      problem: threadData.state.problem,
    };
  }, [threadData]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
    setTimeout(() => setToast(null), 3100);
  }, []);

  const generatePDF = useCallback(async () => {
    const element = document.getElementById("reportContent");
    if (!element) return;
    try {
      setIsGenerating(true);

      setExportMode(true);

      await new Promise((resolve) => setTimeout(resolve, 0));
      // Ensure web fonts (e.g., Noto Sans JP) are loaded before rasterizing
      if ((document as any).fonts && typeof (document as any).fonts.ready?.then === "function") {
        try {
          await (document as any).fonts.ready;
        } catch {}
      }

      // Tạm thời thêm padding-bottom cho badge phần trăm khi xuất PDF
      const badges = Array.from(element.querySelectorAll<HTMLElement>(".confidence-score"));
      badges.forEach((b) => b.classList.add("pb-3"));
      const badgesRoot = Array.from(element.querySelectorAll<HTMLElement>(".why-why-badge"));
      badgesRoot.forEach((b) => b.classList.add("pb-[15px]"));
      // Reset transform của viewport khi export
      const viewport = document.querySelector(".react-flow__viewport");
      let originalTransform = "";
      let originalHeight = "";
      if (viewport instanceof HTMLElement) {
        originalTransform = viewport.style.transform;
        originalHeight = viewport.style.height;

        // Parse scale từ transform (ví dụ: "scale(0.5)" -> 0.5)
        const scaleMatch = originalTransform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
          const scale = parseFloat(scaleMatch[1]);
          viewport.style.height = `calc(100% / ${scale})`;
        }
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      badges.forEach((b) => b.classList.remove("pb-3"));
      badgesRoot.forEach((b) => b.classList.remove("pb-[15px]"));
      // Khôi phục transform và height của viewport
      if (viewport instanceof HTMLElement) {
        if (originalTransform) {
          viewport.style.transform = originalTransform;
        }
        if (originalHeight) {
          viewport.style.height = originalHeight;
        }
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      // Default slicing behavior (no custom page-break logic)
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const datePart = new Date().toISOString().split("T")[0];
      const fileName = `なぜなぜ分析レポート_AGV_${datePart}.pdf`;
      pdf.save(fileName);

      setIsGenerating(false);
      showToast("PDFファイルがダウンロードされました", "success");
    } catch (error) {
      console.error("PDF生成エラー:", error);
      setIsGenerating(false);
      showToast("PDF生成に失敗しました", "error");
    } finally {
      setEdgeTypeForExport(undefined);
      setExportMode(false);
    }
  }, [showToast]);

  // Animate tree nodes on mount
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const nodes = document.querySelectorAll<HTMLElement>(".tree-node");
    nodes.forEach((node, index) => {
      node.style.opacity = "0";
      node.style.transform = "translateY(20px)";
      setTimeout(
        () => {
          node.style.transition = "all 0.5s ease";
          node.style.opacity = "1";
          node.style.transform = "translateY(0)";
        },
        index * 200 + 500,
      );
    });
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+P to export, Esc to go back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        generatePDF();
      }
      if (e.key === "Escape") {
        // Pass origin state back to ReportCreationPage
        const originState = location.state?.originState;
        navigate(`/report-creation-page/${threadId ?? ""}`, {
          state: originState ? { originState } : undefined,
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generatePDF, navigate, threadId]);

  return (
    <div className="container mx-auto max-w-[1400px] p-5">
      {/* Header */}
      <div className="header flex items-center justify-between text-white rounded-[15px] mb-[30px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-[30px] bg-[#004D0D]">
        <div className="header-content">
          <h1 className="text-[2.5em] mb-[10px] font-light">📊 レポートプレビュー</h1>
          <p className="opacity-90 text-[1.1em]">なぜなぜ分析結果の最終確認と出力</p>
          {/* {threadId && (
            <p className="opacity-90 text-sm mt-2">
              Thread ID: <span className="font-semibold">{threadId}</span>
            </p>
          )} */}
        </div>
        <div className="header-actions flex gap-[15px]">
          <button
            onClick={() => {
              // Pass origin state back to ReportCreationPage
              const originState = location.state?.originState;
              navigate(`/report-creation-page/${threadId ?? ""}`, {
                state: originState ? { originState } : undefined,
              });
            }}
            className="btn btn-light px-[12px] py-[12px] rounded-[10px] text-[14px] font-semibold border-2 border-white/30 bg-white/20 hover:bg-white/30 flex items-center gap-2"
          >
            ← 編集に戻る
          </button>
          <button
            onClick={generatePDF}
            className="btn btn-success px-[12px] py-[12px] rounded-[10px] text-[14px] font-semibold bg-[#38a169] hover:bg-[#2f855a] text-white shadow hover:shadow-[0_5px_15px_rgba(56,161,105,0.3)] flex items-center gap-2"
          >
            📄 PDF出力
          </button>
        </div>
      </div>

      {/* Loading and Error States */}
      {isLoading && (
        <div className="bg-white rounded-2xl p-8 shadow border border-[#e1e5e9] text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-2xl p-8 shadow border border-red-200 text-red-700 flex items-center gap-2">
          <span className="text-2xl">❌</span> {error}
        </div>
      )}

      {/* Report Content */}
      {!isLoading && !error && (
        <div
          id="reportContent"
          className="report-content bg-white rounded-[15px] p-10 shadow-[0_5px_20px_rgba(0,0,0,0.08)] border border-[#e1e5e9] mb-[30px]"
        >
          <div className="report-title text-[2em] text-[#2c3e50] mb-[30px] text-center pb-[20px] border-b-[3px] border-[#667eea]">
            {summary?.problem?.title || "なぜなぜ分析レポート"}
          </div>

          {/* Analysis Summary */}
          <div className="analysis-summary bg-[#f8f9fa] border-l-[5px] border-[#667eea] p-[25px] mb-[30px] rounded-r-[10px]">
            <h3 className="mb-[15px] text-[#2c3e50]">📋 分析サマリー</h3>
            <div
              className="summary-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 20,
                marginTop: 20,
              }}
            >
              <div className="summary-item bg-white p-[15px] rounded-[8px] border border-[#e9ecef] text-center">
                <div className="summary-number text-[2em] font-bold text-[#667eea] mb-[5px]">
                  {summary ? summary.dialogCount : "-"}
                </div>
                <div className="summary-label text-[0.9em] text-[#6c757d]">対象回数</div>
              </div>
              <div className="summary-item bg-white p-[15px] rounded-[8px] border border-[#e9ecef] text-center">
                <div className="summary-number text-[2em] font-bold text-[#667eea] mb-[5px]">
                  {summary ? summary.whyNodeCount : "-"}
                </div>
                <div className="summary-label text-[0.9em] text-[#6c757d]">検出要因数</div>
              </div>
              <div className="summary-item bg-white p-[15px] rounded-[8px] border border-[#e9ecef] text-center">
                <div className="summary-number text-[2em] font-bold text-[#667eea] mb-[5px]">
                  {(() => {
                    const whyNodes = threadData?.state?.why_nodes || [];
                    if (whyNodes.length === 0) return "-";

                    const maxConfidence = Math.max(...whyNodes.map((node) => node.root_cause_confidence || 0));
                    return `${Math.round(maxConfidence * 100)}%`;
                  })()}
                </div>
                <div className="summary-label text-[0.9em] text-[#6c757d]">最高確信度</div>
              </div>
              <div className="summary-item bg-white p-[15px] rounded-[8px] border border-[#e9ecef] text-center">
                <div className="summary-number text-[2em] font-bold text-[#667eea] mb-[5px]">
                  {summary ? summary.rootCauseCount : "-"}
                </div>
                <div className="summary-label text-[0.9em] text-[#6c757d]">主要対策</div>
              </div>
            </div>
            <p className="mt-[20px] font-semibold text-[#495057]">
              <strong>最重要要因：</strong>
              {summary?.mainRootCause?.cause || summary?.mainRootCause?.judgement_reason || "—"}
            </p>
          </div>

          {/* Why-Why Tree */}
          <div className="section mb-[40px]">
            <div className="section-title text-[1.5em] text-[#2c3e50] mb-[20px] pb-[10px] border-b-2 border-[#e9ecef] flex items-center gap-[10px]">
              🌳 なぜなぜ分析ツリー
            </div>
            <div className="why-tree-container bg-[#f8f9fa] border-2 border-[#e9ecef] rounded-[15px] p-[30px] my-[30px] overflow-hidden">
              <div className="why-tree-header bg-[#38a169] text-white py-[15px] px-[25px] rounded-[10px] text-center font-semibold text-[1.2em] mb-[30px]">
                なぜなぜ分析
              </div>

              {/* Real WhyWhyTreeVisualization Component */}
              <div className="h-[1200px] w-full">
                <WhyWhyTreeVisualization
                  nodes={vizNodes}
                  className="h-full w-full"
                  interactionsDisabled
                  edgeTypeOverride={edgeTypeForExport}
                  exportMode={exportMode}
                />
              </div>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="analysis-details grid grid-cols-1 md:grid-cols-2 gap-[30px] mt-[30px]">
            <div className="detail-section bg-[#f8f9fa] p-[25px] rounded-[10px] border border-[#e9ecef]">
              <div className="detail-title font-semibold text-[#495057] mb-[15px] pb-[10px] border-b-2 border-[#e9ecef]">
                🔍 {summary?.problem?.title || "なぜなぜ分析レポート"}
              </div>
              {[
                "Man（人）",
                "Machine（機械）",
                "Material（材料）",
                "Method（方法）",
                "Measurement（測定）",
                "Environment（環境）",
              ].map((label, i) => {
                if (threadData?.state?.why_nodes?.[i]?.supporting_facts) {
                  return (
                    <div
                      key={i}
                      className="factor-item bg-white p-[15px] mb-[15px] rounded-[8px] border-l-[4px] border-[#667eea]"
                    >
                      <div className="factor-name font-semibold text-[#2c3e50] mb-[5px]">{label}</div>
                      <div className="text-[14px] text-[#495057]">
                        {threadData?.state?.why_nodes?.[i]?.supporting_facts || "—"}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
            <div className="detail-section bg-[#f8f9fa] p-[25px] rounded-[10px] border border-[#e9ecef]">
              <div className="detail-title font-semibold text-[#495057] mb-[15px] pb-[10px] border-b-2 border-[#e9ecef]">
                📊 確信度スコア付き要因ランキング
              </div>
              {(threadData?.state?.why_nodes || [])
                .filter((node) => node.root_cause_confidence !== undefined && node.root_cause_confidence !== null)
                .sort((a, b) => (b.root_cause_confidence || 0) - (a.root_cause_confidence || 0))
                .map((node: any, i: number) => (
                  <div
                    key={i}
                    className="factor-item bg-white p-[15px] mb-[15px] rounded-[8px] border-l-[4px] border-[#667eea] avoid-break"
                  >
                    <div className="factor-name font-semibold text-[#2c3e50] flex items-center flex-wrap gap-2">
                      <span className="leading-[1.2]">{node.name || `要因 ${i + 1}`}</span>
                      {node.root_cause_confidence && (
                        <span className="confidence-score inline-flex items-center bg-[#667eea] text-white px-2 rounded-[15px] text-[0.8em] ml-0">
                          {(node.root_cause_confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Action Plan */}
          {(threadData?.state?.why_nodes || [])
            .filter((node) => node.root_cause_confidence !== undefined && node.root_cause_confidence !== null)
            .sort((a, b) => (b.root_cause_confidence || 0) - (a.root_cause_confidence || 0)).length > 0 ? (
            <div className="relative action-plan bg-[#e8f5e8] border-2 border-[#c3e6c3] rounded-[10px] p-[25px] mt-[30px]">
              <div className="section-title font-semibold text-[#2c3e50] mb-[20px] pb-[10px] border-b-2 border-[#e9ecef]">
                🎯 提案する対策
              </div>
              <div ref={contentThreadRef}>
                {(threadData?.state?.why_nodes || [])
                  .filter((node) => node.root_cause_confidence !== undefined && node.root_cause_confidence !== null)
                  .sort((a, b) => (b.root_cause_confidence || 0) - (a.root_cause_confidence || 0))
                  .reduce((acc: any[], node: any) => {
                    const highestConfidence =
                      acc.length > 0 ? acc[0].root_cause_confidence : node.root_cause_confidence;
                    if (node.root_cause_confidence === highestConfidence) {
                      acc.push(node);
                    }
                    return acc;
                  }, [])
                  .slice(0, 3)
                  .map((node: any, idx: number) => (
                    <div
                      key={idx}
                      className="action-item bg-white p-[20px] mb-[20px] rounded-[8px] border-l-[5px] border-[#38a169]"
                    >
                      <div className="action-title font-semibold text-[#2c3e50] mb-[10px]">
                        {node.name || "対策"}
                        {node.root_cause_confidence
                          ? `（確信度：${(node.root_cause_confidence * 100).toFixed(0)}%）`
                          : ""}
                      </div>
                      <div className="text-[14px] text-[#495057]">
                        {node.recurrence_prevention_measures || "対策未定"}
                      </div>
                    </div>
                  ))}
              </div>

              <Files
                size={24}
                className="cursor-pointer text-[#6c757d] hover:text-[#495057] transition absolute bottom-[48px] right-[28px]"
                style={{ transform: "rotateY(180deg)" }}
                onClick={() => {
                  copyToClipboard(contentThreadRef.current?.innerText || "");
                }}
              />
            </div>
          ) : null}

          {/* Dialog Log - Only show if enabled in form options */}
          {reportFormData?.options?.dialogLog &&
            threadData?.state?.chat_history &&
            threadData.state.chat_history.length > 0 && (
              <div className="dialog-log bg-[#f8f9fa] border-2 border-[#e9ecef] rounded-[10px] p-[25px] mt-[30px]">
                <div className="section-title font-semibold text-[#2c3e50] mb-[20px] pb-[10px] border-b-2 border-[#e9ecef]">
                  💬 対話ログ
                </div>
                <div
                  className="chat-history space-y-[15px] overflow-y-auto"
                  data-pdf-expand="true"
                >
                  {threadData.state.chat_history.map((chat: any, index: number) => (
                    <div
                      key={index}
                      className={`chat-message p-[15px] rounded-[8px] ${
                        chat.type === "human"
                          ? "bg-blue-50 border-l-4 border-blue-500 ml-[20px]"
                          : "bg-gray-50 border-l-4 border-gray-500 mr-[20px]"
                      }`}
                    >
                      <div className="chat-sender font-semibold text-[14px] mb-[5px]">
                        {chat.type === "human" ? "👤 ユーザー" : "🤖 AI"}
                      </div>
                      <div className="chat-content text-[14px] text-[#495057] whitespace-pre-wrap">{chat.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Supplement Content - Only show if enabled in form options */}
          {reportFormData?.options?.freeText && (
            <div className="supplement-content bg-[#fff3cd] border-2 border-[#ffeaa7] rounded-[10px] p-[25px] mt-[30px]">
              <div className="section-title font-semibold text-[#2c3e50] mb-[10px]">📝 補足情報</div>
              <p className="text-[#495057] whitespace-pre-wrap">
                {reportFormData?.supplement || "補足情報は未入力です。"}
              </p>
            </div>
          )}

          {/* Original Problem Description */}
          <div className="supplement-content bg-[#e3f2fd] border-2 border-[#bbdefb] rounded-[10px] p-[25px] mt-[30px]">
            <div className="section-title font-semibold text-[#2c3e50] mb-[10px]">📋 事前の現状把握情報</div>
            <p className="text-[#495057] whitespace-pre-wrap">
              {threadData?.state?.problem?.description || "補足情報は未入力です。"}
            </p>
          </div>
          {/* Images - Only show if enabled in form options */}
          {reportFormData?.options?.relatedData && (
            <div className="section mt-[40px]">
              <div className="section-title text-[1.5em] text-[#2c3e50] mb-[20px] pb-[10px] border-b-2 border-[#e9ecef]">
                🖼️ 関連画像
              </div>
              {reportFormData?.images && reportFormData.images.length > 0 ? (
                <div
                  className="image-gallery grid gap-[20px]"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
                >
                  {reportFormData.images.map((image, i) => (
                    <div
                      key={i}
                      className="image-item bg-white rounded-[10px] p-[15px] border border-[#e9ecef] shadow"
                    >
                      {image.previewUrl ? (
                        <img
                          src={image.previewUrl}
                          alt={image.name}
                          className="w-full h-[200px] object-cover rounded-[8px] mb-[10px] border border-[#e9ecef]"
                        />
                      ) : (
                        <div className="image-placeholder bg-[#f8f9fa] border-2 border-dashed border-[#dee2e6] rounded-[8px] h-[200px] flex items-center justify-center text-[#6c757d] mb-[10px]">
                          📷 {image.name}
                        </div>
                      )}
                      <div className="text-[14px] text-[#6c757d]">
                        <div className="font-semibold">{image.name}</div>
                        {image.caption && <div className="text-sm text-gray-600 mt-1 italic">{image.caption}</div>}
                        <div className="text-xs text-gray-500 mt-1">
                          {image.type} • {(image.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">📷</div>
                  <p>画像が追加されていません</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-[40px] p-[20px] bg-[#f8f9fa] rounded-[10px] text-center text-[#6c757d]">
            <p>
              レポート作成日時:{" "}
              <span>
                {reportFormData?.timestamp
                  ? new Date(reportFormData.timestamp).toLocaleString("ja-JP")
                  : new Date().toLocaleString("ja-JP")}
              </span>
            </p>
            <p>分析者: なぜなぜ分析サポートAI</p>
          </div>
        </div>
      )}

      {/* Fixed actions */}
      <div className="fixed-actions fixed bottom-[30px] right-[30px] flex flex-col gap-[15px] z-[1000]">
        <button
          className="fab w-[60px] h-[60px] rounded-full bg-[#e53e3e] text-white text-[24px] shadow hover:scale-110 transition disabled:bg-gray-400 flex items-center justify-center"
          disabled={isGenerating}
          onClick={generatePDF}
          title="PDF出力"
        >
          📄
        </button>
        <button
          className="fab w-[60px] h-[60px] rounded-full bg-[#667eea] text-white text-[24px] shadow hover:scale-110 transition flex items-center justify-center"
          onClick={() => {
            // Pass origin state back to ReportCreationPage
            const originState = location.state?.originState;
            navigate(`/report-creation-page/${threadId ?? ""}`, {
              state: originState ? { originState } : undefined,
            });
          }}
          title="編集に戻る"
        >
          ←
        </button>
      </div>

      {/* Loading Overlay for PDF */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
          <div className="bg-white p-10 rounded-2xl text-center">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#667eea] animate-spin mx-auto mb-5" />
            <h3 className="text-xl font-semibold text-gray-800 mb-3">PDF生成中...</h3>
            <p className="text-gray-600">しばらくお待ちください</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[10000] px-5 py-3 rounded-xl text-white shadow-lg transition-transform duration-300"
          style={{
            background: toast.type === "success" ? "#38a169" : "#e53e3e",
            transform: toastVisible ? "translateX(0)" : "translateX(400px)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default ReportPreviewExact;
