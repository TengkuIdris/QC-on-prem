// fontConverter.worker.ts
// Web Worker for converting font URLs to base64

interface ConvertFontMessage {
  type: "convertFonts";
  cssText: string;
  fontFamilies?: string[];
}

interface ConvertFontResponse {
  type: "success" | "error";
  result?: string;
  error?: string;
}

const convertFontUrlsToBase64 = async (cssText: string): Promise<string> => {
  const fontUrlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
  const matches = [...cssText.matchAll(fontUrlRegex)];
  let result = cssText;

  for (const match of matches) {
    const url = match[1];
    try {
      // Skip if already base64
      if (url.startsWith("data:")) continue;

      // Make URL absolute
      const absoluteUrl = new URL(url, self.location.origin).href;

      // Fetch font file
      const response = await fetch(absoluteUrl);
      const blob = await response.blob();

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Replace URL with base64
      result = result.replace(match[0], `url(${base64})`);
    } catch (error) {
      console.warn(`Failed to convert font URL to base64: ${url}`, error);
    }
  }

  return result;
};

self.onmessage = async (e: MessageEvent<ConvertFontMessage>) => {
  const { type, cssText, fontFamilies } = e.data;

  if (type === "convertFonts") {
    try {
      // Filter CSS text to only include specified font families if provided
      let filteredCssText = cssText;
      if (fontFamilies && fontFamilies.length > 0) {
        console.log("Worker received fontFamilies:", fontFamilies);
        console.log("Original CSS length:", cssText.length);

        const fontFaceRules = cssText.split(/@font-face\s*{/).slice(1);
        console.log("Total font-face rules found:", fontFaceRules.length);

        const filteredRules = fontFaceRules.filter((rule) => {
          const fullRule = "@font-face {" + rule;
          return fontFamilies.some((family) => {
            const normalizedFamily = family.replace(/["']/g, "").trim().toLowerCase();
            // Escape special regex characters and use case-insensitive match
            const escapedFamily = normalizedFamily.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const familyRegex = new RegExp(`font-family\\s*:\\s*["']?${escapedFamily}["']?`, "i");
            const matched = familyRegex.test(fullRule.toLowerCase());
            if (matched) {
              console.log("Matched font:", family, "in rule");
            }
            return matched;
          });
        });

        console.log("Filtered rules count:", filteredRules.length);
        filteredCssText = filteredRules.map((rule) => "@font-face {" + rule).join("\n");
        console.log("Filtered CSS length:", filteredCssText.length);
      }

      const result = await convertFontUrlsToBase64(filteredCssText);
      const response: ConvertFontResponse = {
        type: "success",
        result,
      };
      self.postMessage(response);
    } catch (error) {
      const response: ConvertFontResponse = {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      self.postMessage(response);
    }
  }
};

export {};
