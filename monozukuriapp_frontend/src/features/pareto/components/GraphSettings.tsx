import React, { useContext, useEffect, useReducer, useRef, useState } from "react";
import { Grid, Typography, Slider, TextField, Switch } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { ParetoChartOptions, ProcessedDataItem } from "../types";
import { Mark } from "@mui/material/Slider/useSlider.types";
import { Field } from "formik";
import { useAppSelector } from "@/store/redux";
import { RootState } from "@/store/store";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { AdjustFontSizeContext } from "../provider";
import event from "@/utils/eventEmitter";
import { EventType } from "@/constant/enum";

interface GraphSettingsProps {
  options: ParetoChartOptions;
  onOptionChange: (key: keyof ParetoChartOptions, value: any) => void;
  type?: "SINGLE" | "COMPARE";
  data: ProcessedDataItem[];
  handleFormChange: () => void;
  eventType: EventType;
}

type Action = {
  type: "UPDATE_OPTION" | "UPDATE_ALL";
  key: keyof ParetoChartOptions | string;
  value: any;
  data?: ParetoChartOptions;
};

export function reducer(state: ParetoChartOptions, action: Action): ParetoChartOptions {
  switch (action.type) {
    case "UPDATE_OPTION":
      return { ...state, [action.key]: action.value };
    case "UPDATE_ALL":
      return { ...state, ...action.data };
    default:
      return state;
  }
}

const OptionSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  marks?: boolean | Mark[];
  className?: string;
}> = ({ label, value, onChange, min, max, step = 1, disabled = false, marks = true, className }) => {
  return (
    <Grid
      item
      xs={12}
      sm={12}
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Typography
        gutterBottom
        className="font-semibold 2xl:w-[60%] 4xl:w-[36%] !text-[14px]"
      >
        {label}
      </Typography>
      <Slider
        className={className}
        value={value}
        onChange={(_, newValue) => onChange(newValue as number)}
        valueLabelDisplay="auto"
        step={step}
        marks={marks}
        min={min}
        max={max}
        disabled={disabled}
      />
    </Grid>
  );
};

