// export.ts

import { ImageExtension } from "../components/SingleMode";
import { Node } from "@/store/slices/treeSlice";
import FontConverterWorker from "@/features/pareto/utils/fontConverter.worker?worker";
import CanvasRendererWorker from "@/features/pareto/utils/canvasRenderer.worker?worker";

const svgToCanvasWithWorker = async (svgData: string, width: number, height: number): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const worker = new CanvasRendererWorker();
    worker.onmessage = (e: MessageEvent) => {
      const { type, dataUrl, error } = e.data;
      if (type === "success" && dataUrl) {
        const canvas = document.createElement("canvas");
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
        };
        img.onerror = reject;
        img.src = dataUrl;
      } else {
        reject(new Error(error || "Canvas rendering failed"));
      }
    };
    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };
    worker.postMessage({
      type: "render",
      svgData,
      width,
      height,
      format: "png",
      quality: 1,
    });
  });
};

const svgToCanvasMainThread = async (svgData: string, width: number, height: number): Promise<HTMLCanvasElement> => {
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      URL.revokeObjectURL(url);
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2); // Retina

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };

    img.src = url;
  });
};

const getUsedFontFamilies = (element: HTMLElement): string[] => {
  const fontFamilies = new Set<string>();

  const elements = [element, ...element.querySelectorAll("*")];
  elements.forEach((el) => {
    const computed = window.getComputedStyle(el as HTMLElement);
    const fontFamily = computed.fontFamily;
    if (fontFamily) {
      fontFamily.split(",").forEach((font) => {
        const cleaned = font.trim().replace(/["']/g, "");
        fontFamilies.add(cleaned);
      });
    }
  });
  return Array.from(fontFamilies);
};

const convertFontUrlsToBase64 = async (cssText: string, fontFamilies?: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create worker
    const worker = new FontConverterWorker();

    //Handle response from worker
    worker.onmessage = (e: MessageEvent) => {
      const { type, result, error } = e.data;
      if (type === "success" && result) {
        resolve(result);
      } else {
        reject(new Error(error || "Font conversion failed"));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    // Post message to worker
    worker.postMessage({
      type: "convertFonts",
      cssText,
      fontFamilies,
    });
  });
};

const getFontFaceRules = async (element: HTMLElement, fontFamily?: string): Promise<string> => {
  try {
    let usedFonts: string[] = [];
    if (fontFamily) {
      usedFonts = [fontFamily];
    } else {
      usedFonts = getUsedFontFamilies(element);
    }
    if (usedFonts.length === 0) {
      return "";
    }
    // Get all @font-face rules from document stylesheets
    const fontFaces = Array.from(document.styleSheets)
      .flatMap((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules || []);
        } catch (e) {
          return [];
        }
      })
      .filter((rule) => rule instanceof CSSFontFaceRule)
      .map((rule) => rule.cssText)
      .join("\n");

    return await convertFontUrlsToBase64(fontFaces, usedFonts);
  } catch (error) {
    console.error("Error getting font-face rules:", error);
    return "";
  }
};

const svgToCanvas = async (element: HTMLElement, fontFamily?: string): Promise<HTMLCanvasElement> => {
  // Search for the SVG element within the provided HTMLElement
  const svgElement = element.querySelector("svg") || (element as any);
  if (!svgElement) {
    throw new Error("SVG element not found");
  }

  // Clone the SVG element to avoid modifying the original
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

  // Get dimensions
  const box = svgClone.getBoundingClientRect();
  const width = box.width || svgElement.clientWidth;
  const height = box.height || svgElement.clientHeight;

  // Set width and height attributes
  svgClone.setAttribute("width", `${width}px`);
  svgClone.setAttribute("height", `${height}px`);

  // Force font family style on SVG root
  if (fontFamily) {
    const textElements = svgClone.querySelectorAll("text, tspan");
    textElements.forEach((textEl) => {
      (textEl as HTMLElement).style.fontFamily = fontFamily;
    });
  }

  // Embed font family to SVG
  const fontFaces = await getFontFaceRules(element, fontFamily);
  if (fontFaces) {
    let defs = svgClone.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgClone.insertBefore(defs, svgClone.firstChild);
    }
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = fontFaces;
    defs.appendChild(style);
  }

  // Serialize SVG to string
  const svgData = new XMLSerializer().serializeToString(svgClone);

  // Try worker-based rendering first
  try {
    return await svgToCanvasWithWorker(svgData, width, height);
  } catch (error) {
    return await svgToCanvasMainThread(svgData, width, height);
  }
};

