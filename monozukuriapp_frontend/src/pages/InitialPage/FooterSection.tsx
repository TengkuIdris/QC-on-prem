import React from "react";
import { Link } from "react-router-dom";
import { App } from "../../enum/pathnames";
import SvgIcon from "@mui/material/SvgIcon";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import style from "./initial.module.css";

interface FooterSectionProps {
  navigate: (path: string) => void;
}

function XIcon(props: any) {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 1200 1227"
    >
      <path d="M714.163 519.284L1173.58 0H1070.89L662.456 464.531L340.548 0H0L478.025 696.196L0 1226.4H102.691L531.532 741.105L874.452 1226.4H1200L714.163 519.284ZM582.592 675.805L537.332 611.828L139.997 79.6944H310.337L625.397 529.739L670.657 593.716L1087.71 1150.31H917.372L582.592 675.805Z" />
    </SvgIcon>
  );
}

export function FooterSection({ navigate }: FooterSectionProps) {
  return (
    <footer className={style["footer-section"]}>
      <div className={style.container}>
        <div className={style["footer-content"]}>
          <nav className={style["footer-nav"]}>
            <ul>
              <li>
                <a href="#hero">ホーム</a>
              </li>
              <li className={style["footer-nav-group"]}>
                <span className={style["footer-nav-label"]}>ソリューション</span>
                <ul className={style["footer-submenu"]}>
                  <li>
                    <Link to={App.SOLUTIONS_USE_CASES}>導入事例</Link>
                  </li>
                  <li>
                    <Link to={App.SOLUTIONS_BLOG}>お役立ち情報</Link>
                  </li>
                </ul>
              </li>
              <li className={style["footer-nav-group"]}>
                <span className={style["footer-nav-label"]}>機能</span>
                <ul className={style["footer-submenu"]}>
                  <li>
                    <Link to={`${App.FEATURE_CAUSE_TOOL}?tool=parento`}>パレート図</Link>
                  </li>
                  <li>
                    <Link to={`${App.FEATURE_CAUSE_TOOL}?tool=fishbone`}>特性要因図</Link>
                  </li>
                  <li>
                    <Link to={App.WHYWHY}>なぜなぜ分析AI</Link>
                  </li>
                  <li>
                    <Link to={`${App.FEATURE_CAUSE_TOOL}?tool=service-support`}>改善サポート</Link>
                  </li>
                </ul>
              </li>
              <li className={style["footer-nav-group"]}>
                <span className={style["footer-nav-label"]}>会社情報</span>
                <ul className={style["footer-submenu"]}>
                  <li>
                    <Link to={App.COMPANY_INFO}>会社概要</Link>
                  </li>
                  <li>
                    <Link to={App.COMPANY_TEAM}>チーム紹介</Link>
                  </li>
                </ul>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
              <li>
                <a
                  href=""
                  className={`${style["cta-button"]} cursor-pointer`}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    navigate(App.CONTACT);
                  }}
                >
                  お問い合わせ
                </a>
              </li>
            </ul>
          </nav>
          <div className={style["social-links"]}>
            <a
              href="https://x.com/JATCO_Official"
              aria-label="X (formerly Twitter)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <XIcon />
            </a>
            <a
              href="https://www.facebook.com/JATCO.Official"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://youtube.com/@jatco.channel?si=HG-aFROl_0iPSODu"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
            >
              <YouTubeIcon />
            </a>
          </div>
        </div>
        <div className={style["footer-bottom"]}>
          <p>&copy; 2024 カイゼンハブ. All rights reserved.</p>
          <ul className={style["footer-legal"]}>
            <li>
              <a
                href="https://www.jatco.co.jp/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                ジヤトコ株式会社-プライバシーポリシー
              </a>
            </li>
            <li>
              <a
                href="/pdf/terms_of_service.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  const pdfUrl = `${window.location.origin}/pdf/terms_of_service.pdf`;
                  window.open(pdfUrl, "_blank");
                }}
              >
                利用規約
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
