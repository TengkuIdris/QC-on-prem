import Separator from "@/components/ui/Separator/Separator";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { handleApi } from "@/utils/handleApi";
import { Box, Pagination, CircularProgress, Stack } from "@mui/material";
import Typography from "@mui/material/Typography";
import React, { useEffect, useState } from "react";
import style from "../../../pages/kaizen-hub/kaizen-hub.module.css";
import PostItem from "@/pages/kaizen-hub/components/PostItem/PostItem";

const Home = () => {
  const [largestLiked, setLargestLiked] = useState<any[]>([]);
  const [listImprovementByWeek, setListImprovementByWeek] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingPickup, setIsLoadingPickup] = useState(false);

  const getLargestLiked = async () => {
    setIsLoadingPickup(true);
    const [res, error] = await handleApi(kaiZenHubService.getLargestLikedImprovementsByWeek(3));
    if (res) {
      setLargestLiked(res.data);
    }
    if (error) {
      console.log(error);
    }
    setIsLoadingPickup(false);
  };

  const getImprovementByWeekList = async (params: any) => {
    setIsLoadingList(true);
    const [res, error] = await handleApi(kaiZenHubService.getImprovementByWeekList(params));
    if (res) {
      setListImprovementByWeek(res.data.data);
      setTotalPage(res.data.totalPage);
    }
    if (error) {
      console.log(error);
    }
    setIsLoadingList(false);
  };

  useEffect(() => {
    getLargestLiked();
  }, []);

  useEffect(() => {
    getImprovementByWeekList({ page, size: 6 });
  }, [page]);

  return (
    <div className={`${style.container} ${style.containerLarge}`}>
      <div className="mb-5">
        <Typography
          fontWeight={700}
          fontSize={24}
        >
          カイゼンハブへようこそ
        </Typography>
        <Typography className="w-full break-words">現場改善のオーブンプラットフォーム</Typography>
      </div>
      {isLoadingList ? (
        <Stack
          justifyContent="center"
          alignItems="center"
          height="300px"
        >
          <CircularProgress />
          <Typography
            variant="body2"
            sx={{ mt: 2 }}
          >
            読み込み中...
          </Typography>
        </Stack>
      ) : listImprovementByWeek.length === 0 ? (
        <Stack
          justifyContent="center"
          alignItems="center"
          height="300px"
        >
          <Typography
            variant="h6"
            color="text.secondary"
          >
            データがありません
          </Typography>
        </Stack>
      ) : (
        <>
          <section className={`${style.recipeListSection}`}>
            <div className={style.recipeGrid}>
              {listImprovementByWeek.map((item) => (
                <PostItem
                  id={item.id}
                  key={item.id}
                  date={item.createdAt}
                  title={item.title}
                  summary={item.summary}
                  category={item?.categories?.name || ""}
                  relatedDocuments={item.relatedDocuments}
                />
              ))}
            </div>
          </section>

          {totalPage > 1 && (
            <Pagination
              count={totalPage}
              page={page}
              onChange={(event, value) => setPage(value)}
              sx={{ display: "flex", justifyContent: "center", marginTop: "16px" }}
              disabled={isLoadingList}
            />
          )}
        </>
      )}

      <Separator className="my-6" />
      <Box sx={{ p: 2 }}>
        <h3 className="text-xl font-semibold mb-4">今週のピックアップ改善</h3>
        {isLoadingPickup ? (
          <Stack
            justifyContent="center"
            alignItems="center"
            height="150px"
          >
            <CircularProgress size={30} />
            <Typography
              variant="body2"
              sx={{ mt: 1 }}
            >
              ピックアップ読み込み中...
            </Typography>
          </Stack>
        ) : largestLiked.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 2 }}
          >
            ピックアップデータがありません
          </Typography>
        ) : (
          <section className={`${style.recipeListSection}`}>
            <div className={style.recipeGrid}>
              {largestLiked.map((item) => (
                <PostItem
                  id={item.id}
                  key={item.id}
                  date={item.createdAt}
                  title={item.title}
                  summary={item.summary}
                  category={item?.categories?.name || ""}
                  relatedDocuments={item.relatedDocuments}
                />
              ))}
            </div>
          </section>
        )}
      </Box>
    </div>
  );
};
export default Home;
