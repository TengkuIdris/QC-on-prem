import { DataItem, ProcessedDataItem } from "../types";

export const processData = (
  data: DataItem[],
  xAxisItemCount: number,
  beforeProcessedData: ProcessedDataItem[] = [],
): ProcessedDataItem[] => {
  const otherItems = data.filter((item) => item.name === "その他");
  const hasOther = otherItems.length > 0;
  const nonOtherItems = data.filter((item) => item.name !== "その他");
  const sortedData = [...nonOtherItems].sort((a, b) => b.quantity - a.quantity);
  const totalQuantity =
    sortedData.reduce((sum, item) => sum + item.quantity, 0) +
    (hasOther ? otherItems.reduce((sum, item) => sum + item.quantity, 0) : 0);

  let limitedData;
  let otherQuantity = 0;
  let otherData = sortedData;
  if (hasOther) {
    limitedData = sortedData.slice(0, xAxisItemCount - 1);
    const remainingData = sortedData.slice(xAxisItemCount - 1);
    otherQuantity =
      remainingData.reduce((sum, item) => sum + item.quantity, 0) +
      otherItems.reduce((sum, item) => sum + item.quantity, 0);
  } else {
    if (sortedData.length === xAxisItemCount) {
      limitedData = sortedData.slice(0, xAxisItemCount);
      otherQuantity = 0;
    } else {
      if (xAxisItemCount === 1) {
        limitedData = sortedData.slice(0, 1);
        otherData = sortedData.slice(1, sortedData.length);
        otherQuantity = otherData.reduce((sum, item) => sum + item.quantity, 0);
      } else {
        limitedData = sortedData.slice(0, xAxisItemCount - 1);
        otherData = sortedData.slice(xAxisItemCount - 1);
        otherQuantity = otherData.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
  }

  if (otherQuantity > 0) {
    const beforeProcessedDataOther = beforeProcessedData.find((item) => item.name === "その他");
    limitedData.push({
      name: "その他",
      quantity: otherQuantity,
      cumulativeQuantity: 0,
      cumulativePercentage: 0,
      color: beforeProcessedDataOther?.color ?? generateColor(),
      showBarLabel: beforeProcessedDataOther ? beforeProcessedDataOther.showBarLabel : true,
      showLineLabel: beforeProcessedDataOther ? beforeProcessedDataOther.showLineLabel : true,
    });
  }
  let cumulativeQuantity = 0;
  const processedData = limitedData.map((item) => {
    cumulativeQuantity += item.quantity;
    return {
      name: item.name,
      quantity: item.quantity,
      cumulativeQuantity,
      cumulativePercentage: (cumulativeQuantity / totalQuantity) * 100,
      color: item?.color ?? generateColor(),
      showBarLabel: item?.showBarLabel ?? true,
      showLineLabel: item?.showLineLabel ?? true,
    };
  });
  return processedData;
};

export const generateColor = (): string => {
  return `hsl(0, 0%, 100%)`;
};
