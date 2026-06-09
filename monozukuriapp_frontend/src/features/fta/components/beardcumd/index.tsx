import React from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Typography } from "@mui/material";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface CommonBreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

const CommonBreadcrumbs: React.FC<CommonBreadcrumbsProps> = ({
  items,
  separator = <NavigateNextIcon fontSize="small" />,
}) => {
  return (
    <Breadcrumbs
      key={items.map((item) => item.label).join("-")}
      separator={separator}
      aria-label="breadcrumb"
      sx={{
        flex: 1,
        overflow: "hidden",
        "& .MuiBreadcrumbs-ol": {
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "nowrap",
          overflow: "hidden",
        },
        "& .MuiBreadcrumbs-li": {
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          overflow: "hidden",
        },
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (item.onClick) {
          return (
            <Typography
              key={index}
              onClick={item.onClick}
              sx={{
                cursor: "pointer",
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              {item.label}
            </Typography>
          );
        } else if (item.href && item.href !== "#") {
          return (
            <Typography
              key={index}
              component={Link}
              to={item.href}
              sx={{
                textDecoration: "none",
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "0.5px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                maxWidth: isLast ? "none" : "200px",
                "&:hover": {
                  color: "#FFD700",
                },
              }}
            >
              {item.label}
            </Typography>
          );
        } else {
          return (
            <Typography
              key={index}
              sx={{
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "0.5px",
                cursor: "default",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                maxWidth: isLast ? "none" : "200px",
              }}
            >
              {item.label}
            </Typography>
          );
        }
      })}
    </Breadcrumbs>
  );
};

export default CommonBreadcrumbs;
