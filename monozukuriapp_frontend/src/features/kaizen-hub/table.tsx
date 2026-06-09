import { FC, ReactElement, memo, useEffect, useRef, useState } from "react";
import { handleApi } from "@/utils/handleApi";
import React from "react";
import { OrderByEnum, TableType } from "@/enum";
import event from "@/utils/eventEmitter";
import { CircularProgress, Stack } from "@mui/material";

export interface Column {
  title: ReactElement;
  index: string;
  render: (value: any, record?: any, index?: number) => ReactElement;
}

interface TableProps {
  className?: string;
  loadMore: (...search: any) => Promise<any>;
  loadingFirst?: boolean;
  child: (item: any) => ReactElement;
  nameTriggerEventSearch?: TableType;
}

const Table: FC<TableProps> = ({ loadMore, loadingFirst = true, child, className, nameTriggerEventSearch }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<{
    shouldWait: boolean;
    page: number;
    totalPage: number;
    search: any;
    orderBy: OrderByEnum;
    size: number;
  }>({
    search: {},
    shouldWait: false,
    page: 1,
    totalPage: 1,
    orderBy: OrderByEnum.DESC,
    size: 10,
  });

  const handleData = async () => {
    setLoading(true);
    const [res] = await handleApi(loadMore({ page: loadMoreRef.current.page, ...loadMoreRef.current.search }));
    if (res) {
      const data = res?.data?.data || [];

      if (loadMoreRef.current.page === 1) {
        setData(data);
      } else {
        setData((prev) => [...prev, ...data]);
      }
      loadMoreRef.current.totalPage = res.data.totalPage;
    }
    setLoading(false);
  };

  const handleOnscroll = () => {
    if (!loadMoreRef.current.shouldWait) {
      if (
        scrollRef.current?.scrollHeight &&
        810 + Math.ceil(scrollRef.current?.scrollTop || 0) >= scrollRef.current?.scrollHeight &&
        loadMoreRef.current.page < loadMoreRef.current.totalPage
      ) {
        loadMoreRef.current.page++;
        loadMoreRef.current.shouldWait = true;
        const refTimeout = setTimeout(() => {
          loadMoreRef.current.shouldWait = false;
          clearTimeout(refTimeout);
        }, 200);
        handleData();
      }
    }
  };

  useEffect(() => {
    loadingFirst && handleData();
    const handleSearch = async (search = {}) => {
      loadMoreRef.current = {
        search: search,
        shouldWait: true,
        page: 1,
        totalPage: 1,
        orderBy: OrderByEnum.DESC,
        size: 10,
      };
      await handleData();
      loadMoreRef.current.shouldWait = false;
    };
    nameTriggerEventSearch && event.on(nameTriggerEventSearch, handleSearch);
    return () => {
      nameTriggerEventSearch && event.removeListener(nameTriggerEventSearch, handleSearch);
    };
  }, []);

  return (
    <>
      <div>
        <div className={`c_table  ${!data.length ? "c_table__noData" : ""}`}>
          <div
            className="c_table__scroll c_scrollbar custom-scrollbar px-1"
            ref={scrollRef}
            onScroll={handleOnscroll}
          >
            <div className={`c_table__inner ${className}`}>
              {data.map((item) => {
                return child(item);
              })}
            </div>
            {Boolean(data.length) || (
              <div className="flex justify-center flex-col items-center mt-[36px]">
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
              <Stack
                justifyContent={"center"}
                alignItems={"center"}
                height={"100vh"}
              >
                <CircularProgress />
              </Stack>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
export default memo(Table);
