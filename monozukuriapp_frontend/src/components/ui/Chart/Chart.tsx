import React from "react";
import { Bar } from "react-chartjs-2";
import "./Chart.module.css";

interface ChartProps {
  data: any;
  options?: any;
}

const Chart: React.FC<ChartProps> = ({ data, options }) => {
  return (
    <div className="chart">
      <Bar
        data={data}
        options={options}
      />
    </div>
  );
};

export default Chart;
export type { ChartProps };
