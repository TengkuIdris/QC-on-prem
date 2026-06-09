import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App, Auth } from "../../enum/pathnames";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useAppDispatch } from "@/store/redux";
import { logout } from "@/store/slices/authSlice";
import { toast } from "react-toastify";
import { signOut } from "aws-amplify/auth";
import style from "./initial.module.css";

interface HeaderSectionProps {
  isAuthenticated: boolean;
  navigate: (path: string) => void;
}

export function HeaderSection({ isAuthenticated, navigate }: HeaderSectionProps) {
  const dispatch = useAppDispatch();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<null | "features" | "solutions" | "company" | "cta">(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${style.dropdown}`) && !target.closest(`.${style.dropdownRight}`)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openDropdown]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleDropdown = (id: typeof openDropdown) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  const closeAll = () => {
    setOpenDropdown(null);
    setMenuOpen(false);
  };

  return (
    <header className={`${style.header} ${scrolled ? style.scrolled : ""}`}>
      <div className={style.container}>
        <nav className={style.nav}>
          <div
            className={`${style.logo} cursor-pointer`}
            onClick={() => {
              const heroSection = document.getElementById("hero");
              if (heroSection) {
                heroSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <img
              src="/image/logo_kaizenhub_ver2.png"
              alt="カイゼンハブロゴ"
            />
          </div>
          <button
            className={style["nav-toggle"]}
            onClick={toggleMenu}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <ul className={`${style["nav-menu"]} ${menuOpen ? style.active : ""}`}>
            <li>
              <a
                href="#hero"
                onClick={closeAll}
              >
                ホーム
              </a>
            </li>
            <li className={style.dropdown}>
              <button
                className={style.dropdownLabel}
                onClick={() => toggleDropdown("solutions")}
              >
                ソリューション
              </button>
              {openDropdown === "solutions" && (
                <div className={style.dropdownMenu}>
                  <Link
                    to={App.SOLUTIONS_USE_CASES}
                    onClick={closeAll}
                  >
                    導入事例
                  </Link>
                  <Link
                    to={App.SOLUTIONS_BLOG}
                    onClick={closeAll}
                  >
                    お役立ち情報
                  </Link>
                </div>
              )}
            </li>
            <li className={style.dropdown}>
              <button
                className={style.dropdownLabel}
                onClick={() => toggleDropdown("features")}
              >
                機能
              </button>
              {openDropdown === "features" && (
                <div className={style.dropdownMenu}>
                  <Link
                    to={`${App.FEATURE_CAUSE_TOOL}?tool=parento`}
                    onClick={closeAll}
                  >
                    パレート図
                  </Link>
                  <Link
                    to={`${App.FEATURE_CAUSE_TOOL}?tool=fishbone`}
                    onClick={closeAll}
                  >
                    特性要因図
                  </Link>
                  <Link
                    to={App.PRODUCT_WHYWHY}
                    onClick={closeAll}
                  >
                    なぜなぜ分析AI
                  </Link>
                  <Link
                    to={`${App.FEATURE_CAUSE_TOOL}?tool=service-support`}
                    onClick={closeAll}
                  >
                    改善サポート
                  </Link>
                </div>
              )}
            </li>
            <li className={style.dropdown}>
              <button
                className={style.dropdownLabel}
                onClick={() => toggleDropdown("company")}
              >
                会社情報
              </button>
              {openDropdown === "company" && (
                <div className={style.dropdownMenu}>
                  <Link
                    to={App.COMPANY_INFO}
                    onClick={closeAll}
                  >
                    会社概要
                  </Link>
                  <Link
                    to={App.COMPANY_TEAM}
                    onClick={closeAll}
                  >
                    チーム紹介
                  </Link>
                </div>
              )}
            </li>
            <li>
              <a
                href="#faq"
                onClick={closeAll}
              >
                FAQ
              </a>
            </li>
            <li className={style.dropdownRight}>
              <button
                className={`${style["nav-outline-button"]} cursor-pointer`}
                onClick={() => toggleDropdown("cta")}
              >
                改善を始める
              </button>
              {openDropdown === "cta" && (
                <div className={style.dropdownMenuRight}>
                  {!isAuthenticated ? (
                    <Link
                      to={Auth.LOGIN}
                      onClick={closeAll}
                    >
                      ログイン
                    </Link>
                  ) : (
                    <>
                      <Link
                        to={App.HOME}
                        onClick={closeAll}
                      >
                        アプリに移動
                      </Link>
                      <a
                        className="cursor-pointer"
                        onClick={async () => {
                          await signOut();
                          dispatch(logout());
                          toast.success("ログアウトは成功しました。");
                          closeAll();
                        }}
                      >
                        ログアウト
                      </a>
                    </>
                  )}
                </div>
              )}
            </li>
            <li>
              <button
                className={`${style["cta-button"]} cursor-pointer`}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  navigate(App.CONTACT);
                  closeAll();
                }}
              >
                お問い合わせ
              </button>
            </li>
            <li>
              <Link
                to="/en"
                className={style["language-switch"]}
                onClick={closeAll}
              >
                [EN]
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
