import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { App } from "../enum/pathnames";

const useFaviconUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const updateFavicon = (logoName: string) => {
      const existingFavicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (existingFavicon) {
        existingFavicon.href = `/image/favicon.ico`;
      } else {
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.href = `/image/favicon.ico`;
        document.head.appendChild(favicon);
      }
    };

    const isKaizenHub = location.pathname === App.INDEX || location.pathname.startsWith(App.KAIZEN_HUB);
    updateFavicon("favicon");
  }, [location]);
};

export default useFaviconUpdater;
