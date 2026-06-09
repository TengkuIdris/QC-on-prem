import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, memo } from "react";
import { ProcessedDataItem, ParetoChartOptions, AxisDomain, DataItem } from "../types";
import { countSizeTextPareto, wrapTextPareto } from "../utils/pareto";
import { useMediaQuery } from "@mui/material";
import { scaleChart } from "./SingleMode";
import { axisBottom, axisLeft, axisRight, line, scaleBand, scaleLinear, select } from "d3";

interface ParetoChartProps {
  data: ProcessedDataItem[];
  totalQuantity: number;
  options: ParetoChartOptions;
  axisDomains: {
    quantity: AxisDomain;
    percentage: AxisDomain;
  };
  dowload?: boolean;
  mode?: "single" | "compare";
}

export enum Font {
  NotoSansJP = "NotoSansJP-Regular",
  MSGothic = "MS Gothic",
  Arial = "Arial",
  Meiryo = "Meiryo",
  MSMINCHO = "MSMINCHO",
  Georgia = "Georgia",
  Tahoma = "Tahoma",
  CourierNew = "Courier-New",
  TrebuchetMS = "Trebuchet-MS",
  TimesNewRoman = "TimesNewRoman",
  Verdana = "Verdana",
  Helvetica = "Helvetica",
  Calibri = "Calibri",
}

export const FontFamily = {
  [Font.NotoSansJP]: "NotoSansJP",
  [Font.MSGothic]: "MSGothic",
  [Font.Arial]: "Arial",
  [Font.Calibri]: "Calibri",
  [Font.CourierNew]: "Courier-New",
  [Font.Georgia]: "Georgia",
  [Font.Helvetica]: "Helvetica",
  [Font.MSMINCHO]: "MSMINCHO",
  [Font.Meiryo]: "Meiryo",
  [Font.Tahoma]: "Tahoma",
  [Font.TimesNewRoman]: "times-new-roman",
  [Font.TrebuchetMS]: "Trebuchet-MS",
  [Font.Verdana]: "Verdana",
};

