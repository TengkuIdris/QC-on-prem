import React, { useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { ProblemInput } from "@/utils/problem";
import { ProblemInputForm } from "@/features/whywhy/WhyWhyPageView/analysis/ProblemInputForm";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";

function WhyWhyCreatePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentThreadData, setParentThreadData] = useState<any>(null);
  const [isLoadingParentData, setIsLoadingParentData] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "新規なぜなぜ分析", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const parentId = urlParams.get("parentId");
    if (!parentId) return;

    setIsLoadingParentData(true);
    whyWhyApiClient
      .getThread(parentId)
      .then((response) => {
        if (response?.data?.data) {
          setParentThreadData(response.data.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load parent thread data:", error);
        toast.error("親スレッドのデータの読み込みに失敗しました。");
      })
      .finally(() => setIsLoadingParentData(false));
  }, [location.search]);

  const handleProblemSubmit = useCallback(
    async (data: ProblemInput, parentIdParam?: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const urlParams = new URLSearchParams(location.search);
        const parentIdFromUrl = urlParams.get("parentId");
        const parent_id = parentIdParam || parentIdFromUrl || undefined;

        const payload = {
          ...data,
          language: data.language || "ja",
          parent_id,
        };

        const result = await whyWhyApiClient.createThread(payload);
        const thread_id = result?.data?.data?.thread_id;
        if (thread_id) {
          toast.success(
            parent_id ? "新しい分析セッションの作成に成功しました。" : "分析セッションの作成に成功しました。",
          );
          navigate(`/whywhy/view/${thread_id}`, { state: { createdFromChild: !!parent_id } });
        } else {
          const errorMessage =
            result?.data?.data?.error || result?.data?.error || result?.message || "不明なエラーが発生しました。";
          toast.error(`分析セッションの作成に失敗しました。\n\n詳細: ${errorMessage}`);
        }
      } catch (error) {
        toast.error(`予期せぬエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, location.search, navigate],
  );

  return (
    <div className="px-4 py-6 sm:px-0">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: 1440 }}
      >
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
    </div>
  );
}

export default WhyWhyCreatePage;