const GraphSettings: React.FC<GraphSettingsProps> = ({
  options,
  onOptionChange,
  type = "COMPARE",
  handleFormChange,
  eventType,
}) => {
  const [state, dispatch] = useReducer(reducer, options);
  const colorRef = useRef<any>(null);
  const [toggleSetting, setToggleSetting] = useState({
    lineGraph: false,
    textSize: false,
    scorpion: false,
  });
  const { handleUserAdjust } = useContext(AdjustFontSizeContext);

  const handleOptionChange = (key: keyof ParetoChartOptions, value: any) => {
    dispatch({ type: "UPDATE_OPTION", key, value });
    onOptionChange(key, value);
  };
  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const chose_size = userRole?.PARENTO_CREATE_PAGE;
  const chose_color = userRole?.PARENTO_CHOOSE_COLOR_TEXT;
  useEffect(() => {
    type === "SINGLE" && dispatch({ type: "UPDATE_ALL", key: "", value: null, data: options });
    const handleOptionChange = (fontSize: number) => {
      dispatch({
        type: "UPDATE_ALL",
        key: "",
        value: null,
        data: { ...options, lineLabelFontSize: fontSize, columnLabelFontSize: fontSize },
      });
    };
    event.on(eventType, handleOptionChange);
    return () => {
      event.removeListener(eventType, handleOptionChange);
    };
  }, [options]);

  return (
    <>
      <Typography
        variant="h6"
        gutterBottom
      >
        グラフ詳細設定
      </Typography>
      <ul>
        <li>
          <div
            onClick={() => {
              setToggleSetting({
                ...toggleSetting,
                lineGraph: !toggleSetting.lineGraph,
              });
            }}
            className="cursor-pointer hover:text-[#007BFF] w-[34%] xl:w-[25%]"
          >
            {toggleSetting.lineGraph ? <KeyboardArrowDownIcon /> : <ChevronRightIcon />}

            <span>折れ線グラフ</span>
          </div>

          <div className={`mt-[10px]  ${toggleSetting.lineGraph ? "flex" : "hidden"}`}>
            <span className="w-[30%] !text-[14px] ml-[10px]">色</span>
            <TextField
              className="!w-[45%]"
              fullWidth
              label="折れ線グラフの色"
              size="small"
              type="color"
              value={state.lineChartColor}
              onBlur={() => {
                handleOptionChange("lineChartColor", colorRef.current);
                handleFormChange();
              }}
              onChange={(e) => (colorRef.current = e.target.value)}
              disabled={!chose_color}
            />
          </div>
          <div className={`ml-[10px] mt-[10px]  ${toggleSetting.lineGraph ? "flex" : "hidden"}`}>
            <Typography
              gutterBottom
              className="font-semibold w-[100%] 2xl:w-[100%] 4xl:w-[100%] !text-[14px]"
            >
              線の太さ
            </Typography>
            <Slider
              className=""
              value={state.lineThickness}
              onChange={(_, newValue) => {
                handleOptionChange("lineThickness", newValue);
                handleFormChange();
              }}
              valueLabelDisplay="auto"
              min={0.5}
              max={5}
              step={0.5}
              marks={true}
              disabled={!chose_size}
            />
            <div className="w-[80%] 2xl:w-[80%]"></div>
          </div>
        </li>
        <li>
          <div
            className="cursor-pointer hover:text-[#007BFF]  w-[34%] xl:w-[25%]"
            onClick={() => {
              setToggleSetting({
                ...toggleSetting,
                textSize: !toggleSetting.textSize,
              });
            }}
          >
            {toggleSetting.textSize ? <KeyboardArrowDownIcon /> : <ChevronRightIcon />}

            <span>フォントサイズ</span>
          </div>
          <div className={`grid grid-cols-2 gap-4 ${toggleSetting.textSize ? "flex" : "hidden"}`}>
            <div>
              <div className="ml-[10px] mt-[10px]">
                <OptionSlider
                  className="!2xl:w-[40%] !4xl:w-[64%]"
                  label="タイトル"
                  value={state.fontSizeTitle}
                  onChange={(value) => {
                    handleOptionChange("fontSizeTitle", value);
                    handleFormChange();
                  }}
                  min={40}
                  max={60}
                  step={1}
                  disabled={!chose_size}
                />
              </div>
              <div className="ml-[10px] mt-[10px]">
                <Field name="xAxisFontSize">
                  {() => {
                    return (
                      <OptionSlider
                        className="!2xl:w-[40%] !4xl:w-[64%]"
                        label="X軸ラベル"
                        value={state.xAxisFontSize}
                        onChange={(value) => {
                          handleOptionChange("xAxisFontSize", value);
                          handleFormChange();
                        }}
                        disabled={!chose_size}
                        min={20}
                        max={40}
                      />
                    );
                  }}
                </Field>
              </div>
              <div className="ml-[10px] mt-[10px]">
                <OptionSlider
                  className="!2xl:w-[40%] !4xl:w-[64%]"
                  label="累積比率"
                  value={state.lineLabelFontSize}
                  onChange={(value) => {
                    handleUserAdjust(true);
                    handleOptionChange("lineLabelFontSize", value);
                    handleFormChange();
                  }}
                  min={8}
                  max={40}
                  disabled={!chose_size}
                />
              </div>
              <div className="ml-[10px] mt-[10px]">
                <OptionSlider
                  className="!2xl:w-[40%] !4xl:w-[64%]"
                  label="単位"
                  value={state.yAxisUnitSize}
                  onChange={(value) => {
                    handleOptionChange("yAxisUnitSize", value);
                    handleFormChange();
                  }}
                  min={12}
                  max={24}
                  disabled={!chose_size}
                />
              </div>
            </div>
            <div>
              <div className="ml-[10px] mt-[10px] h-[47px] xl:h-[30px]"></div>
              <div className="ml-[10px] mt-[10px]">
                <Field name="yAxisFontSize">
                  {() => {
                    return (
                      <OptionSlider
                        label="Y軸ラベル"
                        className="!2xl:w-[40%] !4xl:w-[64%]"
                        value={state.yAxisFontSize}
                        onChange={(value) => {
                          handleOptionChange("yAxisFontSize", value);
                          handleFormChange();
                        }}
                        disabled={!chose_size}
                        min={20}
                        max={35}
                      />
                    );
                  }}
                </Field>
              </div>
              <div className="ml-[10px] mt-[10px]">
                <OptionSlider
                  label="データラベル"
                  className="!2xl:w-[40%] !4xl:w-[64%]"
                  value={state.columnLabelFontSize}
                  onChange={(value) => {
                    handleOptionChange("columnLabelFontSize", value);
                    handleFormChange();
                  }}
                  min={8}
                  max={40}
                  disabled={!chose_size}
                />
              </div>
              <div className="ml-[10px] mt-[10px]">
                <OptionSlider
                  label="Y軸"
                  className="!2xl:w-[40%] !4xl:w-[64%]"
                  value={state.scale}
                  onChange={(value) => {
                    handleOptionChange("scale", value);
                    handleFormChange();
                  }}
                  min={12}
                  max={32}
                  step={4}
                  disabled={!chose_size}
                />
              </div>
            </div>
          </div>
        </li>
        <li>
          <div
            className="cursor-pointer hover:text-[#007BFF]  w-[16%] xl:w-[15%]"
            onClick={() => {
              setToggleSetting({
                ...toggleSetting,
                scorpion: !toggleSetting.scorpion,
              });
            }}
          >
            {toggleSetting.scorpion ? <KeyboardArrowDownIcon /> : <ChevronRightIcon />}

            <span>表示</span>
          </div>
          <div className={`grid grid-cols-2 gap-1 ${toggleSetting.scorpion ? "flex" : "hidden"}`}>
            <div>
              <span className="ml-[10px] text-[14px]">データラベル</span>
              <Switch
                checked={state.showBarLabels}
                onChange={(e) => {
                  handleOptionChange("showBarLabels", e.target.checked);
                  handleFormChange();
                }}
              />
            </div>
            <div>
              <span className="ml-[10px] text-[14px]">累積比率</span>
              <Switch
                checked={state.showLineLabels}
                onChange={(e) => {
                  handleOptionChange("showLineLabels", e.target.checked);
                  handleFormChange();
                }}
              />
            </div>
          </div>
        </li>
      </ul>
    </>
  );
};

export default GraphSettings;
