import { IconButton } from "@mui/material";
import React, { memo, useEffect, useRef, useState } from "react";
import { Refresh, ZoomOut } from "@mui/icons-material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "../tree.css";
import { ZoomIn } from "lucide-react";
interface DataFTA {
  name: string;
  children?: DataFTA[];
  color?: string;
  level?: number;
  x?: number;
}

interface FTAChartComponentProps {
  root?: DataFTA;
  selectedFont: string;
}

const TreeChart = ({ root, selectedFont }: FTAChartComponentProps) => {
  const chartContainer = useRef<HTMLDivElement>(null);
  const [transformRef, setTransformRef] = useState<any>(null);

  const convertChart = (node: DataFTA) => {
    const result: any = {
      text: { name: node.name },
      HTMLclass:
        node.level === 0
          ? "bg-[#4472c4]"
          : node.level === 1
            ? "bg-[#3cbda1]"
            : node.level === 2
              ? `bg-[#39CCCC]`
              : "bg-[#2ECC40]",
      children: node.children ? node.children.map(convertChart) : [],
    };

    return result;
  };

  useEffect(() => {
    if (chartContainer.current && root) {
      if (selectedFont) {
        chartContainer.current.style.fontFamily = selectedFont;
      }
      const timeout = setTimeout(() => {
        const chartConfig = {
          chart: {
            container: "#treant-chart-container",
            rootOrientation: "WEST",
            nodeAlign: "BOTTOM",
            connectors: {
              type: "step",
            },
            innerHTMLStyle: {
              fontFamily: selectedFont,
            },
            node: {
              HTMLclass: `nodeExample1`,
            },
          },
          nodeStructure: convertChart(root),
        };

        //@ts-ignore
        new Treant(chartConfig);
      }, 0);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [root, selectedFont]);

  return (
    <>
      <div className="p-2">
        <IconButton
          aria-label="Zoom in"
          onClick={() => transformRef.current?.zoomIn(0.2)}
        >
          <ZoomIn />
        </IconButton>
        <IconButton
          aria-label="Zoom out"
          onClick={() => transformRef.current?.zoomOut(0.2)}
        >
          <ZoomOut />
        </IconButton>
        <IconButton
          aria-label="Reset zoom"
          onClick={() => transformRef.current?.setTransform(0, 0, 1)}
        >
          <Refresh />
        </IconButton>
      </div>
      <div className="w-full flex flex-col absolute top-[40px] bottom-0 max-w-full min-w-full overflow-auto h-[calc(100%-50px)]">
        <div className="w-24 h-5 overflow-auto invisible">
          <svg
            id="count_width"
            data-testid="count_width"
            className="whitespace-nowrap"
            width={400}
            height={400}
            style={{
              fontFamily: selectedFont,
            }}
          />
        </div>
        <div
          className="w-0 h-0 overflow-auto invisible"
          id="renderDownloadFTA"
          data-testid="renderDownloadFTA"
        ></div>
        <div className=" w-full h-full ">
          <div
            className="flex w-full flex-1 h-full"
            id="treant-container"
            data-testid="treant-container"
          >
            <TransformWrapper
              onInit={(ref) => setTransformRef(ref)}
              ref={transformRef}
              wheel={{
                disabled: true,
              }}
              doubleClick={{
                disabled: true,
              }}
            >
              <div className="w-full h-full fta-chart">
                <TransformComponent
                  wrapperStyle={{
                    height: "100%",
                    width: "100% ",
                  }}
                >
                  <div
                    id="treant-chart-container"
                    className="max-w-fit h-full w-full"
                    ref={chartContainer}
                  ></div>
                </TransformComponent>
              </div>
            </TransformWrapper>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(TreeChart);
