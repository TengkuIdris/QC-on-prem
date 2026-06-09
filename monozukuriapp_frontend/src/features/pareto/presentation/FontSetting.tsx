import React from "react";
import { ParetoChartOptions } from "../types";
import { MenuItem, Select } from "@mui/material";
import { MenuProps } from "@/components/chart/GeneralChart";

export const FontTypeSelector = ({
  optionChange,
  value,
  disabled = false,
  handleFormChange,
}: {
  optionChange: (key: keyof ParetoChartOptions, value: any) => void;
  value?: string;
  disabled?: boolean;
  handleFormChange: () => void;
}) => {
  return (
    <>
      <Select
        displayEmpty
        value={value}
        onChange={(e) => {
          optionChange("fontFamily", e.target.value);
          handleFormChange();
        }}
        renderValue={(selected) => {
          if (!selected) {
            return <em>フォント選択</em>;
          }

          return selected;
        }}
        inputProps={{ "aria-label": "Without label" }}
        className="!w-full md:!w-[158px] !h-[40px]"
        disabled={disabled}
        MenuProps={MenuProps}
      >
        <MenuItem value="Arial">Arial</MenuItem>
        <MenuItem value="Meiryo">Meiryo</MenuItem>
        <MenuItem value="MSMINCHO">MS 明朝</MenuItem>
        <MenuItem value="Georgia">Georgia</MenuItem>
        <MenuItem value="Tahoma">Tahoma</MenuItem>
        <MenuItem value="Courier-New">CourierNew</MenuItem>
        <MenuItem value="Trebuchet-MS">TrebuchetMS</MenuItem>
        <MenuItem value="MS Gothic">MSGothic</MenuItem>
        <MenuItem value="TimesNewRoman">TimesNewRoman</MenuItem>
        <MenuItem value="Verdana">Verdana</MenuItem>
        <MenuItem value="Helvetica">Helvetica</MenuItem>
        <MenuItem value="Calibri">Calibri</MenuItem>
        <MenuItem value="NotoSansJP-Regular">NotoSansJP-Regular</MenuItem>
      </Select>
    </>
  );
};
