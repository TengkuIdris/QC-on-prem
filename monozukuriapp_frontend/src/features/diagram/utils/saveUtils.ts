export const saveDiagramAsImage = async (svgElement: SVGSVGElement | null): Promise<void> => {
  if (!svgElement) {
    throw new Error("SVG element not found");
  }

  try {
    // Convert SVG to a data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create an Image object and wait for it to load
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = svgUrl;
    });

    // Create a canvas and draw the image
    const canvas = document.createElement("canvas");
    canvas.width = svgElement.clientWidth;
    canvas.height = svgElement.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create canvas context");
    }
    ctx.drawImage(img, 0, 0);

    // Convert canvas to PNG
    const pngUrl = canvas.toDataURL("image/png");

    // Create a download link and trigger the download
    const link = document.createElement("a");
    link.download = `fishbone_diagram_${new Date().toISOString()}.png`;
    link.href = pngUrl;
    link.click();

    // Clean up
    URL.revokeObjectURL(svgUrl);
  } catch (error) {
    console.error("Error saving diagram as image:", error);
    throw error;
  }
};
