import React, { memo, useCallback, useContext, useEffect, useRef } from "react";
import { useCSVReader } from "react-papaparse";
import { DataItem, ParetoChartOptions } from "../types";
import { TextField, Button, Box, Grid, IconButton, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { EventType } from "../../../constant/enum";
import { Field, useFormikContext } from "formik";
import { toast } from "react-toastify";
import handleFontSizeLabel from "../hooks/useFontSizeLabel";
import { AdjustFontSizeContext } from "../provider";

// Maximum value for INTEGER in PostgreSQL (2^31 - 1)
const MAX_QUANTITY = 2147483647;

interface DataInputProps {
  onInput: (data: DataItem[]) => void;
  uploadCSV?: EventType;
  dataInputForm: string;
  isBeforeAfterMode?: boolean;
  xAxisItemCount: string;
  maxItems: string;
  textCSV: string;
  initialData?: DataItem[];
  handleFormChange: (e: any) => void;
  allZeroQuantity: string;
  onOptionChange: (key: keyof ParetoChartOptions, value: any) => void;
  eventType: EventType;
}

export const useDebounce = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

const DataInput: React.FC<DataInputProps> = ({
  onInput,
  dataInputForm,
  isBeforeAfterMode = true,
  maxItems,
  textCSV,
  initialData,
  handleFormChange,
  allZeroQuantity,
  onOptionChange,
  xAxisItemCount,
  eventType,
}) => {
  const { CSVReader } = useCSVReader();
  const formik = useFormikContext<any>();
  const { userHasAction } = useContext(AdjustFontSizeContext);

  const handleCSVUpload = useCallback(
    (results: any) => {
      try {
        const csvItems = results.data
          .filter((row: any[]) => row.length >= 2)
          .map((row: any[]) => ({
            name: row[0],
            quantity: Number(row[1]),
          }))
          .filter((item: DataItem) => {
            if (!item.name || isNaN(item.quantity)) return false;
            if (item.quantity > MAX_QUANTITY) {
              toast.error(`数量が大きすぎます。最大値は ${MAX_QUANTITY.toLocaleString()} です。`);
              return false;
            }
            if (item.quantity < 0) {
              toast.error("数量は0以上である必要があります。");
              return false;
            }
            return true;
          });

        if (!csvItems.length) {
          toast.error("ファイルにデータがありません");
          return;
        }
        formik.setFieldValue(dataInputForm, csvItems);

        !userHasAction &&
          handleFontSizeLabel(
            formik.values[`${xAxisItemCount}`],
            csvItems.length,
            onOptionChange,
            "lineLabelFontSize",
            "columnLabelFontSize",
            eventType,
          );
      } catch (error) {
        toast.error("CSVファイルの読み込み中にエラーが発生しました。");
      }
    },
    [formik],
  );
  const debouncedLog = useDebounce(() => {
    formik.values[dataInputForm] &&
      onInput(formik.values[dataInputForm].filter((item: DataItem) => item.name && item.quantity > 0));
  }, 200);

  useEffect(() => {
    debouncedLog();
  }, [formik.values[dataInputForm]]);

  useEffect(() => {
    initialData && formik.setFieldValue(dataInputForm, initialData);
  }, [initialData]);

  return (
    <>
      <Grid>
        <Grid className="pt-2 h-[360px] overflow-auto custom-scrollbar items-start">
          {formik.values[dataInputForm].map((_: any, index: number) => {
            //@ts-ignore
            const nameError = formik.errors[dataInputForm]?.[index]?.name;
            //@ts-ignore
            const quantityError = formik.errors[dataInputForm]?.[index]?.quantity;
            const errorMessage = nameError || quantityError;
            return (
              <Grid
                item
                xs={12}
                key={index}
                className="pb-4"
              >
                <Box
                  display="flex"
                  alignItems="center"
                  id={`${dataInputForm}?.[${index}]`}
                >
                  <Field
                    name={`${dataInputForm}[${index}].name`}
                    onBlur={() => {}}
                    onChange={(e: any) => {
                      setTimeout(() => {
                        handleFormChange("");
                      }, 0);
                      formik.setFieldValue(`${dataInputForm}[${index}].name`, e.target.value, true);
                    }}
                    as={TextField}
                    label="項目名"
                    sx={{ mr: 1, flexGrow: 1 }}
                    error={
                      //@ts-ignore
                      formik.touched[`${dataInputForm}`]?.[index]?.name &&
                      //@ts-ignore
                      Boolean(formik.errors[`${dataInputForm}`]?.[index]?.name)
                    }
                    disabled={!isBeforeAfterMode}
                  />
                  <Field
                    disabled={!isBeforeAfterMode}
                    name={`${dataInputForm}[${index}].quantity`}
                    type="number"
                    as={TextField}
                    label="数量"
                    sx={{ mr: 1, width: "100px" }}
                    inputProps={{
                      min: 0,
                      max: MAX_QUANTITY,
                      step: 1,
                    }}
                    error={
                      //@ts-ignore
                      formik.touched[`${dataInputForm}`]?.[index]?.quantity &&
                      //@ts-ignore
                      Boolean(formik.errors[`${dataInputForm}`]?.[index]?.quantity)
                    }
                    // helperText={
                    //   //@ts-ignore
                    //   formik.touched[`${dataInputForm}`]?.[index]?.quantity &&
                    //   //@ts-ignore
                    //   formik.errors[`${dataInputForm}`]?.[index]?.quantity
                    //     ? //@ts-ignore
                    //       formik.errors[`${dataInputForm}`]?.[index]?.quantity
                    //     : undefined
                    // }
                    onBlur={() => {}}
                    onChange={(e: any) => {
                      const value = e.target.value;
                      let numValue: number | string = "";

                      if (value !== "" && value !== null && value !== undefined) {
                        numValue = Number(value);

                        // Validate: không cho phép số âm
                        if (numValue < 0) {
                          formik.setFieldError(
                            `${dataInputForm}[${index}].quantity`,
                            "数量は0以上である必要があります",
                          );
                          return;
                        }

                        // Validate: không cho phép số quá lớn
                        if (numValue > MAX_QUANTITY) {
                          formik.setFieldError(
                            `${dataInputForm}[${index}].quantity`,
                            `数量が大きすぎます。最大値は ${MAX_QUANTITY.toLocaleString()} です`,
                          );
                          // Giới hạn giá trị ở MAX_QUANTITY
                          numValue = MAX_QUANTITY;
                          toast.warning(`数量は最大 ${MAX_QUANTITY.toLocaleString()} まで入力できます`);
                        } else {
                          // Clear error nếu giá trị hợp lệ
                          //@ts-ignore
                          const currentError = formik.errors[`${dataInputForm}`]?.[index]?.quantity;
                          if (currentError) {
                            //@ts-ignore
                            formik.setFieldError(`${dataInputForm}[${index}].quantity`, undefined);
                          }
                        }
                      }

                      setTimeout(() => {
                        handleFormChange("");
                      }, 0);
                      formik.setFieldValue(`${dataInputForm}[${index}].quantity`, numValue, true);
                    }}
                    onKeyDown={(e: any) => {
                      if (
                        !(
                          (e.key >= "0" && e.key <= "9") ||
                          ["Backspace", "ArrowLeft", "ArrowRight", "Tab", "Delete", "."].includes(e.key)
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  />

                  <IconButton
                    onClick={() => {
                      const value = formik.values[dataInputForm].filter((item: DataItem, i: number) => index !== i);
                      formik.setFieldValue(dataInputForm, value, true);
                      handleFormChange("");
                      !userHasAction &&
                        handleFontSizeLabel(
                          formik.values[`${xAxisItemCount}`],
                          formik.values[dataInputForm].length + 1,
                          onOptionChange,
                          "lineLabelFontSize",
                          "columnLabelFontSize",
                          eventType,
                        );
                    }}
                    color="error"
                    className="focus:outline-none"
                    disabled={!isBeforeAfterMode}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                {Boolean(errorMessage) &&
                  //@ts-ignore
                  formik.touched[`${dataInputForm}`]?.[index] && (
                    <Typography
                      variant="caption"
                      color="error"
                    >
                      {errorMessage}
                    </Typography>
                  )}
              </Grid>
            );
          })}
          <Grid item>
            {typeof formik.errors[dataInputForm] === "string" ? (
              <Typography
                color="error"
                className="!text-sm"
              >
                {formik.errors[dataInputForm]}
              </Typography>
            ) : typeof formik.errors[maxItems] === "string" ? (
              <Typography
                color="error"
                className="!text-sm"
              >
                {formik.errors[maxItems]}
              </Typography>
            ) : null}
            {formik.submitCount !== 0 &&
              isBeforeAfterMode &&
              formik.values[dataInputForm].length !== 0 &&
              typeof formik.errors[allZeroQuantity] === "string" && (
                <Typography
                  color="error"
                  className="!text-sm !mt-1"
                >
                  {formik.errors[allZeroQuantity]}
                </Typography>
              )}
          </Grid>
        </Grid>

        <Grid
          container
          spacing={2}
          alignItems="center"
          className="pt-4"
        >
          <Box
            mt={2}
            display="flex"
            justifyContent="space-between"
            flexGrow={1}
            sx={{
              paddingLeft: "16px",
            }}
          >
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                if (formik.values[dataInputForm].length < 30) {
                  const value = formik.values[dataInputForm];
                  formik.setFieldValue(
                    dataInputForm,
                    [...value, { name: "", quantity: 0, color: "hsl(0, 0%, 100%)" }],
                    true,
                  );
                  handleFormChange("");
                  !userHasAction &&
                    handleFontSizeLabel(
                      formik.values[`${xAxisItemCount}`],
                      value.length + 1,
                      onOptionChange,
                      "lineLabelFontSize",
                      "columnLabelFontSize",
                      eventType,
                    );
                } else {
                  formik.setErrors({
                    ...formik.errors,
                    [maxItems]: `最大30項目を追加できます。`,
                  });
                }
              }}
              variant="outlined"
              disabled={!isBeforeAfterMode}
              className="focus:outline-none"
            >
              項目を追加
            </Button>
            <CSVReader
              onUploadAccepted={(data: any) => {
                handleCSVUpload(data);
              }}
              onUploadRejected={() => {
                toast.error("CSVファイルの読み込み中にエラーが発生しました。");
                return;
              }}
            >
              {({ getRootProps }: { getRootProps: () => any }) => (
                <Button
                  {...getRootProps()}
                  startIcon={<UploadFileIcon />}
                  variant="outlined"
                  disabled={!isBeforeAfterMode}
                  className="focus:outline-none"
                >
                  {textCSV}
                </Button>
              )}
            </CSVReader>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default memo(DataInput);
