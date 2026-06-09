import React from "react";
import styles from "../../../kaizen-hub.module.css";

const PreviewSection = () => {
  return (
    <aside className={styles.previewSection}>
      <div className={styles.previewCard}>
        <h3 className={styles.previewHeader}>
          <span>👁️</span>
          リアルタイムプレビュー
        </h3>
        <div className={styles.previewContent}>
          <h4
            style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}
            id="preview-title"
          >
            組立工程改善
          </h4>
          <p
            style={{ marginBottom: 12 }}
            id="preview-summary"
          >
            なぜなぜ分析のアプローチで根本原因を明確化し、AI-Agentを活用した工程の最適化を実施。
          </p>
          <div className={styles.previewChart}>
            改善効果グラフ
            <br />
            (データ入力時に更新)
          </div>
        </div>
      </div>
      <div className={styles.previewCard}>
        <h3 className={styles.previewHeader}>
          <span>💡</span>
          入力のヒント
        </h3>
        <div className={styles.previewContent}>
          <ul
            style={{ paddingLeft: 20, fontSize: 13, lineHeight: "1.8" }}
            className="list-disc"
          >
            <li>具体的な数値を入れると説得力が増します</li>
            <li>Before/Afterが明確だと効果が伝わりやすくなります</li>
            <li>実施期間や対象範囲も記載しましょう</li>
            <li>失敗談や注意点も価値ある情報です</li>
          </ul>
        </div>
      </div>
      {/* AI アシスタント */}
      <div
        className={styles.previewCard}
        style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd" }}
      >
        <h3
          className={styles.previewHeader}
          style={{ color: "#0369a1" }}
        >
          <span>🤖</span>
          AI アシスタント
        </h3>
        <div className={styles.previewContent}>
          <p style={{ fontSize: 13, marginBottom: 12 }}>入力内容を分析して、改善提案をします。</p>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ width: "100%", fontSize: 14 }}
          >
            文章を改善提案
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PreviewSection;
