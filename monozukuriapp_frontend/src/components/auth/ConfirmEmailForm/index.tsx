import { Auth } from "@/enum/pathnames";
import { Button, CircularProgress, Grid, InputLabel, TextField } from "@mui/material";
import { resetPassword, type ResetPasswordOutput } from "aws-amplify/auth";
import { AES } from "crypto-js";
import { useFormik } from "formik";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";

const mapErrorMessages: Record<string, string> = {
  "Username/client id combination not found.": "ユーザーの電子メールが見つかりません",
  "Attempt limit exceeded, please try after some time.":
    "試行回数の制限を超えました。しばらくしてからもう一度お試しください。",
  "Cannot reset password for the user as there is no registered/verified email or phone_number":
    "ユーザーに対してパスワードをリセットできません。登録済みまたは確認済みのメールアドレスや電話番号がありません。",
};

const confirmEmailSchema = Yup.object({
  email: Yup.string().email("メールアドレス形式は不正です").required("メールアドレス形式は不正です"),
});

const EmailForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: confirmEmailSchema,
    onSubmit: async ({ email }) => {
      setLoading(true);
      const id = toast.loading("しばらくお待ちください...");
      try {
        const result = await resetPassword({ username: email });
        const { nextStep } = result as ResetPasswordOutput;

        if (nextStep?.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
          toast.update(id, {
            render: `メールへ送信しました。`,
            type: "success",
            isLoading: false,
            autoClose: 5000,
            closeButton: true,
          });
          const encryptEmail = AES.encrypt(email, import.meta.env.VITE_SECRET_KEY).toString();
          navigate(`${Auth.FORGOT_PASSWORD_VERIFY_CODE}?id=${encryptEmail}`);
        } else {
          toast.update(id, {
            render: "予期しない応答が返されました。もう一度お試しください。",
            type: "error",
            isLoading: false,
            autoClose: 5000,
            closeButton: true,
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("Reset password error:", err);
        const errorMessage = err instanceof Error ? err.message : "確認コードの送信に失敗しました";
        toast.update(id, {
          render: mapErrorMessages[errorMessage] || errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
        setLoading(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <Grid
        container
        spacing={2}
      >
        <Grid
          item
          xs={12}
        >
          <InputLabel htmlFor="email">メールアドレス</InputLabel>
          <TextField
            fullWidth
            id="email"
            name="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
        </Grid>
      </Grid>
      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ mt: 3, mb: 2 }}
      >
        {loading ? (
          <CircularProgress
            size={24}
            color="inherit"
          />
        ) : (
          <span>メールへ送信</span>
        )}
      </Button>
      <div className="w-full text-right">
        <Link to={"/auth/login"}>ログイン</Link>
      </div>
    </form>
  );
};

export default EmailForm;
