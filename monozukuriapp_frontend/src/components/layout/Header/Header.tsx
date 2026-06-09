import React, { useContext, useState, useEffect } from "react";
import { AppBar, Toolbar, IconButton, Box, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CommonBreadcrumbs from "@/features/fta/components/beardcumd";
import { BreadcrumbContext } from "../BreadcrumbContext";
import { useAppDispatch } from "@/core/hooks";
import { toggleSidebar } from "@/store/slices/layoutSlice";

interface HeaderProps {
  height: number;
}

const Header: React.FC<HeaderProps> = ({ height }) => {
  const { breadcrumbItems } = useContext(BreadcrumbContext);
  const dispatch = useAppDispatch();
  const theme = useTheme();
  // Menu button is only shown on mobile (< 600px)
  // Hidden in range 600px - 1276px and on large desktop
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // < 600px
  const showMenuButton = isMobile; // Only show on mobile (< 600px)
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = `${new Date(currentTime).getFullYear()}年${String(new Date(currentTime).getMonth() + 1).padStart(2, "0")}月${String(new Date(currentTime).getDate()).padStart(2, "0")}日 ${String(new Date(currentTime).getHours()).padStart(2, "0")}:${String(new Date(currentTime).getMinutes()).padStart(2, "0")}`;

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        height: height,
        zIndex: 1201,
        bgcolor: "var(--color-primary)",
      }}
    >
      <Toolbar sx={{ height: "100%", display: "flex", alignItems: "center", gap: 6 }}>
        {showMenuButton && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => dispatch(toggleSidebar())}
            sx={{ mr: 2, color: "#fff" }}
          >
            <MenuIcon />
          </IconButton>
        )}
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Box
            sx={{
              ml: 3,
              display: "flex",
              alignItems: "center",
              height: "100%",
              flex: 1,
              overflow: "hidden",
              minWidth: 0,
              "& .MuiBreadcrumbs-ol": {
                color: "#fff",
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                height: "100%",
                margin: 0,
                flexWrap: "nowrap",
                overflow: "hidden",
              },
              "& .MuiBreadcrumbs-separator": {
                color: "rgba(255, 255, 255, 0.7)",
                margin: "0 8px",
                flexShrink: 0,
              },
              "& .MuiBreadcrumbs-li": {
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                minWidth: 0,
              },
            }}
          >
            <CommonBreadcrumbs items={breadcrumbItems} />
          </Box>
        )}
        <Box sx={{ marginLeft: "auto", color: "#fff", fontSize: "1.25rem", textWrap: "nowrap" }}>{formatTime}</Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
