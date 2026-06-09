"use client";

import * as React from "react";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Spacer } from "./Spacer";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerWithRangeProps {
  className?: string;
  onDateChange?: (date: DateRange | undefined) => void;
  handleFormChange: () => void;
}

export const DatePickerWithRange = ({ className, onDateChange, handleFormChange }: DatePickerWithRangeProps) => {
  const [date, setDate] = React.useState<DateRange | undefined>();

  const handleDateChange = (date: DateRange | undefined) => {
    setDate(date);
    onDateChange?.(date);
    handleFormChange();
  };

  return (
    <div className={cn("grid gap-2 tw-overflow-auto tw-p-1", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}
            id="date"
            variant="outline"
          >
            <CalendarIcon className="h-4 w-4" />
            <Spacer
              size={3}
              type="horizontal"
            />
            {date?.from ? (
              date.to ? (
                <span key={` ${format(date.from, "yyyy年MM月dd日")} 〜 ${format(date.to, "yyyy年MM月dd日")}`}>
                  {format(date.from, "yyyy年MM月dd日")} 〜 {format(date.to, "yyyy年MM月dd日")}
                </span>
              ) : (
                <span key={`${format(date.from, "yyyy年MM月dd日")}`}>{format(date.from, "yyyy年MM月dd日")}</span>
              )
            ) : (
              <span>期間を選択してください</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0"
        >
          <Calendar
            defaultMonth={date?.from}
            initialFocus
            mode="range"
            onSelect={handleDateChange}
            selected={date}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
