import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setFileContent } from "../../../store/slices/fileSlice";
import { setRootNode } from "../../../store/slices/treeSlice";
import { Box, Container, Typography, Button, Grid, Paper } from "@mui/material";
import { Leaf } from "lucide-react";
import { App } from "@/enum/pathnames";
import CommonBreadcrumbs from "../components/beardcumd";
import { ChartType } from "@/features/pareto/components/DataFromCloud";
import AppUI from "@/features/pareto/components/ParetoSelection";

const Triangle = ({ size, color = "#22C55E", opacity = 1 }: { size: number; color?: string; opacity?: number }) => (
  <>
    <Box
      sx={{
        width: 0,
        height: 0,
        borderLeft: `${size}px solid transparent`,
        borderRight: `${size}px solid transparent`,
        borderBottom: `${size * 2.2}px solid ${color}`,
        position: "relative",
        opacity,
      }}
    >
      <Box
        sx={{
          width: 0,
          height: 0,
          borderLeft: `${size * 0.5}px solid transparent`,
          borderRight: `${size * 0.5}px solid transparent`,
          borderBottom: `${size * 1.1}px solid #F0FDF4`,
          position: "absolute",
          top: `${size * 0.55}px`,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
    </Box>
  </>
);

const FtaPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          dispatch(setFileContent(content));
          navigate(App.GENERAL_CHART);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <CommonBreadcrumbs
        items={[
          {
            label: "FTA（フォルトツリー解析）ツール",
            href: "#",
          },
        ]}
      ></CommonBreadcrumbs>
      <AppUI chartType={ChartType.FTA} />
    </>
  );
};

export default FtaPage;
