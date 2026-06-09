import { useState, useCallback, useMemo, useRef } from "react";
import { DataItem, ProcessedDataItem, ParetoChartOptions } from "../types";
import { processData } from "../utils/paretoCalculations";

const useAxisDomains = (processedData: ProcessedDataItem[]) => {
  const quantityDomain = useMemo(() => {
    const maxQuantity = processedData.length > 0 ? Math.max(...processedData.map((item) => item.quantity)) : 100;
    return { min: 0, max: maxQuantity };
  }, [processedData]);

  const percentageDomain = useMemo(
    () => ({
      min: 0,
      max: 100,
    }),
    [],
  );

  return { quantity: quantityDomain, percentage: percentageDomain };
};

export const useParetoData = () => {
  const [beforeData, setBeforeData] = useState<DataItem[]>([]);
  const [afterData, setAfterData] = useState<DataItem[]>([]);
  const [beforeProcessedData, setBeforeProcessedData] = useState<ProcessedDataItem[]>([]);
  const [afterProcessedData, setAfterProcessedData] = useState<ProcessedDataItem[]>([]);
  const [totalQuantityBefore, setTotalQuantityBefore] = useState(0);
  const [totalQuantityAfter, setTotalQuantityAfter] = useState(0);
  const [optionsBefore, setOptionsBefore] = useState<ParetoChartOptions>({
    title: "パレート図",
    yAxisLabel: "数量",
    yAxisUnits: "個",
    otherColor: "#d3d3d3",
    lineChartColor: "#000000",
    labelOrientation: "portrait",
    yAxisLabelOrientation: "vertical",
    lineLabelOrientation: "portrait",
    columnLabelOrientation: "portrait",
    xAxisItemCount: 1,
    lineThickness: 2,
    xAxisFontSize: 30,
    yAxisFontSize: 30,
    axisFontSize: 8,
    lineLabelFontSize: 27,
    columnLabelFontSize: 32,
    showBarLabels: true,
    showLineLabels: true,
    isBeforeAfterMode: false,
    fontFamily: "NotoSansJP-Regular",
    fontSizeTitle: 50,
    scale: 28,
    yAxisUnitSize: 18,
  });
  const [optionsAfter, setOptionsAfter] = useState<ParetoChartOptions>({
    title: "パレート図",
    yAxisLabel: "数量",
    yAxisUnits: "個",
    otherColor: "#d3d3d3",
    lineChartColor: "#000000",
    labelOrientation: "portrait",
    yAxisLabelOrientation: "vertical",
    lineLabelOrientation: "portrait",
    columnLabelOrientation: "portrait",
    xAxisItemCount: 1,
    lineThickness: 2,
    xAxisFontSize: 30,
    yAxisFontSize: 30,
    axisFontSize: 8,
    showBarLabels: true,
    showLineLabels: true,
    isBeforeAfterMode: false,
    lineLabelFontSize: 27,
    columnLabelFontSize: 32,
    fontFamily: "NotoSansJP-Regular",
    fontSizeTitle: 50,
    scale: 28,
    yAxisUnitSize: 18,
  });

  const beforeProcessedDataRef = useRef<ProcessedDataItem[]>([]);

  // const [isBeforeAfterMode, setIsBeforeAfterMode] = useState(false);

  const beforeAxisDomains = useAxisDomains(beforeProcessedData);

  const afterAxisDomains = useAxisDomains(afterProcessedData);

  const handleDataInput = useCallback((inputData: DataItem[], isBefore = false) => {
    if (isBefore) {
      setBeforeData(inputData);
    } else {
      setAfterData(inputData);
    }
  }, []);

  const handleOptionChangeBefore = useCallback((key: keyof ParetoChartOptions, value: any) => {
    setOptionsBefore((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleOptionChangeAfter = useCallback((key: keyof ParetoChartOptions, value: any) => {
    setOptionsAfter((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleOptionChangeAll = useCallback((key: keyof ParetoChartOptions, value: any) => {
    setOptionsAfter((prev) => ({ ...prev, [key]: value }));
    setOptionsBefore((prev) => ({ ...prev, [key]: value }));
  }, []);

  const generateBeforeChart = useCallback(() => {
    const total = beforeData.reduce((sum, item) => sum + item.quantity, 0);
    setTotalQuantityBefore(total);
    const data = beforeData.map((item) => {
      const beforeProcessedDataFind = beforeProcessedData.find((i) => i.name === item.name);
      return {
        ...item,
        color: beforeProcessedDataFind?.color,
        showBarLabel: beforeProcessedDataFind ? beforeProcessedDataFind?.showBarLabel : true,
        showLineLabel: beforeProcessedDataFind ? beforeProcessedDataFind?.showLineLabel : true,
      };
    });
    const processed = processData(data, optionsBefore.xAxisItemCount, beforeProcessedData);
    setBeforeProcessedData(processed);
    beforeProcessedDataRef.current = processed;
  }, [beforeData, optionsBefore.xAxisItemCount, beforeProcessedData]);

  const generateAfterChart = useCallback(() => {
    const total = afterData.reduce((sum, item) => sum + item.quantity, 0);
    setTotalQuantityAfter(total);
    const data = afterData.map((item) => {
      return {
        ...item,
        color: afterProcessedData.find((i) => i.name === item.name)?.color,
      };
    });
    const processed = processData(data, optionsAfter.xAxisItemCount, afterProcessedData);
    setAfterProcessedData(processed);
  }, [afterData, optionsAfter.xAxisItemCount, afterProcessedData]);

  const handleColorChange = useCallback((index: number, color: string, isBefore = false) => {
    if (isBefore) {
      setBeforeProcessedData((prev) => prev.map((item, i) => (i === index ? { ...item, color } : item)));
    } else {
      setAfterProcessedData((prev) => prev.map((item, i) => (i === index ? { ...item, color } : item)));
    }
  }, []);

  const handleLabelToggle = useCallback(
    (index: number, showBarLabel: boolean, showLineLabel: boolean, isBefore = false) => {
      if (isBefore) {
        setBeforeProcessedData((prev) =>
          prev.map((item, i) => (i === index ? { ...item, showBarLabel, showLineLabel } : item)),
        );
      } else {
        setAfterProcessedData((prev) =>
          prev.map((item, i) => (i === index ? { ...item, showBarLabel, showLineLabel } : item)),
        );
      }
    },
    [],
  );

  const handleBulkColorChange = useCallback((color: string, isBefore = false) => {
    if (isBefore) {
      setBeforeProcessedData((prev) => prev.map((item) => ({ ...item, color })));
      setOptionsBefore((prev) => ({ ...prev, otherColor: color }));
    } else {
      setAfterProcessedData((prev) => prev.map((item) => ({ ...item, color })));
      setOptionsBefore((prev) => ({ ...prev, otherColor: color }));
    }
  }, []);

  return {
    beforeData,
    afterData,
    beforeProcessedData,
    afterProcessedData,
    totalQuantityBefore,
    totalQuantityAfter,
    optionsBefore,
    optionsAfter,
    beforeAxisDomains,
    afterAxisDomains,
    // isBeforeAfterMode,
    // setIsBeforeAfterMode,
    setTotalQuantityBefore,
    handleDataInput,
    handleOptionChangeBefore,
    handleOptionChangeAfter,
    handleOptionChangeAll,
    generateBeforeChart,
    generateAfterChart,
    handleColorChange,
    handleLabelToggle,
    handleBulkColorChange,
    setOptionsBefore,
    setOptionsAfter,
    setBeforeData,
    setAfterData,
    setBeforeProcessedData,
    setAfterProcessedData,
    beforeProcessedDataRef,
  };
};
