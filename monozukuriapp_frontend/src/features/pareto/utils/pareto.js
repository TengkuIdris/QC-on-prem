import { select } from "d3";
export const wrapTextPareto = (selection, results, orientation, k, has, align = "center") => {
  selection.each(function () {
    const text = select(this);
    const x = text.attr("x");
    let y = Number(text.attr("y"));

    results.forEach((d, index) => {
      text
        .append("tspan")
        .attr("dy", orientation === "portrait" ? index * k : 0)
        .attr("dx", orientation === "portrait" ? 0 : index * k)
        .attr("x", orientation === "portrait" ? x : x + index * 30)
        .attr("y", orientation === "portrait" ? y + index * 30 : y)
        .attr("text-anchor", align)
        .text(
          index === 0
            ? `${has ? `[` : ""} ${d} ${results.length === 1 && has ? "]" : ""}`
            : index === results.length - 1
              ? `${d} ${has ? "]" : ""}`
              : d,
        );
    });
  });
};

export const countSizeTextPareto = (text, parent, font, key, orientation, _maxWidthText, value) => {
  const svgText = select("#pareto_width");
  let width = 0,
    height = 0;

  const toGraphemes = (str) => {
    return Array.from(str);
  };

  const wrapText = (selection, _width) => {
    selection.each(function () {
      const text = select(this);
      const originalText = text.text();
      const chars = toGraphemes(originalText);
      const x = text.attr("x");
      let y = 0;
      text.text(null);

      let results = [];
      let currentLine = [];
      const tspan = text.append("tspan").attr("x", x).attr("y", y);

      for (let i = 0; i < chars.length; i++) {
        const testLine = [...currentLine, chars[i]].join("");
        tspan.text(testLine);

        if (tspan.node().getComputedTextLength() > _width) {
          if (currentLine.length === 0) {
            currentLine.push(chars[i]);
          }
          results.push(currentLine.join(""));
          currentLine = currentLine.length === 0 ? [] : [chars[i]];
        } else {
          currentLine.push(chars[i]);
        }
      }

      if (currentLine.length > 0) {
        results.push(currentLine.join(""));
      }

      tspan.remove();
      parent[key] = results;

      results.forEach((line, index) => {
        text
          .append("tspan")
          .attr("x", orientation === "portrait" ? x : x + index * 30)
          .attr("y", orientation === "portrait" ? y + index * 30 : y)
          .attr("dy", orientation === "portrait" ? 30 : 0)
          .text(line);
      });
    });
  };

  const textElement = svgText
    .append("text")
    .attr("x", 40)
    .attr("y", 30)
    .style("font-size", `${font}px`)
    .text(text)
    .call(wrapText, _maxWidthText);
  const size = textElement.node().getBBox();
  height = size.height;
  width = size.width;
  textElement.remove();

  return { width, height };
};
