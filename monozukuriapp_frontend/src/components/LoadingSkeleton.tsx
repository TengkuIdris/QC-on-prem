import React from "react";
import styles from "./LoadingSkeleton.module.css";

interface LoadingSkeletonProps {
  type?: "form" | "content" | "list" | "card";
  rows?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = "content", rows = 3 }) => {
  if (type === "form") {
    return (
      <div className={styles.container}>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <div className={`${styles.skeleton} ${styles.label}`}></div>
            <div className={`${styles.skeleton} ${styles.input}`}></div>
          </div>
          <div className={styles.formGroup}>
            <div className={`${styles.skeleton} ${styles.label}`}></div>
            <div className={`${styles.skeleton} ${styles.input}`}></div>
          </div>
          <div className={styles.formGroup}>
            <div className={`${styles.skeleton} ${styles.label}`}></div>
            <div className={`${styles.skeleton} ${styles.textarea}`}></div>
          </div>
          <div className={styles.formGroup}>
            <div className={`${styles.skeleton} ${styles.button}`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className={styles.container}>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={styles.listItem}
          >
            <div className={`${styles.skeleton} ${styles.avatar}`}></div>
            <div className={styles.listContent}>
              <div className={`${styles.skeleton} ${styles.title}`}></div>
              <div className={`${styles.skeleton} ${styles.subtitle}`}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={`${styles.skeleton} ${styles.cardImage}`}></div>
          <div className={styles.cardContent}>
            <div className={`${styles.skeleton} ${styles.cardTitle}`}></div>
            <div className={`${styles.skeleton} ${styles.cardText}`}></div>
            <div className={`${styles.skeleton} ${styles.cardText} ${styles.short}`}></div>
          </div>
        </div>
      </div>
    );
  }

  // Default content type
  return (
    <div className={styles.container}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={styles.contentRow}
        >
          <div className={`${styles.skeleton} ${styles.line}`}></div>
          <div className={`${styles.skeleton} ${styles.line} ${styles.short}`}></div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
