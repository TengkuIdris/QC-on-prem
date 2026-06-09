import DraftPost from "@/features/kaizen-hub/components/KaizenHubInfo/DraftPost";
import Favorite from "@/features/kaizen-hub/components/KaizenHubInfo/Favorite";
import PostHistory from "@/features/kaizen-hub/components/KaizenHubInfo/PostHistory";
import MyPage from "@/features/settings/components/MyPage";
import React, { useContext, useMemo } from "react";
import { KaizenHubTabInfoContext } from "../kaizen-hub-tab";
import styles from "../kaizen-hub.module.css";

const KaizenHubTabInfo = () => {
  const context = useContext(KaizenHubTabInfoContext);
  if (!context) throw new Error("KaizenHubTabInfo must be used within a KaizenHubTabInfoProvider");
  const { kaizenHubTabInfo, setKaizenHubTabInfo } = context;

  const tabs = useMemo(
    () => [
      {
        label: "ユーザー情報",
        isActive: kaizenHubTabInfo === 0,
        children: <MyPage />,
      },
      {
        label: "投稿履歴",
        isActive: kaizenHubTabInfo === 1,
        children: <PostHistory />,
      },
      {
        label: "お気に入り",
        isActive: kaizenHubTabInfo === 2,
        children: <Favorite />,
      },
      {
        label: "下書き保存",
        isActive: kaizenHubTabInfo === 3,
        children: <DraftPost />,
      },
    ],
    [kaizenHubTabInfo],
  );

  const tableContent = useMemo(() => {
    switch (kaizenHubTabInfo) {
      case 0:
        return <MyPage />;
      case 1:
        return <PostHistory />;
      case 2:
        return <Favorite />;
      case 3:
        return <DraftPost />;
      default:
        return null;
    }
  }, [kaizenHubTabInfo]);

  return (
    <div className={`${styles.container} ${styles.containerMedium}`}>
      <nav className={styles.tabNav}>
        <ul className={styles.tabNavList}>
          {tabs.map((tab, index) => (
            <li
              key={tab.label}
              className={styles.tabNavItem}
              onClick={() => setKaizenHubTabInfo(index)}
            >
              <span className={`${styles.tabNavLink} ${tab.isActive ? styles.active : ""}`}>{tab.label}</span>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.userInfoSection}>{tableContent}</div>
    </div>
  );
};

export default KaizenHubTabInfo;
