import React, { FC, memo } from "react";
import { Typography, Box } from "@mui/material";

export interface PropsMessages {
  messages: string;
}

const RightMessages: FC<PropsMessages> = ({ messages }) => {
  return (
    <Box textAlign={"end"}>
      <Typography
        variant="body1"
        bgcolor={"primary.main"}
        display={"inline-block"}
        px={2}
        py={1}
        borderRadius={4}
        color={"white"}
        maxWidth={"70%"}
        textAlign={"start"}
      >
        {messages}
      </Typography>
    </Box>
  );
};

export default memo(RightMessages);
