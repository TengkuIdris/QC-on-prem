import React, { useState } from "react";
import styles from "../../kaizen-hub.module.css";
import CompletionNotification from "./CompletionNotification";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { handleApi } from "@/utils/handleApi";
import kaiZenHubService, { ImprovementRequest } from "@/services/apis/kaizenhubService";
import { resetSubmitRecipe } from "@/store/slices/submitRecipeSlice";
import { useDraftSave } from "@/hooks/useDradtSave";
import { cleanValues } from "@/utils/cleanValues";
import { useParams } from "react-router-dom";

interface ConfirmPostProps {
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

const ConfirmPost: React.FC<ConfirmPostProps> = ({ setStep }) => {
  const [isOpenCompletionModal, setIsOpenCompletionModal] = useState(false);
  const submitRecipeData = useAppSelector((state) => state.submitRecipe);
  const dispatch = useAppDispatch();
  const { handleSaveDraft, isDraftSaving } = useDraftSave();
  const { id } = useParams();

  const getDataRequest = () => {
    return cleanValues({
      afterMetrics: submitRecipeData.afterMetrics,
      beforeMetrics: submitRecipeData.beforeMetrics,
      category: +submitRecipeData.category,
      caution: submitRecipeData.caution,
      companyName: submitRecipeData.companyName,
      department: submitRecipeData.department,
      email: submitRecipeData.email,
      fullName: submitRecipeData.fullName,
      title: submitRecipeData.title,
      execDays: submitRecipeData.execDays,
      prepDays: submitRecipeData.prepDays,
      relatedDocumentIds: submitRecipeData.relatedDocuments
        .map((doc) => doc.id)
        .filter((id): id is number => id !== undefined),
      stepIds: submitRecipeData.implementationSteps.map((step) => step.id),
      summary: submitRecipeData.summary,
      tags: submitRecipeData.tags,
      tip: submitRecipeData.tip,
    });
  };

  const handleSubmit = async () => {
    try {
      const data: ImprovementRequest = getDataRequest();

      const [res, err] = await handleApi(
        id
          ? kaiZenHubService.updateImprovement(id ? id : 0, { ...data, isDraft: false })
          : kaiZenHubService.createImprovement({ ...data, isDraft: false }),
      );
      if (res) {
        setIsOpenCompletionModal(true);
      } else {
        console.error("Error creating post:", err);
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  if (isOpenCompletionModal) {
    return (
      <CompletionNotification
        onClose={() => {
          setIsOpenCompletionModal(false);
          setStep(1);
          dispatch(resetSubmitRecipe());
        }}
      />
    );
  }

  return (
    <div className={styles.confirmPost}>
      <div className={`${styles.container} ${styles.containerMedium}`}>
        <div className={styles.previewSection}>
          <h2 className={styles.previewTitle}>投稿内容の確認</h2>
          <p
            className={styles.sectionDescription}
            style={{ textAlign: "center" }}
          >
            入力内容に間違いがないか、最終確認をお願いします。
          </p>
          <div className={styles.previewContent}>
            <h3 className={styles.previewSectionTitle}>投稿者情報</h3>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>会社名</div>
              <div className={styles.previewItemValue}>{submitRecipeData.companyName}</div>
            </div>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>部署</div>
              <div className={styles.previewItemValue}>{submitRecipeData.department}</div>
            </div>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>メールアドレス</div>
              <div className={styles.previewItemValue}>{submitRecipeData.email}</div>
            </div>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>氏名</div>
              <div className={styles.previewItemValue}>{submitRecipeData.fullName}</div>
              {/* <div className={styles.previewItemValue}>{submitRecipeData.fullName.length} / 50文字</div> */}
            </div>
          </div>
          <div className={styles.previewContent}>
            <h3 className={styles.previewSectionTitle}>改善内容</h3>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>レシピタイトル</div>
              <div className={styles.previewItemValue}>{submitRecipeData.title || "タイトルが未設定です"}</div>
              {/* <div className={styles.previewItemValue}>{submitRecipeData.title.length} / 100文字</div> */}
            </div>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>
                カテゴリ
                <span className={styles.helpTip}>?</span>
              </div>
              <div className={styles.previewItemValue}>{submitRecipeData.category || "カテゴリが未設定です"}</div>
            </div>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>改善前後の数値データ</div>
              <div className={styles.previewItemValue}>
                <div className={styles.beforeAfterContainer}>
                  <div
                    className={styles.metricInputGroup}
                    style={{ backgroundColor: "var(--gray-50)" }}
                  >
                    <div className={styles.metricHeader}>
                      <span>📊</span>改善前
                    </div>
                    {submitRecipeData.beforeMetrics.length > 0 ? (
                      submitRecipeData.beforeMetrics.map((metric, index) => (
                        <div
                          key={index}
                          className={styles.metricRow}
                        >
                          <div className={styles.previewItemValue}>
                            {metric.name}: {metric.value}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.metricRow}>
                        <div className={styles.previewItemValue}>改善前のデータが未設定です</div>
                      </div>
                    )}
                  </div>
                  <div
                    className={styles.metricInputGroup}
                    style={{ backgroundColor: "var(--gray-50)" }}
                  >
                    <div className={styles.metricHeader}>
                      <span>✨</span>改善後
                    </div>
                    {submitRecipeData.afterMetrics.length > 0 ? (
                      submitRecipeData.afterMetrics.map((metric, index) => (
                        <div
                          key={index}
                          className={styles.metricRow}
                        >
                          <div className={styles.previewItemValue}>
                            {metric.name}: {metric.value}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.metricRow}>
                        <div className={styles.previewItemValue}>改善後のデータが未設定です</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={styles.previewChart}
                style={{
                  height: 150,
                  backgroundColor: "var(--gray-100)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--gray-400)",
                }}
              >
                {submitRecipeData.beforeMetrics.length > 0 && submitRecipeData.afterMetrics.length > 0 ? (
                  <>
                    改善効果グラフ
                    <br />
                    改善データの可視化
                  </>
                ) : (
                  "改善データが設定されると、ここにグラフが表示されます"
                )}
              </div>
            </div>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>タグ</div>
              <div className={styles.previewTags}>
                {submitRecipeData.tags.length > 0 ? (
                  submitRecipeData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={styles.previewTag}
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className={styles.previewTag}>タグが未設定です</span>
                )}
              </div>
            </div>
            <div className={styles.previewItem}>
              <div className={styles.previewItemTitle}>関連資料</div>
              <div className={styles.previewItemImageContainer}>
                {submitRecipeData.relatedDocuments.length > 0 ? (
                  submitRecipeData.relatedDocuments.map((doc, index) => (
                    <div
                      key={index}
                      className={styles.previewImagePlaceholder}
                    >
                      📁 {doc.name}
                    </div>
                  ))
                ) : (
                  <div className={styles.previewImagePlaceholder}>📁 関連資料が未設定です</div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.previewContent}>
            <h3 className={styles.previewSectionTitle}>実施手順</h3>
            <div
              className={styles.timeEstimate}
              style={{
                backgroundColor: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span className={styles.timeEstimateIcon}>⏱️</span>
              <div className={styles.timeEstimateContent}>
                <div className={styles.timeEstimateTitle}>実施期間の目安</div>
                <div>
                  準備期間: {submitRecipeData.prepDays || 0}日間, 実施期間: {submitRecipeData.execDays || 0}日間
                </div>
              </div>
            </div>
            {submitRecipeData.steps.length > 0 ? (
              submitRecipeData.steps.map((step, index) => (
                <div
                  key={step.stepNumber}
                  className={styles.stepBuilderPreviewItem}
                >
                  <div className={styles.stepBuilderPreviewHeader}>
                    <div className={styles.stepNumberLargePreview}>{index + 1}</div>
                    <div className={styles.stepTitlePreview}>{step.title || `ステップ ${index + 1}`}</div>
                  </div>
                  <div className={styles.stepDescriptionPreview}>{step.description || "説明が未設定です"}</div>
                  <div className={styles.previewImageContainer}>
                    {step.imageFile ? (
                      <div className={styles.previewImagePlaceholder}>📷 {step.imageFile.name}</div>
                    ) : step.url ? (
                      <div className={styles.previewImagePlaceholder}>📷 画像ファイル</div>
                    ) : (
                      <div className={styles.previewImagePlaceholder}>{index + 1}-1. 画像が未設定です</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.stepBuilderPreviewItem}>
                <div className={styles.stepBuilderPreviewHeader}>
                  <div className={styles.stepNumberLargePreview}>-</div>
                  <div className={styles.stepTitlePreview}>実施手順が未設定です</div>
                </div>
                <div className={styles.stepDescriptionPreview}>実施手順を追加してください。</div>
              </div>
            )}
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnText}`}
              onClick={() => setStep(3)}
            >
              ← 実施手順に戻る
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => {
                  const data: ImprovementRequest = getDataRequest();
                  isDraftSaving || handleSaveDraft({ ...data });
                }}
                disabled={isDraftSaving}
              >
                {isDraftSaving ? "保存中..." : "下書き保存"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSubmit}
              >
                <span>🚀</span>
                投稿する
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPost;
