import React, { useState, useEffect, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { Button } from "@/components/whywhy/ui/button";
import { Badge } from "@/components/whywhy/ui/badge";
import { Clock, User, ArrowLeft, ArrowRight, GitBranch, Plus } from "lucide-react";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { useNavigate, useParams } from "react-router-dom";
import NoteModal from "./NoteModal";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { getStatusBadge } from "./ThreadList";
import { useAppSelector } from "@/core/hooks";
import { RootState } from "@/store/store";
import { Typography } from "@mui/material";
import { toast } from "react-toastify";
import VisibilitySettingsDialog from "./VisibilitySettingsDialog";

interface Thread {
  thread_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  children_count?: number;
  publicScope?: string;
  hideAuthorName?: boolean;
  owner: {
    id: number;
    name: string;
    email: string;
    full_name: string;
  };
  problem: {
    title?: string;
    description?: string;
  };
}

interface ParentThread {
  thread_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  children_count: number;
  publicScope?: string;
  hideAuthorName?: boolean;
  problem: {
    title?: string;
    description?: string;
  };
}

const ThreadChildrenList: React.FC = () => {
  const [parentThread, setParentThread] = useState<ParentThread | null>(null);
  const [childThreads, setChildThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalOpenParent, setNoteModalOpenParent] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [openVisibilityDialog, setOpenVisibilityDialog] = useState(false);
  const [selectedThreadForVisibility, setSelectedThreadForVisibility] = useState<{
    id: string;
    publicScope?: string;
    hideAuthorName?: boolean;
  } | null>(null);
  const user = useAppSelector((state: RootState) => state.auth.user);
  const userName = useMemo(() => user?.full_name || user?.name || "山田 太郎", [user]);
  const { parentId } = useParams<{ parentId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "続きから", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);
  useEffect(() => {
    if (parentId) {
      fetchParentAndChildren();
    }
  }, [parentId]);

  const fetchParentAndChildren = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch child threads using new API
      const response = await whyWhyApiClient.getChildThreads(parentId!);

      if (response?.data?.data?.data) {
        setChildThreads(response.data.data.data);
        setParentThread(response.data.data.parent);
      }
    } catch (err) {
      console.error("Error fetching parent and children:", err);
      setError("スレッド情報の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "本日";
    } else if (diffInDays === 1) {
      return "1日前";
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`;
    } else {
      return `${diffInDays}日前`;
    }
  };

  const handleThreadClick = (threadId: string) => {
    try {
      // prefetch; ignore errors
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      whyWhyApiClient.getThread(threadId);
    } catch (_) {}
    navigate(`/whywhy/view/${threadId}`);
  };

  const handleParentClick = () => {
    if (parentThread) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        whyWhyApiClient.getThread(parentThread.thread_id);
      } catch (_) {}
      navigate(`/whywhy/view/${parentThread.thread_id}`);
    }
  };

  const handleParentNoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteModalOpenParent(true);
  };

  const handleNoteClick = (e: React.MouseEvent, thread: Thread) => {
    e.stopPropagation();
    setSelectedThread(thread);
    setNoteModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className=" mx-auto py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=" mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={fetchParentAndChildren}
            variant="outline"
          >
            再試行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className=" mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={() => navigate("/whywhy/history")}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            分析履歴に戻る
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">最近の分析</h1>
      </div>

      {/* Hierarchical Thread List */}
      <Card>
        <CardContent className="p-6">
          {!parentThread ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">スレッド情報がありません。</p>
            </div>
          ) : (
            <div className="relative mt-2">
              {/* Parent Thread (v1) */}
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                </CardTitle>
                <span className="text-sm text-gray-500 min-w-[150px] pb-2 pl-3">
                  公開範囲
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className="relative p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer w-full"
                  onClick={handleParentClick}
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 text-white px-2 py-1 text-xs font-medium rounded-full">V1</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate max-w-[500px]">
                          {parentThread.problem.title || parentThread.title}
                        </h4>
                        <span
                          className="text-blue-600 text-xs underline cursor-pointer"
                          onClick={handleParentNoteClick}
                        >
                          メモ
                        </span>
                        {getStatusBadge(parentThread.status)}
                      </div>

                      <p className="text-xs text-gray-500 mt-1">更新 {formatDate(parentThread.updated_at)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
                <div className="min-w-[150px] pl-3">
                  <Typography
                    variant="body2"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Only allow editing if status is "completed"
                      if (parentThread.status === "completed") {
                        setSelectedThreadForVisibility({
                          id: parentThread.thread_id,
                          publicScope: parentThread.publicScope,
                          hideAuthorName: parentThread.hideAuthorName,
                        });
                        setOpenVisibilityDialog(true);
                      } else {
                        // Show toast message if status is not completed
                        toast.error("なぜなぜ分析がまだ完了していないため、公開範囲の設定はまだ実施できていません。");
                      }
                    }}
                    sx={{
                      cursor: "pointer",
                      color: "#4B73FF",
                      fontSize: "0.75rem",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    <span>
                      {parentThread.publicScope === "private" || !parentThread.publicScope
                        ? "公開しない"
                        : parentThread.publicScope === "group"
                          ? "同一グループ内"
                          : parentThread.publicScope === "company"
                            ? "社内"
                            : "未設定"}
                    </span>
                  </Typography>
                </div>
              </div>

              {/* Vertical line connecting to children */}
              {childThreads.length > 0 && <div className="absolute left-7 top-20 bottom-0 w-0.5 bg-gray-300"></div>}

              {/* Child Threads (v2, v3, ...) */}
              {childThreads.map((thread, index) => (
                <div
                  key={thread.thread_id}
                  className="relative ml-8 mb-3"
                >
                  {/* Horizontal line connecting to vertical line */}
                  <div className="absolute left-0 top-4 w-4 h-0.5 bg-gray-300"></div>

                  <div className="flex items-center justify-between">
                    <div
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer w-full"
                      onClick={() => handleThreadClick(thread.thread_id)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-500 text-white px-2 py-1 text-xs font-medium rounded-full">
                          V{index + 2}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate max-w-[500px]">
                              {thread.problem.title || thread.title}
                            </h4>
                            <span
                              className="text-blue-600 text-xs underline cursor-pointer"
                              onClick={(e) => handleNoteClick(e, thread)}
                            >
                              メモ
                            </span>
                            {getStatusBadge(thread.status)}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">更新 {formatDate(thread.updated_at)}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                    <div className="min-w-[150px] pl-3">
                      <Typography
                        variant="body2"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Only allow editing if status is "completed"
                          if (thread.status === "completed") {
                            setSelectedThreadForVisibility({
                              id: thread.thread_id,
                              publicScope: thread.publicScope,
                              hideAuthorName: thread.hideAuthorName,
                            });
                            setOpenVisibilityDialog(true);
                          } else {
                            // Show toast message if status is not completed
                            toast.error("なぜなぜ分析がまだ完了していないため、公開範囲の設定はまだ実施できていません。");
                          }
                        }}
                        sx={{
                          cursor: "pointer",
                          color: "#4B73FF",
                          fontSize: "0.75rem",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        <span>
                          {thread.publicScope === "private" || !thread.publicScope
                            ? "公開しない"
                            : thread.publicScope === "group"
                              ? "同一グループ内"
                              : thread.publicScope === "company"
                                ? "社内"
                                : "未設定"}
                        </span>
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Modal */}
      {selectedThread && (
        <NoteModal
          isOpen={noteModalOpen}
          onClose={() => {
            setNoteModalOpen(false);
            setSelectedThread(null);
          }}
          threadId={selectedThread.thread_id}
          threadTitle={selectedThread.title}
          userName={userName}
        />
      )}

      {parentThread && (
        <NoteModal
          isOpen={noteModalOpenParent}
          onClose={() => setNoteModalOpenParent(false)}
          threadId={parentThread.thread_id}
          threadTitle={parentThread.title}
          userName={userName}
        />
      )}

      {/* Visibility Settings Dialog */}
      {selectedThreadForVisibility && (
        <VisibilitySettingsDialog
          open={openVisibilityDialog}
          threadId={selectedThreadForVisibility.id}
          currentPublicScope={selectedThreadForVisibility.publicScope as "private" | "group" | "company"}
          currentHideAuthorName={selectedThreadForVisibility.hideAuthorName}
          onClose={() => {
            setOpenVisibilityDialog(false);
            setSelectedThreadForVisibility(null);
          }}
          onSave={async (publicScope, hideAuthorName) => {
            setOpenVisibilityDialog(false);
            setSelectedThreadForVisibility(null);
            // Refresh threads list
            await fetchParentAndChildren();
          }}
        />
      )}
    </div>
  );
};

export default ThreadChildrenList;
