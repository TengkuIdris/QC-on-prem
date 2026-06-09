import React from "react";
import { contributors } from "@/constant/contributors";
import style from "./initial.module.css";

export function ContributorsSection() {
  return (
    <section
      id="contributors"
      className={style["contributors-section"]}
    >
      <div className={style["container"]}>
        <h2 className={style["section-title"]}>Contributors</h2>
        <div className={style["contributors-grid"]}>
          {contributors.map((contributor) => (
            <div
              key={contributor.id}
              className={style["contributor-item"]}
            >
              <div className="flex justify-center mb-2">
                <img
                  src={contributor.image}
                  alt={contributor.alt}
                  className="rounded-full w-[60px] h-[60px] object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="text-center font-medium text-[14px] mb-0 text-top-page-title-color">
                {contributor.department}
              </h3>
              <p className="text-center text-top-page-text-color text-xs">{contributor.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
