import React, { memo, useContext } from "react";
import { Grid, TextField, Select, MenuItem, InputLabel, FormControl, Typography, Paper } from "@mui/material";
import { ParetoChartOptions } from "../types";
import { Field, useFormikContext } from "formik";
import handleFontSizeLabel from "../hooks/useFontSizeLabel";
import { AdjustFontSizeContext } from "../provider";
import { EventType } from "@/constant/enum";

interface ChartControlsProps {
  options: ParetoChartOptions;
  onOptionChange: (key: keyof ParetoChartOptions, value: any) => void;
  xAxisItemCount: string;
  isBeforeAfterMode?: boolean;
  handleFormChange: (e: string, beforeSide?: boolean, bothSide?: boolean) => void;
  dataInputForm: string;
  eventType: EventType;
}

export const ControlGroup: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <Grid
    item
    xs={12}
    sm={6}
  >
    <Typography
      variant="subtitle1"
      gutterBottom
      className={className}
    >
      {label}
    </Typography>
    {children}
  </Grid>
);

const ChartControls: React.FC<ChartControlsProps> = ({
  options,
  onOptionChange,
  xAxisItemCount,
  isBeforeAfterMode,
  handleFormChange,
  dataInputForm,
  eventType,
}) => {
  const formik = useFormikContext<any>();
  const { userHasAction } = useContext(AdjustFontSizeContext);
  return (
    <Paper
      elevation={3}
      sx={{ p: 3 }}
    >
      <Typography
        variant="h6"
        gutterBottom
      >
        グラフ基本設定
      </Typography>
      <Grid
        container
        spacing={3}
      >
        <ControlGroup label="タイトル">
          <Field
            name="title"
            as={TextField}
            label="項目名"
            fullWidth
            value={options.title}
            onChange={(e: any) => {
              onOptionChange("title", e.target.value);
              formik.validateField("title");
              formik.setFieldValue("title", e.target.value, true);
              handleFormChange("title", true, true);
            }}
            variant="outlined"
            disabled={isBeforeAfterMode}
            error={formik.touched.title && Boolean(formik.errors.title)}
            InputLabelProps={{
              style: { color: formik.touched.title && formik.errors.title && !isBeforeAfterMode ? "red" : "black" },
            }}
          />
          {formik.touched.title && !isBeforeAfterMode && (
            <Typography
              variant="caption"
              color="error"
            >
              {formik?.errors?.title as any}
            </Typography>
          )}
        </ControlGroup>
        <ControlGroup label="Y軸ラベル">
          <Field
            name="yAxisLabel"
            fullWidth
            onChange={(e: any) => {
              onOptionChange("yAxisLabel", e.target.value);
              formik.validateField("yAxisLabel");
              formik.setFieldValue("yAxisLabel", e.target.value, true);
              handleFormChange("yAxisLabel", true, true);
            }}
            value={options.yAxisLabel}
            variant="outlined"
            disabled={isBeforeAfterMode}
            as={TextField}
            error={formik.touched.yAxisLabel && Boolean(formik.errors.yAxisLabel)}
          />
          {formik.touched.yAxisLabel && !isBeforeAfterMode && (
            <Typography
              variant="caption"
              color="error"
            >
              {formik?.errors?.yAxisLabel as any}
            </Typography>
          )}
        </ControlGroup>
        <ControlGroup label="Y軸単位">
          <Field
            name="yAxisUnits"
            fullWidth
            onChange={(e: any) => {
              onOptionChange("yAxisUnits", e.target.value);
              formik.validateField("yAxisUnits");
              formik.setFieldValue("yAxisUnits", e.target.value, true);
              handleFormChange("yAxisUnits", true, true);
            }}
            value={options.yAxisUnits}
            variant="outlined"
            disabled={isBeforeAfterMode}
            as={TextField}
            error={formik.touched.yAxisUnits && Boolean(formik.errors.yAxisUnits)}
          />
          {formik.touched.yAxisUnits && !isBeforeAfterMode && (
            <Typography
              variant="caption"
              color="error"
            >
              {formik?.errors?.yAxisUnits as any}
            </Typography>
          )}
        </ControlGroup>
        <ControlGroup label="X軸項目数">
          <Field
            name={xAxisItemCount}
            as={TextField}
            value={options.xAxisItemCount}
            defaultValue={formik.values[xAxisItemCount]}
            fullWidth
            type="number"
            onChange={async (e: any) => {
              onOptionChange("xAxisItemCount", parseInt(e.target.value));

              formik.validateField(xAxisItemCount);
              formik.setFieldValue(xAxisItemCount, parseInt(e.target.value));

              handleFormChange("xAxisItemCount", true, true);

              !userHasAction &&
                (await handleFontSizeLabel(
                  parseInt(e.target.value),
                  formik.values[dataInputForm].length,
                  onOptionChange,
                  "lineLabelFontSize",
                  "columnLabelFontSize",
                  eventType,
                ));
            }}
            variant="outlined"
            disabled={isBeforeAfterMode}
            error={formik.touched[xAxisItemCount] && Boolean(formik.errors[xAxisItemCount])}
          />
          {formik.touched[xAxisItemCount] && !isBeforeAfterMode && (
            <Typography
              variant="caption"
              color="error"
            >
              {formik?.errors[xAxisItemCount] as any}
            </Typography>
          )}
        </ControlGroup>
        <ControlGroup label="X軸ラベルの向き">
          <FormControl
            fullWidth
            variant="outlined"
          >
            <InputLabel>X軸ラベルの向き</InputLabel>
            <Select
              name="labelOrientation"
              value={options.labelOrientation}
              onChange={(e) => {
                onOptionChange("labelOrientation", e.target.value);
                handleFormChange("labelOrientation", true, true);
              }}
              label="X軸ラベルの向き"
              disabled={isBeforeAfterMode}
            >
              <MenuItem value="vertical">縦向き</MenuItem>
              <MenuItem value="portrait">横向き</MenuItem>
            </Select>
          </FormControl>
        </ControlGroup>
        <ControlGroup label="Y軸ラベルの向き">
          <FormControl
            fullWidth
            variant="outlined"
          >
            <InputLabel>Y軸ラベルの向き</InputLabel>
            <Field name="yAxisLabelOrientation">
              {() => {
                return (
                  <Select
                    name="yAxisLabelOrientation"
                    disabled={isBeforeAfterMode}
                    value={options.yAxisLabelOrientation}
                    onChange={(e) => {
                      formik.setFieldValue("yAxisLabelOrientation", e.target.value);
                      formik.validateField("yAxisLabelOrientation");
                      onOptionChange("yAxisLabelOrientation", e.target.value);
                      handleFormChange("yAxisLabelOrientation", true, true);
                    }}
                    label="Y軸ラベルの向き"
                  >
                    <MenuItem value="vertical">縦向き</MenuItem>
                    <MenuItem value="portrait">横向き</MenuItem>
                  </Select>
                );
              }}
            </Field>
          </FormControl>
        </ControlGroup>

        <ControlGroup label="累積比率の文字の向き">
          <FormControl
            fullWidth
            variant="outlined"
          >
            <InputLabel>線のサイズ</InputLabel>
            <Select
              disabled={isBeforeAfterMode}
              value={options.lineLabelOrientation}
              onChange={(e) => {
                onOptionChange("lineLabelOrientation", e.target.value);
                handleFormChange("lineLabelOrientation", true, true);
              }}
              label="累積比率の文字の向き"
            >
              <MenuItem value="vertical">縦向き</MenuItem>
              <MenuItem value="portrait">横向き</MenuItem>
            </Select>
          </FormControl>
        </ControlGroup>

        <ControlGroup label="データラベルの向き">
          <FormControl
            fullWidth
            variant="outlined"
          >
            <InputLabel>列のサイズ</InputLabel>
            <Select
              disabled={isBeforeAfterMode}
              value={options.columnLabelOrientation}
              onChange={(e) => {
                onOptionChange("columnLabelOrientation", e.target.value);
                handleFormChange("columnLabelOrientation", true, true);
              }}
              label="データラベルの向き"
            >
              <MenuItem value="vertical">縦向き</MenuItem>
              <MenuItem value="portrait">横向き</MenuItem>
            </Select>
          </FormControl>
        </ControlGroup>
      </Grid>
    </Paper>
  );
};

export default memo(ChartControls);
