import React, { useEffect, useContext } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import AppUI from "@/features/pareto/components/ParetoSelection";
import { ChartType } from "@/features/pareto/components/DataFromCloud";

const DiagramPage: React.FC = () => {
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  useEffect(() => {
    setBreadcrumbItems([{ label: "特性要因図作成ツール", href: "#" }]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems]);
  return (
    <Container
      maxWidth={false}
      sx={{ pt: 6, pb: 4, display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Typography
        variant="subtitle1"
        align="center"
        sx={{ color: "mdc.main", mb: 4, fontWeight: 500 }}
      >
        特性要因図の新規作成・過去データの再開ができます
      </Typography>
      <AppUI chartType={ChartType.FISHBONE} />
    </Container>
  );
};

export default DiagramPage;
