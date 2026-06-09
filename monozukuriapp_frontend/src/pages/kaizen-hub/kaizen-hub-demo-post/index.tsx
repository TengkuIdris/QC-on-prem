import React, { useEffect, useMemo, useState } from "react";
import style from "../kaizen-hub.module.css";
import BasicInfo from "../components/SubmitRecipe/BasicInfo";
import ImproveContent from "../components/SubmitRecipe/ImproveContent";
import Procedure from "../components/SubmitRecipe/Procedure";
import ConfirmPost from "../components/SubmitRecipe/ConfirmPost";
import LoadingState from "@/components/LoadingState";
import useLoading from "@/hooks/useLoading";
import { useAppDispatch } from "@/core/hooks";
import { resetSubmitRecipe, setSubmitRecipe } from "@/store/slices/submitRecipeSlice";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { App } from "@/enum/pathnames";
import { handleApi } from "@/utils/handleApi";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { ImprovementDetail } from "@/interfaces/improvement";
import { MetricType } from "@/enum/kaizenhub/metricType";
import { TypeImprovement } from "@/enum/kaizenhub/typeImprovement";

export const label: Record<TypeImprovement, string> = {
  [TypeImprovement.FIVES]: "組立",
  [TypeImprovement.KANBAN]: "加工",
  [TypeImprovement.IMPROVE]: "保全",
  [TypeImprovement.LEAN_MANUFACTURING_SYSTEM]: "物流",
  [TypeImprovement.TPM]: "品質保証",
};

export const options = [
  {
    value: TypeImprovement.FIVES,
    label: label[TypeImprovement.FIVES],
  },
  {
    value: TypeImprovement.KANBAN,
    label: label[TypeImprovement.KANBAN],
  },
  {
    value: TypeImprovement.IMPROVE,
    label: label[TypeImprovement.IMPROVE],
  },
  {
    value: TypeImprovement.LEAN_MANUFACTURING_SYSTEM,
    label: label[TypeImprovement.LEAN_MANUFACTURING_SYSTEM],
  },
  {
    value: TypeImprovement.TPM,
    label: label[TypeImprovement.TPM],
  },
];

const PostRecipe = () => {
  const [step, setStep] = useState(1);
  const { isLoading, withLoading } = useLoading();
  const dispatch = useAppDispatch();
  const { id } = useParams();
  const navigate = useNavigate();

  const progressSteps = useMemo(() => {
    return [
      { step: 1, label: "基本情報", isActive: step === 1 },
      { step: 2, label: "改善内容", isActive: step === 2 },
      { step: 3, label: "実施手順", isActive: step === 3 },
      { step: 4, label: "確認・投稿", isActive: step === 4 },
    ];
  }, [step]);

  const stepContent = useMemo(() => {
    switch (step) {
      case 1:
        return <BasicInfo setStep={setStep} />;
      case 2:
        return <ImproveContent setStep={setStep} />;
      case 3:
        return <Procedure setStep={setStep} />;
      case 4:
        return <ConfirmPost setStep={setStep} />;
      default:
        return <div>Step {step} content goes here</div>;
    }
  }, [step]);

  const handleGetDetailDraft = async (id: number | string) => {
    const loadData = async () => {
      const [res, error] = await handleApi(kaiZenHubService.getImprovementDetail(id));
      if (res) {
        const data: ImprovementDetail = { ...res.data };
        const afterMetrics =
          data?.metrics
            ?.filter((metric) => metric.type === MetricType.AFTER)
            ?.map((metric) => ({ name: metric.label, value: metric.value })) || [];
        const beforeMetrics =
          data?.metrics
            ?.filter((metric) => metric.type === MetricType.BEFORE)
            ?.map((metric) => ({ name: metric.label, value: metric.value })) || [];

        const tags = data?.labels?.map((label) => label.label.title) || [];

        dispatch(
          setSubmitRecipe({
            afterMetrics,
            beforeMetrics,
            category: data.categoriesId,
            caution: data?.caution || "",
            email: data?.user?.email || "",
            fullName: data?.user?.name || "",
            title: data.title,
            summary: data.summary || "",
            tags,
            prepDays: 0,
            execDays: 0,
            steps: [],
            tip: data.tips,
            relatedDocuments: data.relatedDocuments || [],
            implementationSteps: data.implementationSteps || [],
            companyName: data?.company || "",
            department: data?.department || "",
          }),
        );
      } else if (error) {
        toast.error("データの読み込みに失敗しました");
        navigate(App.KAIZEN_HUB_DRAFT);
      }
    };

    try {
      await withLoading(loadData());
    } catch (error) {
      console.error("Error loading draft:", error);
      toast.error("データの読み込み中にエラーが発生しました");
      navigate(App.KAIZEN_HUB_DRAFT);
    }
  };

  useEffect(() => {
    id && handleGetDetailDraft(id);
  }, [id]);

  useEffect(() => {
    return () => {
      dispatch(resetSubmitRecipe());
    };
  }, []);

  return (
    <LoadingState
      isLoading={isLoading}
      type="spinner"
      overlay={true}
      message="レシピデータを読み込み中..."
    >
      <div className={style.progressContainer}>
        <div className={style.progressWrapper}>
          <div className={style.progressSteps}>
            <div className={style.progressLine}>
              <div
                className={style.progressLineActive}
                style={{ width: "25%" }}
              />
            </div>
            {progressSteps.map((_step) => (
              <div
                key={_step.step}
                className={`${style.progressStep} ${_step.isActive ? style.active : ""} ${step > _step.step ? style.completed : ""}`}
              >
                <div className={style.progressCircle}>{step > _step.step ? "✓" : _step.step}</div>
                <span className={style.progressLabel}>{_step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LoadingState
        isLoading={isLoading}
        type="skeleton"
        skeletonType="form"
        skeletonRows={5}
      >
        <div>{stepContent}</div>
      </LoadingState>
    </LoadingState>
  );
};

export default PostRecipe;
