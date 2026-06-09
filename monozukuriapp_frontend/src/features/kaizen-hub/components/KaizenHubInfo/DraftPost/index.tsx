import { Box, CircularProgress, Stack } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { App } from "@/enum/pathnames";
import PostInfo from "@/features/kaizen-hub/components/PostInfo";
import { handleApi } from "@/utils/handleApi";
import kaiZenHubService from "@/services/apis/kaizenhubService";

export interface Option {
  value: string | number;
  label: string;
}

const size = 10;

const DraftPost = () => {
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const stackRef = useRef<HTMLDivElement>(null);

  const handleGetListDraft = async (pageNum: number) => {
    setLoading(true);
    const params = { isDraft: true, page: pageNum, size };
    const [res] = await handleApi(kaiZenHubService.getListDraft(params));

    if (res) {
      const newData = res.data.data;
      setData((prevData) => [...prevData, ...newData]);
      setHasMore(newData.length === size);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  const handleScroll = () => {
    const element = stackRef.current;
    if (element) {
      const bottomReached = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      if (bottomReached && !loading && hasMore) {
        setPage((prevPage) => prevPage + 1);
      }
    }
  };

  useEffect(() => {
    handleGetListDraft(page);
  }, [page]);

  useEffect(() => {
    const element = stackRef.current;
    if (element) {
      element.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (element) {
        element.removeEventListener("scroll", handleScroll);
      }
    };
  }, [loading, hasMore]);

  return (
    <Box mt={4}>
      <Stack
        ref={stackRef}
        data-testid="draft-post-stack"
        spacing={3}
        className={`max-h-[600px] overflow-auto ${data.length === 0 ? "overflow-hidden" : "overflow-auto"}`}
      >
        {data.map((item: any, index: number) => (
          <div key={index}>
            <PostInfo
              title={item?.title}
              postDate={item?.createdAt}
              desc={item?.description}
              id={item.id}
              linkPath={App.KAIZEN_HUB_POST}
            />
          </div>
        ))}
        {data.length === 0 && !loading && (
          <div className="flex justify-center flex-col items-center mt-20">
            <div>
              <img
                src="/image/no_data.svg"
                alt=""
              />
            </div>
            <span>データがありません</span>
          </div>
        )}
        {loading && (
          <Box
            display="flex"
            justifyContent="center"
            mt={2}
          >
            <CircularProgress />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default DraftPost;
