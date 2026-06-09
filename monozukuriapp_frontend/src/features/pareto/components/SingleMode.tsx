import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import React, { useCallback, useEffect, useReducer, useRef, useState, useContext } from "react";
import { memo } from "react";
import ChartControls from "./ChartControls";
import DataInput from "./DataInput";
import { useParetoData } from "../hooks/useParetoData";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ParetoChart from "./ParetoChart";
import { saveAsCSV, saveAsPNG } from "../utils/export";
import { Form, Formik, FormikProps, FormikValues } from "formik";
import { array, boolean, number, object, string } from "yup";
import { reducer } from "../../../store/reducer/generateChart.reducer";
import { toast } from "react-toastify";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import GraphSettings from "./GraphSettings";
import { DataItem } from "../types";
import DataTable from "./DataTable";
import UserInfoPareto from "./UserInfor";
import { handleApi } from "@/utils/handleApi";
import singleModeService from "@/services/apis/singlemodeService";
import { FontTypeSelector } from "../presentation/FontSetting";
import { convertImageToBlob } from "../utils/convertImage";
import { base64ToBlob } from "../utils/base64ToBlob";
import { generateColor } from "../utils/paretoCalculations";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import IconButton from "@mui/material/IconButton";
import { ZoomIn } from "lucide-react";
import { Refresh, ZoomOut } from "@mui/icons-material";
import styles from "@/features/fta/components/Node.module.css";
import { scrollToError } from "../utils/scrollError";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { RootState } from "@/store/store";
import { clearSavePareto, setSavePareto } from "@/store/slices/checkSaveDataSlice";
import event from "@/utils/eventEmitter";
import { EventType } from "@/constant/enum";
import { App, Auth } from "@/enum/pathnames";
import { logout } from "../../../store/slices/authSlice";
import { signOut } from "aws-amplify/auth";
import { useLocation } from "react-router-dom";
import MenuItem from "@mui/material/MenuItem";
import { typeimg } from "@/components/chart/GeneralChart";
import Select from "@mui/material/Select";
import { FontSizeContext } from "../provider";
import { CircularProgress } from "@mui/material";

export type ImageExtension = "png" | "jpeg";

