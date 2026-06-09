import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../core/hooks";
import style from "./initial.module.css";
import { RootState } from "@/store/store";
import CookieConsentPopUp from "@/components/CookieConsentPopUp";
import { HeaderSection } from "./HeaderSection";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { TeamSection } from "./TeamSection";
import { ContributorsSection } from "./ContributorsSection";
import { FaqSection } from "./FaqSection";
import { FooterSection } from "./FooterSection";
import { Helmet } from "react-helmet-async";

function InitialPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <html lang="ja" />
        <title>特性要因図・パレート図・なぜなぜ分析ツール | AI品質管理プラットフォーム | カイゼンハブ</title>
        <meta
          name="description"
          content="カイゼンハブは、特性要因図（Fishbone Diagram）・パレート図（Pareto Chart）・なぜなぜ分析（Why-Why Analysis）をAIで支援する品質管理プラットフォームです。製造業の現場で再発防止・不良低減・見える化を高速に実現します。"
        />
        <link
          rel="canonical"
          href="https://kznhub.com/"
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
          content="ja_JP"
        />
        <meta
          property="og:locale:alternate"
          content="en_US"
        />
        <meta
          property="og:title"
          content="特性要因図・パレート図・なぜなぜ分析ツール | AI品質管理プラットフォーム | カイゼンハブ"
        />
        <meta
          property="og:description"
          content="カイゼンハブは、特性要因図（Fishbone Diagram）・パレート図（Pareto Chart）・なぜなぜ分析（Why-Why Analysis）をAIで支援する品質管理プラットフォームです。製造業の現場で再発防止・不良低減・見える化を高速に実現します。"
        />
        <meta
          property="og:url"
          content="https://kznhub.com/"
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
          content="カイゼンハブ"
        />
      </Helmet>
      <CookieConsentPopUp />
      <div className={style["font_NotoSansJP"]}>
        <HeaderSection
          isAuthenticated={isAuthenticated}
          navigate={navigate}
        />
        <main>
          <HeroSection navigate={navigate} />
          <FeaturesSection navigate={navigate} />
          <TeamSection />
          <ContributorsSection />
          <FaqSection />
        </main>
        <FooterSection navigate={navigate} />
      </div>
    </>
  );
}

export default InitialPage;
