import { create } from "zustand";

export type ChartItem = {
  itemName: string | undefined;
  quantity: number | undefined;
  color: string | undefined;
};

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

// const handleCalculateDefaultColor = (chartItems: ChartItem[]): string => {
//   const lastHexColorString =
//     chartItems[chartItems.length - 1]?.color ?? "#e0ffff";
//   const red = parseInt(lastHexColorString.slice(1, 3), 16);
//   const green = parseInt(lastHexColorString.slice(3, 5), 16);
//   const blue = parseInt(lastHexColorString.slice(5, 7), 16);
//   const newRed = Math.max(0, red - 10);
//   const newGreen = Math.max(0, green - 10);
//   const newBlue = Math.max(0, blue - 10);
//   const newColor = `#${newRed.toString(16).padStart(2, "0")}${newGreen.toString(16).padStart(2, "0")}${newBlue.toString(16).padStart(2, "0")}`;
//   return newColor;
// };

// global state
export const useInputChartItemsController = create<
  {
    chartItems: ChartItem[];
    yAxisLabel: string;
    unitLabel: string;
    numberOfXAxisItems: number | null;
    titleLabel: string;
    colorOfOtherItem: string;
    colorOfLineChart: string;
    labelDirection: "horizontal" | "vertical";
  } & ChartItemAction
>((set) => ({
  chartItems: [{ itemName: undefined, quantity: undefined, color: "#e0ffff" }],
  yAxisLabel: "",
  unitLabel: "",
  titleLabel: "",
  numberOfXAxisItems: null,
  colorOfOtherItem: "#e0ffff",
  colorOfLineChart: "#000000",
  labelDirection: "vertical",
  handleAddItem: () => {
    set((state) => {
      // const newColor = handleCalculateDefaultColor(state.chartItems);
      return {
        chartItems: [
          ...state.chartItems,
          // { itemName: undefined, quantity: undefined, color: newColor },
          { itemName: undefined, quantity: undefined, color: "#e0ffff" },
        ],
      };
    });
  },
  handleRemoveItem: (index: number) => {
    set((state) => {
      return { chartItems: state.chartItems.filter((_, i) => i !== index) };
    });
  },
  handleQuantityChange: (index: number, field: keyof ChartItem, value: string) => {
    set((state) => {
      return {
        chartItems: state.chartItems.map((item, i) => {
          if (i === index) {
            return {
              ...item,
              [field]: field === "quantity" ? parseInt(value) : value,
            };
          }
          return item;
        }),
      };
    });
  },
  handleColorChange: (index: number, value: string) => {
    set((state) => {
      return {
        chartItems: state.chartItems.map((item, i) => {
          if (i === index) {
            return {
              ...item,
              color: value,
            };
          }
          return item;
        }),
      };
    });
  },
  handleYAxisLabelChange: (value: string) => {
    set({ yAxisLabel: value });
  },
  handleUnitLabelChange: (value: string) => {
    set({ unitLabel: value });
  },
  handleNumberOfXAxisItemsChange: (value: string) => {
    const parsedValue = parseInt(value);

    set({
      numberOfXAxisItems: isNaN(parsedValue) ? null : parsedValue,
    });
  },
  handleTitleLabelChange(value) {
    set({ titleLabel: value });
  },
  handleChangeColorOfOtherItem(value) {
    set({ colorOfOtherItem: value });
  },
  handleColorOfLineChartChange(value) {
    set({ colorOfLineChart: value });
  },
  handleLabelDirectionChange(value) {
    set({ labelDirection: value });
  },
}));
