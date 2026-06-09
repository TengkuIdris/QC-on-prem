import React, { useEffect, useRef, useState } from "react";
import styles from "../kaizen-hub.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { App } from "@/enum/pathnames";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { toast } from "react-toastify";
import LoadingSpinner from "@/components/LoadingSpinner";
import { handleApi } from "@/utils/handleApi";
import useRenderImage from "@/hooks/useRenderImage";
import { ImprovementDetail } from "@/interfaces/improvement";

const maxCommentLength = 500;

export const meritOptions = [
  { value: "ease-of-implementation", label: "導入のしやすさ" },
  { value: "cost-effectiveness", label: "コスト効率が良い" },
  { value: "ease-of-execution", label: "実施しやすい" },
  { value: "high-impact", label: "効果が高い" },
  { value: "detailed-explanation", label: "詳細な説明" },
  { value: "versatility", label: "汎用性がある" },
  { value: "originality", label: "独創的" },
];

const PostReviewForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const selectedMeritsRef = useRef<string[]>([]);
  const [improvement, setImprovement] = useState<ImprovementDetail>();
  const navigate = useNavigate();
  const { id } = useParams();
  const renderImage = useRenderImage(improvement?.relatedDocuments || []);

  const handleStarClick = (rating: number) => {
    setCurrentRating(rating);
  };

  const handleStarHover = (rating: number) => {
    setHoveredStar(rating);
  };

  const handleStarLeave = () => {
    setHoveredStar(0);
  };

  const handleGetDetailImprovement = async () => {
    setIsLoading(true);
    const [res, error] = await handleApi(kaiZenHubService.getImprovementDetail(id ? +id : 0));
    if (res) {
      setImprovement(res.data);
    } else {
      toast.error("改善事例の取得に失敗しました。");
      console.error("Error fetching improvement detail:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!id) {
      toast.error("不正なリクエストです。");
      return;
    }

    setIsLoading(true);

    try {
      const values = {
        comment,
        rate: currentRating,
        improvementId: +id,
      };

      const attraction = meritOptions.reduce((acc: any, option) => {
        if (selectedMeritsRef.current.includes(option.value)) {
          acc[option.value] = true;
        }
        return acc;
      }, {});

      const [res, error] = await handleApi(
        kaiZenHubService.creatReview({
          ...values,
          attraction: JSON.stringify(attraction),
        }),
      );

      if (res) {
        toast.success("レビューを投稿しました！");
        navigate(`${App.KAIZEN_HUB_SEARCH}/${id}`);
      }

      if (error) {
        toast.error("レビューの投稿が失敗しました。");
        console.error("Error creating review:", error);
      }
    } catch (error) {
      toast.error("予期しないエラーが発生しました。");
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStar = (index: number) => {
    const isSelected = index < currentRating;
    const isHovered = index < hoveredStar;
    const isFilled = isSelected || isHovered;

    return (
      <span
        key={index}
        className={`${styles.star} ${isFilled ? styles.filled : ""}`}
        onClick={() => handleStarClick(index + 1)}
        onMouseEnter={() => handleStarHover(index + 1)}
        onMouseLeave={handleStarLeave}
      >
        {isSelected ? "★" : "☆"}
      </span>
    );
  };

  useEffect(() => {
    handleGetDetailImprovement();
  }, []);

  return (
    <div className={`${styles.container} ${styles.containerMedium}`}>
      {isLoading && (
        <LoadingSpinner
          message="レビューを投稿中..."
          overlay
        />
      )}
      <div className={styles.reviewSection}>
        <div className={styles.reviewHeader}>
          {improvement?.relatedDocuments &&
            renderImage.renderImage({ classNameImage: "!w-20 !h-20", classImageError: "!hidden" })}
          <div className={styles.reviewRecipeInfo}>
            <h2 className={styles.reviewRecipeTitle}>{improvement?.title}</h2>
            <span className={styles.reviewRecipeCategory}>{improvement?.categories?.name}</span>
          </div>
        </div>

        <div className={styles.ratingInputGroup}>
          <label className={styles.ratingLabel}>総合評価</label>
          <div
            className={styles.starRating}
            id="star-rating"
            style={{ opacity: isLoading ? 0.6 : 1, pointerEvents: isLoading ? "none" : "auto" }}
          >
            {[...Array(5)].map((_, index) => renderStar(index))}
          </div>
        </div>

        <div className={styles.commentSection}>
          <label
            htmlFor="comment"
            className={styles.formLabel}
          >
            コメント
            <span className={styles.optional}>任意</span>
          </label>
          <textarea
            id="comment"
            className={styles.commentTextarea}
            placeholder="この改善事例について、あなたの経験や感想を共有しましょう。具体的な成果や、導入のヒントなどを記載すると、他のユーザーの参考になります。"
            value={comment}
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.6 : 1 }}
            onChange={(e) => {
              if (e.target.value.length <= maxCommentLength) {
                setComment(e.target.value);
              }
            }}
          ></textarea>
          <div className={styles.commentCharCount}>
            {comment.length} / {maxCommentLength}文字
          </div>
        </div>

        <div className={styles.kaizenReviewSection}>
          <h3 className={styles.kaizenReviewTitle}>この改善レシピの主な魅力は？</h3>

          <div
            className={styles.checkboxGroup}
            style={{ opacity: isLoading ? 0.6 : 1, pointerEvents: isLoading ? "none" : "auto" }}
          >
            {meritOptions.map((option) => (
              <label key={option.value}>
                <input
                  type="checkbox"
                  name="merit"
                  value={option.value}
                  disabled={isLoading}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (e.target.checked) {
                      selectedMeritsRef.current.push(value);
                    } else {
                      selectedMeritsRef.current = selectedMeritsRef.current.filter((v) => v !== value);
                    }
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            className={`${styles.btnSecondary} mr-2`}
            disabled={isLoading}
            onClick={() => {
              if (isLoading) return;

              navigate(`${App.KAIZEN_HUB_SEARCH}/${id}`);
            }}
          >
            ← レシピ詳細に戻る
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            id="submit-review-btn"
            disabled={isLoading}
            onClick={() => {
              if (isLoading) return;

              if (currentRating === 0 && !comment.trim() && selectedMeritsRef.current.length === 0) {
                toast.error("評価を選択してください。");
                return;
              }

              handleSubmit();
            }}
          >
            <span>🚀</span>
            レビューを投稿する
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostReviewForm;
