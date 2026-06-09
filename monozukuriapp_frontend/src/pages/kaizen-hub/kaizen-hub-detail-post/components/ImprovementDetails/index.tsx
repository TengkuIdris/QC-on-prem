import { ILabelImprovement } from "@/interfaces";
import { Box, Typography } from "@mui/material";
import React, { memo } from "react";

export interface ImprovementDetailsProps {
  labels: ILabelImprovement[];
  tipsAndTricks: string;
}

const ImprovementDetails = ({ labels, tipsAndTricks }: ImprovementDetailsProps) => {
  return (
    <Box className="*:[line-break:anywhere]">
      <Typography
        variant="h6"
        className="!font-bold !mb-[8px]"
      >
        改善ポイント
      </Typography>
      {tipsAndTricks !== "" && (
        <ul className="list-none pl-5 mb-6 ">
          {tipsAndTricks?.split("\n").map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <Typography
        variant="h6"
        className="!font-bold !mb-[8px]"
      >
        使用ツール・技法
      </Typography>
      {labels?.length ? (
        <ul className="list-none pl-5">
          {labels?.map((label) => (
            <li key={label?.label?.id}>{label?.label?.title}</li>
          ))}
        </ul>
      ) : (
        <></>
      )}
    </Box>
  );
};

export default memo(ImprovementDetails);
