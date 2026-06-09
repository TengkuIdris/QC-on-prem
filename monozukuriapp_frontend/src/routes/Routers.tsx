import React, { FC } from "react";
import { useRoutes } from "react-router-dom";
import { CircularProgress, Stack } from "@mui/material";
import useCheckAuth from "../hooks/useCheckAuth";
import useFaviconUpdater from "../hooks/useFaviconUpdater";
import { useAppSelector } from "@/store/redux";
import { RootState } from "@/store/store";
import { App } from "../enum/pathnames";
import { createAuthRoutes, createPublicRoutes, createLayoutRoutes, createKaizenHubRoutes } from "./config";

const Routers: FC = () => {
  const isLoading = useCheckAuth();
  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const viewKaizenhub = userRole?.KAIZENHUB_MAIN_SCREEN;
  const postAndViewKaizenhub = userRole?.KAIZENHUB_POST_AND_VIEW;
  useFaviconUpdater();

  const kaizenHubRoute = createKaizenHubRoutes({
    viewKaizenhub: !!viewKaizenhub,
    postAndViewKaizenhub: !!postAndViewKaizenhub,
  });

  const routes = useRoutes([
    createLayoutRoutes(),
    createAuthRoutes(),
    ...(kaizenHubRoute ? [kaizenHubRoute] : []),
    ...createPublicRoutes(),
  ]);

  return (
    <>
      {isLoading ? (
        <Stack
          justifyContent={"center"}
          alignItems={"center"}
          height={"100vh"}
        >
          <CircularProgress />
        </Stack>
      ) : (
        <>{routes}</>
      )}
    </>
  );
};

export default Routers;
