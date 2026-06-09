import { useState } from "react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { DateRange } from "react-day-picker";
import { useImageExtension, useTodayDate } from "../../../../features/pareto/hooks";

export const useUserInfo = ({ totalQuantity, userName }: { totalQuantity: number; userName: string }) => {
  const [period, setPeriod] = useState<DateRange | undefined>();
  const { formattedDate } = useTodayDate();
  const { imageExtension } = useImageExtension();
  const handlePeriodChange = (date: DateRange | undefined) => {
    setPeriod(date);
  };

  const formatDateRange = (date: DateRange | undefined) => {
    if (date?.from && date.to) {
      return `${format(date.from, "yyyy年MM月dd日")} 〜 ${format(date.to, "yyyy年MM月dd日")}`;
    } else if (date?.from) {
      return format(date.from, "yyyy年MM月dd日");
    } else {
      return "期間を選択してください";
    }
  };

  const handleSaveUserInfo = async () => {
    const userInfoSnapshot = document.createElement("div");
    userInfoSnapshot.innerHTML = `
      <div style="padding: 16px;">
        <h4 style="font-weight: bold; margin-bottom: 16px;">ユーザー情報</h4>
        <p style="margin-bottom: 8px;">期間:  ${period ? formatDateRange(period) : ""}</p>
        <p style="margin-bottom: 8px;">氏名: ${userName}</p>
        <p style="margin-bottom: 8px;">合計: ${totalQuantity}</p>
        <p>作成日: ${formattedDate}</p>
      </div>
    `;
    document.body.appendChild(userInfoSnapshot);

    const canvas = await html2canvas(userInfoSnapshot);
    const dataURL = canvas.toDataURL(`image/${imageExtension}`);
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `user-info.${imageExtension}`;
    link.click();

    document.body.removeChild(userInfoSnapshot);
  };

  return {
    setPeriod,
    handlePeriodChange,
    handleSaveUserInfo,
    formattedDate,
    period,
  };
};
