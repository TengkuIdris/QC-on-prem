import React, { useState } from "react";
import Box from "@mui/material/Box";
import HeaderTabs from "./HeaderTabs";
import SendOtpForm from "./SendOtpForm";
import ChangePasswordForm from "./ChangePasswordForm";

const ChangePassword = () => {
  return (
    <Box>
      <HeaderTabs
        title="パスワードを変更する"
        content="OTPトークンの送信を確認する"
      />
      <ChangePasswordForm />
    </Box>
  );
};

export default ChangePassword;
