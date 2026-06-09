import React from "react";
import { Helmet } from "react-helmet-async";
import PublicHeader from "@/components/layout/Header/PublicHeader";
import styles from "./solutions.module.css";

function UseCasesPage() {
  const useCases = [
    {
      id: 1,
      company: "製造業：自動車部品製造部",
      title: "パレート図活用で不良率30%削減",
      description: "データ分析ツールを活用し、重点課題を特定。効率的な改善活動により大幅な品質向上を実現しました。",
      image: "/image/usecase_pareto.png",
    },
    {
      id: 2,
      company: "製造業：電子回路部品製造部",
      title: "なぜなぜ分析AIで真因特定を効率化",
      description:
        "経験と菅に頼って原因を絞っていたが、AIサポートにより第三者目線で課題を洗い出し。検討していなかった視点に気づき真因発掘。AIサポートにより分析時間も15%短縮。",
      image: "/image/usecase_whywhy.png",
    },
    {
      id: 3,
      company: "製造業:自動車部品品質保証部",
      title: "特性要因図 + AI で問題の可視化を実現",
      description:
        "複雑な問題を体系的に整理し、チーム全体での課題共有が可能になりました。現場の課題以外にも、災害対策など日常の課題解決にも活用しています。",
      image: "/image/usecase_fishbone.png",
    },
  ];

  return (
    <>
      <Helmet>
        <title>導入事例・活用シナリオ | 品質管理・なぜなぜ分析の成功事例 | カイゼンハブ</title>
        <meta
          name="description"
          content="製造業の品質管理やなぜなぜ分析でカイゼンハブを活用した具体的な導入事例・ユースケースを紹介します。不良低減、再発防止、現場改善をどのようにAIで支援できるかが分かります。"
        />
      </Helmet>
      <PublicHeader />
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>導入事例</h1>
          <p className={styles.heroSubtitle}>カイゼンハブを導入いただいた企業様の成功事例</p>
        </div>
      </section>
      <section className={styles.contentSection}>
        <div className={styles.container}>
          <div className={styles.useCaseGrid}>
            {useCases.map((useCase) => (
              <div
                key={useCase.id}
                className={styles.useCaseCard}
              >
                <div className={styles.useCaseImage}>
                  <img
                    src={useCase.image}
                    alt={useCase.company}
                  />
                </div>
                <div className={styles.useCaseContent}>
                  <span className={styles.useCaseCompany}>{useCase.company}</span>
                  <h3 className={styles.useCaseTitle}>{useCase.title}</h3>
                  <p className={styles.useCaseDescription}>{useCase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default UseCasesPage;
