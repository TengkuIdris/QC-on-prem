import { Auth } from "@/enum/pathnames";
import LoginPage from "@/features/auth/login/LoginPage";
import EmailForm from "@/components/auth/ConfirmEmailForm";
import CodeForm from "@/components/auth/VerifyCodeForm";
import SetPasswordPage from "@/pages/InitialPage/SetPassWordPage";
import ReVerifyEmail from "@/components/auth/VerifySignUp/ReVerifyEmail";
import SignUpVerifyForm from "@/components/auth/VerifySignUp";
import AuthLayout from "@/components/layout/AuthLayout";
import { RouteConfig } from "../types";

export function createAuthRoutes(): RouteConfig {
  return {
    element: <AuthLayout />,
    children: [
      { path: Auth.LOGIN, element: <LoginPage /> },
      { path: Auth.REGISTER_VERIFY_CODE, element: <SignUpVerifyForm /> },
      { path: Auth.FORGOT_PASSWORD_MAIl, element: <EmailForm /> },
      { path: Auth.FORGOT_PASSWORD_VERIFY_CODE, element: <CodeForm /> },
      { path: Auth.SET_PASSWORD, element: <SetPasswordPage /> },
      { path: Auth.LOGIN_REVERIFY_EMAIL, element: <ReVerifyEmail /> },
    ],
  };
}
