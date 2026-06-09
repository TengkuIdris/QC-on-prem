import { select } from "d3";
import GraphemeSplitter from "grapheme-splitter";

export const handleGetHeightLineText = (fontFamily, fontSize) => {
  const svgText = select("#count_width").style("font-size", fontSize).style("font-family", fontFamily);
  const text = svgText.append("text").attr("x", 0).attr("y", 0);
  const tspan = text.append("tspan").attr("x", 0).attr("y", 0).text("ルアドレス");
  const height = tspan.node().getBBox().height;
  text.remove();
  return height;
};

export const countSizeText = (text, parent, fontFamily, fontSize, _height, maxCharsPerLine = 15) => {
  const svgText = select("#count_width").style("font-size", fontSize).style("font-family", fontFamily);
  let width = 0,
    height = 0;
  const wrapText = (selection) => {
    const splitter = new GraphemeSplitter();
    selection.each(function () {
      const text = select(this);
      const textContent = splitter.splitGraphemes(text.text());
      const x = text.attr("x");
      let y = 0;
      text.text(null);

      // const thaiRegex = /([\u0E00-\u0E7F]+)/;
      const results = [];
      for (let i = 0; i < textContent.length; i += maxCharsPerLine) {
        const chunk = textContent.slice(i, i + maxCharsPerLine);
        results.push(chunk.join(""));
      }
      // if (!textContent.includes(" ") || thaiRegex.test(textContent)) {
      //   // Split text into lines with maximum length maxCharsPerLine
      //   for (let i = 0; i < textContent.length; i += maxCharsPerLine) {
      //     const chunk = textContent.slice(i, i + maxCharsPerLine);
      //     results.push(chunk.join(""));
      //   }
      // } else {
      //   // 5 words in a line
      //   const maxWordsPerLine = 5;
      //   const words = textContent.join("").split(" ");
      //   for (let i = 0; i < words.length; i += maxWordsPerLine) {
      //     const chunk = words.slice(i, i + maxWordsPerLine);
      //     results.push(chunk.join(" "));
      //   }
      // }

      parent.results = results;
      results.forEach((d, index) => {
        text
          .append("tspan")
          .attr("x", x)
          .attr("y", y + index * _height)
          .text(d);
      });
    });
  };
  const textElement = svgText.append("text").attr("x", 10).attr("y", 20).text(text).call(wrapText);
  const size = textElement.node().getBBox();
  height = size.height;
  width = size.width;
  textElement.remove();

  return { width, height };
};
const wrapText = (selection, { results, height }) => {
  selection.each(function () {
    const text = select(this);
    const x = text.attr("x");
    let y = Number(text.attr("y"));

    results.forEach((d, index) => {
      text
        .append("tspan")
        .attr("x", x)
        .attr("y", y + index * height + 15)
        .text(d);
    });
  });
};

export const checkHeightRootText = (name, fontFamily, fontSize) => {
  const svgText = select("#count_width").style("font-size", fontSize).style("font-family", fontFamily);
  const textGroup = svgText
    .append("g")
    .style("writing-mode", "vertical-lr")
    .style("word-break", "break-all")
    .style("text-align", "center");

  const padding = 5;

  const textElement = textGroup
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .text(name)
    .attr("class", "main-effect")
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle");
  const bbox = textElement.node().getBBox();

  textGroup
    .append("rect")
    .attr("x", bbox.x - (padding + 1))
    .attr("y", bbox.y)
    .attr("width", bbox.width + padding * 2)
    .attr("height", bbox.height + padding * 2)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", "1px");

  const size = textGroup.node().getBBox();
  const height = size.height;
  const width = size.width;
  textGroup.remove();
  textElement.remove();
  return { height, width };
};

function initializeSVG(width, height) {
  select("#diagram").select("svg").remove();
  return select("#diagram")
    .append("svg")
    .attr("viewBox", `0 0 ${width + 200} ${height + 100}`)
    .style("background-color", "#fff")
    .attr("preserveAspectRatio", "xMidYMid meet");
}

