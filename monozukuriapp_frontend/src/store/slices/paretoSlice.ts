import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DataItem, ProcessedDataItem, ParetoChartOptions } from "../../features/pareto/types";
import { processData } from "../../features/pareto/utils/paretoCalculations";

interface ParetoState {
  rawData: DataItem[];
  processedData: ProcessedDataItem[] | null;
  options: ParetoChartOptions;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ParetoState = {
  rawData: [],
  processedData: null,
  options: {
    title: "",
    yAxisLabel: "",
    yAxisUnits: "",
    otherColor: "#d3d3d3",
    lineChartColor: "#000000",
    labelOrientation: "portrait",
    xAxisItemCount: 4,
    yAxisLabelOrientation: "vertical",
    lineLabelOrientation: "vertical",
    columnLabelOrientation: "vertical",
    lineThickness: 0,
    xAxisFontSize: 0,
    yAxisFontSize: 0,
    showBarLabels: false,
    showLineLabels: false,
    isBeforeAfterMode: false,
    lineLabelFontSize: 0,
    columnLabelFontSize: 0,
    scale: 0,
    axisFontSize: 0,
    fontSizeTitle: 0,
    fontFamily: "NotoSansJP-Regular",
  },
  status: "idle",
  error: null,
};

const paretoSlice = createSlice({
  name: "pareto",
  initialState,
  reducers: {
    setRawData: (state, action: PayloadAction<DataItem[]>) => {
      state.rawData = action.payload;
    },
    setOptions: (state, action: PayloadAction<Partial<ParetoChartOptions>>) => {
      state.options = { ...state.options, ...action.payload };
    },
    generateChart: (state) => {
      state.processedData = processData(state.rawData, state.options.xAxisItemCount);
    },
  },
});

export const { setRawData, setOptions, generateChart } = paretoSlice.actions;
export default paretoSlice.reducer;
