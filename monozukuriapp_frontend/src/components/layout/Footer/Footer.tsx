import React from "react";
import { Box } from "@mui/material";

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 1,
        px: 2,
        mt: "auto",
        backgroundColor: "#fff",
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        fontSize: 14,
      }}
    >
      <Box
        component="span"
        sx={{ mr: 2 }}
      >
        © {new Date().getFullYear()} 品質改善ツールWebアプリ. All rights reserved.
      </Box>
      <Box sx={{ display: "flex", gap: 2 }}>
        <a
          href="/pdf/terms_of_service.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "text.secondary",
            textDecoration: "none",
            fontSize: 14,
            padding: "4px 12px",
            borderRadius: 4,
            transition: "color 0.2s",
            display: "inline-block",
          }}
        >
          利用規約
        </a>
        <a
          href="https://www.jatco.co.jp/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "text.secondary",
            textDecoration: "none",
            fontSize: 14,
            padding: "4px 12px",
            borderRadius: 4,
            transition: "color 0.2s",
            display: "inline-block",
          }}
        >
          プライバシーポリシー
        </a>
      </Box>
    </Box>
  );
};

export default Footer;
