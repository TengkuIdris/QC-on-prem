import { App } from "@/enum/pathnames";
import React, { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "./featureCauseTool.module.css";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import PublicHeader from "@/components/layout/Header/PublicHeader";
import { productDataMap, SearchParamsSelect } from "./productData";

function ProductWhyWhyPage() {
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const data = productDataMap[SearchParamsSelect.WHYWHY];
  const pageUrl = "https://kznhub.com/product/whywhy";

  useEffect(() => {
    setBreadcrumbItems([
      { label: "TOP", href: "/", onClick: () => navigate("/") },
      {
        label: data.title,
        href: "#",
        onClick: () => navigate(App.PRODUCT_WHYWHY),
      },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate, data.title]);

  return (
    <>
      <Helmet>
        <title>{data.metaTitle}</title>
        <meta
          name="description"
          content={data.metaDescription}
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: data.title,
            description: data.metaDescription,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: pageUrl,
            image: data.demoImage,
            provider: {
              "@type": "Organization",
              name: "カイゼンハブ",
              url: "https://kznhub.com",
            },
          })}
        </script>
      </Helmet>
      <PublicHeader />
      {/* HERO SECTION START */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{data.title}</h1>
          <p className={styles.heroSubtitle}>{data.title_box}</p>
        </div>
      </section>
      {/* HERO SECTION END */}
      {/* DEMO SECTION START */}
      <section className={styles.demoSection}>
        <div className={styles.demoContent}>
          <h2 className={styles.demoTitle}>実際の動作をご覧ください</h2>
          <p className={styles.demoSubtitle}>{data.demoSubtitle}</p>
          <div className={styles.demoCardWrapper}>
            <div className={styles.demoAccentLine}></div>
            <div className={styles.demoCard}>
              <img
                src={data.demoImage}
                alt={data.demoAlt}
                className={styles.demoGif}
              />
            </div>
          </div>
        </div>
      </section>
      {/* DEMO SECTION END */}
      {/* FEATURE SECTION START */}
      <section className={styles.featureSection}>
        <h2 className={styles.featureSectionTitle}>{data.featureSectionTitle}</h2>
        <div className={styles.featureCardGrid}>
          {data.features.map((feature, index) => (
            <div
              className={styles.featureCard}
              key={index}
            >
              <div className={styles.featureIconWrapper}>
                <img
                  src={feature.image}
                  alt=""
                  className={styles.featureIcon}
                />
              </div>
              <div className={styles.featureCardTitle}>{feature.title}</div>
              <div className={styles.featureCardDesc}>{feature.desc}</div>
            </div>
          ))}
        </div>
      </section>
      {/* FEATURE SECTION END */}
      {/* CTA SECTION START */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>今すぐ無料で試してみませんか？</h2>
          <p className={styles.ctaSubtitle}>{data.ctaSubtitle}</p>
          <button
            className={styles.ctaButton}
            onClick={() => navigate(App.CONTACT)}
          >
            お問い合わせはこちらから
          </button>
        </div>
      </section>
      {/* CTA SECTION END */}
    </>
  );
}

export default ProductWhyWhyPage;