export const saveAsPNG = async (
  element: HTMLElement,
  fileName: string,
  imageExtension: ImageExtension,
  fontFamily?: string,
) => {
  try {
    await document.fonts.ready;

    const canvas = await svgToCanvas(element, fontFamily);
    const dataUrl = canvas.toDataURL(`image/${imageExtension}`, imageExtension === "jpeg" ? 0.95 : 1);

    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Error converting to image:", error);
    throw error;
  }
};

export const downloadCanvas = (canvas: HTMLCanvasElement, fileName: string, imageExtension: ImageExtension) => {
  const link = document.createElement("a");
  link.href = canvas.toDataURL(`image/${imageExtension}`);
  link.download = fileName;
  link.click();
};

// Import font files - Vite will handle these as assets
import NotoSansJPFont from "@/assets/fonts/NotoSansJP-Regular.ttf?url";
import MSGothicFont from "@/assets/fonts/MS Gothic.ttf?url";
import ArialFont from "@/assets/fonts/arialceb.ttf?url";
import MeiryoFont from "@/assets/fonts/Meiryo.ttf?url";
import MSMINCHOFont from "@/assets/fonts/MSMINCHO.TTF?url";
import TahomaFont from "@/assets/fonts/tahoma.ttf?url";
import CourierNewFont from "@/assets/fonts/Courier-New.ttf?url";
import TrebuchetMSFont from "@/assets/fonts/Trebuchet-MS.ttf?url";
import VerdanaFont from "@/assets/fonts/verdana.ttf?url";
import GeorgiaFont from "@/assets/fonts/Georgia.ttf?url";
import HelveticaFont from "@/assets/fonts/Helvetica.ttf?url";
import CalibriFont from "@/assets/fonts/calibri-regular.ttf?url";
import TimesNewRomanFont from "@/assets/fonts/times-new-roman.ttf?url";
import HiraginoSquareGothicFont from "@/assets/fonts/HiraginoSquareGothic.ttc?url";
import TravelToMingDynastyFont from "@/assets/fonts/TravelToMingDynasty.ttf?url";

// Map font family names to font file URLs
const fontFileMap: Record<string, string> = {
  NotoSansJP: NotoSansJPFont,
  MSGothic: MSGothicFont,
  Arial: ArialFont,
  Meiryo: MeiryoFont,
  MSMINCHO: MSMINCHOFont,
  Tahoma: TahomaFont,
  "Courier-New": CourierNewFont,
  "Trebuchet-MS": TrebuchetMSFont,
  Verdana: VerdanaFont,
  Georgia: GeorgiaFont,
  Helvetica: HelveticaFont,
  Calibri: CalibriFont,
  "times-new-roman": TimesNewRomanFont,
  HiraginoSquareGothic: HiraginoSquareGothicFont,
  TravelToMingDynasty: TravelToMingDynastyFont,
};

// Load font file and convert to base64
const loadFontAsBase64 = async (fontUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(fontUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch font: ${fontUrl}, status: ${response.status}`);
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix if present
        const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to load font ${fontUrl}:`, error);
    return null;
  }
};

// Extract font family from SVG element
const getFontFamilyFromSVG = (svgElement: HTMLElement): string | null => {
  // Try to get font-family from SVG element's style attribute
  const styleAttr = svgElement.getAttribute("style");
  if (styleAttr) {
    const fontFamilyMatch = styleAttr.match(/font-family:\s*['"]?([^'";,]+)['"]?/i);
    if (fontFamilyMatch) {
      const fontFamily = fontFamilyMatch[1].trim();
      // Map display names to font keys
      const fontNameMap: Record<string, string> = {
        "Noto Sans Japanese（ノト サンズ）": "NotoSansJP",
        "Noto Sans Japanese": "NotoSansJP",
        "MS ゴシック": "MSGothic",
        "メイリオ": "Meiryo",
        "MS 明朝": "MSMINCHO",
        "TimesNewRoman": "times-new-roman",
        "ヒラギノ角ゴシック": "HiraginoSquareGothic",
        "游明朝": "TravelToMingDynasty",
      };
      return fontNameMap[fontFamily] || fontFamily;
    }
  }

  // Try to get from computed style of SVG element
  const computedStyle = window.getComputedStyle(svgElement);
  let fontFamily = computedStyle.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
  
  // Map display names to font keys
  const fontNameMap: Record<string, string> = {
    "Noto Sans Japanese（ノト サンズ）": "NotoSansJP",
    "Noto Sans Japanese": "NotoSansJP",
    "MS ゴシック": "MSGothic",
    "メイリオ": "Meiryo",
    "MS 明朝": "MSMINCHO",
    "TimesNewRoman": "times-new-roman",
    "ヒラギノ角ゴシック": "HiraginoSquareGothic",
    "游明朝": "TravelToMingDynasty",
  };
  fontFamily = fontNameMap[fontFamily] || fontFamily;

  // Try to get from first text element if SVG element doesn't have font-family
  if (!fontFamily || fontFamily === "inherit") {
    const firstText = svgElement.querySelector("text");
    if (firstText) {
      const textComputedStyle = window.getComputedStyle(firstText);
      fontFamily = textComputedStyle.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
      fontFamily = fontNameMap[fontFamily] || fontFamily;
    }
  }

  return fontFamily && fontFamily !== "inherit" ? fontFamily : null;
};

