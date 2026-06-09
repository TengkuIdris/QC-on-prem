import React from "react";
import style from "../../kaizen-hub.module.css";
import { Link } from "react-router-dom";

export default function FooterKaizenHub() {
  return (
    <footer className={style.footer}>
      <div className={style.footerContent}>
        <span>© 2023 カイゼンハブ</span>
        <div className={style.footerLinks}>
          <Link
            to="#"
            onClick={() => {
              window.open("/pdf/terms_of_service.pdf", "_blank");
            }}
          >
            利用規約
          </Link>
          <Link
            to="#"
            onClick={() => {
              window.open("https://www.jatco.co.jp/privacy.html", "_blank");
            }}
          >
            プライバシーポリシー
          </Link>
          <Link to="#">お問い合わせ</Link>
        </div>
      </div>
    </footer>
  );
}
