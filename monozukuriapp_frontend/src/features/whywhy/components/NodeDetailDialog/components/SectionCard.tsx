import React, { FC, memo } from "react";
import styles from "../NodeDetailDialog.module.css";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface SectionCardProps {
  title: string;
  content: string;
  classNameCard: string;
  icon: string;
}

const SectionCard: FC<SectionCardProps> = ({ title, content, classNameCard, icon }) => {
  const { copyToClipboard } = useCopyToClipboard();

  return (
    <div className={`${styles["section-card"]} ${classNameCard}`}>
      <div className={styles["section-header"]}>
        <div className={styles["section-title"]}>
          <div className={`${styles["section-icon"]}`}>{icon}</div>
          {title}
        </div>
        <button
          className={styles["copy-button"]}
          onClick={() => copyToClipboard(content)}
        >
          📋 コピー
        </button>
      </div>
      <div className={styles["section-content"]}>{content}</div>
    </div>
  );
};

export default memo(SectionCard);
