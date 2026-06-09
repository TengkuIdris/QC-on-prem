import React from "react";
import { App } from "../../../enum/pathnames";
import SvgIcon from "@mui/material/SvgIcon";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import style from "../initial.module.css";

interface FooterSectionEnProps {
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

export function FooterSectionEn({ navigate }: FooterSectionEnProps) {
  return (
    <footer className={style["footer-section"]}>
      <div className={style.container}>
        <div className={style["footer-content"]}>
          <nav className={style["footer-nav"]}>
            <ul>
              <li>
                <a href="#hero">Home</a>
              </li>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#team">Team</a>
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
                  Contact
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
          <p>&copy; 2024 Kaizen Hub. All rights reserved.</p>
          <ul className={style["footer-legal"]}>
            <li>
              <a
                href="https://www.jatco.co.jp/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                JATCO Ltd. - Privacy Policy
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
                Terms of Service
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
