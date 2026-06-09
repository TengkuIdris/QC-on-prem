import { Stack, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../core/hooks";

const ErrorPage = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <>
      <Stack
        justifyContent={"center"}
        alignItems={"center"}
        height={"100vh"}
      >
        <Typography>There`&apos;s nothing here: 404!</Typography>
        {isAuthenticated ? <Link to={"/home"}>Go to home</Link> : <Link to={"/auth/login"}>Go to login</Link>}
      </Stack>
    </>
  );
};

export default ErrorPage;
