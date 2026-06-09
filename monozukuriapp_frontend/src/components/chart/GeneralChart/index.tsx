import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import ChatUI from "../../../features/fta/components/chat/ChatUI";
import Tree from "../../../features/fta/components/Node";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import CommonBreadcrumbs from "../../../features/fta/components/beardcumd";
import GeneralChartFishBone from "../GeneralFishboneChart";
import { Node } from "../../../store/slices/treeSlice";
import { motion, AnimatePresence } from "framer-motion";
import TreeChart from "../../../../src/features/fta/FtaDiagram";
import { useAppDispatch } from "../../../core/hooks";
import { setSubmitStatus } from "../../../store/slices/submitSlice";
import styles from "../../../features/fta/components/Node.module.css";
import { toast } from "react-toastify";
import { Form, Formik, FormikProps } from "formik";
import { clearSaveFishBone, setSaveFishBone } from "@/store/slices/checkSaveDataSlice";
import { useAppSelector } from "@/store/redux";
import { RootState } from "@/store/store";
import { App, Auth } from "@/enum/pathnames";
import { EventType } from "@/constant/enum";
import event from "@/utils/eventEmitter";
import { signOut } from "aws-amplify/auth";
import { logout } from "@/store/slices/authSlice";
import { handleApi } from "@/utils/handleApi";
import ftaService from "@/services/apis/ftaService";
import html2canvas from "html2canvas";
import { FontFamily } from "../GeneralFishboneChart/constants";
import { Font } from "../GeneralFishboneChart/enums";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
export const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 290,
    },
  },
};

export const typeimg = {
  PNG: "png",
  JPEG: "jpeg",
};

const enum TypeApi {
  CREATE = "create",
  UPDATE = "update",
  GET = "get",
}
export const api = {
  [TypeApi.CREATE]: ftaService.create,
  [TypeApi.UPDATE]: ftaService.update,
  [TypeApi.GET]: ftaService.getDeatil,
};
type ImageExtension = "png" | "jpeg";

