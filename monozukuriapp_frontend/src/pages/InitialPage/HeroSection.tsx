import React from "react";
import { App } from "../../enum/pathnames";
import style from "./initial.module.css";

interface HeroSectionProps {
  navigate: (path: string) => void;
}

export function HeroSection({ navigate }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className={style["hero-section"]}
    >
      <div className={style.container}>
        <div className={style["hero-content"]}>
          <div className={style["hero-text"]}>
            <h1 className={style["hero-title"]}>
              「考える」を、
              <br />
              「みえる化」する
            </h1>
            <p className={style["hero-description"]}>
              AIが課題ばらしをサポート。直観的な操作で複雑な問題もすっきり整理。
              <br />
              事務仕事でも製造現場でも、誰もに役立つ問題解決ツールです。
              <br />
              あなたの仕事を変えませんか？
            </p>
            <div
              className={`${style["beta-notice"]} cursor-pointer`}
              onClick={() => navigate(App.CONTACT)}
            >
              β版ユーザー募集中 ✨ お気軽にお問い合わせください
            </div>
          </div>
          <div className={style["hero-image"]}>
            <img
              src="/image/fishbone_hero_page.png"
              alt="hero_image"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
