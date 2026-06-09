import React from "react";
import { Box, Typography } from "@mui/material";
import { Build } from "@mui/icons-material";
import styles from "./HeroSection.module.css";

export function HeroSection() {
  return (
    <div className={styles.hero}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1.5,
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 4,
            height: 32,
            background: "var(--color-accent-cta)",
            borderRadius: "2px",
          }}
        />
        <Typography
          variant="h2"
          component="h1"
          align="left"
          sx={{
            fontWeight: "bold",
            color: "#424242",
            fontSize: 40,
            letterSpacing: "-0.5px",
          }}
        >
          品質改善の新時代へ
        </Typography>
      </Box>

      <Typography
        variant="h5"
        align="left"
        sx={{
          color: "var(--color-text-secondary)",
          fontSize: 16,
          mb: 3,
          lineHeight: 1.6,
          ml: 5,
        }}
        paragraph
      >
        高度な分析ツールを簡単操作で、データドリブンな意思決定をサポートし、現場改善を次のレベルへ
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 4,
            height: 20,
            background: "var(--color-accent-cta)",
            borderRadius: "2px",
          }}
        />
        <Build
          sx={{
            color: "#424242",
            fontSize: 24,
            mr: 0.5,
          }}
        />
        <Typography
          variant="h6"
          sx={{
            color: "#424242",
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.3px",
          }}
        >
          分析ツール
        </Typography>
      </Box>
    </div>
  );
}
