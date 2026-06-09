import { CircularProgress, Stack, Typography } from "@mui/material";
import React, { memo } from "react";
import style from "../../../pages/kaizen-hub/kaizen-hub.module.css";
import PostItem from "@/pages/kaizen-hub/components/PostItem/PostItem";
import { ImprovementDetail } from "@/interfaces/improvement";

export interface DataSearch {
  search: string;
  selectedTags: string[];
  page: number;
  size?: number;
}

export interface SearchProps {
  data: ImprovementDetail[];
  isLoading: boolean;
}

const Search = ({ data, isLoading }: SearchProps) => {
  if (isLoading) {
    return (
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
    );
  }
  return (
    <div>
      <section className={`${style.recipeListSection}`}>
        <h2 className={`${style.recipeListTitle}`}>最新の改善レシピ</h2>
        {!data.length ? (
          <div className="flex justify-center flex-col items-center mt-[36px]">
            <div>
              <img
                src="/image/no_data.svg"
                alt=""
              />
            </div>
            <span>データがありません</span>
          </div>
        ) : (
          <div className={`${style.recipeGrid}`}>
            {data.map((item) => (
              <PostItem
                id={item.id}
                key={item.id}
                date={item.createdAt}
                title={item.title}
                summary={item.summary}
                category={item?.categories?.name || ""}
                relatedDocuments={item.relatedDocuments || []}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default memo(Search);
