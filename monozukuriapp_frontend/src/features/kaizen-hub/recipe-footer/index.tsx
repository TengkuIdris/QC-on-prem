import Button from "@/components/ui/Button/Button";
import { App } from "@/enum/pathnames";
import useDebounce from "@/hooks/useDebounce";
import { IImprovement } from "@/interfaces";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { handleApi } from "@/utils/handleApi";
import { CircularProgress, Stack } from "@mui/material";
import copy from "copy-to-clipboard";
import { ClipboardCopy, MessageSquare, MessageSquareHeart, ThumbsUp } from "lucide-react";
import React, { FC, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ReviewView from "./components/ReviewView";

export interface RecipeFooterProps {
  favoriteComment?: boolean;
  data?: IImprovement;
}

const RecipeFooter: FC<RecipeFooterProps> = ({ data }) => {
  const { id } = useParams<{ id: string }>();
  const [isLikeActive, setIsLikeActive] = useState(data?.isLike);
  const [isLike, setIsLike] = useState(data?.isLike);
  const [likesCount, setLikesCount] = useState(data?._count.likes || 0);
  const isLikeActiveDebounce = useDebounce(isLikeActive);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [dataReview, setDataReview] = useState<any>({});
  const [count, setCount] = useState<number>(0);
  const [totalPage, setTotalPage] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const throttleRef = useRef({
    shouldWait: false,
    timeWait: 0,
  });
  const reviewRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const handleLike = async () => {
    setIsLikeActive(!isLikeActive);
    setLikesCount(isLikeActive ? likesCount - 1 : likesCount + 1);
  };

  const handleFetchLike = async () => {
    if (isLikeActiveDebounce !== isLike) {
      try {
        const [res] = await handleApi(kaiZenHubService.likeImprovement(Number(data?.id)));
        if (res?.data) {
          setIsLike(isLikeActiveDebounce);
        } else {
          handleLike();
          toast.error("いいねに失敗しました");
        }
      } catch (error) {
        handleLike();
        toast.error("いいねに失敗しました");
      }
    }
  };

  const handleCopyUrl = () => {
    try {
      const url = window.location.href;
      copy(url);
      toast.success("URLをクリップボードにコピーしました");
    } catch (error) {
      toast.error("URLをクリップボードにコピーに失敗しました");
    }
  };
  const handleGetListReview = async (pageNum = 1) => {
    throttleRef.current.timeWait = Date.now() + 1000;
    setIsLoading(true);
    const [res] = await handleApi(kaiZenHubService.reviewlist({ improvementId: id, page: pageNum, size: 2 }));
    if (res) {
      setCount(res?.data?.count || 0);
      setPage((page) => page + 1);
      setTotalPage(res?.data.totalPage || 1);
      setDataReview((prev: any) => ({
        ...prev,
        data: [...(prev?.data || []), ...(res?.data?.data || [])],
      }));
    } else {
      throttleRef.current.timeWait = 0;
    }
    throttleRef.current.shouldWait = false;
    setIsLoading(false);
  };

  const handleLoadMoreOnScroll = () => {
    if (
      showReview &&
      id &&
      page <= totalPage &&
      throttleRef.current.timeWait < Date.now() &&
      !throttleRef.current.shouldWait
    ) {
      console.log(
        reviewRef.current?.scrollTop,
        (reviewRef.current?.scrollTop || 0) + 1000,
        reviewRef.current?.scrollHeight,
      );

      if ((reviewRef.current?.scrollTop || 0) + 1000 >= (reviewRef.current?.scrollHeight || 0) - 100) {
        handleGetListReview(page);
      }
    }
  };

  const handleScroll = () => {
    if (!showReview) {
      setTimeout(() => {
        window.scrollBy({ top: 500, behavior: "smooth" });
      }, 100);
    }
    setShowReview(!showReview);
  };

  useEffect(() => {
    handleFetchLike();
  }, [isLikeActiveDebounce]);

  useEffect(() => {
    handleGetListReview(1);
  }, []);

  return (
    <>
      <Stack
        direction="row"
        justifyContent={"space-between"}
        alignItems={"center"}
        width={"100%"}
      >
        <div className="flex space-x-4">
          <Button
            className="bg-white flex items-center h-10 border-2 border-gray-400 px-4 rounded-md text-sm font-medium text-gray-700"
            onClick={handleLike}
          >
            <ThumbsUp
              className="mr-2"
              fill={isLikeActive ? "#007bff" : "#fff"}
            />{" "}
            いいね！ ({likesCount})
          </Button>
          <Button
            className="bg-white flex items-center h-10 border-2 border-gray-400 px-4 rounded-md text-sm font-medium text-gray-700"
            onClick={handleScroll}
          >
            <MessageSquare className="mr-2" />
            {`コメント (${count})`}
          </Button>
          <Button
            className="bg-white flex items-center h-10 border-2 border-gray-400 px-4 rounded-md text-sm font-medium text-gray-700"
            onClick={() => navigate(`${App.KAIZEN_HUB_REVIEW_RECIPE}/${id}`)}
          >
            <MessageSquareHeart className="mr-2" />
            レシピをレビュー
          </Button>
        </div>

        <Button
          className="bg-white flex gap-1 items-center h-10 border-2 border-gray-400 px-4 rounded-md text-sm font-medium text-gray-700"
          onClick={handleCopyUrl}
        >
          <ClipboardCopy /> レシピをクリップボードにコピーする
        </Button>
      </Stack>
      {showReview && (
        <div
          className="overflow-x-hidden max-h-[1000px] mt-2"
          onScroll={handleLoadMoreOnScroll}
          ref={reviewRef}
        >
          {dataReview.data &&
            dataReview?.data?.map((review: any, index: number) => (
              <div
                className={`flex mt-5 overflow-y-auto border-b-2 pb-2 ${index !== dataReview.length - 1 ? "border-b-2" : ""}`}
                key={index}
              >
                <ReviewView data={review} />
              </div>
            ))}
          {isLoading && (
            <div className="flex justify-center mt-4">
              <CircularProgress />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default RecipeFooter;
