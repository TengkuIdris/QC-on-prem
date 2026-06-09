// types/index.ts
export interface DataItem {
  name: string;
  quantity: number;
  cumulativeQuantity?: number; // 追加
  cumulativePercentage?: number; // 追加
  color?: string;
  showBarLabel?: boolean;
  showLineLabel?: boolean;
}

export interface ProcessedDataItem extends DataItem {
  cumulativeQuantity: number;
  cumulativePercentage: number;
  color?: string;
  showBarLabel: boolean;
  showLineLabel: boolean;
}

export interface ParetoChartOptions {
  scale: number;
  results?: string[];
  resultsN?: string[];
  resultsT?: string[];
  resultsQ?: string[];
  resultsR?: string[];
  resultsTitle?: string[];
  title: string;
  yAxisLabel: string;
  yAxisUnits: string;
  otherColor: string;
  lineChartColor: string;
  labelOrientation: "vertical" | "portrait";
  yAxisLabelOrientation: "vertical" | "portrait";
  lineLabelOrientation: "vertical" | "portrait";
  columnLabelOrientation: "vertical" | "portrait";
  xAxisItemCount: number;
  lineThickness: number;
  xAxisFontSize: number;
  yAxisFontSize: number;
  showBarLabels: boolean;
  showLineLabels: boolean;
  isBeforeAfterMode?: boolean;
  lineLabelFontSize: number;
  columnLabelFontSize: number;
  axisFontSize: number;
  fontSizeTitle: number;
  fontFamily:
    | "NotoSansJP-Regular"
    | "MS Gothic"
    | "Arial"
    | "Calibri"
    | "Courier-New"
    | "Georgia"
    | "Helvetica"
    | "MSMINCHO"
    | "Meiryo"
    | "Tahoma"
    | "TimesNewRoman"
    | "Trebuchet-MS"
    | "Verdana";
  yAxisUnitSize: number;
}

export interface AxisDomain {
  min: number;
  max: number;
}
