export const formatDateJP = (date: Date, options?: Intl.DateTimeFormatOptions) =>
  date.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", ...options });
