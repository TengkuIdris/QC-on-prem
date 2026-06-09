import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChartItem {
  itemName: string | undefined;
  quantity: number | undefined;
  color: string | undefined;
}

interface Chart {
  chartItems: ChartItem[];
  yAxisLabel: string;
  unitLabel: string;
  numberOfXAxisItems: number | null;
  titleLabel: string;
  colorOfOtherItem: string;
  colorOfLineChart: string;
  labelDirection: "horizontal" | "vertical";
}

type ChartItemAction = {
  handleAddItem: () => void;
  handleRemoveItem: (index: number) => void;
  handleQuantityChange: (index: number, field: keyof ChartItem, value: string) => void;
  handleColorChange: (index: number, value: string) => void;
  handleYAxisLabelChange: (value: string) => void;
  handleUnitLabelChange: (value: string) => void;
  handleNumberOfXAxisItemsChange: (value: string) => void;
  handleTitleLabelChange: (value: string) => void;
  handleChangeColorOfOtherItem: (value: string) => void;
  handleColorOfLineChartChange: (value: string) => void;
  handleLabelDirectionChange: (value: "horizontal" | "vertical") => void;
};

const initialState: Chart = {
  chartItems: [{ itemName: undefined, quantity: undefined, color: "" }],
  yAxisLabel: "",
  unitLabel: "",
  numberOfXAxisItems: null,
  titleLabel: "",
  colorOfOtherItem: "",
  colorOfLineChart: "",
  labelDirection: "vertical",
};

const useInputChartItemsControllerSlice = createSlice({
  name: "userInforPareto",
  initialState,
  reducers: {
    handleAddItem: (state, action: PayloadAction<Chart>) => {
      return {
        ...state,
        chartItems: [...action.payload.chartItems, { itemName: undefined, quantity: undefined, color: "#e0ffff" }],
      };
    },
    handleRemoveItem: (state, action: PayloadAction<{ index: number }>) => {
      return {
        ...state,
        chartItems: state.chartItems.filter((_, i) => i !== action.payload.index),
      };
    },
    // handleYAxisLabelChange: (value: string) => {
    // set({ yAxisLabel: value });
    // },
    // handleUnitLabelChange: (value: string) => {
    // set({ unitLabel: value });
    // },
    // handleNumberOfXAxisItemsChange: (value: string) => {
    // const parsedValue = parseInt(value);

    // set({
    //     numberOfXAxisItems: isNaN(parsedValue) ? null : parsedValue,
    // });
    // },
    // handleTitleLabelChange(value) {
    // set({ titleLabel: value });
    // },
    // handleChangeColorOfOtherItem(value) {
    // set({ colorOfOtherItem: value });
    // },
    // handleColorOfLineChartChange(value) {
    // set({ colorOfLineChart: value });
    // },
    // handleLabelDirectionChange(value) {
    // set({ labelDirection: value });
    // },
  },
});

export const { handleAddItem, handleRemoveItem } = useInputChartItemsControllerSlice.actions;
export default useInputChartItemsControllerSlice.reducer;
