import React, { memo } from "react";
import style from "../../kaizen-hub.module.css";
import { useNavigate } from "react-router-dom";
import { App } from "@/enum/pathnames";
import { RelatedDocument } from "@/interfaces/improvement";
import useRenderImage from "@/hooks/useRenderImage";
import { Tooltip } from "@mui/material";
import { useAppSelector } from "@/core/hooks";

interface PostItemProps {
  title: string;
  summary: string;
  category: string;
  date: string;
  id: number;
  relatedDocuments: RelatedDocument[];
}

const PostItem = memo(function ({ title, summary, category, date, id, relatedDocuments }: PostItemProps) {
  const navigate = useNavigate();
  const renderImage = useRenderImage;
  const userRole = useAppSelector((state) => state.auth.user.role);
  const hasViewPermission = userRole?.KAIZENHUB_POST_AND_VIEW;

  return (
    <div
      className={style.recipeCard}
      onClick={() => hasViewPermission && navigate(`${App.KAIZEN_HUB_SEARCH}/${id}`)}
    >
      {renderImage(relatedDocuments).renderImage()}
      <div className={style.recipeCardContent}>
        <div>
          <h3 className={style.recipeCardTitle}>
            <Tooltip
              title={title}
              placement="top"
              arrow
            >
              <span>{title}</span>
            </Tooltip>
          </h3>
          <p className={style.recipeCardSummary}>{summary}</p>
        </div>
        <div className={style.recipeCardMeta}>
          <span className={style.recipeCardCategory}>{category}</span>
          <span>
            {new Date(date).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
});

export default PostItem;
