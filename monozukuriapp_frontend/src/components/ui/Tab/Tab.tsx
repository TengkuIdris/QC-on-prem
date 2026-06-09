import React, { createContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "../../../enum/pathnames";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

const initialState: {
  page: string;
  setPage?: (value: string) => void;
  showModal: boolean;
  setShowModal?: (value: boolean) => void;
} = {
  page: "home",
  showModal: false,
};

export const KaizenContext = createContext(initialState);

const pageMapping = {
  // [App.KAIZEN_HUB_RECIPE]: "search",
  [App.KAIZEN_HUB_SEARCH]: "search",
  [App.KAIZEN_HUB_REVIEW_RECIPE]: "search",
  [App.KAIZEN_HUB_PREVIEW_POST]: "post",
  [App.KAIZEN_HUB_INFO]: "info",
  [App.KAIZEN_HUB_POST]: "post",
};

const Tab: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> = (props) => {
  const pathname = useLocation().pathname;

  const [page, setPage] = useState("");
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    const path = pathname.split("/")[1];
    // @ts-ignore
    const newPage = pageMapping["/" + path] || "home";
    setPage(newPage === "none" ? "" : newPage);
  }, [pathname]);
  return (
    <KaizenContext.Provider value={{ page, showModal, setPage, setShowModal }}>
      <nav {...props} />
    </KaizenContext.Provider>
  );
};

const TabList: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = (props) => {
  return <div {...props} />;
};

type TriggerProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  value: string;
  disabled?: boolean | any;
};

const TabTrigger: React.FC<TriggerProps> = ({ value, className, children, disabled, ...props }) => {
  const { page, showModal } = React.useContext(KaizenContext);
  const isAuthenticated = useSelector((state: RootState) => state.kaiZenHubAuth.isAuthenticated);
  // register
  const navigator = useNavigate();
  const handleClick = () => {
    if (disabled || (!isAuthenticated && value !== "root")) return; // Disable when not authenticated or disabled

    if (value === "home") {
      navigator("/kaizen-hub");
    } else if (value === "root") {
      navigator("/home");
    } else {
      navigator(`/kaizen-hub-${value}`);
    }
  };
  return (
    <div
      {...props}
      className={`flex justify-center items-center font-bold h-12 rounded-lg cursor-pointer relative bg-white border border-black transition-all duration-150 ${className} ${page === value ? "shadow shadow-black -translate-y-1" : "bg-[#0000000a]"}  ${disabled || (!isAuthenticated && value !== "root") ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={handleClick}
      id={value}
    >
      {children}
      {showModal && value === "recipe" && <Dropdown />}
    </div>
  );
};

const Dropdown = () => {
  const { setPage, setShowModal } = React.useContext(KaizenContext);
  const ref = useRef(null);
  const navigate = useNavigate();
  const navigator = useNavigate();
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (
        ref.current &&
        //@ts-ignore
        !ref.current.contains(event.target) &&
        !document.getElementById("recipe")?.contains(event.target)
      ) {
        setShowModal && setShowModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div
      className="absolute left-0 top-14 rounded-md block-shadow w-full bg-white z-50"
      ref={ref}
      onMouseOut={() => setShowModal && setShowModal(false)}
    >
      <div
        className="h-10 flex justify-start items-center cursor-pointer p-2"
        onClick={() => navigate("/kaizen-hub-post")}
      >
        カイゼンをレシピ投稿
      </div>
      <div
        className="h-10 flex justify-start items-center cursor-pointer border-t border-solid border-gray-200 p-2"
        onClick={(e) => {
          e.stopPropagation();
          setPage && setPage("recipe");
          navigator(App.KAIZEN_HUB_RECIPE);
          setShowModal && setShowModal(false);
        }}
      >
        カイゼンレシピ投の閲覧
      </div>
    </div>
  );
};

const TabContent: React.FC<TriggerProps> = ({ value, ...props }) => {
  const { page } = React.useContext(KaizenContext);
  return page === value && <div {...props} />;
};

export { Tab, TabList, TabTrigger, TabContent };
