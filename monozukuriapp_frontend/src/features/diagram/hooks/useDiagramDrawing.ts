import { useEffect, useCallback, useMemo } from "react";
import { select, Selection } from "d3-selection";
import { Bone, Thickness } from "../types";

interface DrawingOptions {
  largeBoneLength: number;
  mediumBoneLength: number;
  smallBoneLength: number;
  largeAngle: number;
  mediumAngleOffset: number;
  smallAngleOffset: number;
  textBoxWidth: number;
  textBoxHeight: number;
}

const defaultOptions: DrawingOptions = {
  largeBoneLength: 100,
  mediumBoneLength: 50,
  smallBoneLength: 25,
  largeAngle: 75,
  mediumAngleOffset: 30,
  smallAngleOffset: 15,
  textBoxWidth: 80,
  textBoxHeight: 20,
};

export const useDiagramDrawing = (
  svgRef: React.RefObject<SVGSVGElement>,
  width: number,
  height: number,
  thickness: Thickness,
  characteristic: string,
  largeBones: Bone[],
  mediumBones: Bone[][],
  smallBones: Bone[][][],
  options: Partial<DrawingOptions> = {},
) => {
  const mergedOptions = useMemo(() => ({ ...defaultOptions, ...options }), [options]);

  const drawBone = useCallback(
    (
      g: Selection<SVGGElement, unknown, null, undefined>,
      x: number,
      y: number,
      length: number,
      angle: number,
      color: string,
      strokeWidth: number,
    ) => {
      const radians = (angle * Math.PI) / 180;
      const endX = x + length * Math.cos(radians);
      const endY = y + length * Math.sin(radians);

      g.append("line")
        .attr("x1", x)
        .attr("y1", y)
        .attr("x2", endX)
        .attr("y2", endY)
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth);

      return { endX, endY };
    },
    [],
  );

  const drawBoneWithText = useCallback(
    (
      g: Selection<SVGGElement, unknown, null, undefined>,
      x: number,
      y: number,
      length: number,
      angle: number,
      text: string,
      color: string,
      strokeWidth: number,
      isLargeBone: boolean = false,
    ) => {
      const { textBoxWidth, textBoxHeight } = mergedOptions;
      const radians = (angle * Math.PI) / 180;
      let endX, endY, textBoxX, textBoxY;

      if (isLargeBone) {
        // 大骨の場合、テキストボックスの位置を計算
        const textBoxOffset = angle > 0 ? textBoxHeight / 2 : -textBoxHeight / 2;
        textBoxX = x + (length - textBoxWidth / 2) * Math.cos(radians);
        textBoxY = y + (length - textBoxWidth / 2) * Math.sin(radians) - textBoxOffset;

        // 大骨の終点をテキストボックスの中心に設定
        endX = textBoxX + textBoxWidth / 2;
        endY = angle > 0 ? textBoxY + textBoxHeight : textBoxY;
      } else {
        // 中骨、小骨の場合
        const result = drawBone(g, x, y, length, angle, color, strokeWidth);
        endX = result.endX;
        endY = result.endY;
      }

      if (isLargeBone) {
        // テキストボックスを描画
        g.append("rect")
          .attr("x", textBoxX || 0)
          .attr("y", textBoxY || 0)
          .attr("width", textBoxWidth)
          .attr("height", textBoxHeight)
          .attr("fill", "white")
          .attr("stroke", color)
          .attr("stroke-width", 1);

        // テキストを描画
        g.append("text")
          .attr("x", (textBoxX || 0) + textBoxWidth / 2)
          .attr("y", (textBoxY || 0) + textBoxHeight / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .text(text);

        // 大骨を描画
        drawBone(g, x, y, length, angle, color, strokeWidth);
      } else {
        // 中骨、小骨のテキスト描画
        g.append("text")
          .attr("x", endX)
          .attr("y", endY)
          .attr("text-anchor", angle > 0 ? "start" : "end")
          .attr("dominant-baseline", "middle")
          .attr("transform", `rotate(${angle}, ${endX}, ${endY})`)
          .text(text);
      }
    },
    [drawBone, mergedOptions],
  );

  useEffect(() => {
    if (!svgRef?.current) return;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous rendering

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw backbone
    drawBone(g, 0, contentHeight / 2, contentWidth, 0, "black", thickness.backbone);

    // Draw characteristic (vertical text at the end of backbone)
    g.append("text")
      .attr("x", contentWidth)
      .attr("y", contentHeight / 2)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "middle")
      .attr("transform", `rotate(90, ${contentWidth}, ${contentHeight / 2})`)
      .text(characteristic);

    // Draw large bones
    largeBones.forEach((bone, index) => {
      const x = (index + 1) * (contentWidth / (largeBones.length + 1));
      const y = contentHeight / 2;
      const angle = index % 2 === 0 ? -mergedOptions.largeAngle : mergedOptions.largeAngle;

      drawBoneWithText(g, x, y, mergedOptions.largeBoneLength, angle, bone.text, "black", thickness.largeBone, true);

      // Draw medium bones
      if (mediumBones[index]) {
        mediumBones[index].forEach((mediumBone, mediumIndex) => {
          const mediumX = x + (mediumIndex + 1) * 20 * (index % 2 === 0 ? -1 : 1);
          const mediumY = y + (mediumIndex + 1) * 20 * (index % 2 === 0 ? -1 : 1);
          const mediumAngle =
            angle + (index % 2 === 0 ? -mergedOptions.mediumAngleOffset : mergedOptions.mediumAngleOffset);

          drawBoneWithText(
            g,
            mediumX,
            mediumY,
            mergedOptions.mediumBoneLength,
            mediumAngle,
            mediumBone.text,
            "black",
            thickness.mediumBone,
          );

          // Draw small bones
          if (smallBones[index] && smallBones[index][mediumIndex]) {
            smallBones[index][mediumIndex].forEach((smallBone, smallIndex) => {
              const smallX = mediumX + (smallIndex + 1) * 10 * (index % 2 === 0 ? -1 : 1);
              const smallY = mediumY + (smallIndex + 1) * 10 * (index % 2 === 0 ? -1 : 1);
              const smallAngle =
                mediumAngle + (index % 2 === 0 ? -mergedOptions.smallAngleOffset : mergedOptions.smallAngleOffset);

              drawBoneWithText(
                g,
                smallX,
                smallY,
                mergedOptions.smallBoneLength,
                smallAngle,
                smallBone.text,
                "black",
                thickness.smallBone,
              );
            });
          }
        });
      }
    });
  }, [
    svgRef,
    width,
    height,
    thickness,
    characteristic,
    largeBones,
    mediumBones,
    smallBones,
    drawBone,
    drawBoneWithText,
    mergedOptions,
  ]);
};
