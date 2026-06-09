import React, { useEffect, useState } from "react";
import PostItem from "../components/PostItem/PostItem";
import style from "../kaizen-hub.module.css";
import { CircularProgress, Pagination, Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { handleApi } from "@/utils/handleApi";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { toast } from "react-toastify";

export default function KaizenHubUser() {
  const [totalPage, setTotalPage] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [user, setUser] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const { userId } = useParams();

  const handleGetPostByUser = async (userId: number, params: any) => {
    setIsLoading(true);
    const [res, error] = await handleApi(kaiZenHubService.getListPostByUser(userId, params));
    if (res) {
      setData(res.data.data);
      setTotalPage(res.data.totalPage);
      setUser(res.data.user);
    }
    if (error) {
      toast.error("日本語のエラーメッセージ");
      console.log(error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    handleGetPostByUser(userId ? +userId : 0, { page, size: 6 });
  }, [page, userId]);

  return (
    <div className={`${style.container} ${style.containerLarge}`}>
      <div className="mb-5">
        <Typography
          fontWeight={700}
          fontSize={24}
        >
          {user?.full_name ?? user?.name ?? user?.email}の投稿
        </Typography>
      </div>

      {isLoading ? (
        <>
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
        </>
      ) : data.length === 0 ? (
        <>
          <div className="flex justify-center flex-col items-center mt-[36px]">
            <div>
              <img
                src="/image/no_data.svg"
                alt=""
              />
            </div>
            <span>データがありません</span>
          </div>
        </>
      ) : (
        <>
          <section className={`${style.recipeListSection}`}>
            <div className={style.recipeGrid}>
              {data.map((item) => (
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
              disabled={isLoading}
            />
          )}
        </>
      )}
    </div>
  );
}
