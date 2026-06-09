// import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { FileText, ArrowLeft, Download, X } from "lucide-react";
// import whyWhyApiClient from "@/services/apis/whyWhyService";
// import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";

// interface ThreadData {
//   thread_id: string;
//   status: string;
//   created_at: string;
//   updated_at: string;
//   state: {
//     problem?: { title?: string; description?: string };
//     why_nodes?: any[];
//     root_causes?: any[];
//     chat_history?: any[];
//   };
// }

// function ReportPreviewPage(): JSX.Element {
//   const { threadId } = useParams<{ threadId: string }>()
//   const navigate = useNavigate()
//   const [threadData, setThreadData] = useState<ThreadData | null>(null)
//   const [isLoading, setIsLoading] = useState<boolean>(true)
//   const [error, setError] = useState<string | null>(null)
//   const [isGenerating, setIsGenerating] = useState<boolean>(false)
//   const [toast, setToast] = useState<{ message: string; type: 'success'|'error'} | null>(null)

//   const { setBreadcrumbItems } = useContext(BreadcrumbContext);

//   useEffect(() => {
//     setBreadcrumbItems([{ label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") }, { label: "レポートプレビュー", href: "#", onClick: () => null }]);
//     return () => setBreadcrumbItems([]);
//   }, [setBreadcrumbItems, navigate]);

//   const fetchThread = useCallback(async () => {
//     if (!threadId) {
//       setError("Thread IDが無効です")
//       setIsLoading(false)
//       return
//     }
//     try {
//       setIsLoading(true)
//       setError(null)
//       const res = await whyWhyApiClient.getThread(threadId)
//       if (res?.data?.data) setThreadData(res.data.data)
//       else setError("スレッドデータを取得できませんでした")
//     } catch (e) {
//       setError("スレッドデータの取得中にエラーが発生しました")
//     } finally {
//       setIsLoading(false)
//     }
//   }, [threadId])

//   useEffect(() => { fetchThread() }, [fetchThread])

//   const summary = useMemo(() => {
//     if (!threadData?.state) return null
//     const chatHistory = threadData.state.chat_history || []
//     const whyNodes = threadData.state.why_nodes || []
//     const rootCauses = threadData.state.root_causes || []
//     return {
//       dialogCount: chatHistory.length,
//       whyNodeCount: whyNodes.length,
//       rootCauseCount: rootCauses.length,
//       mainRootCause: rootCauses[0] || null,
//       problem: threadData.state.problem
//     }
//   }, [threadData])

//   const showToast = useCallback((message: string, type: 'success'|'error' = 'success') => {
//     setToast({ message, type })
//     setTimeout(() => setToast(null), 2500)
//   }, [])

//   const onGeneratePDF = useCallback(async () => {
//     // Giữ nguyên UI/flow như HTML: bật overlay, thực hiện, tắt overlay
//     setIsGenerating(true)
//     try {
//       // Tạm thời dùng window.print() để xuất; có thể thay bằng html2canvas + jsPDF nếu đã cài deps
//       await new Promise((r) => setTimeout(r, 300))
//       window.print()
//       showToast('PDF出力を開始しました', 'success')
//     } catch (e) {
//       showToast('PDF生成に失敗しました', 'error')
//     } finally {
//       setIsGenerating(false)
//     }
//   }, [showToast])

//   return (
//     <div className="max-w-[1400px] mx-auto p-5">
//       <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 rounded-2xl mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-light mb-2">📊 レポートプレビュー</h1>
//           <p className="opacity-90">なぜなぜ分析結果の最終確認と出力</p>
//           {threadId && <p className="text-sm opacity-90 mt-2">Thread ID: <span className="font-semibold">{threadId}</span></p>}
//         </div>
//         <div className="flex gap-3">
//           <button onClick={() => navigate(`/report-creation-page/${threadId}`)} className="btn btn-light inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30">
//             <ArrowLeft className="w-4 h-4"/> 編集に戻る
//           </button>
//           <button onClick={onGeneratePDF} className="btn btn-success inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
//             <FileText className="w-4 h-4"/> PDF出力
//           </button>
//         </div>
//       </div>

//       {isLoading && (
//         <div className="bg-white rounded-2xl p-8 shadow border border-[#e1e5e9] text-center">読み込み中...</div>
//       )}
//       {error && (
//         <div className="bg-red-50 rounded-2xl p-8 shadow border border-red-200 text-red-700 flex items-center gap-2">
//           <X className="w-5 h-5"/> {error}
//         </div>
//       )}

//       {!isLoading && !error && (
//         <div className="report-content bg-white rounded-2xl p-8 shadow border border-[#e1e5e9]" id="reportContent">
//           {/* Report title */}
//           <div className="report-title text-2xl md:text-[2em] text-[#2c3e50] mb-6 text-center border-b-[3px] border-indigo-400 pb-5">
//             {summary?.problem?.title || 'なぜなぜ分析レポート'}
//           </div>

