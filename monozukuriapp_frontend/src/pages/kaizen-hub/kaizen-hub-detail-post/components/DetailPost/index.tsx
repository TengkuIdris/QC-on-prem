import useDebounce from "@/hooks/useDebounce";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { handleApi } from "@/utils/handleApi";
import React, { memo, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "../../../kaizen-hub.module.css";
import { ImprovementDetail } from "@/interfaces/improvement";
import { MetricType } from "@/enum/kaizenhub/metricType";
import { App } from "@/enum/pathnames";
import useRenderImage from "@/hooks/useRenderImage";

export interface DetailPostProps {
  isStart?: boolean;
  data: ImprovementDetail;
}

const DetailPost = ({ isStart, data }: DetailPostProps) => {
  const [isFavorite, setIsFavorite] = useState(data.isFavorite);
  const [isStartActive, setIsStartActive] = useState(data.isFavorite);
  const isStartActiveDebounce = useDebounce(isStartActive);
  const { id } = useParams();
  const navigate = useNavigate();
  const renderImage = useRenderImage;

  const handleFavorite = async () => {
    if (isFavorite !== isStartActiveDebounce) {
      try {
        const [res] = await handleApi(kaiZenHubService.favoriteImprovement(Number(id)));
        if (res?.data) {
          setIsFavorite(isStartActiveDebounce);
        } else {
          setIsStartActive(!isStartActiveDebounce);
          toast.error("お気に入りに追加できませんでした");
        }
      } catch (error) {
        setIsStartActive(!isStartActiveDebounce);
        toast.error("お気に入りに追加できませんでした");
      }
    }
  };

  useEffect(() => {
    handleFavorite();
  }, [isStartActiveDebounce]);

  return (
    <>
      <div className={styles.recipeDetailSection}>
        {isStart && (
          <div className={styles.recipeHeaderActions}>
            <button
              className={`${styles.favoriteButton} ${isStartActive && styles.isFavorited}`}
              aria-label="お気に入りに追加"
              onClick={() => setIsStartActive(!isStartActive)}
            >
              ★
            </button>
          </div>
        )}

        <h2 className={styles.recipeTitle}>{data?.title}</h2>
        <div className={styles.recipeMeta}>
          <span className={styles.recipeCategory}>{data?.categories?.name}</span>
          <span>投稿者: {data?.fullName}</span>
          <span>
            投稿日:{" "}
            {new Date(data.createdAt).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
        </div>

        <div className={styles.recipeImageContainer}>
          {renderImage(data.relatedDocuments).renderImage({ classNameImage: "", classImageError: "!hidden" })}
        </div>

        <div className={styles.contentBlock}>
          <h3 className={styles.sectionTitle}>改善の概要</h3>
          <p>{data?.summary || ""}</p>
        </div>

        <div className={styles.contentBlock}>
          <h3 className={styles.sectionTitle}>実施のコツ</h3>
          <p>{data?.tips || ""}</p>
        </div>

        <div className={styles.contentBlock}>
          <h3 className={styles.sectionTitle}>注意事項</h3>
          <p>{data?.caution || ""}</p>
        </div>

        {data.implementationSteps.length > 0 && (
          <div className={styles.contentBlock}>
            <h3 className={styles.sectionTitle}>実施手順</h3>
            <p>{data.improvementProcedures}</p>
            <ol>
              {data.implementationSteps
                .sort((a, b) => +a.stepNumber - +b.stepNumber)
                .map((step) => (
                  <li key={step.id}>
                    <strong>{step.title}:</strong>
                    {step.description}
                    {step.url && (
                      <div className="flex justify-center items-center">
                        <img
                          src={step.url}
                          alt={step.title}
                          className="max-h-[150px] max-w-full object-contain rounded-md"
                        />
                      </div>
                    )}
                  </li>
                ))}
            </ol>
          </div>
        )}

        <div className={styles.contentBlock}>
          <h3 className={styles.sectionTitle}>改善前後の数値データ</h3>
          <div className={styles.dataPreviewContainer}>
            <div className={styles.dataCard}>
              <div className={styles.dataCardHeader}>
                <span>📊</span>
                改善前 (既存素材)
              </div>
              {data.metrics
                .filter((metric) => metric.type === MetricType.BEFORE)
                .map((metric) => (
                  <div
                    key={metric.id}
                    className={styles.dataRow}
                  >
                    <div className={styles.dataLabel}>{metric.label}</div>
                    <div className={styles.dataValue}>{metric.value}</div>
                  </div>
                ))}
            </div>

            <div className={styles.dataCard}>
              <div className={styles.dataCardHeader}>
                <span>✨</span>
                改善後 (代替素材)
              </div>
              {data.metrics
                .filter((metric) => metric.type === MetricType.AFTER)
                .map((metric) => (
                  <div
                    key={metric.id}
                    className={styles.dataRow}
                  >
                    <div className={styles.dataLabel}>{metric.label}</div>
                    <div className={styles.dataValue}>{metric.value}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className={styles.chartPlaceholder}>改善効果グラフ (例: コスト比較、性能比較)</div>
        </div>

        {data.labels.length > 0 && (
          <div className={styles.contentBlock}>
            <h3 className={styles.sectionTitle}>タグ</h3>
            <div className={styles.tagsContainer}>
              {data.labels.map((tag) => (
                <span
                  key={tag.label.id}
                  className={styles.tag}
                >
                  {tag.label.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.relatedDocuments.length > 0 && (
          <div className={styles.contentBlock}>
            <h3 className={styles.sectionTitle}>関連資料</h3>
            <div className={`${styles.previewImageContainer} ${styles.autoHeight}`}>
              {data?.relatedDocuments &&
                data.relatedDocuments?.length > 0 &&
                data.relatedDocuments.map((doc, index) => (
                  <div
                    key={doc.id}
                    className={`cursor-pointer ${index > 0 ? "mt-2.5" : ""}`}
                    onClick={() => {
                      window.open(doc.url, "_blank");
                    }}
                  >
                    📁 {doc.name}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className={`${styles.actionButtons} flex justify-between items-center`}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnText}`}
            onClick={() => {
              navigate(App.KAIZEN_HUB);
            }}
          >
            ← レシピ一覧に戻る
          </button>
          <div>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => {
                navigate(`${App.KAIZEN_HUB_SEARCH}/${id}/reviews`);
              }}
            >
              <span>📝</span>
              レシピをレビュー
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ml-2`}
              onClick={() => {
                navigate(`${App.KAIZEN_HUB_REVIEW_RECIPE}/${id}`);
              }}
            >
              <span>👁️</span>
              レビューを見る
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarHeader}>
            <span>💡</span>
            このレシピについて
          </h3>
          <div className={styles.sidebarContent}>
            <ul className="list-disc">
              <li>この改善は、〇〇工程の消耗品コスト削減に貢献しました。</li>
              <li>品質を維持しながらコストメリットを出すための、素材選定プロセスが参考になります。</li>
              <li>年間約15%のコスト削減効果が見込まれます。</li>
            </ul>
          </div>
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarHeader}>
            <span>🚀</span>
            関連する改善ツール
          </h3>
          <div className={styles.sidebarContent}>
            <ul className="list-disc">
              <li>
                <a
                  href="#"
                  style={{ color: "var(--primary-color)", textDecoration: "none" }}
                >
                  コスト削減シミュレーションツール
                </a>
              </li>
              <li>
                <a
                  href="#"
                  style={{ color: "var(--primary-color)", textDecoration: "none" }}
                >
                  材料評価シート
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarHeader}>
            <span>👤</span>
            投稿者情報
          </h3>
          <div className={styles.sidebarContent}>
            {data?.company && <p>{data?.company}</p>}
            {data?.department && <p>{data?.department}</p>}
            <p>
              <Link
                to={`${App.KAIZEN_HUB_USER}/${data.userId}`}
                style={{ color: "var(--primary-color)", textDecoration: "none" }}
              >
                このユーザーの他のレシピを見る
              </Link>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(DetailPost);
