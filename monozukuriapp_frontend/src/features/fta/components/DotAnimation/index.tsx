import React from "react";
import { Box } from "@mui/material";

const DotAnimation = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      gap="4px"
    >
      <Box
        sx={{
          width: "10px",
          height: "10px",
          backgroundColor: "primary.main",
          borderRadius: "50%",
          animation: "bounce 1.5s infinite",
          animationDelay: "0s",
        }}
      />
      <Box
        sx={{
          width: "10px",
          height: "10px",
          backgroundColor: "primary.main",
          borderRadius: "50%",
          animation: "bounce 1.5s infinite",
          animationDelay: "0.2s",
        }}
      />
      <Box
        sx={{
          width: "10px",
          height: "10px",
          backgroundColor: "primary.main",
          borderRadius: "50%",
          animation: "bounce 1.5s infinite",
          animationDelay: "0.4s",
        }}
      />
    </Box>
  );
};

export default DotAnimation;
