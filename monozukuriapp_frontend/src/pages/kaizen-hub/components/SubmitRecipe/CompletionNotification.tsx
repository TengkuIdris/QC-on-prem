import React from "react";
import styles from "../../kaizen-hub.module.css";
import { Link } from "react-router-dom";

interface CompletionNotificationProps {
  onClose: () => void;
}

const CompletionNotification: React.FC<CompletionNotificationProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
      <div className={`${styles.confirmationContainer}`}>
        <div className={styles.confirmationIconArea}>
          {/* Font Awesomeなどのアイコンライブラリを使用するか、SVG/画像で代替 */}
          <span className={styles.confirmationIcon}>✓</span>
        </div>
        <h2 className={styles.confirmationTitle}>レシピが投稿されました！</h2>
        <p className={styles.confirmationDescription}>
          ご投稿ありがとうございます。
          <br />
          カイゼンハブに新しい改善事例が追加されました。
        </p>
        <button
          className={styles.btnClose}
          onClick={onClose}
        >
          閉じる
        </button>
        <div className={styles.confirmationFooterInfo}>
          © 2023 カイゼンハブ | <Link to="#">利用規約</Link> | <Link to="#">プライバシーポリシー</Link>
        </div>
      </div>
    </div>
  );
};

export default CompletionNotification;
