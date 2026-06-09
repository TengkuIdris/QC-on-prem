import { DataSearch } from "@/features/kaizen-hub/search";
import { Box } from "@mui/material";
import React, { createContext, useState } from "react";
import { Outlet } from "react-router-dom";
import HeaderKaizenHub from "../components/Header";
import FooterKaizenHub from "../components/Footer";

export const KaizenHubTabInfoContext = createContext<{
  kaizenHubTabInfo: number;
  setKaizenHubTabInfo: React.Dispatch<React.SetStateAction<number>>;
  paramsSearch: DataSearch;
  setParamsSearch: React.Dispatch<React.SetStateAction<DataSearch>>;
} | null>(null);

const KaizenHubTab = () => {
  const [kaizenHubTabInfo, setKaizenHubTabInfo] = useState<number>(0);
  const [paramsSearch, setParamsSearch] = useState<DataSearch>({
    search: "",
    selectedTags: [],
    page: 1,
  });

  return (
    <KaizenHubTabInfoContext.Provider value={{ kaizenHubTabInfo, setKaizenHubTabInfo, paramsSearch, setParamsSearch }}>
      <Box
        sx={{
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <HeaderKaizenHub />

        <div className="flex-1">
          <Outlet />
        </div>

        <div className="mt-auto">
          <FooterKaizenHub />
        </div>
      </Box>
    </KaizenHubTabInfoContext.Provider>
  );
};

export default KaizenHubTab;
