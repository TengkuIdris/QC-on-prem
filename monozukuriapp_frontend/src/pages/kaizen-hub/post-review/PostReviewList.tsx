import kaiZenHubService from "@/services/apis/kaizenhubService";
import { handleApi } from "@/utils/handleApi";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../kaizen-hub.module.css";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "react-toastify";
import { meritOptions } from "./PostReviewForm";
import { App } from "@/enum/pathnames";
import useRenderImage from "@/hooks/useRenderImage";
import { ImprovementDetail } from "@/interfaces/improvement";

interface ReviewData {
  id: number;
  rate: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  attraction?: string;
  author: string;
}

function PostReviewList() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [dataReview, setDataReview] = useState<ReviewData[]>([]);
  const [improvement, setImprovement] = useState<ImprovementDetail>();
  const [count, setCount] = useState<number>(0);
  const [totalPage, setTotalPage] = useState(1);
  const [page, setPage] = useState(1);
  const { id } = useParams();
  const navigate = useNavigate();

  const renderImage = useRenderImage(improvement?.relatedDocuments || []);

  const handleGetListReview = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [res, error] = await handleApi(
        kaiZenHubService.reviewlist({
          improvementId: id,
          page: pageNum,
          size: 5,
        }),
      );

      if (res?.data) {
        setCount(res.data.count || 0);
        setTotalPage(res.data.totalPage || 1);
        if (!improvement) {
          setImprovement(res.data.data.improvement);
        }

        if (isLoadMore) {
          setDataReview((prev) => [...prev, ...(res.data.data.reviews || [])]);
          setPage(pageNum + 1);
        } else {
          setDataReview(res.data.data.reviews || []);
          setPage(2);
        }
      }

      if (error) {
        toast.error("レビューの取得に失敗しました。");
        console.error("Error fetching reviews:", error);
      }
    } catch (error) {
      toast.error("予期しないエラーが発生しました。");
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page <= totalPage && !isLoadingMore) {
      handleGetListReview(page, true);
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <span
        key={index}
        className={`${styles.star} ${index < rating ? styles.filled : ""}`}
      >
        {index < rating ? "★" : "☆"}
      </span>
    ));
  };

  const formatAttraction = (attractionStr?: string) => {
    if (!attractionStr) return [];

    try {
      const attraction = JSON.parse(attractionStr);

      return meritOptions.filter((option) => attraction[option.value]);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (id) {
      handleGetListReview(1, false);
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className={`${styles.container} ${styles.containerMedium}`}>
        <LoadingSpinner message="レビューを読み込み中..." />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles.containerMedium}`}>
      {isLoading && (
        <LoadingSpinner
          message="レビューを読み込み中..."
          overlay
        />
      )}

      <div className={`${styles.reviewSection}`}>
        <div className={styles.reviewHeader}>
          {improvement?.relatedDocuments &&
            renderImage.renderImage({ classNameImage: "!w-20 !h-20", classImageError: "!hidden" })}
          <div className={styles.reviewRecipeInfo}>
            <h2 className={styles.reviewRecipeTitle}>レビュー一覧</h2>
            <span className={styles.reviewRecipeCategory}>全 {count}件のレビュー</span>
          </div>
        </div>
        {dataReview?.length === 0 ? (
          <div className={styles.contentBlock}>
            <div className={styles.noReviewMessage}>
              <h3 style={{ marginBottom: "16px", color: "var(--gray-600)" }}>📝 まだレビューがありません</h3>
              <p style={{ color: "var(--gray-500)", lineHeight: "1.6" }}>
                このレビューについて最初のレビューを投稿してみませんか？
                <br />
                あなたの経験や感想が他のユーザーの参考になります。
              </p>
            </div>
          </div>
        ) : (
          <>
            {dataReview?.map((review) => (
              <div
                key={review?.id}
                className={`${styles.contentBlock} border p-4 rounded`}
              >
                <div className={styles.reviewItemCard}>
                  <div className={styles.reviewItemHeader}>
                    <div className={styles.reviewUserInfo}>
                      <h4 className={styles.reviewUserName}>👤 {review?.author || "匿名ユーザー"}</h4>
                    </div>
                    <div className={styles.reviewMetaInfo}>
                      <div className={styles.starRating}>{renderStars(review?.rate)}</div>
                      <span className={styles.reviewDate}>
                        📅{" "}
                        {new Date(review?.createdAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {review?.comment && (
                    <div className={styles.reviewCommentSection}>
                      <h5 className={styles.sectionTitle}>💬 コメント</h5>
                      <div className={styles.reviewCommentContent}>
                        <p>{review?.comment}</p>
                      </div>
                    </div>
                  )}

                  {formatAttraction(review?.attraction).length > 0 && (
                    <div className={styles.reviewAttractionsSection}>
                      <h5 className={styles.sectionTitle}>✨ このレシピの魅力</h5>
                      <div className={styles.tagsContainer}>
                        {formatAttraction(review?.attraction).map((merit, index) => (
                          <span
                            key={index}
                            className={styles.tag}
                          >
                            {merit.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {page <= totalPage && (
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  className={`${styles.btnPrimary} ${isLoadingMore ? styles.btnDisabled : ""}`}
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {isLoadingMore ? (
                    <>
                      <span>⏳</span>
                      読み込み中...
                    </>
                  ) : (
                    <>
                      <span>📖</span>
                      さらにレビューを読み込む
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-2">
        <button
          type="button"
          className={`${styles.btn} ${styles.btnText}`}
          onClick={() => navigate(`${App.KAIZEN_HUB_SEARCH}/${id}`)}
        >
          ← レシピ詳細に戻る
        </button>
      </div>
    </div>
  );
}

export default PostReviewList;
