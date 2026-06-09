import { typeimg } from "@/components/chart/GeneralChart";
import { EventType } from "@/constant/enum";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { App, Auth } from "@/enum/pathnames";
import styles from "@/features/fta/components/Node.module.css";
import singleModeService from "@/services/apis/singlemodeService";
import { reducer } from "@/store/reducer/generateChart.reducer";
import { logout } from "@/store/slices/authSlice";
import { clearSavePareto, setSavePareto } from "@/store/slices/checkSaveDataSlice";
import { RootState } from "@/store/store";
import { handleApi } from "@/utils/handleApi";
import { Refresh, ZoomOut } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
// import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
// import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { signOut } from "aws-amplify/auth";
import { Form, Formik, FormikProps, FormikValues } from "formik";
import { ZoomIn } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, useContext } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { array, boolean, number, object, string } from "yup";
import UserInfoPareto from "../../components/UserInfor";
import { useParetoData } from "../../hooks/useParetoData";
import { FontTypeSelector } from "../../presentation/FontSetting";
import { DataItem } from "../../types";
import { base64ToBlob } from "../../utils/base64ToBlob";
import { convertImageToBlob } from "../../utils/convertImage";
import { saveAsCSV, saveAsPNG } from "../../utils/export";
import { generateColor } from "../../utils/paretoCalculations";
import { scrollToError } from "../../utils/scrollError";
import ChartControls from "../ChartControls";
import DataInput from "../DataInput";
import DataTable from "../DataTable";
import GraphSettings from "../GraphSettings";
import ParetoChart from "../ParetoChart";
import { ImageExtension } from "../SingleMode";
import { FontSizeContext } from "../../provider";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import event from "@/utils/eventEmitter";
import { CircularProgress } from "@mui/material";

// This constant is used to determine if the component is in before/after mode
const isBeforeAfterMode = true;

