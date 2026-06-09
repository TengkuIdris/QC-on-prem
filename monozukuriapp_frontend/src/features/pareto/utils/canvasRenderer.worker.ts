// canvasRenderer.worker.ts
// Web Worker for rendering SVG to canvas using OffscreenCanvas

interface RenderMessage {
  type: "render";
  svgData: string;
  width: number;
  height: number;
  format: string;
  quality: number;
}

interface RenderResponse {
  type: "success" | "error";
  dataUrl?: string;
  error?: string;
}

self.onmessage = async (e: MessageEvent<RenderMessage>) => {
  const { type, svgData, width, height, format, quality } = e.data;

  if (type === "render") {
    try {
      // Check if OffscreenCanvas is supported
      if (typeof OffscreenCanvas === "undefined") {
        throw new Error("OffscreenCanvas not supported");
      }

      // Create blob from SVG data
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      // Create OffscreenCanvas
      const canvas = new OffscreenCanvas(width * 2, height * 2);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scale for retina
      ctx.scale(2, 2);

      // Load and draw image
      const response = await fetch(url);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);

      ctx.drawImage(bitmap, 0, 0, width, height);

      // Convert to blob
      const resultBlob = await canvas.convertToBlob({
        type: `image/${format}`,
        quality: quality,
      });

      // Convert blob to base64
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });

      URL.revokeObjectURL(url);

      const successResponse: RenderResponse = {
        type: "success",
        dataUrl,
      };
      self.postMessage(successResponse);
    } catch (error) {
      const errorResponse: RenderResponse = {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      self.postMessage(errorResponse);
    }
  }
};

export {};
