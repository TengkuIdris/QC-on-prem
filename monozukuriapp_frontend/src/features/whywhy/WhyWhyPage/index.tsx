import React, { useEffect, useContext } from "react";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { useNavigate } from "react-router-dom";

import WhyWhyPageView from "../WhyWhyPageView";

const WhyWhyPage: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([{ label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") }]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  return <WhyWhyPageView />;
};

export default WhyWhyPage;
