import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";

const ParetoModeSelection = () => {
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([{ label: "パレート図作成ツール", href: "#" }]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold mb-8">パレート図作成ツール</h1>
      <div className="flex gap-4">
        <button
          className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => navigate("/pareto/single")}
        >
          単一モード
        </button>
        <button
          className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={() => navigate("/pareto/compare")}
        >
          比較モード
        </button>
      </div>
    </div>
  );
};

export default ParetoModeSelection;