//           {/* Analysis summary (summary-grid) */}
//           <div className="analysis-summary bg-[#f8f9fa] border-l-[5px] border-indigo-500 p-6 mb-8 rounded-r-lg">
//             <h3 className="mb-4 text-[#2c3e50]">📋 分析サマリー</h3>
//             <div className="summary-grid grid grid-cols-2 md:grid-cols-4 gap-5">
//               <div className="summary-item bg-white p-4 rounded border text-center">
//                 <div className="summary-number text-3xl font-bold text-indigo-500">{summary?.dialogCount ?? '-'}</div>
//                 <div className="summary-label text-gray-600 text-sm">対象回数</div>
//               </div>
//               <div className="summary-item bg-white p-4 rounded border text-center">
//                 <div className="summary-number text-3xl font-bold text-indigo-500">{summary?.whyNodeCount ?? '-'}</div>
//                 <div className="summary-label text-gray-600 text-sm">検出要因数</div>
//               </div>
//               <div className="summary-item bg-white p-4 rounded border text-center">
//                 <div className="summary-number text-3xl font-bold text-indigo-500">{summary?.rootCauseCount ?? '-'}</div>
//                 <div className="summary-label text-gray-600 text-sm">根本原因数</div>
//               </div>
//               <div className="summary-item bg-white p-4 rounded border text-center">
//                 <div className="summary-number text-3xl font-bold text-indigo-500">{summary?.mainRootCause?.confidence ? `${(summary.mainRootCause.confidence*100).toFixed(0)}%` : '-'}</div>
//                 <div className="summary-label text-gray-600 text-sm">最高確信度</div>
//               </div>
//             </div>
//             {summary?.mainRootCause && (
//               <p className="mt-4 font-semibold text-[#495057]"><strong>最重要要因：</strong>{summary.mainRootCause.cause || summary.mainRootCause.judgement_reason}</p>
//             )}
//           </div>

//           {/* Why tree */}
//           <div className="section mb-10">
//             <div className="section-title text-[1.5em] text-[#2c3e50] mb-5 pb-2 border-b-2 border-[#e9ecef] flex items-center gap-2">🌳 なぜなぜ分析ツリー</div>
//             <div className="why-tree-container bg-[#f8f9fa] border-2 border-[#e9ecef] rounded-2xl p-8 mb-6 overflow-x-auto">
//               <div className="why-tree-header bg-emerald-600 text-white rounded-lg text-center font-semibold text-[1.2em] py-3 mb-6">なぜなぜ分析</div>
//               {/* Tree levels (approximate the HTML layout) */}
//               {/* Level 1 */}
//               <div className="tree-level flex items-center gap-5 mb-6">
//                 <div className="tree-node root bg-[#fff3cd] border-2 border-[#ffc107] rounded-lg p-4 min-w-[200px] shadow">
//                   {(summary?.problem?.title) || '問題（例）'}
//                 </div>
//               </div>
//               {/* Level 2 (map few nodes if available) */}
//               <div className="tree-level flex items-center gap-5 mb-6">
//                 {(threadData?.state?.why_nodes || []).slice(0,3).map((node: any, idx: number) => (
//                   <React.Fragment key={`lvl2-${idx}`}>
//                     {idx>0 && <div className="tree-connector w-10 h-[2px] bg-indigo-500 relative"/>}
//                     <div className="tree-node bg-white border-2 border-[#e9ecef] rounded-lg p-4 min-w-[200px] shadow">
//                       {node.name || node.question || `要因 ${idx+1}`}
//                     </div>
//                   </React.Fragment>
//                 ))}
//               </div>
//               {/* Level 3 */}
//               <div className="tree-level flex items-center gap-5 mb-6">
//                 {(threadData?.state?.why_nodes || []).slice(3,5).map((node: any, idx: number) => (
//                   <React.Fragment key={`lvl3-${idx}`}>
//                     {idx>0 && <div className="tree-connector w-10 h-[2px] bg-indigo-500 relative"/>}
//                     <div className="tree-node bg-white border-2 border-[#e9ecef] rounded-lg p-4 min-w-[200px] shadow">
//                       {node.name || node.question || `要因 ${idx+4}`}
//                     </div>
//                   </React.Fragment>
//                 ))}
//               </div>
//               {/* Final */}
//               <div className="tree-level flex items-center gap-5">
//                 <div className="tree-node final bg-[#d1ecf1] border-2 border-[#bee5eb] rounded-lg p-4 min-w-[200px] shadow font-semibold">
//                   根本原因：{summary?.mainRootCause?.cause || summary?.mainRootCause?.judgement_reason || '—'}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Analysis details 2 columns */}
//           <div className="analysis-details grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
//             <div className="detail-section bg-[#f8f9fa] p-6 rounded-xl border">
//               <div className="detail-title font-semibold text-[#495057] mb-4 pb-2 border-b">🔍 5M1E分析結果</div>
//               {['Man（人）','Machine（機械）','Material（材料）','Method（方法）','Measurement（測定）','Environment（環境）'].map((label, idx) => (
//                 <div key={idx} className="factor-item bg-white p-4 mb-3 rounded border-l-4 border-indigo-500">
//                   <div className="factor-name font-semibold text-[#2c3e50] mb-1">{label}</div>
//                   <div className="text-sm text-[#495057]">{threadData?.state?.why_nodes?.[idx]?.supporting_facts || '—'}</div>
//                 </div>
//               ))}
//             </div>
//             <div className="detail-section bg-[#f8f9fa] p-6 rounded-xl border">
//               <div className="detail-title font-semibold text-[#495057] mb-4 pb-2 border-b">📊 確信度スコア付き要因ランキング</div>
//               {(threadData?.state?.root_causes || []).slice(0,5).map((cause: any, idx: number) => (
//                 <div key={idx} className="factor-item bg-white p-4 mb-3 rounded border-l-4 border-indigo-500">
//                   <div className="factor-name font-semibold text-[#2c3e50]">
//                     {cause.cause || cause.judgement_reason}
//                     {cause.confidence && (
//                       <span className="confidence-score ml-2 inline-block bg-indigo-500 text-white rounded-2xl px-2 py-0.5 text-xs">{(cause.confidence*100).toFixed(0)}%</span>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Action plan */}
//           {threadData?.state?.root_causes?.length ? (
//             <div className="action-plan bg-[#e8f5e8] border-2 border-[#c3e6c3] rounded-xl p-6 mt-8">
//               <div className="section-title text-[1.2em] mb-4">🎯 提案する対策</div>
//               {(threadData.state.root_causes || []).slice(0,2).map((cause: any, idx: number) => (
//                 <div key={idx} className="action-item bg-white p-5 mb-4 rounded border-l-[5px] border-emerald-600">
//                   <div className="action-title font-semibold text-[#2c3e50] mb-2">{cause.cause || cause.judgement_reason}{cause.confidence && `（確信度：${(cause.confidence*100).toFixed(0)}%）`}</div>
//                   <div className="text-sm text-[#495057]">{cause.countermeasures || cause.recurrence_prevention_measures || '対策未定'}</div>
//                 </div>
//               ))}
//             </div>
//           ) : null}