const CompareMode = () => {
  const {
    beforeData,
    afterData,
    beforeProcessedData,
    afterProcessedData,
    totalQuantityBefore: beforeTotalQuantity,
    totalQuantityAfter: afterTotalQuantity,
    optionsAfter,
    optionsBefore,
    beforeAxisDomains,
    afterAxisDomains,
    // isBeforeAfterMode,
    // setIsBeforeAfterMode,
    handleDataInput,
    handleOptionChangeBefore,
    handleOptionChangeAfter,
    handleOptionChangeAll,
    generateBeforeChart,
    generateAfterChart,
    handleColorChange,
    handleLabelToggle,
    handleBulkColorChange,
    setOptionsBefore,
    setOptionsAfter,
    setAfterProcessedData,
    setBeforeProcessedData,
  } = useParetoData();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [state, dispatch] = useReducer(reducer, {
    showBeforeChart: false,
    showAfterChart: false,
    error: null,
  });
  const beforeChartRef = useRef<HTMLDivElement>(null);
  const afterChartRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const requestStatus = useRef({
    before: false,
    after: false,
  });
  const warning = useRef({
    before: false,
    after: false,
  });
  const previous_page = useLocation();
  const previousPageRef = useRef<any>(previous_page.state);
  const flag = useRef<{
    popState: boolean;
    navigateByBreadCrumb: boolean;
  }>({
    popState: false,
    navigateByBreadCrumb: false,
  });

  const [initialData, setInitialData] = useState({
    beforeItems: [{ name: "", quantity: 0, color: "", showBarLabel: true, showLineLabel: true }],
    afterItems: [{ name: "", quantity: 0, color: "", showBarLabel: true, showLineLabel: true }],
    xAxisItemCountBefore: 1,
    maxItemsAfter: undefined,
    maxItemsBefore: undefined,
    allZeroQuantityBefore: undefined,
    allZeroQuantityAfter: undefined,
    yAxisLabelOrientation: "vertical",
  });
  const [nameFile, setNameFile] = useState<string>("");
  const [mode, setMode] = useState("");
  const refImageExtension = useRef<ImageExtension>("png");
  const refImageExtensionAfter = useRef<ImageExtension>("png");
  const transformRefBefore = useRef<any>(null);
  const transformRefAfter = useRef<any>(null);
  const [shouldRender, setShouldRender] = useState<any>({});
  const dispatchCheckSaveData = useAppDispatch();
  const [openDialog, setOpenDialog] = useState(false);
  const [isLoadingDownloadImageChart, setIsLoadingDownloadImageChart] = useState({
    before: false,
    after: false,
  });
  const isChangedOnPage = useAppSelector((state: RootState) => state.checkSaveDataSlice.pareto);
  const pageRef = useRef("/pareto");
  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const save_parento = userRole?.PARENTO_SAVE_TYPED_DATA;
  const save_csv = userRole?.PARENTO_SAVE_AS_CSV;
  const save_image = userRole?.PARENTO_DOWNLOAD_IMAGE;
  const chose_font = userRole?.PARENTO_CHOOSE_FONT_TEXT;
  const createParento = userRole?.PARENTO_CREATE_PAGE;
  const imageBlob = useRef<{
    before: string | Blob | null;
    after: string | Blob | null;
  }>({
    before: null,
    after: null,
  });
  const [loading, setLoading] = useState<{
    before: boolean;
    after: boolean;
    all: boolean;
  }>({
    before: false,
    after: false,
    all: false,
  });

  const [select, setSelect] = useState<{
    typeimg_before: string | undefined;
    typeimg_after: string | undefined;
    font_before: string | undefined;
    font_after: string | undefined;
  }>({
    typeimg_before: undefined,
    typeimg_after: undefined,
    font_before: undefined,
    font_after: undefined,
  });
  const formikRef = useRef<FormikProps<FormikValues>>(null);

  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  const handleCancelSave = useCallback(async (page: string) => {
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

  const formikConfig = useMemo(() => {
    return {
      initialValues: initialData,
      validationSchema: object({
        beforeItems: array(
          object({
            name: string()
              .test("unique-name", "フィールド名が重複しないようにしてください。", function (value) {
                if (value) {
                  const items =
                    this.options.context &&
                    this.options.context.beforeItems.map((item: DataItem) => {
                      if (!item.name) {
                        item.name = "";
                      }
                      return item;
                    });

                  const nameCount = Array.isArray(items)
                    ? items?.filter((item: any) => item?.name?.trim() === value?.trim())?.length
                    : 1;
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
        afterItems: isBeforeAfterMode
          ? array(
              object({
                name: string()
                  .test("unique-name", "フィールド名が重複しないようにしてください。", function (value) {
                    if (value) {
                      const items =
                        this.options.context &&
                        this.options.context.afterItems.map((item: DataItem) => {
                          if (!item.name) {
                            item.name = "";
                          }
                          return item;
                        });

                      const nameCount = Array.isArray(items)
                        ? items?.filter((item: any) => item?.name?.trim() === value?.trim())?.length
                        : 1;

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
            )
              .min(1, "少なくとも 1 つのパラメータを選択してください。")
              .max(30, "30要素以内で入力してください")
          : array(),
        xAxisItemCountBefore: number()
          .transform((value) => (Number.isNaN(value) ? null : value))
          .min(1, "最小値は1です")
          .max(30, "最大値は30です")
          .required("このフィールドは必須です"),
        maxItemsAfter: string(),
        maxItemsBefore: string(),
        title: string().max(30, "30文字以内で入力してください"),
        yAxisLabel: string().max(15, "15文字以内で入力してください"),
        yAxisUnits: string().max(15, "15文字以内で入力してください"),
        yAxisLabelOrientation: string().oneOf(["vertical", "portrait", ""]),
        allZeroQuantityBefore: string().test(
          "check-all-zero-quantity",
          "すべての項目の数量を0にすることはできません。",
          function () {
            const items = this.parent.beforeItems || [];
            const allZero = items.every((item: any) => item.quantity === 0);

            if (allZero) {
              return false;
            }

            return true;
          },
        ),
        allZeroQuantityAfter: isBeforeAfterMode
          ? string().test("check-all-zero-quantity", "すべての項目の数量を0にすることはできません。", function () {
              const items = this.parent.afterItems || [];
              const allZero = items.every((item: any) => item.quantity === 0);

              if (allZero) {
                return false;
              }

              return true;
            })
          : string(),
      }),
      onSubmit: () => {},
      validateOnChange: true,
      validateOnBlur: false,
      validateOnMount: false,
    };
  }, [initialData, isBeforeAfterMode]);

  const onGenerateBeforeChart = async () => {
    try {
      warning.current.before = false;

      generateBeforeChart();
      dispatch({ type: "GENERATE_BEFORE_CHART" });
    } catch (error) {
      dispatch({ type: "SET_ERROR", error: "Beforeチャート生成中にエラーが発生しました。" });
    }
  };

  const onGenerateAfterChart = async () => {
    try {
      warning.current.after = false;
      generateAfterChart();
      dispatch({ type: "GENERATE_AFTER_CHART" });
    } catch (error) {
      dispatch({ type: "SET_ERROR", error: "Afterチャート生成中にエラーが発生しました。" });
    }
  };

  const handlePNGDownload = async (isBefore = false, imageExtension: ImageExtension) => {
    console.log(imageExtension);
    const chartElement = isBefore ? beforeChartRef.current : afterChartRef.current;
    const options = isBefore ? optionsBefore : optionsAfter;
    console.log("isBefore", isBefore);
    if (chartElement) {
      setIsLoadingDownloadImageChart((prev) => ({
        ...prev,
        before: isBefore,
        after: !isBefore,
      }));
      const fileName = `${new Date().toISOString().split("T")[0]}_${options?.title}.${imageExtension}`;
      await saveAsPNG(chartElement, fileName, imageExtension || "png");
      setIsLoadingDownloadImageChart((prev) => ({
        ...prev,
        before: false,
        after: false,
      }));
    }
  };

  const handleCSVDownload = async (isBefore = false) => {
    if (isBefore && !state.showBeforeChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    if (!isBefore && !state.showAfterChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    if (isBefore && state.showBeforeChart && warning.current.before) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    if (!isBefore && state.showAfterChart && warning.current.after) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    const data = isBefore ? beforeProcessedData : afterProcessedData;
    const options = isBefore ? optionsBefore : optionsAfter;
    const fileName = `${new Date().toISOString().split("T")[0]}_${options?.title}_${isBefore ? "(before)" : "(after)"}`;
    saveAsCSV(
      data.map((item) => ({ name: item.name, quantity: item.quantity })),
      fileName,
    );
  };

  const handleUploadDataToServer = async (isBefore = false, imageExtension: ImageExtension) => {
    if (isBefore && !state.showBeforeChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    if (!isBefore && !state.showAfterChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    if (isBefore && state.showBeforeChart && warning.current.before) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    if (!isBefore && state.showAfterChart && warning.current.after) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    setLoading((prev) => ({
      ...prev,
      before: isBefore,
      after: !isBefore,
    }));

    const data = isBefore ? beforeProcessedData : afterProcessedData;
    const options = isBefore ? optionsBefore : optionsAfter;
    const fileName = `${new Date().toISOString().split("T")[0]}_${options?.title}`;
    delete options.isBeforeAfterMode;

    //handle image
    const chartElement = beforeChartRef.current;
    if (chartElement) {
      const image = await convertImageToBlob(chartElement, "pareto", imageExtension);
      imageBlob.current.before = image;
    }

    const chartElementAfter = afterChartRef.current;
    if (chartElementAfter) {
      const image = await convertImageToBlob(chartElementAfter, "pareto", imageExtension);
      imageBlob.current.after = image;
    }

    let cumulativeQuantity = 0;
    const totalQuantity = isBefore
      ? beforeData.reduce((sum, item) => sum + item.quantity, 0)
      : afterData.reduce((sum, item) => sum + item.quantity, 0);

    if (
      Object.prototype.hasOwnProperty.call(options, "results") ||
      Object.prototype.hasOwnProperty.call(options, "resultsT") ||
      Object.prototype.hasOwnProperty.call(options, "resultsQ") ||
      Object.prototype.hasOwnProperty.call(options, "resultsR") ||
      Object.prototype.hasOwnProperty.call(options, "resultsN") ||
      Object.prototype.hasOwnProperty.call(options, "resultsTitle")
    ) {
      delete options?.results;
      delete options?.resultsT;
      delete options?.resultsQ;
      delete options?.resultsR;
      delete options?.resultsN;
      delete options?.resultsTitle;
    }
    if (!save_parento) {
      if (isBefore) {
        requestStatus.current.before = true;
        warning.current.before = true;
      } else {
        requestStatus.current.after = true;
        warning.current.after = true;
      }
      !isBeforeAfterMode && dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
      toast.error("権限の為、入力データが保存できません。");
      return;
    }
    const body = isBefore
      ? {
          mode: "BEFORE",
          name: fileName,
          before: {
            ...options,
            records:
              options.xAxisItemCount < beforeData.length
                ? beforeData.map((item, index) => {
                    cumulativeQuantity += item.quantity;
                    return {
                      name: item.name,
                      quantity: item.quantity,
                      cumulativeQuantity,
                      cumulativePercentage: (cumulativeQuantity / totalQuantity) * 100,
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
          beforeImage: base64ToBlob(imageBlob.current.before),
        }
      : {
          mode: "AFTER",
          name: fileName,
          after: {
            ...options,
            records:
              options.xAxisItemCount < afterData.length
                ? afterData.map((item, index) => {
                    cumulativeQuantity += item.quantity;
                    return {
                      name: item.name,
                      quantity: item.quantity,
                      cumulativeQuantity,
                      cumulativePercentage: (cumulativeQuantity / totalQuantity) * 100,
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
          afterImage: base64ToBlob(imageBlob.current.after),
        };
    const form = new FormData();
    form.append("mode", isBefore ? "BEFORE" : "AFTER");
    form.append("name", fileName);
    form.append(isBefore ? "before" : "after", JSON.stringify(isBefore ? body?.before : body?.after));
    //@ts-ignore
    form.append(isBefore ? "beforeImage" : "afterImage", isBefore ? body?.beforeImage : body?.afterImage);
    if (mode === body.mode && id) {
      const [res, error] = await handleApi(singleModeService.updatePareto(form, id));
      if (res) {
        if (isBefore) {
          requestStatus.current.before = true;
          warning.current.before = false;
        } else {
          requestStatus.current.after = true;
          warning.current.after = false;
        }
        !isBeforeAfterMode && dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));

        toast.success("保存が完了しました");
      }
      if (error) {
        if (!isBeforeAfterMode) {
          requestStatus.current.before = false;
        } else {
          isBefore ? (requestStatus.current.before = false) : (requestStatus.current.after = false);
        }
        toast.error(error);
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        navigate("/pareto/datafromcloud", { state: App.PARETO });

        console.log(error);
      }
    } else {
      const [res, error] = await handleApi(singleModeService.createPareto(form));
      if (res) {
        if (isBefore) {
          requestStatus.current.before = true;
          warning.current.before = false;
        } else {
          requestStatus.current.after = true;
          warning.current.after = false;
        }
        !isBeforeAfterMode && dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        toast.success("保存が完了しました");
      }
      if (error) {
        if (!isBeforeAfterMode) {
          requestStatus.current.before = false;
        } else {
          isBefore ? (requestStatus.current.before = false) : (requestStatus.current.after = false);
        }
        toast.error(error);
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        navigate("/pareto/datafromcloud", { state: App.PARETO });

        console.log(error);
      }
    }
    setLoading((prev) => ({
      ...prev,
      before: false,
      after: false,
    }));
  };

  const handleCSVDowloadAll = () => {
    if (!state.showBeforeChart || !state.showAfterChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    if (state.showBeforeChart && state.showAfterChart && (warning.current.before || warning.current.after)) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    const fileNameAfter = `${new Date().toISOString().split("T")[0]}_${optionsAfter?.title}`;
    saveAsCSV(
      afterProcessedData.map((item) => ({ name: item.name, quantity: item.quantity })),
      fileNameAfter,
    );
    const fileNameBefore = `${new Date().toISOString().split("T")[0]}_${optionsBefore?.title}`;
    saveAsCSV(
      beforeProcessedData.map((item) => ({ name: item.name, quantity: item.quantity })),
      fileNameBefore,
    );
  };

  const handleUploadCSVAll = async (imageExtensionBefore: any, imageExtensionAfter: any) => {
    if (!state.showBeforeChart || !state.showAfterChart) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }

    if (state.showBeforeChart && state.showAfterChart && (warning.current.before || warning.current.after)) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    setLoading((prev) => ({
      ...prev,
      all: true,
    }));
    const fileNameAll = `${new Date().toISOString().split("T")[0]}_${optionsBefore?.title}_${optionsAfter?.title}`;
    delete optionsBefore.isBeforeAfterMode;
    delete optionsAfter.isBeforeAfterMode;

    const chartElement = beforeChartRef.current;

    if (chartElement) {
      const image = await convertImageToBlob(chartElement, "pareto", imageExtensionBefore);
      imageBlob.current.before = image;
    }

    const chartElementAfter = afterChartRef.current;
    if (chartElementAfter) {
      const image = await convertImageToBlob(chartElementAfter, "pareto", imageExtensionAfter);
      imageBlob.current.after = image;
    }
    let cumulativeQuantity = 0;
    const totalQuantityAfter = afterData.reduce((sum, item) => sum + item.quantity, 0);
    const totalQuantityBefore = beforeData.reduce((sum, item) => sum + item.quantity, 0);

    if (
      Object.prototype.hasOwnProperty.call(optionsBefore, "results") ||
      Object.prototype.hasOwnProperty.call(optionsBefore, "resultsT") ||
      Object.prototype.hasOwnProperty.call(optionsBefore, "resultsQ") ||
      Object.prototype.hasOwnProperty.call(optionsBefore, "resultsR") ||
      Object.prototype.hasOwnProperty.call(optionsBefore, "resultsN") ||
      Object.prototype.hasOwnProperty.call(optionsBefore, "resultsTitle")
    ) {
      delete optionsBefore?.results;
      delete optionsBefore?.resultsT;
      delete optionsBefore?.resultsQ;
      delete optionsBefore?.resultsR;
      delete optionsBefore?.resultsN;
      delete optionsBefore?.resultsTitle;
    }

    if (
      Object.prototype.hasOwnProperty.call(optionsAfter, "results") ||
      Object.prototype.hasOwnProperty.call(optionsAfter, "resultsT") ||
      Object.prototype.hasOwnProperty.call(optionsAfter, "resultsQ") ||
      Object.prototype.hasOwnProperty.call(optionsAfter, "resultsR") ||
      Object.prototype.hasOwnProperty.call(optionsAfter, "resultsN") ||
      Object.prototype.hasOwnProperty.call(optionsAfter, "resultsTitle")
    ) {
      delete optionsAfter?.results;
      delete optionsAfter?.resultsT;
      delete optionsAfter?.resultsQ;
      delete optionsAfter?.resultsR;
      delete optionsAfter?.resultsN;
      delete optionsAfter?.resultsTitle;
    }
    const body = {
      mode: "COMPARE",
      name: fileNameAll,
      after: {
        ...optionsAfter,
        records:
          optionsAfter.xAxisItemCount < afterData.length
            ? afterData.map((item, index) => {
                cumulativeQuantity += item.quantity;
                return {
                  name: item.name,
                  quantity: item.quantity,
                  cumulativeQuantity,
                  cumulativePercentage: (cumulativeQuantity / totalQuantityAfter) * 100,
                  color:
                    afterProcessedData.find((i) => i.name === item.name)?.color ??
                    afterProcessedData.find((i) => i.name === "その他")?.color ??
                    generateColor(),
                  showBarLabel:
                    (afterProcessedData[index]
                      ? afterProcessedData[index]?.showBarLabel
                      : afterProcessedData[afterProcessedData.length - 1]?.showBarLabel) ?? true,
                  showLineLabel:
                    (afterProcessedData[index]
                      ? afterProcessedData[index]?.showLineLabel
                      : afterProcessedData[afterProcessedData.length - 1]?.showLineLabel) ?? true,
                };
              })
            : afterProcessedData,
      },
      afterImage: base64ToBlob(imageBlob.current.after),
      before: {
        ...optionsBefore,
        records:
          optionsBefore.xAxisItemCount < beforeData.length
            ? beforeData.map((item, index) => {
                cumulativeQuantity += item.quantity;
                return {
                  name: item.name,
                  quantity: item.quantity,
                  cumulativeQuantity,
                  cumulativePercentage: (cumulativeQuantity / totalQuantityBefore) * 100,
                  color:
                    beforeProcessedData.find((i) => i.name === item.name)?.color ??
                    beforeProcessedData.find((i) => i.name === "その他")?.color ??
                    generateColor(),
                  showBarLabel:
                    (beforeProcessedData[index]
                      ? beforeProcessedData[index]?.showBarLabel
                      : beforeProcessedData[beforeProcessedData.length - 1]?.showBarLabel) ?? true,
                  showLineLabel:
                    (beforeProcessedData[index]
                      ? beforeProcessedData[index]?.showLineLabel
                      : beforeProcessedData[beforeProcessedData.length - 1]?.showLineLabel) ?? true,
                };
              })
            : beforeProcessedData,
      },
      beforeImage: base64ToBlob(imageBlob.current.before),
    };
    if (!save_parento) {
      requestStatus.current.after = true;
      requestStatus.current.before = true;
      warning.current.after = true;
      warning.current.before = true;
      dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
      toast.error("権限の為、入力データが保存できません。");
      return;
    }
    const form = new FormData();
    form.append("mode", "COMPARE");
    form.append("name", fileNameAll);
    form.append("after", JSON.stringify(body.after));
    form.append("before", JSON.stringify(body.before));
    form.append("beforeImage", body?.beforeImage);
    form.append("afterImage", body?.afterImage);
    if (mode !== body.mode && id) {
      const [res, error] = await handleApi(singleModeService.createPareto(form));
      if (res) {
        requestStatus.current.after = true;
        requestStatus.current.before = true;
        warning.current.after = false;
        warning.current.before = false;
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        toast.success("保存が完了しました");
      }
      if (error) {
        requestStatus.current.before = false;
        requestStatus.current.after = false;
        toast.error(error);
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        navigate("/pareto/datafromcloud", { state: App.PARETO });

        console.log(error);
      }
    } else {
      const [res, error] = await handleApi(
        id ? singleModeService.updatePareto(form, id) : singleModeService.createPareto(form),
      );
      if (res) {
        requestStatus.current.after = true;
        requestStatus.current.before = true;
        warning.current.after = false;
        warning.current.before = false;
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        toast.success("保存が完了しました");
      }
      if (error) {
        requestStatus.current.before = false;
        requestStatus.current.after = false;
        toast.error(error);
        dispatchCheckSaveData(setSavePareto({ pareto: false, fishbone: false }));
        navigate("/pareto/datafromcloud", { state: App.PARETO });

        console.log(error);
      }
    }
    setLoading((prev) => ({
      ...prev,
      all: false,
    }));
  };

  const getDetailPareto = async (id: any) => {
    const [res, error] = await handleApi(singleModeService.getDetailPareto(id));
    if (res) {
      setNameFile(res.data?.name);
      if (res.data?.mode === "BEFORE") {
        setBeforeProcessedData(res?.data?.beforePareto?.paretoItem);
        dispatch({ type: "GENERATE_BEFORE_CHART" });
      }
      if (res.data?.mode === "AFTER") {
        setAfterProcessedData(res?.data?.afterPareto?.paretoItem);
        dispatch({ type: "GENERATE_AFTER_CHART" });
      }
      if (res.data?.mode === "COMPARE") {
        setBeforeProcessedData(res?.data?.beforePareto?.paretoItem);
        setAfterProcessedData(res?.data?.afterPareto?.paretoItem);
        dispatch({ type: "GENERATE_BEFORE_CHART" });
        dispatch({ type: "GENERATE_AFTER_CHART" });
      }

      // setIsBeforeAfterMode(typeof res?.data?.afterId === "number" ? true : false);
      handleDataInput(res?.data?.beforePareto?.paretoItem, true);
      handleDataInput(res?.data?.afterPareto?.paretoItem, false);
      setMode(res.data?.mode);
      setInitialData({
        ...initialData,
        beforeItems: res?.data?.beforePareto?.paretoItem,
        afterItems: res?.data?.afterPareto?.paretoItem,
        xAxisItemCountBefore: res?.data?.beforePareto?.paretoItem?.length
          ? res?.data?.beforePareto?.paretoItem?.length
          : res?.data?.afterPareto?.paretoItem?.length
            ? res?.data?.afterPareto?.paretoItem?.length
            : 1,
        maxItemsAfter: undefined,
        maxItemsBefore: undefined,
      });

      const afterPareto = res?.data?.afterPareto;
      const beforePareto = res?.data?.beforePareto;
      delete afterPareto?.paretoItem;
      delete afterPareto?.id;
      delete beforePareto?.paretoItem;
      delete beforePareto?.id;

      if (beforePareto && afterPareto) {
        setOptionsBefore(beforePareto);
        setOptionsAfter(afterPareto);
      } else if (beforePareto && !afterPareto) {
        setOptionsBefore(beforePareto);
        setOptionsAfter({
          ...optionsAfter,
          title: beforePareto.title,
          yAxisLabel: beforePareto.yAxisLabel,
          yAxisUnits: beforePareto.yAxisUnits,
          labelOrientation: beforePareto.labelOrientation,
          yAxisLabelOrientation: beforePareto.yAxisLabelOrientation,
          lineLabelOrientation: beforePareto.lineLabelOrientation,
          columnLabelOrientation: beforePareto.columnLabelOrientation,
          xAxisItemCount: beforePareto.xAxisItemCount,
        });
      } else if (!beforePareto && afterPareto) {
        setOptionsAfter(afterPareto);
        setOptionsBefore({
          ...optionsBefore,
          title: afterPareto.title,
          yAxisLabel: afterPareto.yAxisLabel,
          yAxisUnits: afterPareto.yAxisUnits,
          labelOrientation: afterPareto.labelOrientation,
          yAxisLabelOrientation: afterPareto.yAxisLabelOrientation,
          lineLabelOrientation: afterPareto.lineLabelOrientation,
          columnLabelOrientation: afterPareto.columnLabelOrientation,
          xAxisItemCount: afterPareto.xAxisItemCount,
        });
      }
      setShouldRender({});
    }
    if (error) {
      console.log(error);
    }
  };

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

    breadcrumbs.push({ label: nameFile || "比較グラフの新規作成", href: "#" });

    setBreadcrumbItems(breadcrumbs);

    return () => setBreadcrumbItems([]);
  }, [previousPageRef.current, isChangedOnPage, navigate, setBreadcrumbItems, nameFile]);

  useEffect(() => {
    !id && handleOptionChangeAll("xAxisItemCount", 1);
  }, []);

  useEffect(() => {
    id && getDetailPareto(id);
  }, [id]);

  useEffect(() => {
    if (id) {
      if (mode === "BEFORE") {
        generateBeforeChart();
      } else if (mode === "AFTER") {
        generateAfterChart();
      } else if (mode === "COMPARE") {
        generateAfterChart();
        generateBeforeChart();
      }
    }
  }, [shouldRender]);

  useEffect(() => {
    if (state.showBeforeChart) {
      const errorElement = document.getElementById("before_chart") as HTMLElement;
      errorElement && errorElement.scrollIntoView();
    }
    if (state.showAfterChart) {
      const errorElement = document.getElementById("after_chart") as HTMLElement;
      errorElement && errorElement.scrollIntoView();
    }
  }, [state]);

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
      window.removeEventListener("beforeunload", handleNavigation);
      event.removeListener(EventType.PARETO_CHECK_SAVE_DATA, () => {});
    };
  }, [isChangedOnPage, location.pathname, navigate]);

  const handleFormChange = useCallback(
    (e: any, beforeSide: boolean = true, bothSide: boolean = false) => {
      formikRef.current && formikRef.current.handleChange(e);
      window.history.pushState(null, "", window.location.href);
      requestStatus.current.before = false;
      requestStatus.current.after = false;
      beforeSide ? (warning.current.before = true) : (warning.current.before = false);
      !beforeSide ? (warning.current.after = true) : (warning.current.after = false);
      if (bothSide) {
        warning.current.before = true;
        warning.current.after = true;
      }
      if (save_parento || save_csv) {
        dispatchCheckSaveData(setSavePareto({ pareto: true, fishbone: false }));
      }
    },
    [save_parento, save_csv],
  );

  const getItemName = (item: any) => item?.name || item?.quantity;

  return (
    <>
      <Formik
        {...formikConfig}
        innerRef={formikRef}
      >
        <Form
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
        >
          <div className="text-right">
            {/* <FormControlLabel
              control={
                <Switch
                  checked={isBeforeAfterMode}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (!e.target.checked && formikRef.current) {
                      formikRef.current.setFieldTouched(`afterItems`, false, false);
                      const new_errors = {
                        ...formikRef.current.errors,
                        maxItemsAfter: undefined,
                        afterItems: undefined,
                      };
                      delete new_errors.maxItemsAfter;
                      delete new_errors.afterItems;
                      formikRef.current.setErrors(new_errors);
                    }
                    setIsBeforeAfterMode(e.target.checked);
                  }}
                  color="primary"
                />
              }
              label="前/後モード"
            /> */}

            <Button
              variant="contained"
              type="button"
              className="focus:outline-none !mt-4 !mb-2 md:!w-[158px]"
              sx={{
                backgroundColor: "#fff",
                color: "#000",
                ":hover": {
                  backgroundColor: "#fff",
                },
              }}
              disabled={!isBeforeAfterMode || !save_parento || loading.all}
              onClick={async () => {
                formikRef.current && formikRef.current.handleSubmit();

                if (
                  formikRef.current &&
                  (formikRef.current.errors.beforeItems || formikRef.current.errors.afterItems)
                ) {
                  Array.isArray(formikRef.current?.errors?.beforeItems) &&
                    scrollToError(
                      formikRef.current?.errors?.beforeItems as any,
                      //@ts-ignore
                      formikRef.current?.errors?.beforeItems?.findIndex((item: any) => getItemName(item)),
                      "beforeItems",
                    );
                  Array.isArray(formikRef.current?.errors?.afterItems) &&
                    scrollToError(
                      formikRef.current?.errors?.afterItems as any,
                      //@ts-ignore
                      formikRef.current?.errors?.afterItems?.findIndex((item: any) => getItemName(item)),
                      "afterItems",
                    );
                  return;
                }

                save_parento && (await handleUploadCSVAll(refImageExtension.current, refImageExtensionAfter.current));
              }}
            >
              Webに保存
            </Button>

            <Button
              variant="contained"
              className="focus:outline-none !mt-2 md:!w-[158px] !ml-2"
              disabled={!isBeforeAfterMode || !save_csv}
              onClick={() => save_csv && handleCSVDowloadAll()}
              sx={{
                backgroundColor: "#fff",
                color: "#000",
                ":hover": {
                  backgroundColor: "#fff",
                },
              }}
            >
              CSVに保存
            </Button>

            <Button
              variant="contained"
              type="button"
              className="focus:outline-none !mt-2 md:!w-[158px] !ml-2"
              sx={{
                backgroundColor: "#fff",
                color: "#000",
                ":hover": {
                  backgroundColor: "#fff",
                },
              }}
              onClick={async () => {
                formikRef.current && formikRef.current.handleSubmit();
                const keysNumber = formikRef.current && Object.keys(formikRef.current?.errors)?.length;

                if (!isBeforeAfterMode) {
                  if (keysNumber) {
                    if (keysNumber >= 2 && formikRef.current?.errors?.beforeItems) {
                      return;
                    }
                    if (formikRef.current?.errors?.beforeItems) {
                      Array.isArray(formikRef.current?.errors?.beforeItems) &&
                        scrollToError(
                          formikRef.current?.errors?.beforeItems as any,
                          //@ts-ignore
                          formikRef.current?.errors?.beforeItems?.findIndex((item: any) => getItemName(item)),
                          "beforeItems",
                        );
                    }
                    return;
                  }
                  onGenerateBeforeChart();
                } else {
                  if (keysNumber) {
                    if (keysNumber >= 3) {
                      return;
                    }
                    if (formikRef.current.errors.beforeItems || formikRef.current.errors.afterItems) {
                      Array.isArray(formikRef.current?.errors?.beforeItems) &&
                        scrollToError(
                          formikRef.current.errors.beforeItems as any,
                          //@ts-ignore
                          formikRef.current.errors.beforeItems?.findIndex((item: any) => getItemName(item)),
                          "beforeItems",
                        );
                      Array.isArray(formikRef.current?.errors?.afterItems) &&
                        scrollToError(
                          formikRef.current.errors.afterItems as any,
                          //@ts-ignore
                          formikRef.current.errors.afterItems?.findIndex((item: any) => getItemName(item)),
                          "afterItems",
                        );
                    }
                    return;
                  }
                  onGenerateAfterChart();
                  onGenerateBeforeChart();
                }
              }}
              disabled={!createParento}
            >
              比較グラフを生成
            </Button>
          </div>
          <Grid
            container
            spacing={2}
          >
            <FontSizeContext
              children={
                <>
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <Typography
                      variant="h5"
                      component="h2"
                      gutterBottom
                    >
                      改善前
                    </Typography>
                    <Paper
                      elevation={3}
                      sx={{ p: 2, mb: 2 }}
                    >
                      <ChartControls
                        options={optionsBefore}
                        onOptionChange={handleOptionChangeAll}
                        xAxisItemCount="xAxisItemCountBefore"
                        handleFormChange={() => handleFormChange("", true, true)}
                        dataInputForm="beforeItems"
                        eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                      />
                    </Paper>
                    <Paper
                      elevation={3}
                      sx={{ p: 2, mb: 2 }}
                    >
                      <DataInput
                        onInput={(data) => handleDataInput(data, true)}
                        uploadCSV={EventType.UPLOAD_CSV_BEFORE_CHART}
                        dataInputForm="beforeItems"
                        xAxisItemCount="xAxisItemCountBefore"
                        maxItems="maxItemsBefore"
                        textCSV="過去入力情報のアップロード"
                        initialData={initialData.beforeItems}
                        handleFormChange={() => {
                          if (warning.current.after === true) {
                            handleFormChange("", true, true);
                          } else {
                            handleFormChange("", true, false);
                          }
                        }}
                        allZeroQuantity="allZeroQuantityBefore"
                        onOptionChange={handleOptionChangeBefore}
                        eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                      />
                    </Paper>

                    {state.showBeforeChart && beforeProcessedData.length > 0 && (
                      <>
                        <Paper
                          elevation={3}
                          sx={{ p: 2, mb: 2 }}
                        >
                          <GraphSettings
                            options={optionsBefore}
                            onOptionChange={handleOptionChangeBefore}
                            data={beforeProcessedData}
                            handleFormChange={() => handleFormChange("", true, false)}
                            eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                          />
                        </Paper>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Button
                            variant="contained"
                            color="primary"
                            type="button"
                            className="focus:outline-none w-full md:!w-[158px]"
                            disabled={!createParento}
                            onClick={async () => {
                              if (formikRef.current) {
                                formikRef.current.validateField("beforeItems").then(() => {
                                  if (formikRef.current && formikRef.current.errors.beforeItems) {
                                    Array.isArray(formikRef.current.errors.beforeItems) &&
                                      formikRef.current.errors.beforeItems.forEach((_, index: number) => {
                                        formikRef.current &&
                                          formikRef.current.setFieldTouched(`beforeItems[${index}].name`, true, true);
                                        formikRef.current &&
                                          formikRef.current.setFieldTouched(
                                            `beforeItems[${index}].quantity`,
                                            true,
                                            true,
                                          );
                                      });
                                    Array.isArray(formikRef.current?.errors?.beforeItems) &&
                                      scrollToError(
                                        formikRef.current.errors.beforeItems as any,
                                        //@ts-ignore
                                        formikRef.current.errors.beforeItems?.findIndex((item: any) =>
                                          getItemName(item),
                                        ),
                                        "beforeItems",
                                      );
                                    return;
                                  } else {
                                    if (Number.isNaN(optionsBefore.xAxisItemCount)) {
                                      return;
                                    }
                                    onGenerateBeforeChart();
                                  }
                                });
                              }
                            }}
                          >
                            パレート図を生成
                          </Button>
                          <Button
                            variant="contained"
                            className="focus:outline-none w-full md:!w-[158px]"
                            disabled={!save_parento || loading.before}
                            onClick={() => save_parento && handleUploadDataToServer(true, refImageExtension.current)}
                          >
                            Webに保存
                          </Button>
                          <Button
                            variant="contained"
                            className="focus:outline-none w-full md:!w-[158px]"
                            disabled={!save_csv}
                            onClick={() => save_csv && handleCSVDownload(true)}
                          >
                            CSVに保存
                          </Button>

                          <Button
                            className="bg-blue-500 !outline-none w-full md:!w-[158px]"
                            onClick={() => handlePNGDownload(true, refImageExtension.current)}
                            variant="contained"
                            disabled={!save_image || isLoadingDownloadImageChart.before}
                          >
                            {isLoadingDownloadImageChart.before && (
                              <div>
                                <CircularProgress size={22} />
                              </div>
                            )}
                            <span>画像のダウンロード</span>
                          </Button>
                          <Select
                            displayEmpty
                            disabled={!save_image}
                            value={select?.typeimg_before}
                            onChange={(e) => {
                              setSelect({
                                ...select,
                                typeimg_before: e.target.value as string,
                              });
                              refImageExtension.current = typeimg[e.target.value as "PNG" | "JPEG"] as ImageExtension;
                            }}
                            renderValue={(selected) => {
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
                            value={optionsBefore.fontFamily}
                            handleFormChange={() => handleFormChange("", true, false)}
                            disabled={!chose_font}
                          />
                        </div>
                        <Grid
                          container
                          spacing={2}
                        >
                          <Grid
                            item
                            xs={12}
                          >
                            <div
                              className={`lg:w-full w-full ${styles.boxCss} overflow-x-auto overflow-y-hidden mb-5 items`}
                            >
                              <TransformWrapper
                                initialScale={1}
                                centerOnInit={true}
                                ref={transformRefBefore}
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
                                            data={beforeProcessedData}
                                            totalQuantity={
                                              beforeTotalQuantity > afterTotalQuantity
                                                ? beforeTotalQuantity
                                                : afterTotalQuantity
                                            }
                                            options={optionsBefore}
                                            axisDomains={{
                                              quantity: beforeAxisDomains.quantity,
                                              percentage: {
                                                min: 0,
                                                max:
                                                  beforeTotalQuantity < afterTotalQuantity
                                                    ? ((beforeTotalQuantity > afterTotalQuantity
                                                        ? beforeTotalQuantity
                                                        : afterTotalQuantity) /
                                                        ((afterProcessedData.reduce(
                                                          (sum, item) => sum + item.quantity,
                                                          0,
                                                        ) || 1) >
                                                        (beforeProcessedData.reduce(
                                                          (sum, item) => sum + item.quantity,
                                                          0,
                                                        ) || 1)
                                                          ? beforeProcessedData.reduce(
                                                              (sum, item) => sum + item.quantity,
                                                              0,
                                                            ) || 1
                                                          : afterProcessedData.reduce(
                                                              (sum, item) => sum + item.quantity,
                                                              0,
                                                            ) || 1)) *
                                                      100
                                                    : (beforeTotalQuantity /
                                                        beforeProcessedData.reduce(
                                                          (sum, item) => sum + item.quantity,
                                                          0,
                                                        )) *
                                                      100,
                                              },
                                            }}
                                          />
                                        </div>
                                      </TransformComponent>
                                      <div
                                        ref={beforeChartRef}
                                        className="absolute top-[-9999px] w-full h-[720px] 4xl:h-[750px]"
                                      >
                                        <ParetoChart
                                          dowload
                                          data={beforeProcessedData}
                                          totalQuantity={
                                            beforeTotalQuantity > afterTotalQuantity
                                              ? beforeTotalQuantity
                                              : afterTotalQuantity
                                          }
                                          options={optionsBefore}
                                          axisDomains={{
                                            quantity: beforeAxisDomains.quantity,
                                            percentage: {
                                              min: 0,
                                              max:
                                                beforeTotalQuantity < afterTotalQuantity
                                                  ? ((beforeTotalQuantity > afterTotalQuantity
                                                      ? beforeTotalQuantity
                                                      : afterTotalQuantity) /
                                                      ((afterProcessedData.reduce(
                                                        (sum, item) => sum + item.quantity,
                                                        0,
                                                      ) || 1) >
                                                      (beforeProcessedData.reduce(
                                                        (sum, item) => sum + item.quantity,
                                                        0,
                                                      ) || 1)
                                                        ? beforeProcessedData.reduce(
                                                            (sum, item) => sum + item.quantity,
                                                            0,
                                                          ) || 1
                                                        : afterProcessedData.reduce(
                                                            (sum, item) => sum + item.quantity,
                                                            0,
                                                          ) || 1)) *
                                                    100
                                                  : (beforeTotalQuantity /
                                                      beforeProcessedData.reduce(
                                                        (sum, item) => sum + item.quantity,
                                                        0,
                                                      )) *
                                                    100,
                                            },
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}
                              </TransformWrapper>
                            </div>
                          </Grid>
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
                                onColorChange={(index, color) => handleColorChange(index, color, true)}
                                onLabelToggle={(index, showBarLabel, showLineLabel) =>
                                  handleLabelToggle(index, showBarLabel, showLineLabel, true)
                                }
                                onBulkColorChange={(color) => handleBulkColorChange(color, true)}
                                options={optionsBefore}
                                onOptionChange={handleOptionChangeBefore}
                                items={formikRef.current && formikRef.current.values.beforeItems}
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
                                handleFormChange={() => handleFormChange("", true, false)}
                              />
                            </Paper>
                          </Grid>
                        </Grid>
                      </>
                    )}
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                    className={`opacity-${isBeforeAfterMode ? "1" : "[0.5]"}`}
                  >
                    <Typography
                      variant="h5"
                      component="h2"
                      gutterBottom
                    >
                      改善後
                    </Typography>
                    <Paper
                      elevation={3}
                      sx={{ p: 2, mb: 2 }}
                    >
                      <ChartControls
                        options={optionsAfter}
                        onOptionChange={handleOptionChangeAfter}
                        xAxisItemCount="xAxisItemCountBefore"
                        isBeforeAfterMode={!isBeforeAfterMode}
                        dataInputForm="afterItems"
                        handleFormChange={() => handleFormChange("", true, true)}
                        eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                      />
                    </Paper>
                    <Paper
                      elevation={3}
                      sx={{ p: 2, mb: 2 }}
                    >
                      <DataInput
                        onInput={(data) => handleDataInput(data, false)}
                        uploadCSV={EventType.UPLOAD_CSV_AFTER_CHART}
                        dataInputForm="afterItems"
                        isBeforeAfterMode={isBeforeAfterMode}
                        xAxisItemCount="xAxisItemCountBefore"
                        maxItems="maxItemsAfter"
                        textCSV="過去入力情報のアップロード"
                        initialData={initialData.afterItems}
                        handleFormChange={() => {
                          if (warning.current.before === true) {
                            handleFormChange("", false, true);
                          } else {
                            handleFormChange("", false, false);
                          }
                        }}
                        allZeroQuantity="allZeroQuantityAfter"
                        onOptionChange={handleOptionChangeAfter}
                        eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                      />
                    </Paper>

                    {isBeforeAfterMode && state.showAfterChart && afterProcessedData.length > 0 && (
                      <>
                        <Paper
                          elevation={3}
                          sx={{ p: 2, mb: 2 }}
                        >
                          <GraphSettings
                            options={optionsAfter}
                            data={afterProcessedData}
                            onOptionChange={handleOptionChangeAfter}
                            handleFormChange={() => handleFormChange("", false, false)}
                            eventType={EventType.CHANGE_FONT_SIZE_LABEL_FIRST_RENDER}
                          />
                        </Paper>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Button
                            className="w-full md:!w-[158px] focus:outline-none"
                            variant="contained"
                            color="primary"
                            type="button"
                            onClick={async () => {
                              if (formikRef.current) {
                                formikRef.current.values["afterItems"].forEach((_: any, index: number) => {
                                  formikRef.current &&
                                    formikRef.current.setFieldTouched(`afterItems[${index}].name`, true, true);
                                  formikRef.current &&
                                    formikRef.current.setFieldTouched(`afterItems[${index}].quantity`, true, true);
                                });
                                Array.isArray(formikRef.current?.errors?.afterItems) &&
                                  scrollToError(
                                    formikRef.current.errors.afterItems as any,
                                    //@ts-ignore
                                    formikRef.current.errors.afterItems?.findIndex((item: any) => getItemName(item)),
                                    "afterItems",
                                  );
                                formikRef.current.validateField("afterItems").then(() => {
                                  if (formikRef.current && formikRef.current.errors.afterItems) {
                                    return;
                                  } else {
                                    if (Number.isNaN(optionsAfter.xAxisItemCount)) {
                                      return;
                                    }
                                    onGenerateAfterChart();
                                  }
                                });
                              }
                            }}
                            disabled={!isBeforeAfterMode || !createParento}
                          >
                            パレート図を生成
                          </Button>
                          <Button
                            variant="contained"
                            className="focus:outline-none w-full md:!w-[158px]"
                            disabled={!save_parento || loading.after}
                            onClick={() =>
                              save_parento && handleUploadDataToServer(false, refImageExtensionAfter.current)
                            }
                          >
                            Webに保存
                          </Button>
                          <Button
                            variant="contained"
                            className="focus:outline-none w-full md:!w-[158px]"
                            disabled={!save_csv}
                            onClick={() => save_csv && handleCSVDownload(false)}
                          >
                            CSVに保存
                          </Button>

                          <Button
                            className="bg-blue-500 !outline-none w-full md:!w-[158px]"
                            onClick={() => handlePNGDownload(false, refImageExtensionAfter.current)}
                            variant="contained"
                            disabled={!save_image || isLoadingDownloadImageChart.after}
                          >
                            {isLoadingDownloadImageChart.after && (
                              <div>
                                <CircularProgress size={22} />
                              </div>
                            )}
                            <span>画像のダウンロード</span>
                          </Button>
                          <Select
                            displayEmpty
                            disabled={!save_image}
                            value={select?.typeimg_after}
                            onChange={(e) => {
                              setSelect({
                                ...select,
                                typeimg_after: e.target.value as string,
                              });
                              refImageExtensionAfter.current = typeimg[
                                e.target.value as "PNG" | "JPEG"
                              ] as ImageExtension;
                            }}
                            renderValue={(selected) => {
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
                            optionChange={handleOptionChangeAfter}
                            value={optionsAfter.fontFamily}
                            handleFormChange={() => handleFormChange("", false, false)}
                            disabled={!chose_font}
                          />
                        </div>
                        <Grid
                          container
                          spacing={2}
                        >
                          <Grid
                            item
                            xs={12}
                          >
                            <div
                              className={`lg:w-full w-full ${styles.boxCss} overflow-x-auto overflow-y-hidden mb-5 items`}
                            >
                              <TransformWrapper
                                initialScale={1}
                                centerOnInit={true}
                                ref={transformRefAfter}
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
                                          id="after_chart"
                                        >
                                          <ParetoChart
                                            data={afterProcessedData}
                                            totalQuantity={
                                              beforeTotalQuantity > afterTotalQuantity
                                                ? beforeTotalQuantity
                                                : afterTotalQuantity
                                            }
                                            options={optionsAfter}
                                            axisDomains={{
                                              quantity: afterAxisDomains.quantity,
                                              percentage: {
                                                min: 0,
                                                max:
                                                  afterTotalQuantity < beforeTotalQuantity
                                                    ? ((beforeTotalQuantity > afterTotalQuantity
                                                        ? beforeTotalQuantity
                                                        : afterTotalQuantity) /
                                                        (afterProcessedData.reduce(
                                                          (sum, item) => sum + item.quantity,
                                                          0,
                                                        ) >
                                                        beforeProcessedData.reduce(
                                                          (sum, item) => sum + item.quantity,
                                                          0,
                                                        )
                                                          ? beforeProcessedData.reduce(
                                                              (sum, item) => sum + item.quantity,
                                                              0,
                                                            ) || 1
                                                          : afterProcessedData.reduce(
                                                              (sum, item) => sum + item.quantity,
                                                              0,
                                                            ) || 1)) *
                                                      100
                                                    : (afterTotalQuantity /
                                                        afterProcessedData.reduce(
                                                          (sum, item) => sum + item.quantity,
                                                          0,
                                                        ) || 1) * 100,
                                              },
                                            }}
                                          />
                                        </div>
                                      </TransformComponent>
                                      <div
                                        ref={afterChartRef}
                                        className="absolute top-[-9999px] w-full  h-[720px] 4xl:h-[750px]"
                                      >
                                        <ParetoChart
                                          data={afterProcessedData}
                                          totalQuantity={
                                            beforeTotalQuantity > afterTotalQuantity
                                              ? beforeTotalQuantity
                                              : afterTotalQuantity
                                          }
                                          options={optionsAfter}
                                          axisDomains={{
                                            quantity: afterAxisDomains.quantity,
                                            percentage: {
                                              min: 0,
                                              max:
                                                afterTotalQuantity < beforeTotalQuantity
                                                  ? ((beforeTotalQuantity > afterTotalQuantity
                                                      ? beforeTotalQuantity
                                                      : afterTotalQuantity) /
                                                      (afterProcessedData.reduce(
                                                        (sum, item) => sum + item.quantity,
                                                        0,
                                                      ) >
                                                      beforeProcessedData.reduce((sum, item) => sum + item.quantity, 0)
                                                        ? beforeProcessedData.reduce(
                                                            (sum, item) => sum + item.quantity,
                                                            0,
                                                          ) || 1
                                                        : afterProcessedData.reduce(
                                                            (sum, item) => sum + item.quantity,
                                                            0,
                                                          ) || 1)) *
                                                    100
                                                  : (afterTotalQuantity /
                                                      afterProcessedData.reduce(
                                                        (sum, item) => sum + item.quantity,
                                                        0,
                                                      ) || 1) * 100,
                                            },
                                          }}
                                          dowload
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}
                              </TransformWrapper>
                            </div>
                          </Grid>
                          <Grid
                            item
                            xs={12}
                          >
                            <Paper
                              elevation={3}
                              sx={{ p: 2, mb: 2 }}
                            >
                              <DataTable
                                data={afterProcessedData}
                                onColorChange={(index, color) => handleColorChange(index, color, false)}
                                onLabelToggle={(index, showBarLabel, showLineLabel) =>
                                  handleLabelToggle(index, showBarLabel, showLineLabel, false)
                                }
                                onBulkColorChange={(color) => handleBulkColorChange(color, false)}
                                options={optionsAfter}
                                onOptionChange={handleOptionChangeAfter}
                                items={formikRef.current && formikRef.current.values.afterItems}
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
                                totalQuantity={afterData.reduce((sum: number, item: any) => {
                                  return sum + Number(item.quantity || 0);
                                }, 0)}
                                handleFormChange={() => handleFormChange("", false, false)}
                              />
                            </Paper>
                          </Grid>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </>
              }
            />
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
                onClick={() =>
                  handleCancelSave(
                    flag.current.navigateByBreadCrumb || flag.current.popState
                      ? previousPageRef.current
                      : pageRef.current,
                  )
                }
                color="primary"
                className="focus:outline-none"
              >
                保存しない
              </Button>
              <Button
                onClick={async () => {
                  if (formikRef.current) {
                    formikRef.current.handleSubmit();
                    const keysNumber = Object.keys(formikRef.current?.errors)?.length;

                    if (!isBeforeAfterMode) {
                      if (keysNumber) {
                        if (keysNumber >= 2 && formikRef.current?.errors?.beforeItems) {
                          flag.current.popState = false;
                          flag.current.navigateByBreadCrumb = false;
                          setOpenDialog(false);
                          return;
                        }
                        if (formikRef.current?.errors?.beforeItems) {
                          Array.isArray(formikRef.current?.errors?.beforeItems) &&
                            scrollToError(
                              formikRef.current?.errors?.beforeItems as any,
                              //@ts-ignore
                              formikRef.current?.errors?.beforeItems?.findIndex((item: any) => getItemName(item)),
                              "beforeItems",
                            );
                        }
                        flag.current.popState = false;
                        flag.current.navigateByBreadCrumb = false;
                        setOpenDialog(false);
                        return;
                      }

                      if (isChangedOnPage && state.showBeforeChart && warning.current.before) {
                        toast.error("データを保存する前にチャートを生成してください");
                        flag.current.popState = false;
                        flag.current.navigateByBreadCrumb = false;
                        setOpenDialog(false);
                        return;
                      }

                      await handleUploadDataToServer(true, refImageExtension.current);
                      flag.current.popState = false;
                      flag.current.navigateByBreadCrumb = false;
                      setOpenDialog(false);
                      if (requestStatus.current.before) {
                        handleCancelSave(
                          flag.current.navigateByBreadCrumb || flag.current.popState
                            ? previousPageRef.current
                            : pageRef.current,
                        );
                      }
                    } else {
                      if (keysNumber) {
                        if (keysNumber >= 3) {
                          setOpenDialog(false);
                          flag.current.popState = false;
                          flag.current.navigateByBreadCrumb = false;
                          return;
                        }
                        if (formikRef.current?.errors?.beforeItems || formikRef.current?.errors?.afterItems) {
                          Array.isArray(formikRef.current?.errors?.beforeItems) &&
                            scrollToError(
                              formikRef.current?.errors?.beforeItems as any,
                              //@ts-ignore
                              formikRef.current?.errors?.beforeItems?.findIndex((item: any) => getItemName(item)),
                              "beforeItems",
                            );
                          Array.isArray(formikRef.current?.errors?.afterItems) &&
                            scrollToError(
                              formikRef.current?.errors?.afterItems as any,
                              //@ts-ignore
                              formikRef.current?.errors?.afterItems?.findIndex((item: any) => getItemName(item)),
                              "afterItems",
                            );
                        }
                        flag.current.popState = false;
                        flag.current.navigateByBreadCrumb = false;
                        setOpenDialog(false);
                        return;
                      } else {
                        if (
                          isChangedOnPage &&
                          state.showBeforeChart &&
                          state.showAfterChart &&
                          (warning.current.after || warning.current.before)
                        ) {
                          toast.error("データを保存する前にチャートを生成してください");
                          flag.current.popState = false;
                          flag.current.navigateByBreadCrumb = false;
                          setOpenDialog(false);
                          return;
                        }
                        await handleUploadCSVAll(refImageExtension.current, refImageExtensionAfter.current);
                        flag.current.popState = false;
                        flag.current.navigateByBreadCrumb = false;
                        setOpenDialog(false);
                        if (requestStatus.current.after && requestStatus.current.before) {
                          handleCancelSave(
                            flag.current.navigateByBreadCrumb || flag.current.popState
                              ? previousPageRef.current
                              : pageRef.current,
                          );
                        }
                      }
                    }
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

export default memo(CompareMode);
