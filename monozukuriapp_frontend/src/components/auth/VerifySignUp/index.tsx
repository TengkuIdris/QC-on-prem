import { Auth } from "@/enum/pathnames";
import authService, { VerifyCodeBody } from "@/services/apis/authService";
import { handleApi } from "@/utils/handleApi";
import { Box, Button, CircularProgress, Grid, TextField, Typography } from "@mui/material";
import { AES, enc } from "crypto-js";
import { useFormik } from "formik";
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";

const mapErrorMessages: Record<string, string> = {
  CONFIRM_SIGN_UP_FAILED: "ログインは失敗しました。",
};

const SignUpVerifyForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const verifyFormik = useFormik({
    initialValues: { code: "" },
    validationSchema: Yup.object({
      code: Yup.string()
        .required("コードは必須です")
        .length(6, "コードは6文字以内で入力してください。")
        .matches(/^\d+$/, "コードが正しくありません"),
    }),

    onSubmit: async (values) => {
      const email = AES.decrypt((id as string).replaceAll(" ", "+"), import.meta.env.VITE_SECRET_KEY).toString(
        enc.Utf8,
      );
      const verifyCodeBody: VerifyCodeBody = {
        email: email,
        code: values.code,
      };
      await handleVerify(verifyCodeBody);
    },
  });

  const handleVerify = async (verifyCodeBody: VerifyCodeBody) => {
    setIsLoading(true);
    const id = toast.loading("しばらくお待ちください...");
    try {
      const [res, error] = await handleApi(authService.verifyCode(verifyCodeBody));
      if (res?.data) {
        toast.update(id, { render: "新規登録は完成しました。", type: "success", isLoading: false, autoClose: 5000 });
        navigate(Auth.LOGIN);
      } else {
        toast.update(id, {
          render: mapErrorMessages[error] || error,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      toast.update(id, {
        render: mapErrorMessages[errorMessage] || errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const email = AES.decrypt((id as string).replaceAll(" ", "+"), import.meta.env.VITE_SECRET_KEY).toString(enc.Utf8);
    const [res] = await handleApi(authService.resendCode({ email }));
    if (res) {
      toast.success("コードが返送されました");
    } else {
      toast.error("コードの再送信に失敗しました");
    }
  };
  return (
    <form
      onSubmit={verifyFormik.handleSubmit}
      autoComplete="off"
    >
      <>
        <Grid
          container
          spacing={2}
        >
          <Grid
            item
            xs={12}
          >
            <TextField
              fullWidth
              id="code"
              name="code"
              label="検証コード"
              value={verifyFormik.values.code}
              onChange={verifyFormik.handleChange}
              error={verifyFormik.touched.code && Boolean(verifyFormik.errors.code)}
              helperText={verifyFormik.touched.code && verifyFormik.errors.code}
            />
          </Grid>
        </Grid>
        {verifyFormik.status && (
          <Box mt={2}>
            <Typography color="error">{verifyFormik.status}</Typography>
          </Box>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={isLoading}
          sx={{ mt: 3, mb: 2 }}
        >
          <span >
            確認する
            <CircularProgress
              color="info"
              size={24}
              sx={{ ml: 1 }}
              className={isLoading ? "" : "hidden"}
            />
          </span>
        </Button>
        <Grid
          container
          justifyContent="flex-end"
        >
          <Grid
            item
            className="!mr-6 text-linkColor cursor-pointer"
            onClick={handleResendCode}
          >
            コードを再送信する
          </Grid>
          <Grid item>
            <Link to={Auth.REGISTER}>戻る</Link>
          </Grid>
        </Grid>
      </>
    </form>
  );
};

export default SignUpVerifyForm;
