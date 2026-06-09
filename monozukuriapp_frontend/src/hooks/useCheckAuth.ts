import { RootState } from "@/store/store";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../core/hooks";
import { App, Auth } from "../enum/pathnames";
import authService from "../services/apis/authService";
import { login, logout } from "../store/slices/authSlice";
import { handleApi } from "../utils/handleApi";
import { clearLocalStorageCognito } from "@/helpers/clearCognitoSession";
import { ActionType } from "@/constant/enum";

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === "true";

// On-prem stub user. Mirrors the shape produced by /user/me well enough for
// the redux auth slice and the WHYWHY page role checks to be happy.
const buildDevUser = () => {
  const role = Object.values(ActionType).reduce(
    (acc, key) => {
      acc[key] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );
  return {
    email: "dev@local",
    id: 1,
    name: "Dev User",
    full_name: "Dev User",
    role: role as any,
    company: null,
    department: null,
    company_relation: null,
    affiliation: null,
  };
};

const useCheckAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCheckUserIsValid = async () => {
    if (AUTH_DISABLED) {
      dispatch(login(buildDevUser()));
      return true;
    }
    const [res] = await handleApi(authService.me());
    if (res) {
      const { email, id, name, company, department, full_name, company_relation, affiliation } = res.data;
      const role = res.data?.plansDetails.reduce((acc: any, item: any) => {
        acc[item.action.type] = item?.enableFlag;
        return acc;
      }, {});
      dispatch(login({ email, id, name, role, company, department, full_name, company_relation, affiliation }));
      return true;
    } else {
      clearLocalStorageCognito();
      dispatch(logout());
      return false;
    }
  };

  const fetchUserData = async () => {
    setIsLoading(true);

    // Auto logout when entering set password page
    const isSetPasswordPage = location.pathname === Auth.SET_PASSWORD;
    if (isSetPasswordPage) {
      clearLocalStorageCognito();
      dispatch(logout());
    }

    let _isAuthenticated = isAuthenticated;
    _isAuthenticated = await handleCheckUserIsValid();
    const isAuthPage = location.pathname.startsWith("/auth");
    const isPublicPage = [
      App.INDEX,
      App.PRIVACYANDPOLICY,
      App.FEATURE_CAUSE_TOOL,
      App.PRODUCT_PARETO,
      App.PRODUCT_FISHBONE,
      App.PRODUCT_WEBSAVE,
      App.PRODUCT_SERVICE_SUPPORT,
      App.CONTACT,
      Auth.SET_PASSWORD,
      Auth.REGISTER_SUCCESS,
    ].includes(location.pathname as App);

    if (location.pathname !== App.INDEX) {
      if (_isAuthenticated && isAuthPage) {
        navigate(App.HOME);
      } else if (!_isAuthenticated && !isAuthPage && !isPublicPage) {
        navigate("/auth/login");
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, [isAuthenticated, location.pathname]);

  const handleVisibilityChange = async () => {
    if (document.visibilityState === "visible") {
      await handleCheckUserIsValid();
    }
  };

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isLoading;
};

export default useCheckAuth;