export const createFishboneDiagram = (
  data,
  selectedFont,
  rootFontSize,
  firstChildFontSize,
  otherChildFontSize,
  firstChild,
  otherChild,
) => {
  const svg = initializeSVG(data.width, data.height).style("font-family", selectedFont);
  const textGroup = svg.append("g");
  const text = data.name;

  // Increase padding for monospace fonts like Courier-New
  // Check for various monospace font name variations
  const isMonospaceFont = selectedFont && (
    selectedFont.includes("Courier") ||
    selectedFont.includes("Courier-New") ||
    selectedFont.includes("Courier New")
  );
  const padding = isMonospaceFont ? 10 : 5;

  const textTemp = svg
    .append("text")
    .attr("x", data.line.x2)
    .attr("y", data.line.y1)
    .text(text)
    .style("writing-mode", "vertical-lr")
    .style("font-size", rootFontSize);
  const { width, height } = textTemp.node().getBBox();
  textTemp.remove();

  // Add extra width buffer for monospace fonts to prevent text overflow
  const widthBuffer = isMonospaceFont ? width * 0.1 : 0;
  const adjustedWidth = width + widthBuffer;

  textGroup.attr("transform", `translate(${data.line.x2 + 2 * padding + adjustedWidth / 2}, ${data.line.y1})`);

  textGroup
    .append("text")
    .attr("x", -1)
    .attr("y", 0)
    .text(text)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("writing-mode", "vertical-lr")
    .style("font-size", rootFontSize);

  textGroup
    .append("rect")
    .attr("x", -adjustedWidth / 2 - padding)
    .attr("y", -height / 2 - padding)
    .attr("width", adjustedWidth + 2 * padding)
    .attr("height", height + 2 * padding)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", "1px");

  textGroup
    .append("path")
    .attr(
      "d",
      `M${-adjustedWidth / 2 - padding - 15},${-12} L${-adjustedWidth / 2 - padding},${0} L${-adjustedWidth / 2 - padding - 15},${12} Z`,
    )
    .attr("fill", "black");
  svg
    .append("line")
    .attr("x1", data.line.x1)
    .attr("y1", data.line.y1)
    .attr("x2", data.line.x2)
    .attr("y2", data.line.y2)
    .attr("stroke", "black")
    .attr("stroke-width", 3);

  const render = (children) => {
    children.forEach((child) => {
      svg
        .append("line")
        .attr("x1", child.line.x1)
        .attr("y1", child.line.y1)
        .attr("x2", child.line.x2)
        .attr("y2", child.line.y2)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

      const directionConfig = {
        southEast: { angle: 30, x: -2.5, y: -4.5 },
        northEast: { angle: 30, x: -2.5, y: 4.5 },
        west: { angle: 30, x: 4.5, y: 0 },
        east: { angle: 90, x: -4.5, y: 0 },
        northWest: { angle: 90, x: 2, y: 4 },
        southWest: { angle: 90, x: 2, y: -4 },
      };

      const { angle, x, y } = directionConfig[child.direction] || { angle: 0, x: 0, y: 0 };
      let childLineX1 = child.line.x1 + x;
      let childLineY1 = child.line.y1 + y;

      svg;
      svg
        .append("path")
        .attr("d", "M0,-5 L4.33,2.5 L-4.33,2.5 Z")
        .attr("fill", "black")
        .attr("transform", `translate(${childLineX1},${childLineY1}) rotate(${angle})`);
      svg
        .append("text")
        .attr("x", child.text.x)
        .attr("y", child.text.y)
        .attr("class", "text")
        .style("font-size", child.level > 1 ? otherChildFontSize : firstChildFontSize)
        .call(wrapText, {
          results: child.text.results,
          height: child.level > 1 ? otherChild : firstChild,
        });

      if (child.children?.length) {
        render(child.children);
      }
    });
  };
  render(data.children);

  // CRITICAL FIX: Recalculate viewBox after rendering to include ALL nodes
  // This ensures no nodes are clipped regardless of tree size or text length
  const svgElement = select("#diagram svg");
  if (svgElement.node()) {
    try {
      const bbox = svgElement.node().getBBox();

      // Use larger padding (40-50%) to handle long text nodes
      // Text wrapping can make nodes taller/wider than calculated
      const paddingX = Math.max(300, bbox.width * 0.4);
      const paddingY = Math.max(250, bbox.height * 0.4);

      const newX = bbox.x - paddingX;
      const newY = bbox.y - paddingY;
      const newWidth = bbox.width + paddingX * 2;
      const newHeight = bbox.height + paddingY * 2;

      svgElement.attr("viewBox", `${newX} ${newY} ${newWidth} ${newHeight}`);
    } catch (error) {
      console.warn("Could not recalculate viewBox:", error);
    }
  }
};
