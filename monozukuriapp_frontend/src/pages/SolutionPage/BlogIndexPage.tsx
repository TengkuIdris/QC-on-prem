import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import PublicHeader from "@/components/layout/Header/PublicHeader";
import { loadBlogPosts, type BlogMetadata } from "@/utils/blogUtils";
import { App } from "@/enum/pathnames";
import styles from "./solutions.module.css";

function BlogIndexPage() {
  const navigate = useNavigate();
  const [blogPosts, setBlogPosts] = useState<BlogMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadBlogPosts()
      .then((posts) => {
        setBlogPosts(posts);
      })
      .catch((error) => {
        console.error("Error loading blog posts:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = blogPosts;

    if (q) {
      filtered = blogPosts.filter((post) => {
        const searchableFields = [post.title, post.excerpt, post.category, post.date];
        return searchableFields.some((field) => field?.toLowerCase().includes(q));
      });
    }

    // Sort by date descending (newest first)
    return [...filtered].sort((a, b) => {
      const dateA = Date.parse(a.date);
      const dateB = Date.parse(b.date);
      return dateB - dateA;
    });
  }, [blogPosts, query]);

  const formatDate = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <>
      <Helmet>
        <title>お役立ち情報 | 品質管理・なぜなぜ分析・AI活用ノウハウ | カイゼンハブ</title>
        <meta
          name="description"
          content="品質管理、特性要因図、パレート図、なぜなぜ分析、AI活用に関する最新のノウハウや事例、現場で使えるテンプレートを紹介するカイゼンハブ公式ブログです。"
        />
      </Helmet>
      <PublicHeader />
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>お役立ち情報</h1>
          <p className={styles.heroSubtitle}>品質改善や製造現場に関する最新情報</p>
        </div>
      </section>
      <section className={styles.contentSection}>
        <div className={styles.container}>
          {!loading && (
            <div className={styles.blogToolbar}>
              <div className={styles.toolbarLeft}>
                <span className={styles.resultCount}>{filteredPosts.length} 件</span>
              </div>
              <div className={styles.toolbarRight}>
                <div className={styles.searchWrapper}>
                  <input
                    className={styles.searchInput}
                    type="search"
                    placeholder="検索（タイトル / カテゴリ / 概要）"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p>読み込み中...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>該当する記事が見つかりませんでした。</p>
            </div>
          ) : (
            <div className={styles.blogGrid}>
              {filteredPosts.map((post) => (
                <article
                  key={post.slug}
                  className={styles.blogCard}
                >
                  <div className={styles.blogContent}>
                    <div className={styles.blogMeta}>
                      <span className={styles.blogCategory}>{post.category}</span>
                      <span className={styles.blogDate}>{formatDate(post.date)}</span>
                    </div>
                    <h3 className={styles.blogTitle}>{post.title}</h3>
                    <p className={styles.blogExcerpt}>{post.excerpt}</p>
                    <button
                      onClick={() => navigate(`${App.SOLUTIONS_BLOG}/${post.slug}`)}
                      className={styles.blogLink}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        font: "inherit",
                      }}
                    >
                      続きを読む →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default BlogIndexPage;
