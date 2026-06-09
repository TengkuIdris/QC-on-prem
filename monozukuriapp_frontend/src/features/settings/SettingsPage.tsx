import { Paper } from "@mui/material";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import React, { useMemo, useState } from "react";
import CustomTabPanel from "./components/CustomTabPanel";
import MyPage from "./components/MyPage";

interface LabelProps {
  label: string;
}

interface TabsContentProps {
  name: string;
  children?: React.ReactNode;
}

const label: LabelProps[] = [
  {
    label: "ユーザー情報",
  },
];

const tabsContent: TabsContentProps[] = [
  {
    name: "mypage",
    children: <MyPage />,
  },
];

const SettingsPage = () => {
  const [value, setValue] = useState<number>(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const tabsContentMemo = useMemo(() => {
    return (
      <Tabs
        value={value}
        onChange={handleChange}
        className="w-full overflow-x-auto md:overflow-visible"
        TabIndicatorProps={{
          style: {
            backgroundColor: "#3f51b5",
            height: 3,
          },
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile={true}
        sx={{
          "& .MuiTabs-scrollButtons": {
            color: "#3f51b5",
          },
        }}
      >
        {label.map((item: LabelProps, index: number) => {
          return (
            <Tab
              disableRipple
              key={item.label}
              label={item.label}
              className={`!outline-none xs:flex-shrink-0 md:w-[20%] ${value === index ? "!text-[#3f51b5] font-bold" : "text-[#000]"}`}
              sx={{
                fontSize: {
                  xs: "14px",
                  md: "16px",
                  lg: "18px",
                },
                padding: {
                  xs: "10px",
                  md: "15px",
                  lg: "20px",
                },
                textTransform: "none",
                transition: "all 0.3s",
                "&:hover": {
                  color: "#3f51b5",
                  opacity: 1,
                },
                "&.Mui-selected": {
                  color: "#3f51b5",
                },
                "&.Mui-focusVisible": {
                  backgroundColor: "rgba(63, 81, 181, 0.1)",
                },
              }}
            />
          );
        })}
      </Tabs>
    );
  }, [value, handleChange]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 h-full">
      <Paper
        elevation={4}
        sx={{
          borderRadius: "8px",
          minHeight: "100%",
          p: 2,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>{tabsContentMemo}</Box>
        <Box
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: "0 0 8px 8px",
            minHeight: "100%",
            flexGrow: 1,
            mt: 2,
            p: 2,
          }}
        >
          {tabsContent.map((tab: TabsContentProps, index: number) => {
            return (
              <CustomTabPanel
                value={value}
                index={index}
                key={tab.name}
              >
                {tab.children}
              </CustomTabPanel>
            );
          })}
        </Box>
      </Paper>
    </div>
  );
};

export default SettingsPage;
