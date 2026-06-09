import axios from "axios";
import { normalizeError } from "@/utils/errorHandling";
import { AES } from "crypto-js";
import { fetchAuthSession } from "aws-amplify/auth";
import { store } from "../../store/store";
import { logout } from "../../store/slices/authSlice";
import { clearLocalStorageCognito } from "@/helpers/clearCognitoSession";

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === "true";

// 開発環境用のモックをインポート
// let mockFetchAuthSession: any = null;
// if (import.meta.env.DEV) {
//   import("../../mocks/authMock").then((module) => {
//     mockFetchAuthSession = module.mockFetchAuthSession;
//   });
// }

// Use environment variable for baseURL
// In dev: /api/v1 (proxied by Vite to backend)
// In production: https://alb.phase-1.kznhub.com/api/v1 (direct to ALB)
const baseURL = import.meta.env.VITE_BACKEND_URL_V1 || "/api/v1";

export const instance = axios.create({
  baseURL,
  headers: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  },
});

instance.interceptors.request.use(
  (config) => {
    if (AUTH_DISABLED) {
      return config;
    }
    const user = localStorage.getItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.LastAuthUser`,
    );
    if (!user) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[auth] No LastAuthUser found — request will be sent without Authorization header.");
      }
      return config;
    }
    const accessToken = localStorage.getItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.accessToken`,
    );
    const idToken = localStorage.getItem(
      `CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user}.idToken`,
    );
    const indenty = localStorage.getItem("indenty");
    if (accessToken && idToken && indenty && import.meta.env.VITE_SECRET_KEY) {
      const encryptIdToken = AES.encrypt(idToken, import.meta.env.VITE_SECRET_KEY).toString();
      const encryptIndenty = AES.encrypt(indenty, import.meta.env.VITE_SECRET_KEY).toString();
      config.headers.Authorization = `Bearer ${accessToken} ${encryptIdToken} ${encryptIndenty}`;
    } else if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[auth] Missing one of accessToken/idToken/indenty/SECRET_KEY — header not attached.");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Attach normalized error for downstream consumers
    try {
      error.normalized = normalizeError(error);
    } catch {
      // no-op; keep original error shape
    }
    const originalConfig = error.config;
    if (error?.response?.status === 401 && !originalConfig._retry) {
      // On-prem bypass: no Cognito session to refresh. Just surface the 401.
      if (AUTH_DISABLED) {
        return Promise.reject(error);
      }
      originalConfig._retry = true;
      try {
        // 開発環境ではモックを使用
        const authSession =
          // import.meta.env.DEV && mockFetchAuthSession
          //   ? await mockFetchAuthSession()
          //   : await fetchAuthSession({ forceRefresh: true });
          await fetchAuthSession({ forceRefresh: true });

        const { accessToken, idToken } = authSession.tokens ?? {};
        const encryptIdToken = AES.encrypt(idToken?.toString() || "", import.meta.env.VITE_SECRET_KEY).toString();
        const indenty = localStorage.getItem("indenty");
        if (accessToken) {
          if (indenty && import.meta.env.VITE_SECRET_KEY) {
            const encryptIndenty = AES.encrypt(indenty, import.meta.env.VITE_SECRET_KEY).toString();
            originalConfig.headers.Authorization = `Bearer ${accessToken} ${encryptIdToken} ${encryptIndenty}`;
          } else {
            if (import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.warn("[auth] Retry without indenty — header may be incomplete.");
            }
            originalConfig.headers.Authorization = `Bearer ${accessToken} ${encryptIdToken}`;
          }
        }
        if (accessToken) {
          return instance(originalConfig);
        }
        store.dispatch(logout());
        clearLocalStorageCognito();
        return Promise.reject(error);
      } catch (error) {
        store.dispatch(logout());
        clearLocalStorageCognito();
      }
    }
    return Promise.reject(error);
  },
);

export default instance;
