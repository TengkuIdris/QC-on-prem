import React, { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { Button } from "@/components/whywhy/ui/button";
import { Badge } from "@/components/whywhy/ui/badge";
import { Clock, User, ArrowRight } from "lucide-react";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/core/hooks";

interface Thread {
  thread_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  children_count?: number;
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

interface ThreadListProps {
  className?: string;
}
export const getStatusBadge = (status: string) => {
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
          variant="outline"
          className="bg-yellow-100 text-yellow-800"
        >
          待機中
        </Badge>
      );
    case "running":
      return (
        <Badge
          variant="outline"
          className="bg-orange-100 text-orange-800"
        >
          実行中
        </Badge>
      );
    case "waiting_for_input":
      return <Badge variant="outline">入力待ち</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
const ThreadList: React.FC<ThreadListProps> = ({ className }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userName = useAppSelector((state) => state.auth.user.full_name || state.auth.user.name || "山田 太郎");
  const navigate = useNavigate();

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await whyWhyApiClient.getThreads(1, 10);

      if (response?.data?.data?.data) {
        // Filter to show only parent threads (no parent_id) or threads with children
        const allThreads = response.data.data?.data;
        const parentThreads = allThreads.filter((thread: Thread) => !thread.parent_id);
        setThreads(parentThreads);
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

  const handleThreadClick = (thread: Thread) => {
    // If thread has children, navigate to child list view
    if (thread.children_count && thread.children_count > 0) {
      navigate(`/whywhy/children/${thread.thread_id}`);
    } else {
      // If no children, navigate directly to analysis view
      try {
        // fire-and-forget prefetch (ignore errors)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        whyWhyApiClient.getThread(thread.thread_id);
      } catch (_) {}
      navigate(`/whywhy/view/${thread.thread_id}`, { state: { preTitle: thread.problem.title || thread.title } });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            最近の分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
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
            最近の分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={fetchThreads}
              variant="outline"
            >
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (threads?.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            最近の分析
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          最近の分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {threads?.map((thread) => (
            <div
              key={thread.thread_id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleThreadClick(thread)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {thread.problem.title || thread.title}
                    </h4>
                    {getStatusBadge(thread.status)}
                    {thread.children_count && thread.children_count > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {thread.children_count}子スレッド
                      </Badge>
                    )}
                    {thread.parent_id && (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
                        v{/* Version number will be calculated based on parent's children */}
                      </Badge>
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
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {threads?.length >= 10 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/whywhy", { state: { view: "history" } })}
            >
              すべての履歴を見る
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ThreadList;
