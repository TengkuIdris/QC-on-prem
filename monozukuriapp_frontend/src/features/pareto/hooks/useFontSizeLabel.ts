import { ParetoChartOptions } from "../types";
import event from "@/utils/eventEmitter";
import { EventType } from "@/constant/enum";

const handleFontSizeLabel = async (
  xAxisItemCountNumber: number,
  numberColumns: number,
  onChangeOption: (key: keyof ParetoChartOptions, value: any) => void,
  firstOption: keyof ParetoChartOptions,
  secondOption: keyof ParetoChartOptions,
  eventType: EventType,
) => {
  const numerItems = xAxisItemCountNumber <= numberColumns ? xAxisItemCountNumber : numberColumns;

  const fontSize =
    numerItems <= 7
      ? 25
      : numerItems <= 10
        ? 22
        : numerItems <= 15
          ? 16
          : numerItems <= 20
            ? 12
            : numerItems <= 25
              ? 10
              : 8;
  await Promise.all([onChangeOption(firstOption, fontSize), onChangeOption(secondOption, fontSize)]);
  event.emit(eventType, fontSize);
};

export default handleFontSizeLabel;
