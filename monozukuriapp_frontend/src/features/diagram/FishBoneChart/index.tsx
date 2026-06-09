import { FontSize } from "@/components/chart/GeneralFishboneChart/enums";
import React, { memo, useEffect } from "react";
import { handleGenerateJsonCoordinates } from "../utils/fishbone/compute-dimensions";
import { countSizeText, createFishboneDiagram, handleGetHeightLineText } from "../utils/fishbone/renderFishBone";

interface DataFishbone {
  name: string;
  children?: DataFishbone[];
  color?: string;
  x?: number;
}
interface FishboneChartComponentProps {
  openTree?: boolean;
  selectedFont?: string;
  divRef?: React.RefObject<HTMLDivElement>;
  root?: DataFishbone;
  rootFontSize?: FontSize | string;
  firstChildFontSize?: FontSize | string;
  otherChildFontSize?: FontSize | string;
}

const FishboneChartComponent = ({
  selectedFont = "",
  divRef,
  root,
  rootFontSize = FontSize._16px,
  firstChildFontSize = FontSize._12px,
  otherChildFontSize = FontSize._12px,
}: FishboneChartComponentProps) => {
  const handleCountsize = (
    data: any,
    selectedFont: string,
    firstChildFontSize: FontSize,
    otherChildFontSize: FontSize,
    firstChild: number,
    otherChild: number,
  ) => {
    if (data.level) {
      const { width, height } = countSizeText(
        data.name,
        data,
        selectedFont,
        data.level > 1 ? otherChildFontSize : firstChildFontSize,
        data.level > 1 ? otherChild : firstChild,
      );
      data.width = width;
      data.height = height;
    }
    if (data.children && data.children.length) {
      data.children.forEach((d: any) =>
        handleCountsize(d, selectedFont, firstChildFontSize, otherChildFontSize, firstChild, otherChild),
      );
    }
  };
  const hanldeChangeJsonToCalc = (
    data: any,
    selectedFont: string,
    firstChildFontSize: FontSize,
    otherChildFontSize: FontSize,
    firstChild: number,
    otherChild: number,
  ) => {
    handleCountsize(data, selectedFont, firstChildFontSize, otherChildFontSize, firstChild, otherChild);
    const convert = (_data: any, index: number) => {
      if (_data.level) {
        _data.index = index;
        _data.text = {
          results: _data.results,
          width: _data.width + (_data.level === 1 && _data?.results[0]?.length < 3 ? 30 : 0),
          height: _data.height,
        };
        delete _data.results;
        delete _data.width;
        delete _data.height;
        delete _data.name;
      }
      if (_data.children && _data.children.length) {
        _data.children.forEach(convert);
      }
    };
    convert(data, 0);
  };
  useEffect(() => {
    if (!root) return;

    const data = JSON.parse(JSON.stringify(root));
    data.fontSize = rootFontSize;
    data.fontFamily = selectedFont;
    const firstChild = handleGetHeightLineText(selectedFont, firstChildFontSize);
    const otherChild = handleGetHeightLineText(selectedFont, otherChildFontSize);
    hanldeChangeJsonToCalc(
      data,
      selectedFont,
      firstChildFontSize as FontSize,
      otherChildFontSize as FontSize,
      firstChild,
      otherChild,
    );
    handleGenerateJsonCoordinates(data);
    createFishboneDiagram(
      data,
      selectedFont,
      rootFontSize,
      firstChildFontSize,
      otherChildFontSize,
      firstChild,
      otherChild,
    );
  }, [root, selectedFont, rootFontSize, firstChildFontSize, otherChildFontSize]);

  return (
    <>
      <div className={`h-full absolute top-0 bottom-0 min-w-full min-h-full flex items-center `}>
        <div
          id="root"
          className="h-full w-full"
        >
          <div className="h-full w-full">
            <div
              id="diagram"
              data-testid="diagram"
              ref={divRef}
              className="px-5 relative h-full w-full flex item-center justify-center items-center"
            ></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(FishboneChartComponent);