const ParetoChart = forwardRef<SVGSVGElement, ParetoChartProps>(
  ({ data, totalQuantity, options, axisDomains, dowload }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isRender, setIsRender] = useState<any>({});
    const isLargeScreen = useMediaQuery("(min-width: 1921px) and (max-width: 2200px)");

    useImperativeHandle(ref, () => svgRef.current as SVGSVGElement);

    const [yAxisLabelWidth, setYAxisLabelWidth] = useState({
      left: 0,
      right: 0,
      title: 0,
      quantity: 0,
      totalW: 0,
      totalH: 0,
      name: 0,
      heightLeft: 0,
      heightTitle: 0,
      heightYUnits: 0,
      heightRight: 0,
    });
    const yAxisLabelWidthRef = useRef({
      left: 0,
      right: 0,
      title: 0,
      quantity: 0,
      totalW: 0,
      totalH: 0,
      name: 0,
      heightLeft: 0,
      heightTitle: 0,
      heightYUnits: 0,
      heightRight: 0,
    });

    useEffect(() => {
      const resizeAction = () => {
        setIsRender({});
      };
      window.addEventListener("resize", resizeAction);

      return () => {
        window.removeEventListener("resize", resizeAction);
      };
    }, []);

    const caculationLabelY = (w: any, h: any, count: number) => {
      const { width: wL, height: hL } = countSizeTextPareto(
        `${options.yAxisLabel}`,
        options,
        options.yAxisFontSize,
        "results",
        options.yAxisLabelOrientation,
        options.yAxisLabelOrientation === "vertical" ? 600 : 120,
        options.yAxisLabel.length > 32 ? 25 : options.yAxisLabel.length > 7 ? 7 : 2,
      );
      const { width: wR, height: hR } = countSizeTextPareto(
        "累積比率",
        options,
        options.yAxisFontSize,
        "resultsR",
        options.yAxisLabelOrientation,
        options.yAxisLabelOrientation === "vertical" ? 300 : 80,
        7,
      );
      const { width: wT, height: hT } = countSizeTextPareto(
        options.yAxisUnits,
        options,
        25,
        "resultsT",
        "portrait",
        250 * scaleChart[`${options.scale}` as keyof typeof scaleChart],
        7,
      );

      const { height: hTitle } = countSizeTextPareto(
        options.title,
        options,
        40,
        "resultsTitle",
        "portrait",
        1000 * scaleChart[`${options.scale}` as keyof typeof scaleChart],
        32 * scaleChart[`${options.scale}` as keyof typeof scaleChart],
      );

      yAxisLabelWidthRef.current.left = wL;
      yAxisLabelWidthRef.current.right = wR;
      yAxisLabelWidthRef.current.title = wT;
      yAxisLabelWidthRef.current.quantity = 0;
      yAxisLabelWidthRef.current.heightLeft = hL;
      yAxisLabelWidthRef.current.heightTitle = hTitle;
      yAxisLabelWidthRef.current.heightYUnits = hT;
      yAxisLabelWidthRef.current.heightRight = hR;
      if (count === 0) {
        setYAxisLabelWidth({
          ...yAxisLabelWidth,
          left: wL,
          right: wR,
          title: wT,
          quantity: 0,
          totalW: w,
          totalH: h,
          heightLeft: hL,
          heightTitle: hTitle,
          heightYUnits: hT,
          heightRight: hR,
        });
        return;
      }
      setYAxisLabelWidth({
        ...yAxisLabelWidth,
        left: wL,
        right: wR,
        title: wT,
        quantity: 0,
        heightLeft: hL,
        heightTitle: hTitle,
        heightYUnits: hT,
        heightRight: hR,
      });
    };

    useEffect(() => {
      let count = 0;

      while (count <= 2) {
        if (!svgRef.current || data.length === 0) return;
        const svg = select(svgRef.current);
        svg.selectAll("*").remove();
        const coordinatesDots: { cx: number; cy: number }[] = [];

        const nameMaxLength = data.reduce(
          (acc: any, item: DataItem) => {
            if (item.name.length > acc.length) {
              acc = {
                name: item.name,
                length: item.name.length,
              };
            }
            return acc;
          },
          {
            name: "",
            length: 0,
          },
        );
        const margin = { top: 80, right: 80, bottom: 200, left: 80 };

        const width =
          (isLargeScreen
            ? nameMaxLength.length < 20
              ? 1756
              : 3256
            : nameMaxLength.length <= 20 && nameMaxLength.length >= 10
              ? 1656
              : nameMaxLength.length <= 10
                ? 1456
                : nameMaxLength.length > 20 && options.labelOrientation === "vertical"
                  ? nameMaxLength.length > 20 && nameMaxLength.length < 40
                    ? 1556 + (nameMaxLength.length / 100) * 1000
                    : 1956 + (nameMaxLength.length / 100) * 1000
                  : 1456) * scaleChart[`${options.scale}` as keyof typeof scaleChart];
        const height =
          (1230 - 91 + yAxisLabelWidthRef.current.heightTitle) *
          scaleChart[`${options.scale}` as keyof typeof scaleChart];

        const chart = svg
          .append("g")
          .attr(
            "transform",
            `translate(${isLargeScreen ? (options.yAxisLabelOrientation === "vertical" ? 70 : 170) : options.yAxisLabelOrientation === "vertical" ? 70 : options.yAxisLabel.length > 7 ? 170 : 170},${yAxisLabelWidthRef.current.heightTitle + 180})`,
          );

        // 仮想の(0, 0)点を追加
        const extendedData = [
          {
            name: "0",
            quantity: 0,
            cumulativeQuantity: 0,
            cumulativePercentage: 0,
            color: "none",
            showBarLabel: false,
            showLineLabel: false,
          },
          ...data,
        ];

        // X scale
        const x = scaleBand()
          .range([0, width])
          .domain(data.map((d) => d.name))
          .padding(0.0);

        // Y scale for bars
        const yBar = scaleLinear().range([height, 0]).domain([0, totalQuantity]);

        // Y scale for line
        const yLine = scaleLinear().range([height, 0]).domain([0, axisDomains.percentage.max]);

        const { width: wN } = countSizeTextPareto(
          nameMaxLength.name,
          options,
          options.xAxisFontSize,
          "resultsN",
          options.labelOrientation === "vertical" ? "vertical" : "portrait",
          nameMaxLength.length >= 40 ? 1800 : 1200,
          32,
        );

        const tooltip = select("body").append("div").attr("class", "tooltip").attr("id", "tooltip");

        if (options?.results) {
          chart
            .append("text")
            .attr("transform", options.yAxisLabelOrientation === "vertical" ? "" : "rotate(0)")
            .attr(
              "transform",
              `translate(${options.yAxisLabelOrientation === "vertical" ? -10 : -40},${options.yAxisLabelOrientation === "vertical" ? 0 : options.yAxisLabel.length > 4 ? 60 : 55})`,
            )
            .attr(
              "y",
              (yAxisLabelWidthRef.current.totalH -
                (options.labelOrientation === "vertical" ? wN : 0) -
                yAxisLabelWidthRef.current.heightLeft -
                yAxisLabelWidthRef.current.heightTitle -
                yAxisLabelWidthRef.current.left -
                yAxisLabelWidthRef.current.heightYUnits) /
                2,
            )
            .attr(
              "x",
              options.yAxisLabelOrientation === "vertical"
                ? 0
                : options?.yAxisLabel.length > 5
                  ? nameMaxLength.length >= 30 && options.labelOrientation === "vertical"
                    ? -10
                    : 30
                  : options?.yAxisLabel.length === 4
                    ? 40
                    : options?.yAxisLabel.length > 1
                      ? -10
                      : -30,
            )
            .style("text-anchor", "middle")
            .style("font-size", `${options.yAxisFontSize}px`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("fill", "black")
            .style("writing-mode", options.yAxisLabelOrientation === "vertical" ? "tb" : "lr")
            .call((d) =>
              wrapTextPareto(
                d,
                options.yAxisLabelOrientation === "vertical" ? options?.results?.reverse() : options?.results,
                options.yAxisLabelOrientation,
                options.yAxisLabelOrientation === "vertical" ? 12 : 12,
                false,
                options.yAxisLabelOrientation === "vertical" ? "start" : "end",
              ),
            );
        } else {
          chart
            .append("text")
            .attr("transform", options.yAxisLabelOrientation === "vertical" ? "" : "rotate(0")
            .attr("y", options.yAxisLabelOrientation === "vertical" ? height * 0.45 : height * 0.55)
            .attr("x", options.yAxisLabelOrientation === "vertical" ? margin.left : 0)
            .style("text-anchor", "middle")
            .style("font-size", `${options.yAxisFontSize}px`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("fill", "black")
            .style("writing-mode", options.yAxisLabelOrientation === "vertical" ? "tb" : "lr")
            .text(`${options.yAxisLabel}`);
        }
        const xOffsetGlobel = totalQuantity >= 10000 ? 40 : 0;
        // Draw bars
        chart
          .selectAll(".bar")
          .data(data)
          .enter()
          .append("rect")
          .attr("class", "bar")
          .attr(
            "x",
            (d) =>
              x(d.name)! +
              (options.yAxisLabelOrientation === "vertical"
                ? margin.left + yAxisLabelWidthRef.current.quantity - 20
                : yAxisLabelWidthRef.current.left - 60) +
              xOffsetGlobel,
          )
          .attr("y", (d) => yBar(d.quantity))
          .attr("width", x.bandwidth())
          .attr("height", (d) => height - yBar(d.quantity))
          .attr("fill", (d) => d.color || options.otherColor)
          .attr("stroke", "black")
          .attr("stroke-width", 2);

        // Draw line
        const _line = line<ProcessedDataItem>()
          .x((d) =>
            d.name === "0"
              ? (options.yAxisLabelOrientation === "vertical"
                  ? margin.left + yAxisLabelWidthRef.current.quantity - 20
                  : yAxisLabelWidthRef.current.left - 60) + xOffsetGlobel
              : x(d.name)! +
                x.bandwidth() +
                (options.yAxisLabelOrientation === "vertical"
                  ? margin.left + yAxisLabelWidthRef.current.quantity - 20
                  : yAxisLabelWidthRef.current.left - 60) +
                xOffsetGlobel,
          )
          .y((d) => yLine(d.cumulativePercentage));

        chart
          .append("path")
          .datum(extendedData)
          .attr("class", "line")
          .attr("d", _line)
          .attr("fill", "none")
          .attr("stroke", options.lineChartColor)
          .attr("stroke-width", options.lineThickness);

        //Draw dots
        chart
          .append("g")
          .selectAll("circle")
          .data(extendedData.slice(1, -1))
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", (d, index) => {
            const coordinatesXDot =
              x(d.name)! +
              x.bandwidth() +
              (options.yAxisLabelOrientation === "vertical"
                ? margin.left + yAxisLabelWidthRef.current.quantity - 20
                : yAxisLabelWidthRef.current.left - 60) +
              xOffsetGlobel;
            coordinatesDots[index] = { cx: coordinatesXDot, cy: 0 };
            return coordinatesXDot;
          })
          .attr("cy", (d, index) => {
            coordinatesDots[index] = { ...coordinatesDots[index], cy: yLine(d?.cumulativePercentage as any) };
            return yLine(d?.cumulativePercentage as any);
          })
          .attr("r", 4)
          .attr("fill", "steelblue")
          .attr("stroke", "black")
          .attr("stroke-width", 1.5);

        // X-axis
        chart
          .append("g")
          .attr(
            "transform",
            `translate(${(options.yAxisLabelOrientation === "vertical" ? margin.left + yAxisLabelWidthRef.current.quantity - 20 : yAxisLabelWidthRef.current.left - 60) + xOffsetGlobel},${height})`,
          )
          .call(axisBottom(x).tickSize(0))
          .selectAll("text")
          .data(data)
          .attr("transform", options.labelOrientation === "vertical" ? "rotate(0)" : "")
          .style("text-anchor", options.labelOrientation === "vertical" ? "start" : "")
          .attr("dx", options.labelOrientation === "vertical" ? "" : "0em")
          .attr("dy", options.labelOrientation === "vertical" ? "0.8rem" : "1.5em")
          .style("font-size", `${options.xAxisFontSize}px`)
          .style("writing-mode", options.labelOrientation === "vertical" ? "tb" : "lr")
          .style("font-family", FontFamily[options.fontFamily])
          .text((d) => {
            if (options.labelOrientation === "portrait") {
              const columnWidth = x.bandwidth();

              const text = d.name;
              const fontSize = options.xAxisFontSize;
              const chars = Array.from(text);
              const maxChars = Math.floor(columnWidth / fontSize);
              // Kiểm tra nếu text quá dài
              if (chars.length > maxChars) {
                if (maxChars > 3) {
                  return chars.slice(0, maxChars - 3).join("") + "...";
                } else if (maxChars > 0) {
                  return chars[0] + "...";
                } else {
                  return "...";
                }
              }
              return text;
            } else {
              return d.name;
            }
          })
          .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible").style("display", "block").text(d.name);
          })
          .on("mousemove", function (event) {
            const tooltipWidth = tooltip?.node()?.offsetWidth || 0;
            tooltip.style("top", event.pageY - 10 + "px").style("left", event.pageX - tooltipWidth - 10 + "px");
          })
          .on("mouseout", function () {
            tooltip.style("visibility", "hidden").style("display", "none");
          });

        // Y-axis quantity
        chart
          .append("g")
          .attr(
            "transform",
            `translate(${(options.yAxisLabelOrientation === "vertical" ? margin.left + yAxisLabelWidthRef.current.quantity - 20 : yAxisLabelWidthRef.current.left - 60) + xOffsetGlobel}, 0)`,
          )
          .call(
            axisLeft(yBar)
              .ticks(10 * scaleChart[`${options.scale}` as keyof typeof scaleChart])
              .tickFormat((d: any) => {
                if (d >= 1000000) {
                  return d.toExponential(1);
                }
                return d;
              }),
          )
          .selectAll("text")
          .style("font-size", `${nameMaxLength.length >= 30 && options.labelOrientation === "vertical" ? 28 : 23}`);

        // Add bar labels
        if (options.showBarLabels) {
          const dataHasLabel = data.map((item) => {
            return item.showBarLabel ? item : { ...item, quantity: null };
          }) as ProcessedDataItem[];
          chart
            .selectAll(".bar-label")
            .data(dataHasLabel)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("transform", options.columnLabelOrientation === "vertical" ? "" : "rotate(0)")
            .attr(
              "x",
              (d) =>
                x(d.name)! +
                x.bandwidth() / 2 +
                (options.yAxisLabelOrientation === "vertical"
                  ? margin.left + yAxisLabelWidthRef.current.quantity - 20
                  : yAxisLabelWidthRef.current.left - 60) +
                xOffsetGlobel,
            )
            .attr("y", (d) => yBar(d.quantity) - 35)
            .attr("dx", options.columnLabelOrientation === "vertical" ? "0" : "0")
            .attr("dy", (d, i) => {
              if (i === 0 && d.cumulativePercentage >= 82) {
                return options.columnLabelOrientation === "vertical" ? "-0.5em" : "1em";
              }
              return options.columnLabelOrientation === "vertical" ? "-0.2em" : "1em";
            })
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .style("font-size", `${options.columnLabelFontSize}px`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("writing-mode", options.columnLabelOrientation === "vertical" ? "tb" : "lr")
            .text((d) => {
              if (d.quantity >= 1000000) {
                return d.quantity.toExponential(1);
              }
              return d.quantity;
            });
        }

        // Add line labels
        let count100 = data.filter((item) => item.cumulativePercentage === 100).length;

        if (options.showLineLabels) {
          const dataHasLabel = data.map((item) => {
            if (item.cumulativePercentage === 100) {
              count100--;
            }
            return item.showLineLabel
              ? { ...item, cumulativePercentage: !count100 ? null : item.cumulativePercentage }
              : { ...item, cumulativePercentage: null };
          }) as ProcessedDataItem[];

          chart
            .selectAll(".line-label")
            .data(dataHasLabel)
            .enter()
            .append("text")
            .attr("class", "line-label")
            .attr("transform", options.lineLabelOrientation === "vertical" ? "" : "rotate(0)")
            .attr("x", (d, index) => {
              const lineLabelsX =
                x(d.name)! +
                x.bandwidth() +
                (options.yAxisLabelOrientation === "vertical"
                  ? margin.left + yAxisLabelWidthRef.current.quantity - 20
                  : yAxisLabelWidthRef.current.left - 60) +
                xOffsetGlobel;

              return lineLabelsX - (index === 0 ? 12 : 20);
            })
            .attr("y", (d, index) => {
              if (d.cumulativePercentage === null) {
                return -1000;
              }
              return yLine(d.cumulativePercentage) - (index === 0 ? 50 : 30);
            })
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .style("font-size", `${options.lineLabelFontSize}px`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("writing-mode", options.lineLabelOrientation === "vertical" ? "tb" : "lr")
            .text((d) => {
              return d?.cumulativePercentage ? `${d.cumulativePercentage?.toFixed(1)}%` : null;
            });
        }

        // Frame around the chart
        chart
          .append("rect")
          .attr(
            "x",
            (options.yAxisLabelOrientation === "vertical"
              ? margin.left + yAxisLabelWidthRef.current.quantity - 20
              : yAxisLabelWidthRef.current.left - 60) + xOffsetGlobel,
          )
          .attr("y", 0)
          .attr("width", width)
          .attr("height", height)
          .attr("fill", "none")
          .attr("stroke", "black");

        // Y-axis units
        if (options?.resultsT) {
          const xOffset = totalQuantity >= 10000 ? 10 : 0;
          chart
            .append("text")
            .attr("transform", "rotate(0)")
            .attr(
              "transform",
              `translate(${options.yAxisLabelOrientation === "vertical" ? -50 + xOffset : -10 + xOffset},0)`,
            )
            .attr("y", (-120 * options.resultsT.length) / 4)
            .attr(
              "x",
              options.yAxisLabel.length <= 4 && options.yAxisLabelOrientation === "portrait"
                ? -10
                : yAxisLabelWidthRef.current.title / 4 -
                    (options.yAxisUnits.length > 10
                      ? -20
                      : options.yAxisUnits.length > 8
                        ? -25
                        : options.yAxisUnits.length > 4
                          ? -23
                          : options.yAxisUnits.length > 3
                            ? -15
                            : -80),
            )
            .style("text-anchor", "middle")
            .style("font-size", `${options.yAxisUnitSize}`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("fill", "black")
            .call((d) => wrapTextPareto(d, options?.resultsT, "portrait", 2.1, true));
        } else {
          chart
            .append("text")
            .attr("transform", "rotate(0)")
            .style("text-anchor", "middle")
            .style("font-size", `${options.yAxisUnitSize}`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("fill", "black")
            .text(`[ ${options.yAxisUnits} ]`);
        }

        // 累積比率 label (Right)
        chart
          .append("text")
          .attr("transform", options.yAxisLabelOrientation === "vertical" ? "" : "rotate(0)")
          .attr("transform", `translate(${options.yAxisLabelOrientation === "vertical" ? 0 : 10}, 0)`)
          .attr(
            "y",
            (yAxisLabelWidthRef.current.totalH -
              (options.labelOrientation === "vertical" ? wN : 10) -
              yAxisLabelWidthRef.current.heightTitle) /
              2,
          )
          .attr(
            "x",
            (options.yAxisLabelOrientation === "vertical"
              ? width + margin.left + 15
              : yAxisLabelWidthRef.current.left + width - 20) + xOffsetGlobel,
          )
          .attr("dy", options.yAxisLabelOrientation === "vertical" ? "1em" : "-1em")
          .attr("dx", options.yAxisLabelOrientation === "vertical" ? "1em" : "2em")
          .attr("dy", "-1em")
          .style("text-anchor", "middle")
          .style("font-size", `${options.yAxisFontSize}px`)
          .style("font-family", FontFamily[options.fontFamily])
          .style("fill", "black")
          .style("writing-mode", options.yAxisLabelOrientation === "vertical" ? "tb" : "lr")
          .text("累積比率");

        //% Y-axis
        chart
          .append("g")
          .attr(
            "transform",
            `translate(${(options.yAxisLabelOrientation === "vertical" ? margin.left + yAxisLabelWidthRef.current.quantity - 20 : yAxisLabelWidthRef.current.left - 60) + xOffsetGlobel + width},0)`,
          )
          .call(axisRight(yLine).ticks(10 * scaleChart[`${options.scale}` as keyof typeof scaleChart]))
          .selectAll("text")
          .style("font-family", FontFamily[options.fontFamily])
          .style("font-size", `${nameMaxLength.length >= 30 && options.labelOrientation === "vertical" ? 28 : 23}`);

        // % label
        chart
          .append("text")
          .attr("transform", "rotate(0)")
          .attr(
            "transform",
            `translate(${width + (options.yAxisLabelOrientation === "vertical" ? margin.left + yAxisLabelWidthRef.current.quantity + 0 : yAxisLabelWidthRef.current.left - 40) + xOffsetGlobel}, 0)`,
          )
          .attr("y", -11)
          .attr("dy", "-1.23em")
          .attr("dx", "0.5em")
          .style("text-anchor", "middle")
          .style("font-size", `${options.yAxisUnitSize}px`)
          .style("font-family", FontFamily[options.fontFamily])
          .style("fill", "black")
          .text("[ % ]");

        const node = chart.node() as SVGGElement;
        const bbox = node.getBBox();

        const gWidth = bbox.width;
        const gHeight = bbox.height;
        yAxisLabelWidthRef.current.totalW = gWidth;
        yAxisLabelWidthRef.current.totalH = gHeight;
        if (options?.resultsTitle) {
          chart
            .append("text")
            .attr(
              "transform",
              `translate(${options.yAxisLabelOrientation === "vertical" ? 0 : -70},${-(margin.top + yAxisLabelWidthRef.current.heightTitle - 80 + (isLargeScreen ? 0 : 15) + (options.resultsTitle.length >= 3 ? 40 : 0))})`,
            )
            .attr("x", gWidth / 2 - 40)
            .style("text-anchor", "middle")
            .style("font-size", `${options.fontSizeTitle}px`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("fill", "black")
            .style("writing-mode", "lr")
            .call((d) =>
              wrapTextPareto(d, options?.resultsTitle, "portrait", (options.fontSizeTitle / 70) * 40, false),
            );
        } else {
          chart
            .append("text")
            .attr("transform", `translate(${0},${0})`)
            .attr("y", -margin.top + 30)
            .attr("x", 0)
            .style("text-anchor", "middle")
            .style("font-size", `${options.fontSizeTitle}px`)
            .style("font-family", FontFamily[options.fontFamily])
            .style("fill", "black")
            .style("writing-mode", "lr")
            .text(options.title);
        }

        caculationLabelY(gWidth, gHeight, count);
        count++;
      }
    }, [data, totalQuantity, isRender, options.fontFamily]);

    return (
      <>
        {!dowload && (
          <div className="w-24 h-5 overflow-auto invisible">
            <svg
              id="pareto_width"
              className="whitespace-nowrap"
              width={svgRef.current?.clientWidth}
              height={svgRef.current?.clientHeight}
            />
          </div>
        )}
        <div className={`h-full`}>
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox={`0 0 ${yAxisLabelWidthRef.current.totalW ? yAxisLabelWidthRef.current.totalW + 80 : 856 * 1.5} ${yAxisLabelWidthRef.current.totalH ? yAxisLabelWidthRef.current.totalH * 1.2 + 80 : 800 * 1.8}`}
            preserveAspectRatio="xMidYMid meet"
          />
        </div>
      </>
    );
  },
);

export default memo(ParetoChart);
