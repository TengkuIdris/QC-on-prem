export const useTodayDate = (): { formattedDate: string } => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const formattedDate = formatter.format(now).replace(/(\d{4})\/(\d{2})\/(\d{2})/, "$1年$2月$3日");

  return { formattedDate };
};
