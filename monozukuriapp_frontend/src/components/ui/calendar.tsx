import * as React from "react";

import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, ClassNames } from "react-day-picker";
import "react-day-picker";

import { buttonVariants } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  classNames?: ClassNames;
  showOutsideDays?: boolean;
};

const Calendar = ({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) => {
  // const formatCaption: any = (date: any, options: any) => {
  //   const y = format(date, "yyyy");
  //   const m = format(date, "MM", { locale: options?.locale });
  //   return `${y}年${m}月`;
  // };
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: "p-0 opacity-50 hover:opacity-100 bg-[#fff]",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1 bg-white",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "notranslate h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 !bg-white",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 bg-white"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground bg-white",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      // formatters={{ formatCaption }}
      locale={enUS}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
};
Calendar.displayName = "Calendar";

export { Calendar };
