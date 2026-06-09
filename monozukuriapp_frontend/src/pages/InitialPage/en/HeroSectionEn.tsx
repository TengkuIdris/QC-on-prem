import React from "react";
import { App } from "../../../enum/pathnames";
import style from "../initial.module.css";

interface HeroSectionEnProps {
  navigate: (path: string) => void;
}

export function HeroSectionEn({ navigate }: HeroSectionEnProps) {
  return (
    <section
      id="hero"
      className={style["hero-section"]}
    >
      <div className={style.container}>
        <div className={style["hero-content"]}>
          <div className={style["hero-text"]}>
            <h1 className={style["hero-title"]}>
              Visualize Your
              <br />
              Thinking Process
            </h1>
            <p className={style["hero-description"]}>
              AI-powered problem-solving support. Intuitive tools to organize complex issues clearly.
              <br />
              Useful for both office work and manufacturing sites—a problem-solving tool for everyone.
              <br />
              Ready to transform your work?
            </p>
            <div
              className={`${style["beta-notice"]} cursor-pointer`}
              onClick={() => navigate(App.CONTACT)}
            >
              Beta users wanted ✨ Feel free to contact us
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
