import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, Calendar, Clock, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import copy from "copy-to-clipboard";
import PublicHeader from "@/components/layout/Header/PublicHeader";
import { loadBlogPost, type BlogPost } from "@/utils/blogUtils";
import { App } from "@/enum/pathnames";
import styles from "./blog-post.module.css";

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  AI: <Lightbulb className={styles.icon} />,
  品質管理: <Lightbulb className={styles.icon} />,
  カイゼン: <Lightbulb className={styles.icon} />,
  問題解決: <Lightbulb className={styles.icon} />,
  その他: <Lightbulb className={styles.icon} />,
};

function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      navigate(App.SOLUTIONS_BLOG);
      return;
    }

    loadBlogPost(slug)
      .then((loadedPost) => {
        if (!loadedPost) {
          navigate(App.SOLUTIONS_BLOG);
          return;
        }
        setPost(loadedPost);
      })
      .catch((error) => {
        console.error("Error loading blog post:", error);
        navigate(App.SOLUTIONS_BLOG);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug, navigate]);

  const handleCopyLink = () => {
    const url = window.location.href;
    try {
      copy(url);
      toast.success("リンクがクリップボードにコピーされました");
    } catch (error) {
      toast.error("コピーに失敗しました");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <>
        <PublicHeader />
        <div
          className={styles.postLayout}
          style={{ padding: "2rem", textAlign: "center" }}
        >
          <p>読み込み中...</p>
        </div>
      </>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | お役立ち情報 | カイゼンハブ</title>
        <meta
          name="description"
          content={post.excerpt}
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            dateModified: post.date,
            author: {
              "@type": "Organization",
              name: "カイゼンハブ",
              url: "https://kznhub.com",
            },
            publisher: {
              "@type": "Organization",
              name: "カイゼンハブ",
              logo: {
                "@type": "ImageObject",
                url: "https://kznhub.com/image/logo_kaizenhub.png",
              },
            },
          })}
        </script>
      </Helmet>
      <PublicHeader />
      <div className={styles.postLayout}>
        <nav className={styles.backLink}>
          <button onClick={() => navigate(App.SOLUTIONS_BLOG)}>
            <ArrowLeft size={18} />
            お役立ち情報一覧に戻る
          </button>
        </nav>

        <div className={styles.postHero}>
          <h1>{post.title}</h1>
          <p className={styles.subtitle}>{post.excerpt}</p>
        </div>

        <div className={styles.postMainContent}>
          <article className={styles.postArticle}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </article>

          <aside className={styles.postSidebar}>
            <div className={styles.metadataCard}>
              <div className={styles.metadataItem}>
                {categoryIcons[post.category] || categoryIcons["その他"]}
                <div>
                  <strong>カテゴリ:</strong> {post.category}
                </div>
              </div>

              <div className={styles.metadataItem}>
                <Calendar className={styles.icon} />
                <div>
                  <strong>公開日:</strong> {formatDate(post.date)}
                </div>
              </div>

              <div className={styles.metadataItem}>
                <Clock className={styles.icon} />
                <div>
                  <strong>読了時間:</strong> {post.readingTime} 分
                </div>
              </div>

              <button
                onClick={handleCopyLink}
                className={styles.shareButton}
              >
                <LinkIcon size={18} />
                リンクをコピー
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export default BlogPostPage;
