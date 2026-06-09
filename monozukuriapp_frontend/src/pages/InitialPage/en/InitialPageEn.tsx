import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../core/hooks";
import style from "../initial.module.css";
import { RootState } from "@/store/store";
import CookieConsentPopUp from "@/components/CookieConsentPopUp";
import { HeaderSectionEn } from "./HeaderSectionEn";
import { HeroSectionEn } from "./HeroSectionEn";
import { FooterSectionEn } from "./FooterSectionEn";
import { Helmet } from "react-helmet-async";

function InitialPageEn() {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <html lang="en" />
        <title>Fishbone & Pareto Tools | AI Problem-Solving Platform | Kaizen Hub</title>
        <meta
          name="description"
          content="AI-assisted fishbone diagram, Pareto chart, and Why-Why analysis for identifying root causes in manufacturing and quality management."
        />
        <link
          rel="canonical"
          href="https://kznhub.com/en/"
        />
        <link
          rel="alternate"
          hreflang="ja"
          href="https://kznhub.com/"
        />
        <link
          rel="alternate"
          hreflang="en"
          href="https://kznhub.com/en/"
        />
        <link
          rel="alternate"
          hreflang="x-default"
          href="https://kznhub.com/"
        />
        <meta
          property="og:locale"
          content="en_US"
        />
        <meta
          property="og:title"
          content="Fishbone & Pareto Tools | AI Problem-Solving Platform | Kaizen Hub"
        />
        <meta
          property="og:description"
          content="AI-assisted fishbone diagram, Pareto chart, and Why-Why analysis for identifying root causes in manufacturing and quality management."
        />
        <meta
          property="og:url"
          content="https://kznhub.com/en/"
        />
        <meta
          property="og:type"
          content="website"
        />
        <meta
          property="og:image"
          content="https://kznhub.com/image/kznhub_og.jpg"
        />
        <meta
          property="og:site_name"
          content="Kaizen Hub"
        />
      </Helmet>
      <CookieConsentPopUp />
      <div className={style["font_NotoSansJP"]}>
        <HeaderSectionEn
          isAuthenticated={isAuthenticated}
          navigate={navigate}
        />
        <main>
          <HeroSectionEn navigate={navigate} />
        </main>
        <FooterSectionEn navigate={navigate} />
      </div>
    </>
  );
}

export default InitialPageEn;
