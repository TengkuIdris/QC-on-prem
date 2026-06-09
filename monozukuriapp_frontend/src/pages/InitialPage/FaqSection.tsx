import React, { useState } from "react";
import { faq } from "@/constant/faq";
import style from "./initial.module.css";

export function FaqSection() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className={`${style["faq-section"]} bg-[#f9f9f9]`}
    >
      <div className={style["container"]}>
        <h2 className={`mb-8 ${style["section-title"]}`}>よくある質問</h2>
        <div className={style["faq-grid"]}>
          {faq.map((faqItem, index) => (
            <div
              key={index}
              className={`${style["faq-item"]} ${openFaqIndex === index ? style.active : ""}`}
            >
              <div
                className={style["faq-question"]}
                onClick={() => toggleFaq(index)}
              >
                <h3 className={style["faq-question-text"]}>Q. {faqItem.question}</h3>
                <div className={style["faq-toggle"]}>
                  <svg viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </div>
              </div>
              <div className={style["faq-answer"]}>
                <p className={style["faq-answer-text"]}>A. {faqItem.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
