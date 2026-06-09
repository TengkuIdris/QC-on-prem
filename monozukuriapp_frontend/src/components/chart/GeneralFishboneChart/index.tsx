import React, { useCallback, useEffect, useRef, useState, useContext } from "react";
import {
  Box,
  Button,
  IconButton,
  useMediaQuery,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  SelectChangeEvent,
  Select,
  MenuItem,
  Typography,
  Tabs,
  Tab,
  Popper,
  Paper,
  CircularProgress,
} from "@mui/material";
import { ZoomOut, ZoomOutMap as ZoomOutMapIcon } from "@mui/icons-material";
import { ZoomIn } from "lucide-react";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ReactZoomPanPinchHandlers, TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import Tree from "../../../features/fta/components/Node";
import { useAppDispatch, useAppSelector } from "../../../core/hooks";
import styles from "../../../features/fta/components/Node.module.css";
import FishboneChartComponent from "../../../features/diagram/FishBoneChart";
import { setSubmitStatus } from "../../../store/slices/submitSlice";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { handleApi } from "@/utils/handleApi";
import { toast } from "react-toastify";
import { ImageExtension } from "@/features/pareto/components/SingleMode";
import { saveAsPNGFishbone } from "@/features/pareto/utils/export";
import { convertImageToBlob } from "@/features/pareto/utils/convertImage";
import { Node } from "@/store/slices/treeSlice";
import { Form, Formik, FormikProps } from "formik";
import { clearSaveFishBone, setSaveFishBone } from "@/store/slices/checkSaveDataSlice";
import { RootState } from "@/store/store";
import { EventChatType, EventType } from "@/constant/enum";
import event from "@/utils/eventEmitter";
import { App, Auth } from "@/enum/pathnames";
import { logout } from "@/store/slices/authSlice";
import { signOut } from "aws-amplify/auth";
import { MenuProps, typeimg } from "../GeneralChart";
import TabPanel from "./components/TabPanel";
import { Font, FontSize, TypeApi } from "./enums";
import { api, FontFamily } from "./constants";
import { ImperativePanelGroupHandle, Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import exportToExcel from "@/utils/exportToExcel";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Collapse, Fade } from "@mui/material";
import { setNodeFishbone } from "@/store/slices/nodeFisboneSlice";

export type SelectLanguage = "English" | "Japanese" | "Thai" | "Spanish";

