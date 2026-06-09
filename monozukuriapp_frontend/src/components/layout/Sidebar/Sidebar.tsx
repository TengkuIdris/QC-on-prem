import React, { useMemo, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import BarChartIcon from "@mui/icons-material/BarChart";
import WorkIcon from "@mui/icons-material/Work";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FeedbackIcon from "@mui/icons-material/Feedback";
import { useLocation, useNavigate } from "react-router-dom";
import { Tooltip, useMediaQuery, useTheme, Drawer } from "@mui/material";
import { App, Auth } from "../../../enum/pathnames";
import { useAppDispatch, useAppSelector } from "../../../core/hooks";
import { logout } from "../../../store/slices/authSlice";
import { toast } from "react-toastify";
import { signOut } from "aws-amplify/auth";
import { RootState } from "@/store/store";
import styles from "./Sidebar.module.css";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import authService from "@/services/apis/authService";
import event from "@/utils/eventEmitter";
import { EventType } from "@/constant/enum";

interface SidebarProps {
  width: number;
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ width, open, onClose, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isChangedOnPage = useAppSelector(
    (state: RootState) => state.checkSaveDataSlice.pareto || state.checkSaveDataSlice.fishbone,
  );
  const user = useAppSelector((state: RootState) => state.auth.user);
  const userName = useMemo(() => user?.full_name || user?.name || "山田 太郎", [user]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const hasMainScreenPermission = user.role?.KAIZENHUB_MAIN_SCREEN;

  const handleLogoClick = () => {
    // Check if currently on WhyWhy analysis view page (need to intercept navigation)
    const isOnWhyWhyAnalysisView = location.pathname.startsWith("/whywhy/view/");
    
    if (isChangedOnPage || isOnWhyWhyAnalysisView) {
      event.emit(EventType.PARETO_CHECK_SAVE_DATA, App.INDEX);
    } else {
      navigate(App.INDEX);
      onClose();
    }
  };

  const menuItems = [{ text: "ホーム", path: App.HOME, icon: <HomeIcon /> }];
  const analysisItems = [
    { text: "パレート図作成", path: App.PARETO, icon: <BarChartIcon /> },
    {
      text: "特性要因図作成",
      path: App.DIAGRAM,
      icon: <AccountTreeIcon />,
    },
    { text: "なぜなぜ分析", path: App.WHYWHY, icon: <QuestionMarkIcon /> },
    {
      text: "ご意見・ご要望",
      path: App.FEEDBACK,
      icon: <FeedbackIcon />,
    },
  ];
  const projectItems = [{ text: "マイプロジェクト", path: App.YOUR_PROJECTS, icon: <WorkIcon /> }];
  const bottomItems = [
    {
      text: "設定",
      path: "/settings",
      icon: <SettingsIcon />,
      onClick: () => navigate(App.SETTINGS),
    },
    {
      text: "利用規約",
      path: "/pdf/terms_of_service.pdf",
      icon: <OpenInNewIcon />,
      onClick: () => {
        window.open("/pdf/terms_of_service.pdf", "_blank");
      },
    },
    {
      text: "プライバシーポリシー",
      path: "https://www.jatco.co.jp/privacy.html",
      icon: <OpenInNewIcon />,
      onClick: () => {
        window.open("https://www.jatco.co.jp/privacy.html", "_blank");
      },
    },
    {
      text: "ログアウト",
      path: App.INDEX,
      icon: <LogoutIcon />,
      onClick: async () => {
        try {
          console.log("Logging out user:", user);
          if (user.email) {
            await authService.logout({ email: user.email });
          }
          await signOut();
          dispatch(logout());
          navigate(Auth.LOGIN);
          toast.success("ログアウトは成功しました。");
        } catch (err) {
          console.log(err);
          toast.error("ログアウト中にエラーが発生しました。");
        }
      },
    },
  ];

  const handleNav = (item: any) => {
    // Check if currently on WhyWhy analysis view page (need to intercept navigation)
    const isOnWhyWhyAnalysisView = location.pathname.startsWith("/whywhy/view/");
    
    if (isChangedOnPage || isOnWhyWhyAnalysisView) {
      event.emit(EventType.PARETO_CHECK_SAVE_DATA, item.path);
    } else {
      if (!item?.disabled) {
        if (item.onClick) {
          item.onClick();
        } else {
          // React Routerのnavigate関数を使用（ページリロードなし）
          navigate(item.path, { replace: false });
        }
        if (isMobile && open) {
          onClose();
        }
      }
    }
  };

  const openMenu = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const sidebarContent = (
    <div
      className={`${styles.sidebar} ${!open ? styles.collapsed : ""}`}
      style={{ width: open ? width : 72 }}
    >
      <div className={styles["sidebar-header"]}>
        <div
          className={`${styles["sidebar-logo"]} ${open ? "" : "hidden"}`}
          onClick={handleLogoClick}
          style={{ cursor: "pointer" }}
        >
          <img
            src="/image/logo_kaizenhub_ver2.png"
            alt="KaizenHub Logo 2"
            style={{ height: 48, width: "auto" }}
          />
        </div>
        <button
          className={`${styles["sidebar-toggle"]} ${open ? "" : "hidden"}`}
          onClick={onToggle}
          aria-label="close sidebar"
        >
          <MenuIcon />
        </button>
        <button
          className={`${styles["sidebar-toggle"]} ${open ? "hidden" : ""}`}
          onClick={onToggle}
          aria-label="open sidebar"
          style={{ margin: "0 auto" }}
        >
          <MenuIcon />
        </button>
      </div>

      <div className={`${styles["sidebar-section-title"]} ${open ? "" : "hidden"}`}>メインナビゲーション</div>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.text}>
              <button
                type="button"
                className={`${styles.sidebarButton} ${location.pathname === item.path ? styles.active : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNav(item);
                }}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={`${open ? "" : "hidden"}`}>{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`${styles["sidebar-section-title"]} ${open ? "" : "hidden"}`}>分析ツール</div>
      <nav>
        <ul>
          {analysisItems.map((item) => (
            <li key={item.text}>
              <button
                type="button"
                className={`${styles.sidebarButton} ${location.pathname === item.path ? styles.active : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNav(item);
                }}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={`${open ? "" : "hidden"}`}>{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`${styles["sidebar-section-title"]} ${open ? "" : "hidden"}`}>プロジェクト</div>
      <nav>
        <ul>
          {projectItems.map((item) => (
            <li key={item.text}>
              <button
                type="button"
                className={`${styles.sidebarButton} ${location.pathname === item.path ? styles.active : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNav(item);
                }}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={`${open ? "" : "hidden"}`}>{item.text}</span>
              </button>
            </li>
          ))}
          {/* {hasMainScreenPermission && (
            <li className="flex justify-start">
              <img
                src="/image/logo_kaizenhub_rev.png"
                alt="logo"
                className={`cursor-pointer  ${open ? "h-20 pl-4" : ""}`}
                onClick={() => navigate(App.KAIZEN_HUB)}
              />
            </li>
          )} */}
        </ul>
      </nav>

      <div className={styles["sidebar-footer"]}>
        <ul>
          <li>
            <Tooltip
              title={userName}
              slotProps={{
                popper: {
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [0, -14],
                      },
                    },
                  ],
                },
              }}
            >
              <button
                type="button"
                onClick={handleClick}
                aria-controls={openMenu ? "account-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu ? "true" : undefined}
                className={`${styles.sidebarFooterButton} flex items-center justify-between`}
              >
                <div className="flex items-center">
                  <span className={styles.icon}>
                    <AccountCircleIcon />
                  </span>
                  <span className={`${open ? "" : "hidden"}`}>
                    {userName.length > 20 ? `${userName.substring(0, 20)}...` : userName}
                  </span>
                </div>
                {open && (
                  <span className={styles.icon}>
                    <ArrowForwardIosIcon />
                  </span>
                )}
              </button>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={openMenu}
              onClose={handleClose}
              onClick={handleClose}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    overflow: "visible",
                    filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                    mt: 1.5,
                    left: `${open ? "275px" : "70px"} !important`,
                    "& .MuiAvatar-root": {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              {bottomItems.map((item, index) => (
                <MenuItem
                  key={index}
                  onClick={() => {
                    handleClose();
                    handleNav(item);
                  }}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    alignItems: "center",
                    padding: "8px 16px",
                    color: "text.primary",
                  }}
                >
                  {item.text}
                  <span className={styles.icon}>{item.icon}</span>
                </MenuItem>
              ))}
            </Menu>
          </li>
        </ul>
      </div>
    </div>
  );

  // モバイル時はDrawerで表示
  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: width,
            backgroundColor: "var(--color-primary)",
            color: "#fff",
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // デスクトップ時は通常のサイドバー
  return sidebarContent;
};

export default Sidebar;
