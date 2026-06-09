import React, { FC, memo } from "react";
import { Typography, Box } from "@mui/material";
import { PropsMessages } from "../RightMessages";

const LeftMessages: FC<PropsMessages> = ({ messages }) => {
  return (
    <Box textAlign={"start"}>
      <Typography
        variant="body1"
        bgcolor={"primary.800"}
        display={"inline-block"}
        px={2}
        py={1}
        borderRadius={4}
        maxWidth={"70%"}
      >
        {messages}
      </Typography>
    </Box>
  );
};

export default memo(LeftMessages);
