import React, { useState, ReactNode } from "react";
import { Box, CssBaseline, ThemeProvider, IconButton, useMediaQuery, useTheme } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
// import Footer from "./Footer/Footer";
import Sidebar from "./Sidebar/Sidebar";
import theme from "../../theme/theme";
import { Outlet, useLocation, matchPath } from "react-router-dom";
import SingleModeProvider from "../../store/singlemodeProvider/singlemode";
import { App } from "../../enum/pathnames";
import Header from "./Header/Header";
import { BreadcrumbProvider } from "./BreadcrumbContext";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { closeSidebar, toggleSidebar } from "@/store/slices/layoutSlice";

interface LayoutProps {
  rightPanel?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ rightPanel }) => {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const { isOpenSidebar: sidebarOpen } = useAppSelector((state) => state.layout);
  const sidebarWidth = 280;
  const sidebarCollapsedWidth = 72;
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down("md"));
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up("lg"));
  const isLargeDesktop = useMediaQuery("(min-width:1600px)");
  const rightPanelWidth = isLargeDesktop ? 350 : 300;
  const dispatch = useAppDispatch();

  const location = useLocation();
  const isWhyWhyPage = location.pathname.includes(App.WHYWHY);
  const isWhyWhyAnalysisPage = !!matchPath(App.WHYWHY_ANALYSIS_VIEW, location.pathname);
  const isKaizenHubPage = location.pathname.includes(App.KAIZEN_HUB);

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  const toggleRightPanel = () => {
    setRightPanelOpen(!rightPanelOpen);
  };

  const currentSidebarWidth = isMobile ? 0 : sidebarOpen ? sidebarWidth : sidebarCollapsedWidth;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BreadcrumbProvider>
        <Box sx={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
          <Sidebar
            width={sidebarWidth}
            open={sidebarOpen}
            onClose={() => dispatch(closeSidebar())}
            onToggle={handleToggleSidebar}
          />
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              width: `calc(100% - ${currentSidebarWidth}px - ${rightPanelOpen && isDesktop && rightPanel ? rightPanelWidth : 0}px)`,
              transition: theme.transitions.create(["width", "margin"], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            }}
          >
            <Header height={64} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: isKaizenHubPage || isWhyWhyAnalysisPage ? 0 : 3,
                pt: 0,
                bgcolor: isWhyWhyPage && !isWhyWhyAnalysisPage ? "primary.800" : "",
                overflow: "auto",
                width: "100%",
                backgroundColor: isWhyWhyAnalysisPage ? "#f9fafb" : "#fff",
              }}
            >
              <SingleModeProvider>
                <Outlet />
              </SingleModeProvider>
            </Box>
            {/* <Footer /> */}
          </Box>
          {rightPanel && (
            <>
              <Box
                sx={{
                  width: rightPanelOpen && isDesktop ? rightPanelWidth : 0,
                  flexShrink: 0,
                  overflow: "hidden",
                  transition: theme.transitions.create("width", {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                  }),
                }}
              >
                {rightPanel}
              </Box>
              <IconButton
                color="primary"
                aria-label={rightPanelOpen ? "close right panel" : "open right panel"}
                onClick={toggleRightPanel}
                sx={{
                  position: "fixed",
                  top: 16,
                  right: rightPanelOpen && isDesktop ? `${rightPanelWidth}px` : 16,
                  zIndex: (theme) => theme.zIndex.drawer + 2,
                  bgcolor: "background.paper",
                  boxShadow: 2,
                  transition: theme.transitions.create(["right"], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                  }),
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                {rightPanelOpen && isDesktop ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </>
          )}
        </Box>
      </BreadcrumbProvider>
    </ThemeProvider>
  );
};

export default Layout;
