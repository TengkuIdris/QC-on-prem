import { TimeFormatTemplate } from "@/constant/enum";
import { format, isToday } from "date-fns";

export function formatTimeToNow(createAt: Date) {
  if (!createAt) {
    createAt = new Date();
  }
  const time = new Date(createAt).getTime();
  if (isToday(time)) {
    return format(time, TimeFormatTemplate.TIME);
  }
  return format(time, TimeFormatTemplate.DATE_TIME);
}