export const scaleChart = {
  "12": 0.9,
  "16": 0.8,
  "20": 0.7,
  "24": 0.6,
  "28": 0.5,
  "32": 0.4,
};
const SingleMode = () => {
  const {
    beforeData,
    beforeProcessedData,
    totalQuantityBefore: beforeTotalQuantity,
    optionsBefore: optionsBeforeChart,
    beforeAxisDomains,
    handleDataInput,
    handleOptionChangeBefore,
    generateBeforeChart,
    handleColorChange,
    handleLabelToggle,
    handleBulkColorChange,
    setBeforeProcessedData,
    setOptionsBefore,
  } = useParetoData();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [state, dispatch] = useReducer(reducer, {
    showBeforeChart: id ? true : false,
    showAfterChart: id ? true : false,
    error: null,
  });
  const beforeChartRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState({
    items: [{ name: "", quantity: 0, color: "", showBarLabel: true, showLineLabel: true }],
    xAxisItemCount: 1,
    maxItems: undefined,
    allZeroQuantity: undefined,
    title: "",
    yAxisLabel: "",
    lineThickness: 2,
    yAxisLabelOrientation: "vertical",
  });
  const refImageExtension = useRef<ImageExtension>("png");
  const refImage = useRef<any>();
  const transformRef = useRef<any>(null);
  const [shouldRender, setShouldRender] = useState<any>({});
  const [openDialog, setOpenDialog] = useState(false);
  const isChangedOnPage = useAppSelector((state: RootState) => state.checkSaveDataSlice.pareto);
  const dispatchCheckSaveData = useAppDispatch();
  const pageRef = useRef("/pareto");
  const requestStatus = useRef<boolean>(false);
  const warning = useRef<boolean>(false);
  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const save_parento = userRole?.PARENTO_SAVE_TYPED_DATA;
  const save_csv = userRole?.PARENTO_SAVE_AS_CSV;
  const save_image = userRole?.PARENTO_DOWNLOAD_IMAGE;
  const chose_font = userRole?.PARENTO_CHOOSE_FONT_TEXT;
  const createParento = userRole?.PARENTO_CREATE_PAGE;
  const previous_page = useLocation();
  const previousPageRef = useRef(previous_page.state);
  const [isUploading, setIsUploading] = useState(false);
  const flag = useRef<{
    popState: boolean;
    navigateByBreadCrumb: boolean;
  }>({
    popState: false,
    navigateByBreadCrumb: false,
  });
  const [select, setSelect] = useState<{
    typeimg: string | undefined;
    font: string | undefined;
  }>({
    typeimg: undefined,
    font: undefined,
  });
  const [nameFile, setNameFile] = useState<string | null>(null);
  const formikRef = useRef<FormikProps<FormikValues>>(null);
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const [isLoadingDownloadImageChart, setIsLoadingDownloadImageChart] = useState(false);
  const onGenerateBeforeChart = async () => {
    try {
      warning.current = false;
      generateBeforeChart();
      dispatch({ type: "GENERATE_BEFORE_CHART" });
    } catch (error) {
      dispatch({ type: "SET_ERROR", error: "Beforeチャート生成中にエラーが発生しました。" });
    }
  };

  const handlePNGDownload = async (imageExtension: ImageExtension) => {
    if (!state.showBeforeChart) {
      toast.error("画像をロードできません");
      return;
    }

    const chartElement = beforeChartRef.current;
    if (!chartElement) return;

    setIsLoadingDownloadImageChart(true);

    try {
      const fileName = `${new Date().toISOString().split("T")[0]}_${optionsBeforeChart?.title}.${imageExtension}`;
      await saveAsPNG(chartElement, fileName, imageExtension, optionsBeforeChart.fontFamily as string);
    } catch (error) {
      toast.error("画像のダウンロードに失敗しました");
    } finally {
      setIsLoadingDownloadImageChart(false);
    }
  };

  const handleCSVDownload = async () => {
    if (!state.showBeforeChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    if (state.showBeforeChart && warning.current) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    //save data
    const data = beforeProcessedData;
    const updatedOptionsBefore = { ...optionsBeforeChart };
    delete updatedOptionsBefore.isBeforeAfterMode;
    const fileName = `${new Date().toISOString().split("T")[0]}_${updatedOptionsBefore?.title}`;
    saveAsCSV(
      data.map((item) => ({ name: item.name, quantity: item.quantity })),
      fileName,
    );
  };
  const handleUploadDataToServer = async (imageExtension: ImageExtension) => {
    if (!state.showBeforeChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    if (state.showBeforeChart && warning.current) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    setIsUploading(true);
    try {
      //handle image
      const data = beforeProcessedData;
      const updatedOptionsBefore = { ...optionsBeforeChart };
      delete updatedOptionsBefore.isBeforeAfterMode;
      const fileName = `${new Date().toISOString().split("T")[0]}_${updatedOptionsBefore?.title}`;
      const chartElement = beforeChartRef.current;
      if (chartElement) {
        const image = await convertImageToBlob(chartElement, "pareto", imageExtension);
        refImage.current = image;
      }
      let cumulativeQuantity = 0;
      const totalQuantityBefore = beforeData.reduce((sum, item) => sum + item.quantity, 0);

      Object.prototype.hasOwnProperty.call(updatedOptionsBefore, "results") && delete updatedOptionsBefore?.results;
      Object.prototype.hasOwnProperty.call(updatedOptionsBefore, "resultsT") && delete updatedOptionsBefore?.resultsT;
      Object.prototype.hasOwnProperty.call(updatedOptionsBefore, "resultsQ") && delete updatedOptionsBefore?.resultsQ;
      Object.prototype.hasOwnProperty.call(updatedOptionsBefore, "resultsR") && delete updatedOptionsBefore?.resultsR;
      Object.prototype.hasOwnProperty.call(updatedOptionsBefore, "resultsN") && delete updatedOptionsBefore?.resultsN;
      Object.prototype.hasOwnProperty.call(updatedOptionsBefore, "resultsTitle") &&
        delete updatedOptionsBefore?.resultsTitle;

      //post data
      const body = {
        mode: "SINGLE",
        name: fileName,
        single: {
          ...updatedOptionsBefore,
          records:
            optionsBeforeChart.xAxisItemCount < beforeData.length
              ? beforeData.map((item, index) => {
                  cumulativeQuantity += item.quantity;
                  return {
                    name: item.name,
                    quantity: item.quantity,
                    cumulativeQuantity,
                    cumulativePercentage: (cumulativeQuantity / totalQuantityBefore) * 100,
                    color:
                      data.find((i) => i.name === item.name)?.color ??
                      data.find((i) => i.name === "その他")?.color ??
                      generateColor(),
                    showBarLabel:
                      (data[index] ? data[index]?.showBarLabel : data[data.length - 1]?.showBarLabel) ?? true,
                    showLineLabel:
                      (data[index] ? data[index]?.showLineLabel : data[data.length - 1]?.showLineLabel) ?? true,
                  };
                })
              : data,
        },
        singleImage: base64ToBlob(refImage.current),
      };

      const form = new FormData();
      form.append("mode", "SINGLE");
      form.append("name", fileName);
      form.append("single", JSON.stringify(body.single));
      form.append("singleImage", body.singleImage);
      const [res, error] = await handleApi(
        id ? singleModeService.updatePareto(form, id) : singleModeService.createPareto(form),
      );
      if (!save_parento) {
        requestStatus.current = true;
        warning.current = true;
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        toast.error("権限の為、入力データが保存できません。");
        return;
      }
      if (res) {
        requestStatus.current = true;
        warning.current = false;
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        toast.success(id ? "更新成功" : "保存が完了しました");
      }
      if (error) {
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        toast.error(error);

        requestStatus.current = false;
        navigate("/pareto/datafromcloud", { state: App.PARETO });
      }
    } catch (error) {
      console.error("Error uploading data to server:", error);
      toast.error("データの保存中にエラーが発生しました。");
      requestStatus.current = false;
    } finally {
      setIsUploading(false);
    }
  };

  const getDetailPareto = async (id: number) => {
    const [res, error] = await handleApi(singleModeService.getDetailPareto(id));
    if (res) {
      setNameFile(res.data.name);
      const singlePareto = res.data.singlePareto;
      setBeforeProcessedData(singlePareto.paretoItem);
      handleDataInput(singlePareto.paretoItem, true);
      setInitialData({
        ...initialData,
        items: res?.data?.singlePareto?.paretoItem,
        xAxisItemCount: res?.data?.singlePareto?.paretoItem?.length ? res?.data?.singlePareto?.paretoItem?.length : 1,
      });
      delete singlePareto.paretoItem;
      setOptionsBefore(singlePareto);
      setShouldRender({});
      return;
    }
    if (error) {
      console.log(error);
    }
  };

  const handleCancelSave = useCallback(async (page: any) => {
    dispatchCheckSaveData(clearSavePareto({ pareto: false }));
    if (page !== Auth.LOGIN) {
      navigate(page);
    } else {
      await signOut();
      dispatchCheckSaveData(logout());
      toast.success("ログアウトは成功しました。");
      navigate(Auth.LOGIN);
    }
    setOpenDialog(false);
  }, []);

  const handleNavigation = useCallback(
    (e: any) => {
      if (isChangedOnPage && Boolean(save_parento || save_csv)) {
        e.preventDefault();
        return "";
      }
    },
    [isChangedOnPage],
  );

  useEffect(() => {
    if (state.showBeforeChart) {
      const errorElement = document.getElementById("before_chart") as HTMLElement;
      errorElement && errorElement.scrollIntoView();
    }
  }, [state]);

  useEffect(() => {
    id && getDetailPareto(Number(id));
  }, [id]);

  useEffect(() => {
    id && onGenerateBeforeChart();
  }, [shouldRender]);

  useEffect(() => {
    window.addEventListener("beforeunload", handleNavigation);
    window.addEventListener("popstate", () => {
      flag.current.popState = true;
      setOpenDialog(true);
    });

    event.on(EventType.PARETO_CHECK_SAVE_DATA, (param: string) => {
      setOpenDialog(true);
      pageRef.current = param;
    });

    return () => {
      event.removeListener(EventType.PARETO_CHECK_SAVE_DATA, () => {});
      window.removeEventListener("beforeunload", handleNavigation);
    };
  }, [isChangedOnPage, location.pathname, navigate]);

  useEffect(() => {
    const mapping = {
      [App.DATA_FROM_CLOUD]: [
        { label: "パレート図作成ツール", href: "#", onClick: () => navigate("/pareto") },
        {
          label: "保存したデータ",
          href: "#",
          onClick: () => {
            if (isChangedOnPage) {
              flag.current.navigateByBreadCrumb = true;
              setOpenDialog(true);
            } else {
              navigate(App.DATA_FROM_CLOUD);
            }
          },
        },
      ],
      [App.YOUR_PROJECTS]: [
        {
          label: "あなたのプロジェクト",
          href: "#",
          onClick: () => {
            if (isChangedOnPage) {
              flag.current.navigateByBreadCrumb = true;
              setOpenDialog(true);
            } else {
              navigate(App.YOUR_PROJECTS);
            }
          },
        },
      ],
    };

    const breadcrumbs = [];

    if (previousPageRef.current === App.DATA_FROM_CLOUD) {
      breadcrumbs.push(...mapping[App.DATA_FROM_CLOUD]);
    } else if (previousPageRef.current === App.YOUR_PROJECTS) {
      breadcrumbs.push(...mapping[App.YOUR_PROJECTS]);
    } else {
      breadcrumbs.push({
        label: "パレート図作成ツール",
        href: "#",
        onClick: () => {
          if (isChangedOnPage) {
            flag.current.navigateByBreadCrumb = true;
            setOpenDialog(true);
          } else {
            navigate("/pareto");
          }
        },
      });
    }

    breadcrumbs.push({ label: nameFile || "パレート図の新規作成", href: "#" });

    setBreadcrumbItems(breadcrumbs);

    return () => setBreadcrumbItems([]);
  }, [previousPageRef.current, isChangedOnPage, navigate, setBreadcrumbItems, nameFile]);

  const handleFormChange = useCallback(
    (e: any) => {
      formikRef.current && formikRef.current.handleChange(e);
      window.history.pushState(null, "", window.location.href);
      requestStatus.current = false;
      warning.current = true;
      if (save_parento || save_csv) {
        dispatchCheckSaveData(setSavePareto({ pareto: true, fishbone: false }));
      }
    },
    [save_parento, save_csv],
  );

  const onInput = useCallback((data: any) => {
    handleDataInput(data, true);
  }, []);
  return (
    <>
      <Formik
        initialValues={initialData}
        validationSchema={object({
          items: array(
            object({
              name: string()
                .test("unique-name", "フィールド名が重複しないようにしてください。", function (value) {
                  if (value) {
                    const items =
                      this.options.context &&
                      this.options.context.items.map((item: DataItem) => {
                        if (!item.name) {
                          item.name = "";
                        }
                        return item;
                      });
                    const nameCount = items?.filter((item: any) => item?.name?.trim() === value?.trim())?.length;
                    return nameCount === 1;
                  }
                  return true;
                })
                .max(30, "30文字以内で入力してください")
                .required("必須項目が入力されていません。入力してください。"),
              quantity: number()
                .required("必須項目が入力されていません。入力してください。")
                .min(0, "0以上の数値を入力してください"),
              color: string(),
              showBarLabel: boolean(),
              showLineLabel: boolean(),
            }),
          ).min(1, "少なくとも 1 つのパラメータを選択してください。"),
          xAxisItemCount: number()
            .transform((value) => (Number.isNaN(value) ? null : value))
            .min(1, "最小値は1です")
            .max(30, "最大値は30です")
            .required("このフィールドは必須です"),
          title: string().max(30, "30文字以内で入力してください"),
          yAxisLabel: string().max(15, "15文字以内で入力してください"),
          yAxisUnits: string().max(15, "15文字以内で入力してください"),
          maxItems: string(),
          lineThickness: number(),
          yAxisLabelOrientation: string().oneOf(["vertical", "portrait", ""]),
          allZeroQuantity: string().test(
            "check-all-zero-quantity",
            "すべての項目の数量を0にすることはできません。",
            function () {
              const items = this.parent.items || [];
              const allZero = items.every((item: any) => item.quantity === 0);

              if (allZero) {
                return false;
              }

              return true;
            },
          ),
        })}
        onSubmit={() => {}}
        validateOnChange={true}
        validateOnBlur={false}
        validateOnMount={false}
        innerRef={formikRef}
      >
        <Form
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
        >
          <Grid
            container
            spacing={2}
            className="flex flex-row"
          >
            <FontSizeContext
              children={
                <Grid
                  item
                  xs={12}
                  md={6}
                >
                  <Paper
                    elevation={3}
                    sx={{ p: 2, mb: 2 }}
                  >
                    <ChartControls
                      options={optionsBeforeChart}
                      onOptionChange={handleOptionChangeBefore}
                      xAxisItemCount="xAxisItemCount"
                      handleFormChange={() => handleFormChange("")}
                      dataInputForm="items"
                      eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                    />
                  </Paper>
                  <Paper
                    elevation={3}
                    sx={{ p: 2, mb: 2 }}
                  >
                    <DataInput
                      onInput={onInput}
                      isBeforeAfterMode={true}
                      dataInputForm="items"
                      xAxisItemCount="xAxisItemCount"
                      maxItems="maxItems"
                      textCSV="CSVをアップロード"
                      initialData={initialData.items}
                      handleFormChange={handleFormChange}
                      allZeroQuantity="allZeroQuantity"
                      onOptionChange={handleOptionChangeBefore}
                      eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                    />
                  </Paper>
                  <Grid
                    item
                    xs={12}
                  >
                    <Paper
                      elevation={3}
                      sx={{ p: 2, mb: 2 }}
                    >
                      <GraphSettings
                        options={optionsBeforeChart}
                        onOptionChange={handleOptionChangeBefore}
                        type="SINGLE"
                        data={beforeProcessedData}
                        handleFormChange={() => handleFormChange("")}
                        eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                      />
                    </Paper>
                  </Grid>
                </Grid>
              }
            />

            <Grid
              item
              xs={12}
              md={6}
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  className="focus:outline-none w-full md:!w-[158px]"
                  onClick={() => {
                    formikRef.current && formikRef.current.handleSubmit();
                    const keysNumber = formikRef?.current && Object.keys(formikRef.current?.errors)?.length;
                    if (keysNumber) {
                      if (keysNumber >= 2 && formikRef?.current && formikRef?.current.errors?.items) {
                        return;
                      }
                      if (
                        formikRef?.current &&
                        formikRef?.current.errors?.items &&
                        formikRef.current?.errors?.items?.length
                      ) {
                        Array.isArray(formikRef.current?.errors?.items) &&
                          scrollToError(
                            formikRef.current.errors.items as any,
                            //@ts-ignore
                            formikRef.current.errors.items?.findIndex((item: any) => item?.name || item?.quantity),
                            "items",
                          );
                      }
                      return;
                    }

                    onGenerateBeforeChart();
                  }}
                  disabled={!createParento}
                >
                  パレート図を生成
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleUploadDataToServer(refImageExtension.current)}
                  className="focus:outline-none w-full md:!w-[158px]"
                  disabled={!save_parento || isUploading}
                >
                  Webに保存
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleCSVDownload()}
                  className="focus:outline-none w-full md:!w-[158px]"
                  disabled={!save_csv}
                >
                  CSVに保存
                </Button>
                <Button
                  className="bg-blue-500 !outline-none w-full md:!w-[158px] relative"
                  onClick={() => handlePNGDownload(refImageExtension.current)}
                  variant="contained"
                  disabled={!save_image || isLoadingDownloadImageChart}
                >
                  {isLoadingDownloadImageChart && (
                    <div>
                      <CircularProgress size={22} />
                    </div>
                  )}
                  <span>画像のダウンロード</span>
                </Button>
                <Select
                  displayEmpty
                  disabled={!save_image}
                  value={select?.typeimg}
                  onChange={(e: any) => {
                    setSelect({
                      ...select,
                      typeimg: e.target.value as string,
                    });
                    refImageExtension.current = typeimg[e.target.value as "PNG" | "JPEG"] as ImageExtension;
                  }}
                  renderValue={(selected: any) => {
                    if (!selected) {
                      return <em>画像の拡張子を選択</em>;
                    }

                    return selected;
                  }}
                  inputProps={{ "aria-label": "Without label" }}
                  className="!w-full md:!w-[158px] !h-[40px]"
                >
                  {Object.keys(typeimg).map((name) => (
                    <MenuItem
                      key={name}
                      value={name}
                    >
                      {name}
                    </MenuItem>
                  ))}
                </Select>
                <FontTypeSelector
                  optionChange={handleOptionChangeBefore}
                  value={optionsBeforeChart.fontFamily}
                  handleFormChange={() => handleFormChange("")}
                  disabled={!chose_font}
                />
              </div>

              {state.showBeforeChart && beforeProcessedData.length > 0 && (
                <>
                  <div
                    className={`lg:w-full w-full ${styles.boxCss} overflow-x-auto overflow-y-hidden mb-5 items mt-4`}
                  >
                    <TransformWrapper
                      initialScale={1}
                      centerOnInit={true}
                      ref={transformRef}
                      doubleClick={{ disabled: true }}
                      wheel={{
                        disabled: true,
                      }}
                    >
                      {({ zoomIn, zoomOut, setTransform }) => (
                        <>
                          <div className={styles.searchBox}>
                            <Box
                              display="flex"
                              gap={2}
                              mb={2}
                            >
                              <IconButton onClick={() => zoomIn(0.2)}>
                                <ZoomIn />
                              </IconButton>
                              <IconButton onClick={() => zoomOut(0.2)}>
                                <ZoomOut />
                              </IconButton>
                              <IconButton onClick={() => setTransform(0, 0, 1)}>
                                <Refresh />
                              </IconButton>
                            </Box>
                          </div>

                          <div className="w-full">
                            <TransformComponent
                              wrapperStyle={{
                                height: "100%",
                                width: "100%",
                              }}
                              contentStyle={{ width: "100%", height: "100%" }}
                            >
                              <div
                                className="w-full  h-[720px] 4xl:h-[750px]"
                                id="before_chart"
                              >
                                <ParetoChart
                                  totalQuantity={beforeTotalQuantity}
                                  axisDomains={beforeAxisDomains}
                                  data={beforeProcessedData}
                                  options={optionsBeforeChart}
                                  mode="single"
                                />
                              </div>
                            </TransformComponent>
                            <div
                              className="absolute top-[-9999px] w-full h-[720px] 4xl:h-[750px]"
                              ref={beforeChartRef}
                            >
                              <ParetoChart
                                data={beforeProcessedData}
                                totalQuantity={beforeTotalQuantity}
                                options={optionsBeforeChart}
                                axisDomains={beforeAxisDomains}
                                dowload
                                mode="single"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </TransformWrapper>
                  </div>
                  <Grid
                    container
                    spacing={2}
                  >
                    <Grid
                      item
                      xs={12}
                    >
                      <Paper
                        elevation={3}
                        sx={{ p: 2, mb: 2 }}
                      >
                        <DataTable
                          data={beforeProcessedData}
                          onColorChange={(index, color) => {
                            handleColorChange(index, color, true);
                          }}
                          onLabelToggle={(index, showBarLabel, showLineLabel) => {
                            handleLabelToggle(index, showBarLabel, showLineLabel, true);
                          }}
                          onBulkColorChange={(color) => {
                            handleBulkColorChange(color, true);
                          }}
                          options={optionsBeforeChart}
                          onOptionChange={handleOptionChangeBefore}
                          items={formikRef?.current && formikRef?.current.values.items}
                        />
                      </Paper>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                    >
                      <Paper
                        elevation={3}
                        sx={{ p: 2, mb: 2 }}
                      >
                        <UserInfoPareto
                          totalQuantity={beforeData.reduce((sum: number, item: any) => {
                            return sum + Number(item.quantity || 0);
                          }, 0)}
                          handleFormChange={() => handleFormChange("")}
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>

          <Dialog
            open={openDialog && Boolean(save_parento || save_csv)}
            onClose={() => {
              flag.current.popState = false;
              flag.current.navigateByBreadCrumb = false;
              setOpenDialog(false);
            }}
          >
            <DialogContent>
              <DialogContentText>変更内容が保存されていない可能性がありますが、よろしいですか？</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  handleCancelSave(
                    flag.current.navigateByBreadCrumb || flag.current.popState
                      ? previousPageRef.current
                      : pageRef.current,
                  );
                }}
                color="primary"
                className="focus:outline-none"
              >
                保存しない
              </Button>
              <Button
                onClick={async () => {
                  formikRef?.current && formikRef?.current.handleSubmit();
                  const keysNumber = formikRef?.current && Object.keys(formikRef?.current?.errors)?.length;
                  if (keysNumber) {
                    if (keysNumber >= 2 && formikRef?.current?.errors?.items) {
                      flag.current.popState = false;
                      flag.current.navigateByBreadCrumb = false;
                      setOpenDialog(false);
                      return;
                    }
                    if (formikRef?.current?.errors?.items && formikRef?.current?.errors?.items?.length) {
                      Array.isArray(formikRef?.current?.errors?.items) &&
                        scrollToError(
                          formikRef?.current.errors.items as any,
                          //@ts-ignore
                          formikRef?.current.errors.items?.findIndex((item: any) => item?.name || item?.quantity),
                          "items",
                        );
                    }
                    flag.current.popState = false;
                    flag.current.navigateByBreadCrumb = false;
                    setOpenDialog(false);
                    return;
                  }

                  if (isChangedOnPage && state.showBeforeChart && warning.current) {
                    toast.error("データを保存する前にチャートを生成してください");
                    flag.current.popState = false;
                    flag.current.navigateByBreadCrumb = false;
                    setOpenDialog(false);
                    return;
                  }
                  await handleUploadDataToServer(refImageExtension.current);
                  setOpenDialog(false);
                  if (requestStatus.current) {
                    handleCancelSave(
                      flag.current.navigateByBreadCrumb || flag.current.popState
                        ? previousPageRef.current
                        : pageRef.current,
                    );
                  }
                }}
                color="secondary"
                className="focus:outline-none"
                autoFocus
                type="button"
              >
                保存する
              </Button>
            </DialogActions>
          </Dialog>
        </Form>
      </Formik>
    </>
  );
};

export default memo(SingleMode);
