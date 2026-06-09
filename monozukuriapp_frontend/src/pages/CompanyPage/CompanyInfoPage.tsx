import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import PublicHeader from "@/components/layout/Header/PublicHeader";
import { FooterSection } from "@/pages/InitialPage/FooterSection";
import styles from "./company.module.css";

function CompanyInfoPage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>会社概要 | ジヤトコ株式会社 | カイゼンハブ</title>
        <meta
          name="description"
          content="ジヤトコ株式会社の会社概要。自動車用変速機・電動パワートレインの開発・製造・販売を行っています。"
        />
        <link
          rel="preconnect"
          href="https://www.jatco.co.jp"
        />
        <link
          rel="dns-prefetch"
          href="https://www.jatco.co.jp"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "カイゼンハブ",
            url: "https://kznhub.com",
            logo: "https://kznhub.com/image/logo_kaizenhub.png",
            address: {
              "@type": "PostalAddress",
              addressCountry: "JP",
            },
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "Customer Service",
              url: "https://kznhub.com/contact",
              availableLanguage: ["Japanese", "English"],
            },
          })}
        </script>
        <style>
          {`
            @media (prefers-reduced-motion: reduce) {
              * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
          `}
        </style>
      </Helmet>
      <PublicHeader />
      <div className={`${styles.page} antialiased`}>
        <main className={styles.pageMain}>
          <div className={styles.pageContent}>
            <div className="flex flex-col gap-5 lg:gap-8">
              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">ジヤトコ株式会社</h1>
                <p className="text-zinc-600 text-base md:text-lg">技術と情熱でモビリティの可能性を拡げる</p>
              </div>

              {/* メインコンテンツエリア：左側のカード群と右側の大きな画像 */}
              <div className="grid grid-cols-12 gap-5 lg:gap-8">
                {/* Left Column: 会社概要、出資構成、事業内容を縦に並べる */}
                <div className="col-span-12 md:col-span-6 flex flex-col gap-5 lg:gap-8">
                  {/* 会社概要と出資構成を横並び */}
                  <div className="grid grid-cols-2 gap-5 lg:gap-8 items-stretch">
                    {/* 会社概要 */}
                    <div className="col-span-2 md:col-span-1">
                      <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-5 h-full">
                        <h2 className="text-lg font-bold text-zinc-900 mb-3">会社概要</h2>
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">設立</h3>
                              <p className="text-xs text-zinc-600">1999年6月28日</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">本社所在地</h3>
                              <p className="text-xs text-zinc-600">静岡県富士市今泉700番地の1</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">資本金</h3>
                              <p className="text-xs text-zinc-600">299億3,530万円</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">従業員数</h3>
                              <p className="text-xs text-zinc-600">約11,700名（2025年3月31日現在）</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 出資構成 */}
                    <div className="col-span-2 md:col-span-1">
                      <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-5 h-full">
                        <h2 className="text-lg font-bold text-zinc-900 mb-3">出資構成</h2>
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">日産自動車株式会社</h3>
                              <p className="text-xs text-zinc-600">75%</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">三菱自動車工業株式会社</h3>
                              <p className="text-xs text-zinc-600">15%</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">スズキ株式会社</h3>
                              <p className="text-xs text-zinc-600">10%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 事業内容 */}
                  <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-5 flex-1">
                    <h2 className="text-lg font-bold text-zinc-900 mb-3">事業内容</h2>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">自動車用変速機</h3>
                          <p className="text-xs text-zinc-600">
                            CVT（無段変速機）やAT（オートマチックトランスミッション）の開発・製造
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">電動パワートレイン</h3>
                          <p className="text-xs text-zinc-600">
                            電気自動車やハイブリッド車向けの電動パワートレインシステムの開発
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border-l-4 border-[#1A7F37]">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-zinc-900 mb-0.5">その他サービス</h3>
                          <p className="text-xs text-zinc-600">実験受託、エンジニア派遣などの技術サービス</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: 大きな画像と半透明のオーバーレイカード */}
                <div className="hidden md:block col-span-6 relative">
                  {/* Main Company Image - 左側の全セクションの高さに合わせる */}
                  <div className="sticky top-24 h-fit">
                    <div className="relative w-full min-h-[600px] rounded-[28px] overflow-hidden">
                      <img
                        className="w-full h-full min-h-[600px] rounded-[28px] object-cover"
                        src="https://www.jatco.co.jp/wp-jatco/wp-content/themes/JATCO/assets/img/company/mainvisual.jpg"
                        alt="ジヤトコ株式会社の建物外観"
                        loading="lazy"
                      />

                      {/* Mission Card (Top Left Overlay) - 半透明背景 */}
                      <div className="absolute left-4 top-6 right-4 md:right-auto md:w-[calc(50%-1rem)] md:max-w-[420px] rounded-[24px] bg-[#E8F5E9]/90 backdrop-blur-sm text-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,.3)] p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
                            aria-hidden="true"
                          >
                            ◎
                          </span>
                          <h3 className="font-semibold text-base">ミッション</h3>
                        </div>
                        <p className="text-sm leading-6">
                          私たちは、社会から信頼される企業として、クリーン、安全、快適そしてワクワクする商品・サービスを通し、モビリティに新しい価値を提供します。
                        </p>
                      </div>

                      {/* Purpose Card (Bottom Right Overlay) - 半透明背景 */}
                      <div className="absolute left-4 right-4 bottom-6 md:left-auto md:w-[calc(50%-1rem)] md:max-w-[380px] rounded-[24px] bg-[#E8F5E9]/90 backdrop-blur-sm text-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,.3)] p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
                            aria-hidden="true"
                          >
                            ◉
                          </span>
                          <h3 className="font-semibold text-base">パーパス</h3>
                        </div>
                        <p className="text-sm leading-6">技術と情熱でモビリティの可能性を拡げる</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile: Show overlay cards below image */}
              <div className="md:hidden space-y-4">
                {/* Mission Card */}
                <div className="rounded-[24px] bg-[#E8F5E9] text-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,.3)] p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
                      aria-hidden="true"
                    >
                      ◎
                    </span>
                    <h3 className="font-semibold text-base">ミッション</h3>
                  </div>
                  <p className="text-sm leading-6">
                    私たちは、社会から信頼される企業として、クリーン、安全、快適そしてワクワクする商品・サービスを通し、モビリティに新しい価値を提供します。
                  </p>
                </div>

                {/* Purpose Card */}
                <div className="rounded-[24px] bg-[#E8F5E9] text-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,.3)] p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
                      aria-hidden="true"
                    >
                      ◉
                    </span>
                    <h3 className="font-semibold text-base">パーパス</h3>
                  </div>
                  <p className="text-sm leading-6">技術と情熱でモビリティの可能性を拡げる</p>
                </div>

                {/* Mobile Image */}
                <img
                  className="w-full rounded-[28px] object-cover"
                  src="https://www.jatco.co.jp/wp-jatco/wp-content/themes/JATCO/assets/img/company/mainvisual.jpg"
                  alt="ジヤトコ株式会社の建物外観"
                  loading="lazy"
                />
              </div>

              {/* CTA */}
              <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-5 text-center">
                <h2 className="text-lg font-bold text-zinc-900 mb-2">採用情報・お問い合わせ</h2>
                <p className="text-zinc-600 text-sm mb-3">ジヤトコで一緒に未来のモビリティを創りませんか</p>
                <a
                  href="https://www.jatco.co.jp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1A7F37] text-white font-semibold text-sm hover:bg-[#15682d] transition-colors shadow-lg"
                >
                  <img
                    src="https://www.jatco.co.jp/wp-jatco/wp-content/themes/JATCO/assets/img/common/jatco_favicon.ico"
                    alt=""
                    className="w-5 h-5 rounded-full bg-white"
                    aria-hidden="true"
                    loading="lazy"
                  />
                  <span>ジヤトコ株式会社公式サイトへ</span>
                </a>
              </div>
            </div>
          </div>
        </main>
        <FooterSection navigate={navigate} />
      </div>
    </>
  );
}

export default CompanyInfoPage;
