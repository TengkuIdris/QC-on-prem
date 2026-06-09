import React, { forwardRef } from "react";
import "react-datepicker/dist/react-datepicker.css";
import ReactDatePicker, { DatePickerProps as ReactDatePickerProps } from "react-datepicker";
import { CalendarIcon, ClockIcon } from "lucide-react";

type DatePickerProps = ReactDatePickerProps;

const CustomTimeInput = ({ value, onChange }: any) => {
  const inputTimeRef = React.useRef<HTMLInputElement>(null);

  const timeValue = React.useMemo(() => {
    if (!value) return "";

    if (typeof value === "string") {
      return value;
    }

    if (value instanceof Date) {
      return value.toTimeString().slice(0, 5);
    }

    if (typeof value === "number") {
      const dateFromNumber = new Date(value);
      return dateFromNumber.toTimeString().slice(0, 5);
    }

    return "";
  }, [value]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value;
    if (onChange && timeString) {
      onChange(timeString);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputTimeRef}
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        className="px-2 py-1 rounded-md border bg-background text-base border-gray-300 focus:border-blue-500"
      />
      <ClockIcon
        className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
        size={20}
        onClick={() => {
          inputTimeRef.current?.showPicker();
        }}
      />
    </div>
  );
};

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>((props: DatePickerProps, ref) => {
  return (
    <div className="relative">
      <ReactDatePicker
        dayClassName={() => "notranslate"}
        className="flex w-full rounded-md border bg-background px-3 py-2 pr-10 h-12 text-base border-gray-300 focus:border-blue-500"
        customTimeInput={<CustomTimeInput />}
        {...(props as any)}
        ref={ref}
        showIcon={false}
      />
      {props.showIcon && (
        <CalendarIcon
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
          size={20}
          onClick={() => {
            const input = document.querySelector(".react-datepicker__input-container input") as HTMLInputElement;
            if (input) {
              input.focus();
            }
          }}
        />
      )}
    </div>
  );
});
