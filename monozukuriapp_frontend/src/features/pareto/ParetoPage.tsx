import React, { useEffect, useContext } from "react";
import { Container } from "@mui/material";
import ParetoCreationTool from "./components/ParetoCreationTool";
import { useNavigate } from "react-router-dom";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";

export interface StateType {
  showBeforeChart: boolean;
  showAfterChart: boolean;
  error: string | null;
}

const ParetoPage: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([{ label: "パレート図作成ツール", href: "#", onClick: () => navigate("/pareto") }]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  return (
    <>
      <Container maxWidth={false}>
        <ParetoCreationTool />
      </Container>
    </>
  );
};

export default ParetoPage;
