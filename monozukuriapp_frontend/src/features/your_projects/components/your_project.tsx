import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import DataFromCloud, { ChartType } from "@/features/pareto/components/DataFromCloud";
import React, { useContext, useEffect } from "react";

const YourProjects = () => {
  // const chartType = searchParams.get("chart");
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([{ label: "保存したデータ", href: "#" }]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems]);

  return (
    <div className="mt-4">
      <DataFromCloud
        chartType={ChartType.PARETO}
        pageCurrent="yourProjects"
        title="パレート図"
        show={true}
        showBreadcrumb={false}
      />
      <DataFromCloud
        chartType={ChartType.FISHBONE}
        pageCurrent="yourProjects"
        title="特性要因図"
        show={true}
        showBreadcrumb={false}
      />
      <DataFromCloud
        chartType={ChartType.WHYWHY}
        pageCurrent="yourProjects"
        title="なぜなぜ分析"
        show={true}
        showBreadcrumb={false}
      />
    </div>
  );
};

export default YourProjects;
