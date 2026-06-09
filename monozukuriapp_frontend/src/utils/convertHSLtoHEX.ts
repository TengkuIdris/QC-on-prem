export function colorToHex(color: any) {
  if (!color) return "";
  // If already hex
  if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) return color;
  // If rgb or rgba
  const rgbMatch = color.match(/^rgb(a?)\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[2].split(",").map((x: any) => parseFloat(x));
    const r = Math.round(parts[0]);
    const g = Math.round(parts[1]);
    const b = Math.round(parts[2]);
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  // If hsl or hsla
  const hslMatch = color.match(/^hsl(a?)\(([^)]+)\)$/);
  if (hslMatch) {
    let [h, s, l] = hslMatch[2].split(",").map((x: any) => x.trim());
    h = parseFloat(h);
    s = parseFloat(s) / 100;
    l = parseFloat(l) / 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h / 360 + 1 / 3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1 / 3);
    }
    return (
      "#" +
      [r, g, b]
        .map((x) =>
          Math.round(x * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
  // fallback
  return color;
}