//           {/* Supplement */}
//           <div className="supplement-content bg-[#fff3cd] border-2 border-[#ffeaa7] rounded-xl p-6 mt-8">
//             <div className="section-title text-[1.2em] mb-3">📝 補足情報</div>
//             <p className="text-[#495057]">{threadData?.state?.problem?.description || '補足情報は未入力です。'}</p>
//           </div>

//           {/* Image gallery */}
//           <div className="section mt-10">
//             <div className="section-title text-[1.5em] text-[#2c3e50] mb-4">🖼️ 関連画像</div>
//             <div className="image-gallery grid grid-cols-1 md:grid-cols-2 gap-5">
//               <div className="image-item bg-white rounded-xl p-4 border shadow-sm">
//                 <div className="image-placeholder bg-[#f8f9fa] border-2 border-dashed border-[#dee2e6] rounded-lg h-[200px] flex items-center justify-center text-[#6c757d] mb-2">📷 画像プレースホルダー</div>
//                 <div className="text-[14px] text-[#6c757d]">説明</div>
//               </div>
//               <div className="image-item bg-white rounded-xl p-4 border shadow-sm">
//                 <div className="image-placeholder bg-[#f8f9fa] border-2 border-dashed border-[#dee2e6] rounded-lg h-[200px] flex items-center justify-center text-[#6c757d] mb-2">📷 画像プレースホルダー</div>
//                 <div className="text-[14px] text-[#6c757d]">説明</div>
//               </div>
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="mt-10 p-5 bg-[#f8f9fa] rounded-xl text-center text-[#6c757d]">
//             <p>レポート作成日時: <span>{new Date().toLocaleString('ja-JP')}</span></p>
//             <p>分析者: なぜなぜ分析サポートAI</p>
//           </div>
//         </div>
//       )}

//       {/* Fixed actions (FAB) */}
//       <div className="fixed-actions fixed bottom-7 right-7 flex flex-col gap-4 z-[1000]">
//         <button className="fab w-[60px] h-[60px] rounded-full bg-red-600 text-white text-2xl shadow hover:scale-110 transition" onClick={onGeneratePDF} title="PDF出力">📄</button>
//         <button className="fab w-[60px] h-[60px] rounded-full bg-indigo-600 text-white text-2xl shadow hover:scale-110 transition" onClick={() => navigate(`/report-creation-page/${threadId}`)} title="編集に戻る">←</button>
//       </div>

//       {/* Loading overlay for PDF */}
//       {isGenerating && (
//         <div className="loading-overlay fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
//           <div className="loading-content bg-white p-10 rounded-2xl text-center">
//             <div className="spinner border-4 border-gray-200 border-t-indigo-500 rounded-full w-12 h-12 animate-spin mx-auto mb-4"/>
//             <h3 className="text-lg font-semibold">PDF生成中...</h3>
//             <p className="text-gray-600 mt-1">しばらくお待ちください</p>
//           </div>
//         </div>
//       )}

//       {/* Toast */}
//       <div className={`fixed top-5 right-5 rounded-xl px-4 py-3 text-white shadow-lg transition-transform duration-300 ${toast ? 'translate-x-0' : 'translate-x-[400px]'} ${toast?.type==='error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
//         {toast?.message}
//       </div>
//     </div>
//   )
// }

// export default ReportPreviewPage
