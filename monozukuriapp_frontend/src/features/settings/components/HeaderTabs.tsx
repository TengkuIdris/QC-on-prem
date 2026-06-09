import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import React from "react";
import { memo } from "react";

interface HeaderProps {
  title: string;
  content: string;
}

const HeaderTab = ({ title, content }: HeaderProps) => {
  return (
    <Grid>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          fontSize: {
            xs: "24px",
            md: "22px",
          },
          fontWeight: "bold",
          cursor: "context-menu",
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          fontSize: {
            xs: "20px",
            md: "16px",
          },
          cursor: "context-menu",
          marginBottom: "40px",
        }}
      >
        {content}
      </Typography>
    </Grid>
  );
};

export default memo(HeaderTab);
