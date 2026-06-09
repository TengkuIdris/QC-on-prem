import React, { useMemo } from "react";
import style from "../../kaizen-hub.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@/enum/pathnames";
import { useAppSelector } from "@/core/hooks";

interface HeaderItem {
  title: string;
  path: string;
  icon: string;
  isActive: boolean;
  isDisabled: boolean;
}

export default function HeaderKaizenHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname.split("/")[1];
  const userRole = useAppSelector((state) => state.auth.user.role);
  const hasViewPermission = userRole?.KAIZENHUB_POST_AND_VIEW;

  const items: HeaderItem[] = useMemo(
    () => [
      {
        title: "ホーム",
        path: App.KAIZEN_HUB,
        icon: "🏠",
        isActive: pathname === App.KAIZEN_HUB.slice(1),
        isDisabled: false,
      },
      {
        title: "レシピを探す",
        path: App.KAIZEN_HUB_SEARCH,
        icon: "🔍",
        isActive: pathname === App.KAIZEN_HUB_SEARCH.slice(1),
        isDisabled: false,
      },
      {
        title: "レシピを投稿",
        path: App.KAIZEN_HUB_POST,
        icon: "📝",
        isActive: pathname === App.KAIZEN_HUB_POST.slice(1),
        isDisabled: !hasViewPermission,
      },
      {
        title: "マイページ",
        path: App.KAIZEN_HUB_INFO,
        icon: "👤",
        isActive: pathname === App.KAIZEN_HUB_INFO.slice(1),
        isDisabled: false,
      },
      {
        title: "改善ツール",
        path: App.HOME,
        icon: "🛠️",
        isActive: pathname === App.HOME.slice(1),
        isDisabled: false,
      },
    ],
    [pathname],
  );

  return (
    <header className={style.header}>
      <div className={style.headerContent}>
        <h1 className={`${style.headerTitle} h-full`}>
          <img
            src="/image/logo_kaizenhub_rev.png"
            alt="カイゼンハブ ロゴ"
            className="h-full"
          />
          カイゼンハブ
        </h1>
        <div className={style.headerActions}>
          {items.map((item) => (
            <button
              key={item.title}
              className={`${style.btn} ${item.isDisabled ? style.btnDisabled : item.isActive ? style.btnPrimary : style.btnSecondary}`}
              onClick={() => {
                navigate(item.path);
              }}
              disabled={item.isDisabled}
            >
              <span>{item.icon}</span>
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
