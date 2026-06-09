import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Box, Typography, Paper, Stack } from "@mui/material";
import { App } from "@/enum/pathnames";
import { useAppSelector } from "@/core/hooks";

const AuthLayout = () => {
  const location = useLocation();
  const favicon = "favicon";

  return (
    <>
      <Stack
        direction={"column"}
        minHeight={"100vh"}
      >
        <Stack
          direction={"row"}
          flexGrow={1}
          minHeight={"100vh"}
        >
          <Stack
            bgcolor={"white"}
            width={"40%"}
            justifyContent={"center"}
            alignItems={"center"}
            display={{ xs: "none", md: "flex" }}
          >
            <img src="/image/auth.jpg" />
          </Stack>
          <Stack
            width={{ xs: "100%", md: "60%" }}
            flexDirection="column"
            alignItems="center"
            justifyContent={"center"}
            bgcolor={"primary.800"}
          >
            <Stack
              direction={"column"}
              alignItems={"center"}
              width={"632px"}
              maxWidth={"100%"}
              px={2}
            >
              <Paper
                elevation={4}
                sx={{ p: 4, mt: 3, width: "100%" }}
              >
                <img
                  src={`/image/${favicon}.ico`}
                  width={200}
                  className="mx-auto mb-10"
                />

                <Outlet />
              </Paper>
            </Stack>
          </Stack>
        </Stack>
        <Box
          py={3}
          px={2}
          borderTop={"1px solid divider"}
        >
          <Copyright />
        </Box>
      </Stack>
    </>
  );
};

const Copyright: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
    >
      {"Copyright © "}
      <Link
        color="inherit"
        to={isAuthenticated ? App.HOME : "#"}
      >
        MZKApp
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
};

export default AuthLayout;
