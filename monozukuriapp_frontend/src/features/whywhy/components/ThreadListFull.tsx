import React, { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { Button } from "@/components/whywhy/ui/button";
import { Button as MuiButton } from "@mui/material";
import { Badge } from "@/components/whywhy/ui/badge";
import { Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { useNavigate } from "react-router-dom";
import NoteModal from "./NoteModal";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { useAppSelector } from "@/core/hooks";
import { IconButton } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { toast } from "react-toastify";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Typography } from "@mui/material";
import VisibilitySettingsDialog from "./VisibilitySettingsDialog";

export interface Thread {
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

interface ThreadListFullProps {
  className?: string;
}

const ThreadListFull: React.FC<ThreadListFullProps> = ({ className }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [threadIdDelete, setThreadIdDelete] = useState<string | null>(null);
  const [openVisibilityDialog, setOpenVisibilityDialog] = useState(false);
  const [selectedThreadForVisibility, setSelectedThreadForVisibility] = useState<{
    id: string;
    publicScope?: string;
    hideAuthorName?: boolean;
  } | null>(null);
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const userName = useAppSelector((state) => state.auth.user.full_name || state.auth.user.name || "山田 太郎");

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "続きから", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  const pageSize = 20;

  useEffect(() => {
    fetchThreads(currentPage);
  }, [currentPage]);

  const fetchThreads = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await whyWhyApiClient.getThreads(page, pageSize);
      if (response?.data?.data?.data) {
        // Show only parent threads (no parent_id)
        const allThreads = response.data.data?.data;
        const parentThreads = allThreads.filter((thread: Thread) => !thread.parent_id);
        setThreads(parentThreads);
        setTotalPages(response.data?.data?.meta?.totalPages || 1);
        setTotalItems(response.data?.data?.meta?.total || 0);
      }
    } catch (err) {
      console.error("Error fetching threads:", err);
      setError("分析履歴の取得に失敗しました。");
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
      return "今日";
    } else if (diffInDays === 1) {
      return "昨日";
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`;
    } else {
      return date.toLocaleDateString("ja-JP");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800"
          >
            完了
          </Badge>
        );
      case "in_progress":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800"
          >
            進行中
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800"
          >
            待機中
          </Badge>
        );
      case "running":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800"
          >
            実行中
          </Badge>
        );
      case "waiting_for_input":
        return (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800"
          >
            入力待ち
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getVersionBadge = (thread: Thread) => {
    if (thread.parent_id) {
      // This is a child thread - show version
      return (
        <Badge
          variant="default"
          className="bg-purple-50 text-purple-700 border-purple-200"
        >
          v2
        </Badge>
      );
    } else if (thread.children_count && thread.children_count > 0) {
      // This is a parent thread with children - show v1
      return (
        <Badge
          variant="default"
          className="bg-orange-50 text-orange-700 border-orange-200"
        >
          v1
        </Badge>
      );
    }
    return null;
  };

  const handleThreadClick = (thread: Thread) => {
    // If thread has children, navigate to child list view
    if (thread.children_count && thread.children_count > 0) {
      navigate(`/whywhy/children/${thread.thread_id}`);
    } else {
      // If no children, navigate directly to analysis view
      try {
        // fire-and-forget prefetch
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        whyWhyApiClient.getThread(thread.thread_id);
      } catch (_) {}
      navigate(`/whywhy/view/${thread.thread_id}`, { state: { preTitle: thread.problem.title || thread.title } });
    }
  };

  const handleNoteClick = (e: React.MouseEvent, thread: Thread) => {
    e.stopPropagation();
    setSelectedThread(thread);
    setNoteModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDeleteThread = async () => {
    try {
      if (threadIdDelete) {
        await whyWhyApiClient.deleteAnalysis(threadIdDelete);
        setThreadIdDelete(null);
        toast.success("スレッドを削除しました。");
        fetchThreads(currentPage);
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
      toast.error("スレッドの削除に失敗しました。");
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            分析履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            分析履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={() => fetchThreads(currentPage)}
              variant="outline"
            >
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (threads.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            分析履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">分析履歴がありません。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              分析履歴 ({totalItems}件)
            </CardTitle>
            <span className="text-sm text-gray-500 min-w-[150px] pl-3">
              公開範囲
            </span>
          </div>
          
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {threads?.map((thread) => (
              <div className="flex items-center justify-between">
                <div
                  key={thread.thread_id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer w-full "
                  onClick={() => handleThreadClick(thread)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {thread.problem.title || thread.title}
                        </h4>
                        {getStatusBadge(thread.status)}

                        {(!thread.children_count || thread.children_count === 0) && (
                          <span
                            className="text-blue-600 text-xs underline cursor-pointer"
                            onClick={(e) => handleNoteClick(e, thread)}
                          >
                            メモ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{userName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>更新 {formatDate(thread.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="relative group my-auto w-14"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        className="focus:outline-none hover:bg-gray-200 transition-colors duration-200"
                        size="small"
                      >
                        <MoreHorizIcon fontSize="small" />
                      </IconButton>

                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[100] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <MuiButton
                          variant="outlined"
                          color="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setThreadIdDelete(thread.thread_id);
                          }}
                          className="w-full justify-start px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-none hover:rounded-md border-none shadow-none"
                        >
                          削除
                        </MuiButton>
                      </div>
                    </div>
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
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} / {totalItems}件
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  前へ
                </Button>
                <span className="text-sm text-gray-500">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  次へ
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
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
      {/* Confirm Delete Modal */}
      {
        <Dialog
          open={!!threadIdDelete}
          onClose={() => setThreadIdDelete(null)}
        >
          <DialogTitle>削除を確認</DialogTitle>
          <DialogContent>
            <DialogContentText>このアイテムを削除してもよろしいですか?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <MuiButton
              onClick={() => setThreadIdDelete(null)}
              color="primary"
              className="focus:outline-none"
            >
              キャンセル
            </MuiButton>
            <MuiButton
              onClick={handleDeleteThread}
              color="secondary"
              className="focus:outline-none"
              autoFocus
            >
              削除
            </MuiButton>
          </DialogActions>
        </Dialog>
      }

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
            await fetchThreads(currentPage);
          }}
        />
      )}
    </>
  );
};

export default ThreadListFull;
