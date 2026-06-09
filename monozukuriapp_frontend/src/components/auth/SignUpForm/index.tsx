import FormField from "@/components/ui/FormField/FormField";
import { Auth } from "@/enum/pathnames";
import authService, { RegisterBody } from "@/services/apis/authService";
import { handleApi } from "@/utils/handleApi";
import { Box, Button, CircularProgress, Grid, Typography } from "@mui/material";
import { AES } from "crypto-js";
import { Form, Formik } from "formik";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";

const SignUpSchema = Yup.object({
  username: Yup.string().required("ユーザー名は必須です"),
  email: Yup.string().email("メールアドレス形式は不正です").required("メールアドレスは必須です"),
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

const mapErrorMessages: Record<string, string> = {
  USER_EXISTED: "ユーザーが既に存在します。",
};

const SignUpForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showCFPassword, setShowCFPassword] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (
    values: {
      username: string;
      email: string;
      password: string;
      confirmPassword: string;
    },
    setIsLoading: (isSubmitting: boolean) => void,
  ) => {
    const registerBody: RegisterBody = {
      email: values.email,
      name: values.username,
      password: values.password,
    };
    setIsLoading(true);
    const id = toast.loading("しばらくお待ちください...");
    try {
      const [res, error] = await handleApi(authService.register(registerBody));
      if (res?.data) {
        toast.update(id, {
          render: "検証コードをメールに送信しましたので、ご確認ください。",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        const encryptEmail = AES.encrypt(registerBody.email, import.meta.env.VITE_SECRET_KEY).toString();
        navigate(`${Auth.REGISTER_VERIFY_CODE}?id=${encryptEmail}`);
      } else {
        toast.update(id, {
          render: mapErrorMessages[error] || error,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "エラーが発生しました";
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

  return (
    <Formik
      initialValues={{
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      }}
      validationSchema={SignUpSchema}
      onSubmit={(values, { setSubmitting }) => {
        handleRegister(values, setSubmitting);
      }}
    >
      {({ errors, touched, isSubmitting, status }) => (
        <Form autoComplete="off">
          <>
            <Grid
              container
              spacing={2}
            >
              <FormField
                name="username"
                label="ユーザー名"
                type="text"
                touched={touched}
                errors={errors}
              />
              <FormField
                name="email"
                label="メールアドレス"
                type="text"
                touched={touched}
                errors={errors}
              />
              <FormField
                name="password"
                label="パスワード"
                type="password"
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                touched={touched}
                errors={errors}
              />
              <FormField
                name="confirmPassword"
                label="パスワードの確認"
                type="password"
                showPassword={showCFPassword}
                setShowPassword={setShowCFPassword}
                touched={touched}
                errors={errors}
              />
            </Grid>
            {status && (
              <Box mt={2}>
                <Typography color="error">{status}</Typography>
              </Box>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              sx={{ mt: 3, mb: 2 }}
            >
              {isSubmitting ? (
                <>
                  新規登録
                  <CircularProgress
                    color="info"
                    size={24}
                    sx={{ ml: 1 }}
                  />
                </>
              ) : (
                "新規登録"
              )}
            </Button>
            <Grid
              container
              justifyContent="flex-end"
            >
              <Grid item>
                <Link to={Auth.LOGIN}>既にアカウントがありますか？ログイン</Link>
              </Grid>
            </Grid>
          </>
        </Form>
      )}
    </Formik>
  );
};

export default SignUpForm;
