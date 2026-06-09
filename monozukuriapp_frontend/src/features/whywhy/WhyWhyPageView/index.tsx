import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import { Plus, Settings, History, Copy } from "lucide-react";
import { ProblemInputForm } from "./analysis/ProblemInputForm";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { ProblemInput } from "@/utils/problem";
import { toast } from "react-toastify";
import { App } from "@/enum/pathnames";
import ThreadListFull from "../components/ThreadListFull";
import HistoryButton from "@/features/whywhy/components/HistoryButton";
import { FilePlus, FolderOpen } from "lucide-react";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { Container, Typography } from "@mui/material";
import RecentFile from "../components/RecentFile";

const WhyWhyPageView: React.FC = () => {
  const [currentView, setCurrentView] = useState<"overview" | "new-analysis" | "history">("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentThreadData, setParentThreadData] = useState<any>(null);
  const [isLoadingParentData, setIsLoadingParentData] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "新規なぜなぜ分析", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  // Handle navigation state and URL parameters
  useEffect(() => {
    if (location.state?.view === "history") {
      setCurrentView("history");
      // Clear the state to prevent it from persisting
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Check for parentId in URL query parameters
    const urlParams = new URLSearchParams(location.search);
    const parentId = urlParams.get("parentId");
    if (parentId) {
      setCurrentView("new-analysis");
    }

    // Handle goToStep from navigation state
    if (location.state?.goToStep) {
      setCurrentView("new-analysis");
    }
  }, [location.state, location.search, navigate, location.pathname]);

  // Fetch parent thread data when parentId is present
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const parentId = urlParams.get("parentId");

    if (parentId && !parentThreadData) {
      setIsLoadingParentData(true);
      whyWhyApiClient
        .getThread(parentId)
        .then((response) => {
          if (response?.data?.data) {
            const threadData = response.data.data;
            setParentThreadData(threadData);
          }
        })
        .catch((error) => {
          console.error("Failed to load parent thread data:", error);
          toast.error("親スレッドのデータの読み込みに失敗しました。");
        })
        .finally(() => {
          setIsLoadingParentData(false);
        });
    }
  }, [location.search]); // Remove parentThreadData from dependency

  const handleProblemSubmit = async (data: ProblemInput, parentIdParam?: string) => {
    // Get parentId from URL query parameter if not provided
    const urlParams = new URLSearchParams(location.search);
    const parentIdFromUrl = urlParams.get("parentId");
    const parentId = parentIdParam || parentIdFromUrl;

    // Prevent duplicate submission if already submitting
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create child thread with parent_id if parentId exists
      const problemData = {
        ...data,
        language: data.language || "ja",
        // Add parent_id to create child thread
        parent_id: parentId || undefined,
      };

      const result = await whyWhyApiClient.createThread(problemData);

      if (result?.data?.data?.thread_id) {
        const { thread_id } = result.data.data;
        const successMessage = parentId
          ? `新しい分析セッションの作成に成功しました。`
          : `分析セッションの作成に成功しました。`;
        toast.success(successMessage);
        // Redirect to analysis view page with flag if created from child thread
        navigate(`/whywhy/view/${thread_id}`, {
          state: { createdFromChild: parentId ? true : false },
        });
      } else {
        const errorMessage =
          result?.data?.data?.error || result?.data?.error || result?.message || "不明なエラーが発生しました。";
        console.error("❌ Failed to create thread:", errorMessage);
        toast.error(`分析セッションの作成に失敗しました。\n\n詳細: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error submitting problem:", error);
      toast.error(`不明なエラーが発生しました。`);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      <Container
        maxWidth={false}
        sx={{ pt: 6, pb: 4, display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        {currentView === "overview" && (
          <div>
            <Typography
              variant="subtitle1"
              align="center"
              sx={{ color: "mdc.main", mb: 4, fontWeight: 500 }}
            >
              課題の真因の追及・対策の立案ができます
            </Typography>
            <div className="bg-gray-50 mx-auto px-4 py-8">
              <div
                className="mx-auto w-full"
                style={{ maxWidth: 1440 }}
              >
                <div
                  className={`grid grid-cols-1 gap-6 place-items-center md:grid-cols-2 lg:grid-cols-3 place-items-center `}
                >
                  <div
                    className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center w-full min-w-[300px] cursor-pointer transition-transform hover:scale-105"
                    tabIndex={0}
                    role="button"
                    onClick={() =>
                      navigate(
                        "/whywhy/create" +
                          (new URLSearchParams(location.search).get("parentId")
                            ? `?parentId=${new URLSearchParams(location.search).get("parentId")}`
                            : ""),
                      )
                    }
                  >
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                      <FilePlus className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-base font-medium text-gray-900 mb-1">{"新規分析"}</h2>
                    <p className="text-sm text-gray-500 mb-3">{"なぜなぜ分析を開始"}</p>
                    <button
                      className="w-full bg-blue-600 text-white rounded-md py-2 text-sm hover:bg-blue-700 transition-colors"
                      onClick={() =>
                        navigate(
                          "/whywhy/create" +
                            (new URLSearchParams(location.search).get("parentId")
                              ? `?parentId=${new URLSearchParams(location.search).get("parentId")}`
                              : ""),
                        )
                      }
                    >
                      {"新規分析"}
                    </button>
                  </div>
                  <div
                    className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center w-full min-w-[300px] cursor-pointer transition-transform hover:scale-105"
                    tabIndex={0}
                    role="button"
                    onClick={() => navigate(App.WHYWHY_HISTORY)}
                  >
                    <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                      <FolderOpen className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-base font-medium text-gray-900 mb-1">{"過去の分析"}</h2>
                    <p className="text-sm text-gray-500 mb-3">{"過去に入力した課題情報を参照"}</p>
                    <HistoryButton />
                  </div>
                  <div
                    className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center w-full min-w-[300px] cursor-pointer transition-transform hover:scale-105"
                    tabIndex={0}
                    role="button"
                    onClick={() => navigate("/whywhy/internal-cases")}
                  >
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                      {/* Icon placeholder - empty as requested */}
                    </div>
                    <h2 className="text-base font-medium text-gray-900 mb-1">{"社内事例"}</h2>
                    <p className="text-sm text-gray-500 mb-3">{"過去の分析事例を検索"}</p>
                    <button
                      className="w-full bg-green-600 text-white rounded-md py-2 text-sm hover:bg-green-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/whywhy/internal-cases");
                      }}
                    >
                      {"社内の分析事例"}
                    </button>
                  </div>
                </div>
                {/* Recent Files Section */}
                <RecentFile />
              </div>
              {/* <Card className="mt-6 mx-2 mx-auto mt-10">
                <CardHeader>
                  <CardTitle>なぜなぜ分析について</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    なぜなぜ分析は、問題の根本原因を特定するための体系的な手法です。
                    このプラットフォームでは、5M1E（Man、Machine、Material、Method、Measurement、Environment）の観点から
                    問題を分析し、AIがサポートする対話型の分析を実行できます。
                  </p>
                </CardContent>
              </Card> */}
            </div>
          </div>
        )}
        {currentView === "new-analysis" && (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {parentThreadData ? "新しい分析セッション作成" : "新規なぜなぜ分析"}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {parentThreadData
                  ? "親スレッドの情報を基に新しい独立した分析セッションを作成します"
                  : "問題の詳細情報を入力して新しい分析を始めます"}
              </p>
              {parentThreadData && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 font-medium">親スレッドからデータをコピー中</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    親スレッド「{parentThreadData.state?.problem?.title || parentThreadData.title}
                    」の情報が自動的に入力されています。
                  </p>
                  <p className="text-sm text-blue-700 mt-2 font-medium">
                    ※ この情報を基に新しい独立した分析セッションを作成します。
                  </p>
                </div>
              )}
            </div>
            {isLoadingParentData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">親スレッドのデータを読み込み中...</p>
              </div>
            ) : (
              <ProblemInputForm
                onSubmit={handleProblemSubmit}
                isLoading={isSubmitting}
                initialData={parentThreadData?.state?.problem || location.state?.prefillData || undefined}
                goToStep={location.state?.goToStep}
              />
            )}
          </div>
        )}

        {currentView === "history" && (
          <div className="px-4 py-6 sm:px-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">分析履歴</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">過去の分析セッションの一覧です。</p>
            <div className="mt-6">
              <ThreadListFull />
            </div>
          </div>
        )}
      </Container>
    </>
  );
};

export default WhyWhyPageView;
