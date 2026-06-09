import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App, Auth } from "../../../enum/pathnames";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useAppDispatch } from "@/store/redux";
import { logout } from "@/store/slices/authSlice";
import { toast } from "react-toastify";
import { signOut } from "aws-amplify/auth";
import style from "../initial.module.css";

interface HeaderSectionEnProps {
  isAuthenticated: boolean;
  navigate: (path: string) => void;
}

export function HeaderSectionEn({ isAuthenticated, navigate }: HeaderSectionEnProps) {
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
              alt="Kaizen Hub Logo"
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
                Home
              </a>
            </li>
            <li className={style.dropdown}>
              <button
                className={style.dropdownLabel}
                onClick={() => toggleDropdown("solutions")}
              >
                Solutions
              </button>
              {openDropdown === "solutions" && (
                <div className={style.dropdownMenu}>
                  <Link
                    to={App.SOLUTIONS_USE_CASES}
                    onClick={closeAll}
                  >
                    Use Cases
                  </Link>
                  <Link
                    to={App.SOLUTIONS_BLOG}
                    onClick={closeAll}
                  >
                    Blog
                  </Link>
                </div>
              )}
            </li>
            <li className={style.dropdown}>
              <button
                className={style.dropdownLabel}
                onClick={() => toggleDropdown("features")}
              >
                Features
              </button>
              {openDropdown === "features" && (
                <div className={style.dropdownMenu}>
                  <Link
                    to={`${App.FEATURE_CAUSE_TOOL}?tool=parento`}
                    onClick={closeAll}
                  >
                    Pareto Chart
                  </Link>
                  <Link
                    to={`${App.FEATURE_CAUSE_TOOL}?tool=fishbone`}
                    onClick={closeAll}
                  >
                    Fishbone Diagram
                  </Link>
                  <Link
                    to={App.WHYWHY}
                    onClick={closeAll}
                  >
                    Why-Why Analysis AI
                  </Link>
                  <Link
                    to={`${App.FEATURE_CAUSE_TOOL}?tool=service-support`}
                    onClick={closeAll}
                  >
                    Improvement Support
                  </Link>
                </div>
              )}
            </li>
            <li className={style.dropdown}>
              <button
                className={style.dropdownLabel}
                onClick={() => toggleDropdown("company")}
              >
                Company
              </button>
              {openDropdown === "company" && (
                <div className={style.dropdownMenu}>
                  <Link
                    to={App.COMPANY_INFO}
                    onClick={closeAll}
                  >
                    Company Overview
                  </Link>
                  <Link
                    to={App.COMPANY_TEAM}
                    onClick={closeAll}
                  >
                    Team
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
                Start Improvement
              </button>
              {openDropdown === "cta" && (
                <div className={style.dropdownMenuRight}>
                  {!isAuthenticated ? (
                    <Link
                      to={Auth.LOGIN}
                      onClick={closeAll}
                    >
                      Login
                    </Link>
                  ) : (
                    <>
                      <Link
                        to={App.HOME}
                        onClick={closeAll}
                      >
                        Go to App
                      </Link>
                      <a
                        className="cursor-pointer"
                        onClick={async () => {
                          await signOut();
                          dispatch(logout());
                          toast.success("Logged out successfully.");
                          closeAll();
                        }}
                      >
                        Logout
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
                Contact
              </button>
            </li>
            <li>
              <Link
                to="/"
                className={style["language-switch"]}
                onClick={closeAll}
              >
                [日本語]
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