const GeneralChart: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [openChat, setOpenChat] = useState(false);
  const [openDiagram, setOpenDiagram] = useState(true);
  const navigate = useNavigate();
  const id = searchParams.get("id");
  const chartType = searchParams.get("chart");
  const isSubmittedRef = useRef<boolean>(false);
  const [disableDowload, setDisableDowload] = useState<boolean>(false);
  const [selectedFont, setSelectedFont] = useState<string>(FontFamily[Font.MSGothic]);
  const dispatch = useAppDispatch();
  const [disableButton, setDisableButton] = useState<boolean>(false);
  const refImageExtension = useRef<ImageExtension>("png");
  const isChangedOnPage = useAppSelector((state: RootState) => state.checkSaveDataSlice.fishbone);
  const previous_page = useLocation();
  const previousPageRef = useRef<any>(previous_page.state);

  const pageRef = useRef("/diagram");

  const [openPopUp, setOpenPopUp] = useState<boolean>(false);
  const genChartRef = useRef<boolean>(id ? true : false);
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
  const dispatchCheckSaveData = useAppDispatch();
  const warning = useRef<boolean>(false);
  const flag = useRef<{
    popState: boolean;
    navigateByBreadCrumb: boolean;
  }>({
    popState: false,
    navigateByBreadCrumb: false,
  });
  const formikRef = useRef<
    FormikProps<{
      title: string;
    }>
  >();
  const [select, setSelect] = useState<{
    typeimg: string | undefined;
    fontFamily: string | undefined;
    fontSize: string | undefined;
  }>({
    typeimg: undefined,
    fontFamily: undefined,
    fontSize: undefined,
  });

  const userRole = useAppSelector((state: RootState) => state.auth.user.role);
  const requestStatus = useRef<boolean>(false);
  const saveFTA = userRole?.FTA_SAVE_TYPED_DATA;
  const createPage = userRole?.FTA_CREATE_PAGE;
  const aiTest = userRole?.FTA_AI_TEST;
  const dowloadImage = userRole?.FTA_DOWNLOAD_IMAGE;
  const selectedFontFamily = userRole?.FTA_CHOOSE_FONT_TEXT;

  // const aiTestFishbone = userRole?.FISHBONE_AI_TEST;

  const uploadFishboneChart = async () => {
    const chartElement = document.getElementById("treant-container");
    if (!chartElement) {
      toast.error("チャートの要素が見つかりません");
      return;
    }

    setDisableButton(true);

    const clonedElement = chartElement.cloneNode(true) as HTMLElement;
    clonedElement.classList.add("before-download");

    const paddedContainer = document.createElement("div");
    paddedContainer.style.position = "relative";
    paddedContainer.style.padding = "20px 50px 50px";
    paddedContainer.style.backgroundColor = "#fff";
    paddedContainer.appendChild(clonedElement);

    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "absolute";
    hiddenContainer.style.top = "-9999px";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.appendChild(paddedContainer);
    document.body.appendChild(hiddenContainer);

    try {
      const canvas = await html2canvas(paddedContainer, {
        backgroundColor: "#fff",
        scale: 1,
      });

      const imageBody = await new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => resolve(blob as Blob), `image/${refImageExtension.current}`),
      );

      // const fileName = `${new Date().toISOString().split("T")[0]}_${treeNode?.name || "タイトル"}`;

      const form = new FormData();
      form.append("fontFamily", selectedFont);
      form.append("parameters", JSON.stringify(treeNode));
      form.append("thumbnail", imageBody);

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
        error && navigate("/fta/datafromcloudFTA", { state: App.DIAGRAM });
        toast.error(error);
        console.log(error);
      }
    } catch (error) {
      console.error("アップロードエラー:", error);
      toast.error("チャートのアップロード中にエラーが発生しました");
    } finally {
      document.body.removeChild(hiddenContainer);
      setDisableButton(false);
    }
  };

  // const treeNode = useSelector((state: RootState) => state.tree.rootNode);

  const handleFontChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as Font;
    setSelectedFont(value);
  };
  const handleButtonClick = () => {
    dispatch(setSubmitStatus(true));
    setTimeout(() => {
      setOpenDiagram(false);
    }, 100);
    isSubmittedRef.current = true;
    genChartRef.current = true;
    warning.current = false;
  };
  const confirmUploadFishbone = async () => {
    if (!isSubmittedRef.current) {
      toast.error("データを保存する前にチャートを生成してください");
      return;
    }
    setDisableButton(true);
    await uploadFishboneChart();
  };
  const handleNavigation = useCallback(
    (e: any) => {
      if (isChangedOnPage && Boolean(saveFTA)) {
        e.preventDefault();
        return "";
      }
    },
    [isChangedOnPage],
  );
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

  const getFishBone = async (id: string | number) => {
    const [res, error] = await handleApi(api[TypeApi.GET](id));

    if (res) {
      setTreeNode({
        ...(res.data.parameters ? JSON.parse(res.data.parameters) : {}),
        title: res.data.name,
        fontFamily: res.data.fontFamily,
      });
      formikRef.current?.setFieldValue("title", res.data.name);
      isSubmittedRef.current = true;
    }
    res.data?.fontFamily && setSelectedFont(res.data.fontFamily);

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

    const element = document.getElementById("treant-container");
    if (!element) {
      toast.error("要素が見つかりません");
      setDisableDowload(false);
      return;
    }

    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.classList.add("before-download");

    const paddedContainer = document.createElement("div");
    paddedContainer.style.position = "relative";
    paddedContainer.style.padding = "20px 50px 50px";
    paddedContainer.style.backgroundColor = "#fff";
    paddedContainer.appendChild(clonedElement);

    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "absolute";
    hiddenContainer.style.top = "-9999px";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.appendChild(paddedContainer);
    document.body.appendChild(hiddenContainer);

    try {
      const canvas = await html2canvas(paddedContainer, {
        backgroundColor: "#fff",
        scale: 1,
      });

      const fileName = `${new Date().toISOString().split("T")[0]}_${treeNode?.name || "タイトル"}.${imageExtension}`;
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL(`image/${imageExtension}`);
      link.click();
    } catch (error) {
      console.error("PNG作成エラー:", error);
      toast.error("PNGの作成中にエラーが発生しました");
    } finally {
      document.body.removeChild(hiddenContainer);
      setDisableDowload(false);
    }
  };

  useEffect(() => {
    id && getFishBone(id);
  }, [id]);

  const handleFormChange = (e: any) => {
    formikRef?.current && formikRef.current.handleChange(e);
    requestStatus.current = false;
    warning.current = true;
    window.history.pushState(null, "", window.location.href);
    if (saveFTA) {
      dispatchCheckSaveData(setSaveFishBone({ pareto: false, fishbone: true }));
    }
  };
  if (chartType === "fishbone") {
    return <GeneralChartFishBone />;
  }
  return (
    <Box
      className="h-full"
      sx={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <CommonBreadcrumbs
        items={[
          previousPageRef.current === App.DATA_FROM_CLOUD_FTA
            ? {
                label: "保存したデータ",
                href: "#",
                onClick: () => {
                  if (isChangedOnPage) {
                    flag.current.navigateByBreadCrumb = true;
                    setOpenPopUp(true);
                    return;
                  }
                  navigate(App.DATA_FROM_CLOUD_FTA);
                },
              }
            : previousPageRef.current === App.YOUR_PROJECTS
              ? {
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
                }
              : {
                  label: "FTA（フォルトツリー解析）ツール",
                  href: "#",
                  onClick: () => {
                    if (isChangedOnPage) {
                      flag.current.navigateByBreadCrumb = true;
                      setOpenPopUp(true);
                      return;
                    }
                    navigate(App.FTA);
                  },
                },
          {
            label: `新規作成`,
            href: "#",
          },
        ]}
      />

      <Box
        sx={{
          p: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <AnimatePresence>
            {openChat && (
              <motion.div
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "18%",
                  height: "100%",
                  zIndex: 10,
                }}
              >
                <Box sx={{ width: "100%", height: "100%", bgcolor: "background.paper" }}>
                  <Formik
                    initialValues={{
                      title: "",
                    }}
                    onSubmit={() => {}}
                  >
                    {() => {
                      return (
                        <ChatUI
                          setQueryIds={() => {}}
                          diagrams={""}
                          open={false}
                        />
                      );
                    }}
                  </Formik>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={{
              marginLeft: openChat ? "18%" : "0%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              display: "flex",
              height: "100%",
              flex: 1,
            }}
          >
            <Box
              sx={{
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                left: openChat ? "18%" : "0%",
                transition: "left 0.3s ease",
              }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Box
                  onClick={() => setOpenChat(!openChat)}
                  sx={{ cursor: "pointer" }}
                  data-testid="chat-toggle-button"
                >
                  {openChat ? <ChevronLeftIcon size={40} /> : <ChevronRightIcon size={40} />}
                </Box>
              </motion.div>
            </Box>

            <AnimatePresence>
              {openDiagram && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "50%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`${styles.boxCss}`}
                >
                  <Box
                    id="root"
                    sx={{ height: "100%", pr: 2 }}
                  >
                    <Typography
                      variant="h4"
                      gutterBottom
                      sx={{ textWrap: "nowrap" }}
                    >
                      FTA作成
                    </Typography>

                    <div className="flex h-[90%]">
                      <div className="w-full pr-2 relative">
                        <div id="root">
                          <div className={`w-full overflow-auto absolute top-0 bottom-0 h-full`}>
                            <div className=" w-full h-full">
                              {treeNode?.children && (
                                <Tree
                                  root={treeNode}
                                  maxNode={6}
                                  setTreeNode={setTreeNode}
                                  isSubmittedRef={isSubmittedRef}
                                  handleFormChange={handleFormChange}
                                  disableAi={!aiTest}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            <Box
              sx={{
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                // borderLeft: !openDiagram ? "1px solid black" : "none",
              }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Box
                  onClick={() => setOpenDiagram(!openDiagram)}
                  sx={{ cursor: "pointer" }}
                  data-testid="diagram-toggle-button"
                >
                  {openDiagram ? <ChevronLeftIcon size={40} /> : <ChevronRightIcon size={40} />}
                </Box>
              </motion.div>
            </Box>

            <Box
              sx={{
                width: "calc(100% - (36% + 24px * 2))",
                height: "100%",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              className={`${styles.boxCss}`}
            >
              <Formik
                initialValues={{
                  title: "",
                }}
                onSubmit={() => {}}
              >
                {(formik) => {
                  formikRef.current = formik;
                  return (
                    <Form
                      onChange={() => {
                        handleFormChange("");
                      }}
                      className="h-full"
                    >
                      <Box className="flex-col flex h-full flex-1">
                        <div className="flex gap-2 cursor-default flex-wrap mb-3 p-1">
                          <Button
                            variant="contained"
                            // className={styles.buttonSubmited}
                            color="success"
                            className="!w-[200px] text-white"
                            sx={{ backgroundColor: "var(--color-primary)" }}
                            onClick={handleButtonClick}
                            disabled={!createPage}
                          >
                            FTA図に反映
                          </Button>

                          <Button
                            variant="contained"
                            color="success"
                            disabled={disableDowload || !dowloadImage}
                            onClick={() => !disableDowload && handlePNGDownload(refImageExtension.current)}
                            className={`${disableDowload ? " !cursor-default" : "cursor-pointer "} !w-[200px]`}
                            sx={{ backgroundColor: "var(--color-primary)" }}
                          >
                            FTA図の保存
                          </Button>
                          <Select
                            displayEmpty
                            disabled={!dowloadImage}
                            value={select?.typeimg}
                            onChange={(e) => {
                              setSelect({
                                ...select,
                                typeimg: e.target.value as string,
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
                            className="!w-[200px] !h-[40px]"
                            data-testid="image-extension-select"
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
                            className="!w-[200px] !h-[40px]"
                            MenuProps={MenuProps}
                            data-testid="font-select"
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
                          <Button
                            variant="contained"
                            color="success"
                            className="contained text-white !w-[200px]"
                            sx={{ backgroundColor: "var(--color-primary)" }}
                            type="button"
                            disabled={disableButton || !saveFTA}
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
                          </Button>
                        </div>
                        <Paper
                          sx={{
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            // overflow: "auto",
                          }}
                        >
                          <div className="w-full  mt-5 relative flex-1">
                            <TreeChart
                              root={treeNode}
                              selectedFont={selectedFont}
                            />
                          </div>
                        </Paper>
                      </Box>
                      <Dialog
                        open={openPopUp && Boolean(saveFTA)}
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
                    </Form>
                  );
                }}
              </Formik>
            </Box>
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
};

export default GeneralChart;
