import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, Button, Typography, CircularProgress, Grid } from "@mui/material";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField/FormField";
import { AES } from "crypto-js";
import { lazy } from "react";
import axios from "axios";
import authService from "@/services/apis/authService";
import { Auth } from "@/enum/pathnames";
// import { auditService } from '@/services/auditService';

const PasswordSchema = Yup.object({
  password: Yup.string()
    .min(8, "パスワードは8文字以上である必要があります。")
    .matches(/[a-z]/, "パスワードには少なくとも1つの小文字が含まれている必要があります")
    .matches(/[A-Z]/, "パスワードには少なくとも1つの大文字が含まれている必要があります")
    .matches(/[0-9]/, "パスワードには少なくとも1つの数字が含まれている必要があります")
    .matches(/[^a-zA-Z0-9]/, "パスワードには少なくとも1つの特殊文字が含まれている必要があります")
    .required("パスワードは必須です"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), undefined], "パスワードが一致しません")
    .required("パスワードの確認は必須です"),
});

function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showCFPassword, setShowCFPassword] = useState(false);

  if (!userId) {
    return <Typography color="error">無効なリンクです。</Typography>;
  }

  // Submit logic extracted to a function
  const handleSetPassword = async (values: { password: string }, setSubmitting: (b: boolean) => void) => {
    setSubmitting(true);
    try {
      const response = await authService.setPasswordForInvitedUser({ userId, password: values.password });
      const email = response?.data?.data?.email;
      if (email) {
        // Gọi API auditlog qua service
        try {
          // await auditService.logPasswordChanged(userId);
        } catch (e) {
          /* ignore */
        }
        toast.success("パスワード設定とCognito連携が完了しました。メールをご確認ください。");
        const encryptEmail = AES.encrypt(email, import.meta.env.VITE_SECRET_KEY).toString();
        if (response?.data?.data?.requireOtp) {
          setTimeout(() => {
            navigate(Auth.REGISTER_VERIFY_CODE + `?id=${encryptEmail}`);
          }, 2000);
        } else {
          setTimeout(() => {
            navigate(Auth.LOGIN);
          }, 2000);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "エラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={{ password: "", confirmPassword: "" }}
      validationSchema={PasswordSchema}
      onSubmit={(values, { setSubmitting }) => handleSetPassword(values, setSubmitting)}
    >
      {({ errors, touched, isSubmitting }) => (
        <Form autoComplete="off">
          <Grid
            container
            spacing={2}
          >
            <FormField
              name="password"
              label="新しいパスワード"
              type="password"
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              touched={touched}
              errors={errors}
            />
            <FormField
              name="confirmPassword"
              label="パスワード確認"
              type="password"
              showPassword={showCFPassword}
              setShowPassword={setShowCFPassword}
              touched={touched}
              errors={errors}
            />
          </Grid>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={isSubmitting}
          >
            <span className={isSubmitting ? "hidden" : ""}>
              パスワードを設定
            </span>
            <span className={isSubmitting ? "" : "hidden"}>
              <CircularProgress size={24} />
            </span>
          </Button>
        </Form>
      )}
    </Formik>
  );
}

export default SetPasswordPage;