const GeneralChartFishBone: React.FC = () => {
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const theme = useTheme();
  const transformRef = useRef<any>(null);
  const [transformState, setTransformState] = useState<{
    positionX: number;
    positionY: number;
    previousScale: number;
    scale: number;
  }>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useAppDispatch();
  const nodeFishbone = useAppSelector((state) => state.nodeFishbone);
  const navigate = useNavigate();
  const [treeNode, setTreeNode] = useState<Node | undefined>(
    id
      ? undefined
      : {
          id: 0,
          name: "タイトル",
          level: 0,
          children: [],
        },
  );
  const [isOpenExpandCollapse, setIsOpenExpandCollapse] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [selectedFont, setSelectedFont] = useState<string>(FontFamily[Font.MSGothic]);
  const [selectLanguage, setSelectLanguage] = useState<SelectLanguage>("Japanese");
  const isSubmittedRef = useRef<boolean>(false);
  const refImageExtension = useRef<ImageExtension>("png");
  const formikRef = useRef<
    FormikProps<{
      title: string;
      new_message: string;
    }>
  >();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [arrowRef, setArrowRef] = useState(null);

  const [disableButton, setDisableButton] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openPopUp, setOpenPopUp] = useState<boolean>(false);
  const [disableDowload, setDisableDowload] = useState<boolean>(false);
  const dispatchCheckSaveData = useAppDispatch();
  const pageRef = useRef("/diagram");
  const isChangedOnPage = useAppSelector((state: RootState) => state.checkSaveDataSlice.fishbone);
  const requestStatus = useRef<boolean>(false);
  const genChartRef = useRef<boolean>(id ? true : false);
  const warning = useRef<boolean>(false);
  const previous_page = useLocation();
  const previousPageRef = useRef<any>(previous_page.state);
  const flag = useRef<{
    popState: boolean;
    navigateByBreadCrumb: boolean;
  }>({
    popState: false,
    navigateByBreadCrumb: false,
  });
  const [rootFontSize, setRootFontSize] = useState<FontSize | string>(FontSize._16px);
  const [firstChildFontSize, setFirstChildFontSize] = useState<FontSize | string>(FontSize._14px);
  const [otherChildFontSize, setOtherChildFontSize] = useState<FontSize | string>(FontSize._12px);
  const handleFontChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as string;
    setSelectedFont(value);
  };
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setIsOpenExpandCollapse(true);
    setTabValue(newValue);
  };

  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const saveFishbone = userRole?.FISHBONE_SAVE_TYPED_DATA;
  const createFishbone = userRole?.FISHBONE_CREATE_PAGE;
  const dowloadImage = userRole?.FISHBONE_DOWNLOAD_IMAGE;
  const selectedFontFamily = userRole?.FISHBONE_CHOOSE_FONT_TEXT;
  const selectedFontSize = userRole?.FISHBONE_CHOOSE_FONT_SIZE;
  const aiTest = userRole?.FISHBONE_AI_TEST;
  const queryIds = useRef<number[]>([]);
  const [diagrams, setDiagrams] = useState<string>("");
  const [select, setSelect] = useState<{
    typeimg: string | undefined;
    fontFamily: string | undefined;
    fontSize: string | undefined;
  }>({
    typeimg: undefined,
    fontFamily: undefined,
    fontSize: undefined,
  });
  const [nameFile, setNameFile] = useState<string>();
  const [isLoadingDownloadImageChart, setIsLoadingDownloadImageChart] = useState<boolean>(false);
  const zoomPanPinchHandlers = useRef<Pick<ReactZoomPanPinchHandlers, "zoomIn" | "zoomOut" | "setTransform">>();
  const tree = useAppSelector((state: RootState) => state.tree);
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);

  const uploadFishboneChart = async () => {
    const chartElement = document.querySelector("#diagram svg") as HTMLElement;
    let imageBody = new Blob();
    const fileName = `${new Date().toISOString().split("T")[0]}_${treeNode?.name || "タイトル"}`;

    if (chartElement) {
      const image = await convertImageToBlob(chartElement, fileName, refImageExtension.current, "fishbone");
      imageBody = image as Blob;
    }

    // Trim all node names before sending to backend
    const trimmedTreeNode = trimTreeNodeNames(treeNode);

    const form = new FormData();
    form.append("fontFamily", selectedFont);
    form.append("rootFontSize", rootFontSize.replace("px", ""));
    form.append("firstLevelFontSize", firstChildFontSize.replace("px", ""));
    form.append("otherLevelFontSize", otherChildFontSize.replace("px", ""));
    form.append("parameters", JSON.stringify(trimmedTreeNode));
    form.append("thumbnail", imageBody);
    form.append("queryIds", JSON.stringify(queryIds.current));

    // treeNode && saveAsCSVFishBone(treeNode, fileName);

    //@ts-ignore
    const [res, error] = await handleApi(api[id ? TypeApi.UPDATE : TypeApi.CREATE](id ? id : form, form));
    if (res) {
      requestStatus.current = true;
      warning.current = true;
      dispatchCheckSaveData(clearSaveFishBone());
      toast.success("保存が完了しました");
    }
    if (error) {
      dispatchCheckSaveData(clearSaveFishBone());
      requestStatus.current = false;
      error && navigate("/diagram/fishbone/datafromcloud", { state: App.DIAGRAM });
      toast.error(error);
    }
    setDisableButton(false);
  };

  const confirmUploadFishbone = async () => {
    if (!isSubmittedRef.current) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    setDisableButton(true);
    await uploadFishboneChart();
  };

  const getFishBone = async (id: string | number) => {
    const [res, error] = await handleApi(api[TypeApi.GET](id));
    if (res) {
      const parameters =
        res.data.parameters && typeof res.data.parameters === "object"
          ? res.data.parameters
          : res.data.parameters
            ? JSON.parse(res.data.parameters)
            : {};
      setNameFile(parameters.name);
      setTreeNode({
        ...(res.data.parameters && typeof res.data.parameters === "object"
          ? res.data.parameters
          : res.data.parameters
            ? JSON.parse(res.data.parameters)
            : {}),
        title: res.data.name,
        fontFamily: res.data.fontFamily,
      });
      res.data?.fontFamily && setSelectedFont(res.data.fontFamily);
      setRootFontSize(`${res.data?.rootFontSize}px`);
      setFirstChildFontSize(`${res.data?.firstLevelFontSize}px`);
      setOtherChildFontSize(`${res.data?.otherLevelFontSize}px`);
      formikRef.current?.setFieldValue("title", res.data.name);
      isSubmittedRef.current = true;
      dispatch(
        setNodeFishbone({
          problem: res?.data?.parameters?.name || "",
          diagrams: "",
          fishBoneId: res.data.id,
        }),
      );
    }
    if (error) {
      console.log(error);
    }
  };

  const handlePNGDownload = async (imageExtension: ImageExtension) => {
    if (!isSubmittedRef.current) {
      toast.error("画像を保存する前にチャートを生成してください");
      return;
    }

    setDisableDowload(true);
    const svgElement = document.querySelector("#diagram svg") as HTMLElement;

    const clonedSvg = svgElement.cloneNode(true) as HTMLElement;
    document.getElementById("renderDownload")?.appendChild(clonedSvg);
    // @ts-ignore
    const viewBox = clonedSvg?.getAttribute("viewBox")?.split(" ");

    // @ts-ignore
    clonedSvg.setAttribute("width", viewBox[2]);
    // @ts-ignore
    clonedSvg.setAttribute("height", viewBox[3]);
    setIsLoadingDownloadImageChart(true);
    if (clonedSvg) {
      try {
        const fileName = `${new Date().toISOString().split("T")[0]}_${treeNode?.name || "タイトル"}.${imageExtension}`;
        await await saveAsPNGFishbone(clonedSvg as HTMLElement, fileName, imageExtension, selectedFont);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("画像のエクスポート中にエラーが発生しました");
      } finally {
        setIsLoadingDownloadImageChart(false);
        setDisableDowload(false);
      }
    } else {
      setDisableDowload(false);
    }
  };

  const validateNodeRecursive = (node: Node, parentName: string = ""): boolean => {
    if (node.name && node.name.trim() !== "") {
      if (node.children && node.children.length > 0) {
        const hasValidChild = node.children.some((child) => child.name && child.name.trim() !== "");

        if (!hasValidChild) {
          const nodePath = parentName ? `${parentName} > ${node.name}` : node.name;
          toast.error(`「${nodePath}」の配下に少なくとも1つの要因を入力してください`);
          return false;
        }

        for (const child of node.children) {
          const nodePath = parentName ? `${parentName} > ${node.name}` : node.name;
          if (!validateNodeRecursive(child, nodePath)) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const validateFishboneData = (node: Node | undefined): boolean => {
    if (!node) {
      toast.error("特性要因図のデータがありません");
      return false;
    }

    if (!node.name || node.name.trim() === "") {
      toast.error("タイトルを入力してください");
      return false;
    }
    // Validate recursively all levels
    return validateNodeRecursive(node);
  };

  // Use functional update to always get the latest state value
  // This ensures we get the current state even if Tree component mutates objects
  const handleButtonClick = () => {
    // Get the latest data from Redux instead of local state
    // Tree component updates Redux via dispatch(setRootNode())
    const currentTreeNode = tree.rootNode;

    if (!validateFishboneData(currentTreeNode)) {
      return;
    }

    dispatch(setSubmitStatus(true));
    isSubmittedRef.current = true;
    genChartRef.current = true;
    warning.current = false;
  };

  const handleCancelSave = useCallback(async (page: string) => {
    dispatchCheckSaveData(clearSaveFishBone());
    if (page !== Auth.LOGIN) {
      navigate(page);
    } else {
      await signOut();
      dispatchCheckSaveData(logout());
      toast.success("ログアウトは成功しました。");
      navigate(Auth.LOGIN);
    }
  }, []);

  const handleNavigation = useCallback(
    (e: any) => {
      if (isChangedOnPage && Boolean(saveFishbone)) {
        e.preventDefault();
        return "";
      }
    },
    [isChangedOnPage],
  );

  const handleExportExcel = () => {
    console.log("tree: ", tree);
    const emptyRow: string[] = [];
    const title = [tree.rootNode.name];
    const header = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6"];

    const data = [title, emptyRow, header];

    const handleAddDataBody = (children: Node[]) => {
      for (const child of children) {
        const newRow = Array(child.level - 1).fill("");
        newRow.push(child.name);
        data.push(newRow);
        if (child.children.length > 0) {
          handleAddDataBody(child.children);
        }
      }
    };

    handleAddDataBody(tree.rootNode.children);

    exportToExcel(data, "fishbone_chart.xlsx");
  };

  // Trim all node names recursively before rendering
  const trimTreeNodeNames = (node: Node | undefined): Node | undefined => {
    if (!node) return undefined;

    const trimNode = (n: Node): Node => {
      return {
        ...n,
        name: n.name?.trim() || "",
        children: n.children?.map(trimNode) || [],
      };
    };

    return trimNode(node);
  };

  useEffect(() => {
    id && getFishBone(id);
  }, [id]);

  useEffect(() => {
    if (isMobile) {
      panelGroupRef.current?.setLayout([30, 70]);
    }
  }, [isMobile]);

  useEffect(() => {
    window.addEventListener("beforeunload", handleNavigation);
    window.addEventListener("popstate", () => {
      flag.current.popState = true;
      setOpenPopUp(true);
    });

    event.on(EventType.PARETO_CHECK_SAVE_DATA, (param: string) => {
      setOpenPopUp(true);
      pageRef.current = param;
    });

    return () => {
      event.removeListener(EventType.PARETO_CHECK_SAVE_DATA, () => {});
      window.removeEventListener("beforeunload", handleNavigation);
    };
  }, [isChangedOnPage, location.pathname, navigate]);

  useEffect(() => {
    const mapping = {
      [App.DATA_FROM_CLOUD_FISHBONE]: [
        { label: "特性要因図作成ツール", href: "#", onClick: () => navigate("/diagram") },
        {
          label: "保存したデータ",
          href: "#",
          onClick: () => {
            if (isChangedOnPage) {
              flag.current.navigateByBreadCrumb = true;
              setOpenPopUp(true);
              return;
            }
            navigate(App.DATA_FROM_CLOUD_FISHBONE);
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
              setOpenPopUp(true);
              return;
            }
            navigate(App.YOUR_PROJECTS);
          },
        },
      ],
    };

    const breadcrumbs = [];

    if (previousPageRef.current === App.DATA_FROM_CLOUD_FISHBONE) {
      breadcrumbs.push(...mapping[App.DATA_FROM_CLOUD_FISHBONE]);
    } else if (previousPageRef.current === App.YOUR_PROJECTS) {
      breadcrumbs.push(...mapping[App.YOUR_PROJECTS]);
    } else {
      breadcrumbs.push({
        label: "特性要因図作成ツール",
        href: "#",
        onClick: () => {
          if (isChangedOnPage) {
            flag.current.navigateByBreadCrumb = true;
            setOpenPopUp(true);
            return;
          }
          navigate("/diagram");
        },
      });
    }

    breadcrumbs.push({ label: nameFile || `新規作成`, href: "#" });

    setBreadcrumbItems(breadcrumbs);
    return () => setBreadcrumbItems([]);
  }, [previousPageRef.current, isChangedOnPage, navigate, setBreadcrumbItems, nameFile]);

  return (
    <Box
      className="h-full"
      sx={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pt: 2,
      }}
    >
      <Formik
        initialValues={{
          title: "",
          new_message: "",
        }}
        onSubmit={() => {}}
      >
        {(formik) => {
          const handleFormChange = (e: any) => {
            formik.handleChange(e);
            requestStatus.current = false;
            warning.current = true;
            window.history.pushState(null, "", window.location.href);
            if (saveFishbone) {
              dispatchCheckSaveData(setSaveFishBone({ pareto: false, fishbone: true }));
            }
          };
          formikRef.current = formik;
          return (
            <Form className="h-full">
              <div
                ref={containerRef}
                className="flex flex-col lg:flex-row h-full gap-5"
              >
                <PanelGroup
                  autoSaveId="fishbone-panel-group"
                  direction="horizontal"
                  ref={panelGroupRef}
                >
                  <Panel
                    defaultSize={35}
                    minSize={10}
                  >
                    <div className={`w-full h-full ${styles.boxCss} block h-full border rounded-md border-black/20`}>
                      <Box
                        display="flex"
                        height={"100%"}
                        // className="height_chatUI"
                      >
                        <Box
                          width="100%"
                          height={"100%"}
                          className=""
                        >
                          <div
                            id="root"
                            className="h-full flex flex-col"
                          >
                            <div
                              className="flex  justify-between flex-wrap mt-2 my-4 h-20"
                              style={{ gap: 16 }}
                            >
                              <Button
                                variant="contained"
                                sx={{
                                  backgroundColor: "#4B73FF",
                                  color: "#fff",
                                  borderRadius: "4px",
                                  height: "36px",
                                  padding: "6px 12px",
                                  fontWeight: 600,
                                  fontFamily: "NotoSansJP, -apple-system, BlinkMacSystemFont, sans-serif",
                                  textTransform: "none",
                                  boxShadow: "none",
                                  "&:hover": { backgroundColor: "#3960D0" },
                                }}
                                disableElevation
                                startIcon={
                                  <span
                                    role="img"
                                    aria-label="ai"
                                  >
                                    🐟
                                  </span>
                                }
                                disabled={!nodeFishbone.payload.problem || nodeFishbone.isLoading}
                                onClick={(e) => {
                                  console.log(nodeFishbone);
                                  setAnchorEl(e.currentTarget);
                                  event.emit(EventChatType.CALL_AI_WITH_FIRST_NODE, {
                                    language: selectLanguage,
                                  });
                                }}
                              >
                                AIで展開
                              </Button>
                              <Select
                                variant="outlined"
                                size="small"
                                defaultValue={selectLanguage}
                                value={selectLanguage}
                                sx={{
                                  minWidth: 120,
                                  backgroundColor: "#fff",
                                  border: "1px solid #E5E8EC",
                                  color: "#374151",
                                  borderRadius: "4px",
                                  height: "36px",
                                  fontFamily: "NotoSansJP, -apple-system, BlinkMacSystemFont, sans-serif",
                                  fontWeight: 500,
                                  ".MuiSelect-icon": { color: "#5F6D7E" },
                                  ".MuiOutlinedInput-notchedOutline": { border: "none" },
                                }}
                                onChange={(e) => {
                                  setSelectLanguage(e.target.value as SelectLanguage);
                                }}
                              >
                                <MenuItem value="English">English</MenuItem>
                                <MenuItem value="Spanish">Spanish</MenuItem>
                                <MenuItem value="Japanese">日本語</MenuItem>
                                <MenuItem value="Thai">ภาษาไทย</MenuItem>
                              </Select>
                            </div>
                            <div className={`w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh_-240px)]`}>
                              <div className="my-[20px] w-max min-w-full">
                                {treeNode?.children && (
                                  <div data-testid="tree-container">
                                    <Tree
                                      root={treeNode}
                                      maxNode={6}
                                      setTreeNode={setTreeNode}
                                      isSubmittedRef={isSubmittedRef}
                                      handleFormChange={handleFormChange}
                                      setDiagrams={setDiagrams}
                                      diagrams={diagrams}
                                      queryIds={queryIds}
                                      disableAi={!aiTest}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Box>
                      </Box>
                    </div>
                  </Panel>
                  {!isMobile && (
                    <PanelResizeHandle className="w-[5px] h-full bg-gray-300 cursor-col-resize hover:bg-gray-400 mx-[2.5px]" />
                  )}
                  <Panel
                    defaultSize={65}
                    minSize={14}
                  >
                    <div
                      className={`w-full h-full flex flex-col ${styles.boxCss} border rounded-md border-black/20 h-full`}
                    >
                      <div className=" h-full flex-col flex">
                        <div className="flex gap-2 justify-between cursor-default flex-wrap">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="contained"
                              onClick={handleButtonClick}
                              className={`${styles.buttonSubmited} !w-[200px] `}
                              disabled={!createFishbone}
                            >
                              特性要因図に反映
                            </Button>
                            <Button
                              variant="contained"
                              className="contained bg-[#00B0F0] text-white !w-[220px] !h-[40px] self-end"
                              type="button"
                              disabled={disableButton || !saveFishbone}
                              onClick={async () => {
                                formik.handleSubmit();
                                const keysNumber = Object.keys(formik?.errors)?.length;
                                if (keysNumber) {
                                  return;
                                }
                                await confirmUploadFishbone();
                              }}
                            >
                              入力データのWEB保存
                            </Button>
                          </div>
                          <div>
                            <Box className="flex items-center rounded-md bg-white p-1 shadow-lg">
                              <IconButton
                                onClick={() => {
                                  zoomPanPinchHandlers.current?.zoomIn(0.2);
                                }}
                                data-testid="zoom-in-button"
                                size="small"
                              >
                                <ZoomIn size={20} />
                              </IconButton>
                              <Typography
                                variant="caption"
                                sx={{ marginY: 0.5, cursor: "default" }}
                              >
                                {`${Math.round((transformState?.scale || 1) * 100)}%`}
                              </Typography>
                              <IconButton
                                onClick={() => {
                                  zoomPanPinchHandlers.current?.zoomOut(0.2);
                                }}
                                data-testid="zoom-out-button"
                                size="small"
                              >
                                <ZoomOut fontSize="small" />
                              </IconButton>
                              <IconButton
                                onClick={() => {
                                  zoomPanPinchHandlers.current?.setTransform(0, 0, 1);
                                }}
                                data-testid="reset-zoom-button"
                                size="small"
                              >
                                <ZoomOutMapIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </div>
                        </div>

                        <div className="w-24 h-5 overflow-auto invisible">
                          <svg
                            id="count_width"
                            className="whitespace-nowrap"
                            width={400}
                            height={400}
                            style={{
                              fontFamily: selectedFont,
                            }}
                          />
                        </div>
                        <div
                          className="w-0 h-0 overflow-auto invisible"
                          id="renderDownload"
                        ></div>
                        <TransformWrapper
                          initialScale={1}
                          centerOnInit={true}
                          limitToBounds={false}
                          // maxScale={15}
                          // minScale={0.5}
                          ref={transformRef}
                          doubleClick={{ disabled: true }}
                          wheel={{
                            disabled: true,
                          }}
                          onTransformed={(ref, state) => {
                            setTransformState({
                              ...state,
                              previousScale: transformState?.scale || 1,
                            });
                          }}
                        >
                          {({ zoomIn, zoomOut, setTransform }) => {
                            zoomPanPinchHandlers.current = { zoomIn, zoomOut, setTransform };
                            return (
                              <div className="w-full flex-1 relative">
                                <div className="w-full h-full">
                                  <TransformComponent
                                    wrapperStyle={{
                                      height: "100%",
                                      width: "100%",
                                    }}
                                    contentStyle={{ width: "100%", height: "100%" }}
                                  >
                                    <div className="w-full relative">
                                      {treeNode?.children && (
                                        <FishboneChartComponent
                                          openTree={true}
                                          selectedFont={selectedFont}
                                          divRef={divRef}
                                          root={trimTreeNodeNames(treeNode)}
                                          rootFontSize={rootFontSize}
                                          firstChildFontSize={firstChildFontSize}
                                          otherChildFontSize={otherChildFontSize}
                                        />
                                      )}
                                    </div>
                                  </TransformComponent>
                                </div>
                              </div>
                            );
                          }}
                        </TransformWrapper>
                        <div>
                          <Box
                            sx={{
                              marginTop: 2,
                              borderTop: 1,
                              borderColor: "divider",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Tabs
                              value={tabValue}
                              onChange={handleTabChange}
                              aria-label="control tabs"
                              TabIndicatorProps={{
                                sx: {
                                  top: 0,
                                },
                              }}
                            >
                              <Tab
                                label="スタイル"
                                id="control-tab-0"
                                aria-controls="control-tabpanel-0"
                              />
                              <Tab
                                label="エクスポート"
                                id="control-tab-1"
                                aria-controls="control-tabpanel-1"
                              />
                            </Tabs>

                            <IconButton
                              aria-label="expand-collapse"
                              onClick={() => setIsOpenExpandCollapse(!isOpenExpandCollapse)}
                              sx={{
                                transform: isOpenExpandCollapse ? "rotate(0deg)" : "rotate(180deg)",
                                ml: "auto",
                                transition: "transform 0.3s ease",
                              }}
                            >
                              <KeyboardArrowDownIcon />
                            </IconButton>
                          </Box>
                          <Collapse
                            in={isOpenExpandCollapse}
                            timeout={300}
                          >
                            <Fade
                              in={isOpenExpandCollapse}
                              timeout={300}
                            >
                              <Box>
                                <TabPanel
                                  value={tabValue}
                                  index={0}
                                >
                                  <div className="flex gap-2 cursor-default mt-2 flex-wrap p-2 justify-center items-end">
                                    <Select
                                      displayEmpty
                                      value={selectedFont}
                                      disabled={!selectedFontFamily}
                                      onChange={(e) => {
                                        setSelect({
                                          ...select,
                                          fontFamily: e.target.value as string,
                                        });
                                        handleFontChange(e as SelectChangeEvent<string>);
                                      }}
                                      renderValue={(selected) => {
                                        if (!selected) {
                                          return <em>フォント選択</em>;
                                        }
                                        return Font[selected as keyof typeof Font];
                                      }}
                                      inputProps={{ "aria-label": "Without label" }}
                                      className="!w-[140px] !h-[40px]"
                                      MenuProps={MenuProps}
                                    >
                                      {Object.keys(Font).map((key) => (
                                        <MenuItem
                                          key={key}
                                          value={FontFamily[Font[key as keyof typeof Font]]}
                                        >
                                          {Font[key as keyof typeof Font]}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                    <div className="w-[140px] flex flex-col">
                                      <label
                                        htmlFor=""
                                        className="text-sm font-semibold mb-1"
                                      >
                                        タイトル文字サイズ
                                      </label>
                                      <Select
                                        displayEmpty
                                        value={rootFontSize}
                                        disabled={!selectedFontSize}
                                        onChange={(e) => {
                                          setRootFontSize(e.target.value as FontSize);
                                        }}
                                        inputProps={{ "aria-label": "Without label" }}
                                        className="!w-[140px] !h-[40px]"
                                        MenuProps={MenuProps}
                                      >
                                        {Object.keys(FontSize).map((key) => (
                                          <MenuItem
                                            key={key}
                                            value={FontSize[key as keyof typeof FontSize]}
                                          >
                                            {FontSize[key as keyof typeof FontSize]}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </div>
                                    <div className="w-[140px] flex flex-col">
                                      <label
                                        htmlFor=""
                                        className="text-sm font-semibold mb-1"
                                      >
                                        Level1 サイズ
                                      </label>
                                      <Select
                                        displayEmpty
                                        value={firstChildFontSize}
                                        disabled={!selectedFontSize}
                                        onChange={(e) => {
                                          setFirstChildFontSize(e.target.value as FontSize);
                                        }}
                                        inputProps={{ "aria-label": "Without label" }}
                                        className="!w-[140px] !h-[40px]"
                                        MenuProps={MenuProps}
                                      >
                                        {Object.keys(FontSize).map((key) => (
                                          <MenuItem
                                            key={key}
                                            value={FontSize[key as keyof typeof FontSize]}
                                          >
                                            {FontSize[key as keyof typeof FontSize]}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </div>
                                    <div className="w-[140px] flex flex-col">
                                      <label
                                        htmlFor=""
                                        className="text-sm font-semibold mb-1"
                                      >
                                        Level2 サイズ
                                      </label>
                                      <Select
                                        displayEmpty
                                        value={otherChildFontSize}
                                        disabled={!selectedFontSize}
                                        onChange={(e) => {
                                          setOtherChildFontSize(e.target.value as FontSize);
                                        }}
                                        inputProps={{ "aria-label": "Without label" }}
                                        className="!w-[140px] !h-[40px]"
                                        MenuProps={MenuProps}
                                      >
                                        {Object.keys(FontSize).map((key) => (
                                          <MenuItem
                                            key={key}
                                            value={FontSize[key as keyof typeof FontSize]}
                                          >
                                            {FontSize[key as keyof typeof FontSize]}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </div>
                                  </div>
                                </TabPanel>
                                <TabPanel
                                  value={tabValue}
                                  index={1}
                                >
                                  <div className="flex gap-2 cursor-default mt-2 flex-wrap p-2 justify-center items-end">
                                    <Select
                                      displayEmpty
                                      disabled={!dowloadImage}
                                      value={select?.typeimg}
                                      onChange={(e) => {
                                        setSelect({
                                          ...select,
                                          typeimg: e.target.value as string,
                                        });
                                        refImageExtension.current = typeimg[
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
                                      className="!w-[200px] !h-[40px]"
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
                                    <Button
                                      variant="contained"
                                      disabled={disableDowload || !dowloadImage}
                                      onClick={() => !disableDowload && handlePNGDownload(refImageExtension.current)}
                                      className={`${disableDowload || isLoadingDownloadImageChart ? " !cursor-default" : "cursor-pointer "} !w-[200px] `}
                                    >
                                      {isLoadingDownloadImageChart && (
                                        <div>
                                          <CircularProgress size={22} />
                                        </div>
                                      )}
                                      <span>画像のダウンロード</span>
                                    </Button>
                                    {/* <Button
                                      variant="contained"
                                      className="contained bg-[#00B0F0] text-white !w-[200px] !h-[40px] self-end"
                                      type="button"
                                      disabled={disableButton || !saveFishbone}
                                      onClick={async () => {
                                        formik.handleSubmit();
                                        const keysNumber = Object.keys(formik?.errors)?.length;
                                        if (keysNumber) {
                                          return;
                                        }
                                        await confirmUploadFishbone();
                                      }}
                                    >
                                      入力データの保存
                                    </Button> */}
                                    <Button
                                      variant="contained"
                                      className="contained bg-[#00B0F0] text-white !w-[200px] !h-[40px] self-end"
                                      type="button"
                                      onClick={() => {
                                        handleExportExcel();
                                      }}
                                    >
                                      Excelに出力
                                    </Button>
                                  </div>
                                </TabPanel>
                              </Box>
                            </Fade>
                          </Collapse>
                        </div>
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>

                <Dialog
                  open={openPopUp && Boolean(saveFishbone)}
                  onClose={() => {
                    flag.current.popState = false;
                    flag.current.navigateByBreadCrumb = false;
                    setOpenPopUp(false);
                  }}
                >
                  <DialogContent>
                    <DialogContentText>
                      変更内容が保存されていない可能性がありますが、よろしいですか？
                    </DialogContentText>
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
                        formik.handleSubmit();
                        const keysNumber = Object.keys(formik?.errors)?.length;
                        if (keysNumber) {
                          flag.current.popState = false;
                          flag.current.navigateByBreadCrumb = false;
                          setOpenPopUp(false);
                          return;
                        } else {
                          if (genChartRef.current && isChangedOnPage && warning.current) {
                            toast.error("データを保存する前にチャートを生成してください");
                            flag.current.popState = false;
                            flag.current.navigateByBreadCrumb = false;
                            setOpenPopUp(false);
                            return;
                          }

                          await uploadFishboneChart();
                          flag.current.popState = false;
                          flag.current.navigateByBreadCrumb = false;
                          setOpenPopUp(false);
                          if (requestStatus.current) {
                            handleCancelSave(
                              flag.current.navigateByBreadCrumb || flag.current.popState
                                ? previousPageRef.current
                                : pageRef.current,
                            );
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
              </div>
            </Form>
          );
        }}
      </Formik>
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogContent>
          <DialogContentText>上書きしてもよろしいですか?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            className="focus:outline-none"
            onClick={() => setOpenDialog(false)}
          >
            キャンセル
          </Button>
          <Button
            color="secondary"
            className="focus:outline-none"
            autoFocus
            onClick={async () => {
              await uploadFishboneChart();
              setOpenDialog(false);
            }}
          >
            同意する
          </Button>
        </DialogActions>
      </Dialog>

      <Popper
        sx={{ zIndex: 1200 }}
        open={nodeFishbone.isLoading}
        anchorEl={anchorEl}
        placement="right"
        transition
        modifiers={[
          {
            name: "arrow",
            enabled: true,
            options: {
              element: arrowRef,
            },
          },
          {
            name: "offset",
            enabled: true,
            options: {
              offset: [0, 10],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade
            {...TransitionProps}
            timeout={350}
          >
            <Paper
              sx={{
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: "50%",
                  left: "-8px",
                  transform: "translateY(-50%)",
                  width: 0,
                  height: 0,
                  borderStyle: "solid",
                  borderWidth: "8px 8px 8px 0",
                  borderColor: "transparent #fff transparent transparent",
                  filter: "drop-shadow(-1px 0 1px rgba(0,0,0,0.1))",
                },
              }}
            >
              <Box
                component="span"
                className="arrow"
                ref={setArrowRef}
                sx={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    width: 0,
                    height: 0,
                  },
                }}
              />
              <Typography sx={{ p: 2 }}>生成には1~2分かかります</Typography>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default GeneralChartFishBone;