// Embed font into SVG
const embedFontInSVG = async (svgString: string, fontFamily: string | null): Promise<string> => {
  if (!fontFamily || !fontFileMap[fontFamily]) {
    return svgString;
  }

  const fontPath = fontFileMap[fontFamily];
  const base64Font = await loadFontAsBase64(fontPath);

  if (!base64Font) {
    return svgString;
  }

  // Parse SVG
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.documentElement;

  // Check if defs already exists
  let defs = svgElement.querySelector("defs");
  if (!defs) {
    defs = svgDoc.createElementNS("http://www.w3.org/2000/svg", "defs");
    svgElement.insertBefore(defs, svgElement.firstChild);
  }

  // Create style element with @font-face
  const style = svgDoc.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    @font-face {
      font-family: '${fontFamily}';
      src: url(data:font/truetype;charset=utf-8;base64,${base64Font}) format('truetype');
      font-weight: normal;
      font-style: normal;
    }
  `;
  defs.appendChild(style);

  // Serialize back to string
  return new XMLSerializer().serializeToString(svgDoc);
};

export const saveAsPNGFishbone = async (
  element: HTMLElement,
  fileName: string,
  imageExtension: ImageExtension,
  selectedFont?: string,
) => {
  // Wait for fonts to be loaded
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    try {
      await document.fonts.ready;
    } catch (error) {
      console.warn("Font loading error:", error);
    }
  }

  // Get font family from parameter or SVG
  let fontFamily = selectedFont || getFontFamilyFromSVG(element);
  
  // Map font display names to font keys if needed
  if (fontFamily) {
    const fontNameMap: Record<string, string> = {
      "Noto Sans Japanese（ノト サンズ）": "NotoSansJP",
      "Noto Sans Japanese": "NotoSansJP",
      "MS ゴシック": "MSGothic",
      "メイリオ": "Meiryo",
      "MS 明朝": "MSMINCHO",
      "TimesNewRoman": "times-new-roman",
      "ヒラギノ角ゴシック": "HiraginoSquareGothic",
      "游明朝": "TravelToMingDynasty",
    };
    fontFamily = fontNameMap[fontFamily] || fontFamily;
  }

  // Serialize SVG
  let svgData = new XMLSerializer().serializeToString(element);

  // Embed font into SVG
  if (fontFamily) {
    svgData = await embedFontInSVG(svgData, fontFamily);
  }

  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const img = new Image();

  img.onload = () => {
    canvas.width = element.clientWidth || element.getBoundingClientRect().width;
    canvas.height = element.clientHeight || element.getBoundingClientRect().height;
    context?.drawImage(img, 0, 0);
    downloadCanvas(canvas, fileName, imageExtension);
    URL.revokeObjectURL(url);
  };
  img.onerror = (error) => {
    console.error("Image load error:", error);
    URL.revokeObjectURL(url);
  };
  img.src = url;
};

const convertToCSV = (data: any) => {
  return data.map((row: any) => row.join(",")).join("\n");
};

export const saveAsCSV = (data: { name: string; quantity: number }[], fileName: string) => {
  const dt = data.reduce((acc: any, item: any) => {
    acc.push([item.name, item.quantity]);
    return acc;
  }, []);
  const csvContent = "\uFEFF" + convertToCSV([["項目名,数量"], ...dt]);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const encodedUri = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const saveAsCSVFishBone = (data: Node, fileName: string) => {
  let blob = new Blob([JSON.stringify(data)], { type: "text/csv" });
  let url = window.URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
};
