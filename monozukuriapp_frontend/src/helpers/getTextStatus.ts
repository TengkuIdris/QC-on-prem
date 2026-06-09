export type Status = "running" | "waiting_for_input" | "completed" | "error";

export const getTextStatus = (status: Status): string => {
  switch (status) {
    case "running":
      return "実行中";
    case "waiting_for_input":
      return "入力待ち";
    case "completed":
      return "完了";
    case "error":
      return "エラー";
    default:
      return "不明なステータス";
  }
};
