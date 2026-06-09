import { Auth } from "@/enum/pathnames";
import authService from "@/services/apis/authService";
import { handleApi } from "@/utils/handleApi";
import { Box, Button, CircularProgress, Grid, TextField, Typography } from "@mui/material";
import { AES, enc } from "crypto-js";
import { useFormik } from "formik";
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";

const ReVerifyEmail: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
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
      setIsLoading(true);
      const toastId = toast.loading("しばらくお待ちください...");
      try {
        const [res, error] = await handleApi(authService.verifyOtp({ email, otp: values.code }));
        if (res?.data) {
          toast.update(toastId, {
            render: "メール認証が完了しました。再度ログインしてください。",
            type: "success",
            isLoading: false,
            autoClose: 5000,
          });
          navigate(Auth.LOGIN);
        } else {
          toast.update(toastId, {
            render: error || "認証に失敗しました",
            type: "error",
            isLoading: false,
            autoClose: 5000,
          });
        }
      } catch (err) {
        toast.update(toastId, { render: "認証に失敗しました", type: "error", isLoading: false, autoClose: 5000 });
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleResendCode = async () => {
    if (isSendingOtp) return; // Prevent multiple requests

    const email = AES.decrypt((id as string).replaceAll(" ", "+"), import.meta.env.VITE_SECRET_KEY).toString(enc.Utf8);
    setIsSendingOtp(true);
    try {
      const result = await handleApi(authService.sendVerifyOtp({ email }));
      toast.success("認証コードを再送信しました");
    } catch (error) {
      toast.error("認証コードの再送信に失敗しました");
    } finally {
      setIsSendingOtp(false);
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
              label="認証コード"
              placeholder="メールに送信された6桁のコードを入力してください"
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
            確認する{" "}
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
            className="text-linkColor cursor-pointer"
            onClick={handleResendCode}
          >
            <span className={isSendingOtp ? "hidden" : ""}>
              コードを再送信する
            </span>
            <span className={isSendingOtp ? "" : "hidden"}>
              送信中...
            </span>
          </Grid>
        </Grid>
      </>
    </form>
  );
};

export default ReVerifyEmail;
