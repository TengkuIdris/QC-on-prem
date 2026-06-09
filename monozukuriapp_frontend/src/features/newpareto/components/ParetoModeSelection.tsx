import React, { useContext } from "react";
import { ChartType } from "@/features/pareto/components/DataFromCloud";
import AppUI from "@/features/pareto/components/ParetoSelection";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";

const ParetoModeSelection = () => {
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  React.useEffect(() => {
    setBreadcrumbItems([{ label: "パレート図作成ツール", href: "#" }]);
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
        パレート図の新規作成・比較・過去データの再開ができます
      </Typography>
      <AppUI chartType={ChartType.PARETO} />
    </Container>
  );
};

export default ParetoModeSelection;
