import { Button, Checkbox, FormControlLabel, Stack } from "@mui/material";
import { signIn, signOut } from "aws-amplify/auth";
import { Form, Formik } from "formik";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as yup from "yup";
import { useAppDispatch } from "../../../core/hooks";
import { App, Auth } from "../../../enum/pathnames";
import authService, { LoginBody } from "../../../services/apis/authService";
import { login } from "../../../store/slices/authSlice";
import { handleApi } from "../../../utils/handleApi";
import FormField from "../../ui/FormField/FormField";
import { v4 as uuidv4 } from "uuid";
import { AES } from "crypto-js";

const LoginSchema = yup.object().shape({
  email: yup.string().email("メールアドレス形式は不正です").required("メールアドレスは必須です"),
  password: yup
    .string()
    .min(8, "パスワードは８文字以上で入力してください。")
    .matches(/[a-z]/, "パスワードには少なくとも1つの小文字を含める必要があります")
    .matches(/[A-Z]/, "パスワードには少なくとも1つの大文字を含める必要があります")
    .matches(/[0-9]/, "パスワードには少なくとも1つの数字を含める必要があります")
    .matches(/[^a-zA-Z0-9]/, "パスワードには少なくとも1つの特殊文字を含める必要があります")
    .required("パスワードは必須です"),
});

const mapErrorMessages: Record<string, string> = {
  "Incorrect username or password.": "メールまたはパスワードが正しくありません。",
  "User does not exist.": "ユーザーが存在しません。",
  "Member role is not allowed to login": "メンバー権限ではログインできません。管理者にお問い合わせください。",
  "Request failed with status code 500": "ログインに失敗しました。",
};

const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState<boolean>(
    localStorage.getItem("rememberMe") ? JSON.parse(localStorage.getItem("rememberMe") as string) : false,
  );
  const initialValue = {
    email: rememberMe ? localStorage.getItem("email") || "" : "",
    password: rememberMe ? localStorage.getItem("password") || "" : "",
  };
  const dispatch = useAppDispatch();
  const location = useLocation();
  const pageRedirect = location.state?.path;

  const fetchUserData = async () => {
    const [res] = await handleApi(authService.me());

    if (res?.data) {
      const { email, id, name, company, department, full_name, company_relation, affiliation } = res.data;
      const role = res.data?.plansDetails.reduce((acc: any, item: any) => {
        acc[item.action.type] = item?.enableFlag;
        return acc;
      }, {});
      dispatch(login({ email, id, name, role, company, department, full_name, company_relation, affiliation }));
    }
  };

  const handleLogin = async ({ email, password }: LoginBody, setSubmitting: (isSubmitting: boolean) => void) => {
    setSubmitting(true);
    const id = toast.loading("しばらくお待ちください...");
    try {
      localStorage.setItem("rememberMe", JSON.stringify(rememberMe));
      if (rememberMe) {
        localStorage.setItem("email", email);
        localStorage.setItem("password", password);
      } else {
        localStorage.removeItem("email");
        localStorage.removeItem("password");
      }
      const { isSignedIn: _isSignedIn, nextStep: _nextStep } = await signIn({ username: email, password });

      if (!_isSignedIn || _nextStep.signInStep !== "DONE") {
        throw new Error("ログインに失敗しました");
      }
      await signOut({ global: true });
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      if (isSignedIn || nextStep.signInStep === "DONE") {
        const ui = uuidv4();
        localStorage.setItem("indenty", ui);

        const user = localStorage.getItem(
          `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.LastAuthUser`,
        );
        const accessToken = localStorage.getItem(
          `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.accessToken`,
        );
        const idToken = localStorage.getItem(
          `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.idToken`,
        ) as string;

        const encryptIdToken = AES.encrypt(idToken, import.meta.env.VITE_SECRET_KEY).toString();
        await authService.updateIndenty({
          indenty: ui,
          tokens: `${accessToken} ${encryptIdToken}`,
        });
        await fetchUserData();
        navigate(pageRedirect ? pageRedirect : App.HOME);
        toast.update(id, {
          render: "ログインは成功しました",
          type: "success",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      }
    } catch (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : error && typeof error === "object" && "message" in error && typeof (error as any).message === "string"
              ? (error as any).message
              : "";
      if (errorMessage.includes("EMAIL_NOT_VERIFIED")) {
        const encryptEmail = AES.encrypt(email, import.meta.env.VITE_SECRET_KEY).toString();
        try {
          await handleApi(authService.sendVerifyOtp({ email }));
          toast.update(id, {
            render: "メールアドレスの再確認が必要です。認証コードを送信しました。",
            type: "info",
            isLoading: false,
            autoClose: 5000,
            closeButton: true,
          });
        } catch (otpError) {
          console.error("Failed to send OTP:", otpError);
          toast.update(id, {
            render: "メールアドレスの再確認が必要です。認証コードの送信に失敗しました。",
            type: "warning",
            isLoading: false,
            autoClose: 5000,
            closeButton: true,
          });
        }
        navigate(Auth.LOGIN_REVERIFY_EMAIL + `?id=${encryptEmail}`);
      } else if (errorMessage === "Request failed with status code 500") {
        await signOut({ global: true });
        toast.update(id, {
          render: mapErrorMessages[errorMessage] || errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      } else {
        toast.update(id, {
          render: mapErrorMessages[errorMessage] || errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValue}
      validationSchema={LoginSchema}
      onSubmit={(values, { setSubmitting }) => handleLogin(values, setSubmitting)}
      enableReinitialize
    >
      {({ values, errors, touched, isSubmitting }) => (
        <Form>
          <Stack
            direction="column"
            spacing={3}
          >
            <FormField
              name="email"
              label="メールアドレス"
              type="text"
              touched={touched}
              errors={errors}
              value={values.email}
            />
            <FormField
              name="password"
              label="パスワード"
              type="password"
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              touched={touched}
              value={values.password}
              errors={errors}
            />
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                }
                label="ログイン状態を保持"
              />
              <Link to={Auth.FORGOT_PASSWORD_MAIl}>パスワードを忘れました</Link>
            </Stack>
            {/* <Link
              to={Auth.REGISTER}
              className="text-right !mt-0"
            >
              新規登録
            </Link> */}
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              <span className={isSubmitting ? "" : "hidden"}>
                ログイン中...
              </span>
              <span className={isSubmitting ? "hidden" : ""}>
                ログイン
              </span>
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};

export default LoginForm;
