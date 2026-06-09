const formatSizeFile = (size: number) => {
  if (typeof size !== "number" || size < 0) return "Invalid size";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)}MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(2)}KB`;
  return `${size}B`;
};

export { formatSizeFile };
