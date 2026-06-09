import { Box, Rating, Stack, Tooltip, Typography } from "@mui/material";
import React, { FC } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@/enum/pathnames";
import { ThumbsUp } from "lucide-react";
import { format } from "date-fns";

interface PostInfoProps {
  title: string;
  postDate: string;
  desc: string;
  id: number;
  like?: number;
  rating?: number;
  linkPath?: App;
  isView?: boolean;
  isShow?: boolean;
  isRating?: boolean;
}

export const PostInfo: FC<PostInfoProps> = ({
  title,
  desc,
  postDate,
  id,
  like,
  rating,
  linkPath,
  isView,
  isShow = false,
  isRating = false,
}) => {
  const navigate = useNavigate();

  return (
    <Stack
      direction={"row"}
      alignItems={"center"}
      justifyContent={"space-between"}
      sx={{ "&:hover": { backgroundColor: "#f0f0f0" }, py: 1, px: 2 }}
    >
      <Box>
        <Tooltip
          title={title}
          arrow
          placement="bottom-start"
        >
          <Typography
            fontWeight={700}
            variant="h5"
            className="line-clamp-1 text-blue-700 underline underline-offset-4 [line-break:anywhere] cursor-pointer"
            onClick={() => {
              if (linkPath) {
                navigate(`${linkPath}/${id}`, { state: { isView } });
                return;
              }
              navigate(`${App.KAIZEN_HUB_SEARCH}/${id}`, { state: { isView } });
            }}
          >
            {title ? title : "タイトルがありません"}
          </Typography>
        </Tooltip>

        <Stack direction={"column"}>
          <Tooltip
            title={desc}
            arrow
            placement="bottom-start"
          >
            <Typography
              className="line-clamp-2 [line-break:anywhere] cursor-context-menu"
              sx={{ color: "#000" }}
            >
              {`${format(postDate, "yyyy/MM/dd")} ${desc ? ` - ${desc}` : ""}`}
            </Typography>
          </Tooltip>
        </Stack>
      </Box>
      <Stack
        direction={"row"}
        alignItems={"center"}
        gap={5}
      >
        {
          <Stack
            direction={"row"}
            alignItems={"center"}
            gap={5}
          >
            {isShow && (
              <ThumbsUp
                data-testid="thumbs-up-icon"
                color="#000"
              />
            )}
            <Typography
              sx={{ color: "#000" }}
              className="cursor-context-menu"
            >
              {like}
            </Typography>
          </Stack>
        }
        {isRating && (
          <Rating
            name="read-only"
            value={rating}
            readOnly
            precision={0.5}
          />
        )}
      </Stack>
    </Stack>
  );
};

export default PostInfo;
