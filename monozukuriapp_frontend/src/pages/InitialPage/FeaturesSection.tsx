import React from "react";
import { App } from "../../enum/pathnames";
import style from "./initial.module.css";

interface FeaturesSectionProps {
  navigate: (path: string) => void;
}

export function FeaturesSection({ navigate }: FeaturesSectionProps) {
  return (
    <section
      id="features"
      className={style["features-section"]}
    >
      <div className={style.container}>
        <h2 className={style["section-title"]}>主な機能</h2>
        <div className={style["features-grid"]}>
          <div
            className={`${style["feature-item"]} cursor-pointer`}
            onClick={() => {
              navigate(App.PRODUCT_PARETO);
            }}
          >
            <div className={style["feature-header"]}>
              <div className={`${style["feature-icon"]}`}>
                <img
                  src="/image/parento-icon.png"
                  alt="icon_pareto"
                  loading="lazy"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h3 className={`${style["feature-title"]} text-center`}>パレート図作成</h3>
            </div>
            <p className={`${style["feature-description"]} text-center mt-2`}>
              パレート図作成Webアプリ。シンプルな操作で作成可能。問題の重要度を可視化してデータ分析しよう！
            </p>
          </div>
          <div
            className={`${style["feature-item"]} cursor-pointer`}
            onClick={() => {
              navigate(App.PRODUCT_FISHBONE);
            }}
          >
            <div className={style["feature-header"]}>
              <div className={`${style["feature-icon"]}`}>
                <img
                  src="/image/fishbone.png"
                  alt="icon_fishbone"
                  loading="lazy"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h3 className={`${style["feature-title"]} text-center`}>特性要因図作成</h3>
            </div>
            <p className={`${style["feature-description"]} text-center mt-2`}>
              いつまでもパワポでポチポチしていませんか？AIが作成のサポートをします！
            </p>
          </div>
          <div
            className={`${style["feature-item"]} cursor-pointer`}
            onClick={() => {
              navigate(App.WHYWHY);
            }}
          >
            <div className={style["feature-header"]}>
              <div className={`${style["feature-icon"]}`}>
                <img
                  src="/image/ai.svg"
                  alt="icon_whywhy_analysis"
                  loading="lazy"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h3 className={`${style["feature-title"]} text-center`}>なぜなぜ分析AI</h3>
            </div>
            <p className={`${style["feature-description"]} text-center mt-2`}>
              現場で発生している課題の真因追求をAIがサポートし、対策を提案します。
            </p>
          </div>
          <div
            className={`${style["feature-item"]} cursor-pointer`}
            onClick={() => {
              navigate(App.PRODUCT_SERVICE_SUPPORT);
            }}
          >
            <div className={style["feature-header"]}>
              <div className={`${style["feature-icon"]}`}>
                <img
                  src="/image/SS.webp"
                  alt="icon_service-support"
                  loading="lazy"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <h3 className={`${style["feature-title"]} text-center`}>改善サポート</h3>
            </div>
            <p className={`${style["feature-description"]} text-center mt-2`}>
              困ったらお声がけください。現場調査や改善からデータ分析まで経験豊富な専門家がサポートします！
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
