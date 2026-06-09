import { Auth } from "@/enum/pathnames";
import { logPasswordChanged } from "@/services/apis/authService";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography,
} from "@mui/material";
import { confirmResetPassword, resetPassword, type ResetPasswordOutput } from "aws-amplify/auth";
import { AES, enc } from "crypto-js";
import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";

const ForgotPassword = Yup.object({
  code: Yup.string().required("コードは必須です"),
  password: Yup.string()
    .min(8, "パスワードは８文字以上で入力してください。")
    .matches(/[a-z]/, "パスワードには少なくとも1つの小文字を含める必要があります")
    .matches(/[A-Z]/, "パスワードには少なくとも1つの大文字を含める必要があります")
    .matches(/[0-9]/, "パスワードには少なくとも1つの数字を含める必要があります")
    .matches(/[^a-zA-Z0-9]/, "パスワードには少なくとも1つの特殊文字を含める必要があります")
    .required("パスワードは必須です"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), undefined], "パスワードが一致しません")
    .required("パスワードの確認は必須です"),
});

const CodeForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [showPassword, setShowPassword] = useState(false);
  const [showCFPassword, setShowCFPassword] = useState(false);

  const handleSubmit = async (
    {
      code,
      password,
    }: {
      code: string;
      password: string;
    },
    setLoading: (isSubmitting: boolean) => void,
  ) => {
    try {
      setLoading(true);
      const email = AES.decrypt((id as string).replaceAll(" ", "+"), import.meta.env.VITE_SECRET_KEY).toString(
        enc.Utf8,
      );
      await confirmResetPassword({
        confirmationCode: code,
        username: email,
        newPassword: password,
      });
      // Gọi log audit
      try {
        await logPasswordChanged(undefined, { email });
      } catch (e) {
        /* ignore */
      }
      toast.success("パスワードを変更しました。");
      navigate(Auth.LOGIN);
    } catch (error) {
      toast.error("パスワードの変更に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    const email = AES.decrypt((id as string).replaceAll(" ", "+"), import.meta.env.VITE_SECRET_KEY).toString(enc.Utf8);
    try {
      const { nextStep } = (await resetPassword({ username: email })) as ResetPasswordOutput;
      if (nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        toast.success("コードが返送されました");
      } else {
        toast.error("コードの再送信に失敗しました");
      }
    } catch {
      toast.error("コードの再送信に失敗しました");
    }
  };

  return (
    <Formik
      initialValues={{
        code: "",
        password: "",
        confirmPassword: "",
      }}
      validationSchema={ForgotPassword}
      onSubmit={(values, { setSubmitting }) => {
        handleSubmit(values, setSubmitting);
      }}
      enableReinitialize
    >
      {({ errors, touched, isSubmitting }) => (
        <Form autoComplete="off">
          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={12}
            >
              <InputLabel htmlFor="code">検証コード</InputLabel>
              <Field
                as={OutlinedInput}
                fullWidth
                id="code"
                name="code"
                error={touched.code && Boolean(errors.code)}
              />
              <ErrorMessage name="code">
                {(message) => (
                  <Typography
                    color={"error.main"}
                    fontSize={"0.75rem"}
                    mt={"3px"}
                  >
                    {message}
                  </Typography>
                )}
              </ErrorMessage>
            </Grid>
            <Grid
              item
              xs={12}
            >
              <InputLabel htmlFor="password">パスワード</InputLabel>
              <Field
                as={OutlinedInput}
                fullWidth
                id="password"
                name="password"
                error={touched.password && Boolean(errors.password)}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                sx={{
                  "& input::-ms-reveal": {
                    display: "none",
                  },
                  "& input::-ms-clear": {
                    display: "none",
                  },
                }}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword((show) => !show)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <ErrorMessage name="password">
                {(message) => (
                  <Typography
                    color={"error.main"}
                    fontSize={"0.75rem"}
                    mt={"3px"}
                  >
                    {message}
                  </Typography>
                )}
              </ErrorMessage>
            </Grid>
            <Grid
              item
              xs={12}
            >
              <InputLabel htmlFor="confirmPassword">パスワードの確認</InputLabel>
              <Field
                as={OutlinedInput}
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                type={showCFPassword ? "text" : "password"}
                autoComplete="new-password"
                sx={{
                  "& input::-ms-reveal": {
                    display: "none",
                  },
                  "& input::-ms-clear": {
                    display: "none",
                  },
                }}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowCFPassword((show) => !show)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showCFPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <ErrorMessage name="confirmPassword">
                {(message) => (
                  <Typography
                    color={"error.main"}
                    fontSize={"0.75rem"}
                    mt={"3px"}
                  >
                    {message}
                  </Typography>
                )}
              </ErrorMessage>
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            sx={{ mt: 3, mb: 2 }}
          >
            <span className={isSubmitting ? "hidden" : ""}>パスワードの確認</span>
            <span className={isSubmitting ? "" : "hidden"}>
              <CircularProgress size={24} />
            </span>
          </Button>
          <div
            className="w-full text-right text-linkColor cursor-pointer"
            onClick={handleResendCode}
          >
            <span>コードを再送信する</span>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default CodeForm;
