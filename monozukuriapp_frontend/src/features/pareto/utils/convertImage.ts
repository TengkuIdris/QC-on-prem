import html2canvas from "html2canvas";
import { ImageExtension } from "../components/SingleMode";

type TypeChart = "pareto" | "fishbone";

export const convertImageToBlob = async (
  element: HTMLElement,
  fileName: string,
  imageExtension: ImageExtension,
  type?: TypeChart,
) => {
  if (fileName === "pareto") {
    element.style.display = "block";
    element.style.position = "absolute";
    element.style.top = "-9999px";
  }
  try {
    if (type === "fishbone") {
      const svgData = new XMLSerializer().serializeToString(element);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      return svgBlob;
    } else {
      return await html2canvas(element).then((canvas) => {
        return canvas.toDataURL(`image/${imageExtension}`);
      });
    }
  } catch (error) {
    return null;
  }
};
