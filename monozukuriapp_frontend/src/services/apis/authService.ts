import { ActionType } from "@/constant/enum";
import { ServiceBase } from "./baseService";
import axiosClient from "./axiosClient";

interface RefreshTokenBody {
  refreshToken: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface LoginRes extends MeRes {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterBody extends LoginBody {
  name: string;
}

export interface ResendCode {
  email: string;
}
export interface UpdateIndenty {
  indenty: string;
  tokens: string;
}
export interface VerifyCodeBody extends ResendCode {
  code: string;
}

interface Action {
  id: number;
  type: ActionType;
  name: string;
  createdAt: string | any;
  updatedAt: string | any;
}

interface Permission {
  id: number;
  planId: number;
  actionId: number;
  enableFlag: boolean;
  limitedUsage: number | null;
  createdAt: string;
  updatedAt: string;
  action: Action;
}

export interface RoleUser {
  [key: string]: Permission;
}

export interface CompanyRelation {
  company_code: string;
  company_name: string;
  contact_email: string;
  id: number;
  is_active: boolean;
}
export interface MeRes {
  id: number;
  email: string;
  name: string;
  role?: RoleUser;
  company: string | null;
  department: string | null;
  full_name: string | null;
  company_relation: CompanyRelation | null;
  affiliation: string | null;
}

export const logPasswordChanged = async (userId?: string, metadata?: any) => {
  return axiosClient.post("/audit-log/password-changed", { userId, metadata });
};

class AuthService extends ServiceBase {
  refreshToken = async (body: RefreshTokenBody) => {
    return await this.post("/auth/refresh-token", body);
  };

  login = async (body: LoginBody) => {
    return await this.post("/auth/login", body);
  };

  register = async (body: RegisterBody) => {
    return await this.post("/auth/create-user", body);
  };

  verifyCode = async (body: VerifyCodeBody) => {
    return await this.post("/auth/verify-code", body);
  };

  resendCode = async (body: ResendCode) => {
    return await this.post("/auth/resend-code", body);
  };

  updateIndenty = async (body: UpdateIndenty) => {
    return await this.put("/auth/update-indenty", body);
  };

  me = async () => {
    return await this.get("/user/me", {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  };

  logout = async (body: { email?: string; userId?: number }) => {
    return await this.post("/auth/logout", body);
  };

  setPasswordForInvitedUser = async (body: { userId: string; password: string }) => {
    return await this.post("/auth/set-password", body);
  };

  sendVerifyOtp = async (body: { email: string }) => {
    return await this.post("/auth/send-verify-otp", body);
  };

  verifyOtp = async (body: { email: string; otp: string }) => {
    return await this.post("/auth/verify-otp", body);
  };
}
const authService = new AuthService();
export default authService;
