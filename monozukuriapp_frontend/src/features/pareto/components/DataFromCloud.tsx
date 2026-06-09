import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import AppsIcon from "@mui/icons-material/Apps";
import ReorderIcon from "@mui/icons-material/Reorder";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import CommonBreadcrumbs from "../../fta/components/beardcumd";
import { handleApi } from "@/utils/handleApi";
import dataFromCloudService from "@/services/apis/dataFromCloudService";
import { useTranFormDate } from "../hooks/local/useTranFormDate";
import React from "react";
import { App } from "@/enum/pathnames";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { Thread } from "@/features/whywhy/components/ThreadListFull";
import VisibilitySettingsDialog from "@/features/whywhy/components/VisibilitySettingsDialog";
import whyWhyApiClient from "@/services/apis/whyWhyService";

export enum ChartType {
  PARETO = "pareto",
  FISHBONE = "fishbone",
  FTA = "fta",
  RECENT_FILES = "recentFiles",
  WHYWHY = "whywhy",
}

export enum TypeApi {
  LIST = "list",
  CREATE = "create",
  DELETE = "delete",
}

export const api = {
  [ChartType.PARETO]: {
    [TypeApi.LIST]: dataFromCloudService.getListPareto,
    [TypeApi.DELETE]: dataFromCloudService.deletePareto,
  },
  [ChartType.FISHBONE]: {
    [TypeApi.LIST]: dataFromCloudService.getListFishBone,
    [TypeApi.DELETE]: dataFromCloudService.deleteFishBone,
  },
  [ChartType.FTA]: {
    [TypeApi.LIST]: dataFromCloudService.getListFTA,
    [TypeApi.DELETE]: dataFromCloudService.deleteFTA,
  },
  [ChartType.RECENT_FILES]: {
    [TypeApi.LIST]: dataFromCloudService.getListRecentFiles,
  },
  [ChartType.WHYWHY]: {
    [TypeApi.LIST]: dataFromCloudService.getListWhyWhy,
    [TypeApi.DELETE]: dataFromCloudService.deleteWhyWhy,
  },
};

function calculateSize(item: any, chartType: ChartType) {
  const getSizeByMode = (item: any) => {
    if (item?.mode === "COMPARE") {
      return (item?.afterPareto?.size ?? 0) + (item?.beforePareto?.size ?? 0);
    }
    if (item?.mode === "AFTER") {
      return item?.afterPareto?.size ?? 0;
    }
    if (item?.mode === "BEFORE") {
      return item?.beforePareto?.size ?? 0;
    }
    return item?.singlePareto?.size ?? 0;
  };

  if (chartType === ChartType.PARETO) {
    return getSizeByMode(item);
  }
  if (chartType === ChartType.RECENT_FILES) {
    return item?.size ?? getSizeByMode(item);
  }
  return item?.size ?? 0;
}

const handleCalculateSize = (size: number) => {
  if (typeof size !== "number" || size < 0) return "Invalid size";
  if (size === 0) return "--";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)}MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(2)}KB`;
  return `${size}B`;
};

interface DataFromCloudProps {
  chartType: ChartType;
  show?: boolean;
  pageCurrent?: string;
  title: string;
  showBreadcrumb?: boolean;
  params?: { [key: string]: any };
  homepage?: boolean;
}
const DataFromCloud = ({
  chartType,
  show = true,
  pageCurrent,
  title,
  showBreadcrumb = true,
  homepage = false,
  params,
}: DataFromCloudProps) => {
  const [data, setData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewMode, setViewMode] = useState<string>("list");
  const navigate = useNavigate();
  const ref = useRef<any>();
  const typeSelectRef = useRef<ChartType>();
  const [shouldCallAgain, setShouldCallAgain] = useState<any>({});
  const [page, setPage] = useState<number>(1);
  const [totalPage, setTotalPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const tranFormDate = useTranFormDate();
  const location = useLocation();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const [openVisibilityDialog, setOpenVisibilityDialog] = useState(false);
  const [selectedThreadForVisibility, setSelectedThreadForVisibility] = useState<{
    id: string;
    publicScope?: string;
    hideAuthorName?: boolean;
  } | null>(null);

  const handleDelete = async (id: number) => {
    let handleApiFunc;

    if (chartType === ChartType.RECENT_FILES) {
      // @ts-ignore
      handleApiFunc = api[typeSelectRef.current][TypeApi.DELETE];
    } else {
      handleApiFunc = api[chartType][TypeApi.DELETE];
    }

    //@ts-ignore
    const [res, error] = await handleApi(handleApiFunc(id));
    if (res) {
      toast.success("削除成功");
      setShouldCallAgain({});
    }
    if (error) {
      console.log(error);
    }
  };

  const handleDeleteClick = useCallback((id: number) => {
    ref.current = id;
    setOpenDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    ref.current && handleDelete(ref.current);
    setOpenDialog(false);
  }, [data]);
  const handleCancelDelete = useCallback(() => {
    setOpenDialog(false);
    typeSelectRef.current = undefined;
  }, []);

  const handleUploadDataChart = useCallback((item: any) => {
    if (chartType === ChartType.FISHBONE) {
      navigate(`/diagram/general-chart?chart=fishbone&id=${item?.id}`, {
        state: pageCurrent ? App.YOUR_PROJECTS : App.DATA_FROM_CLOUD_FISHBONE,
      });
    } else if (chartType === ChartType.FTA) {
      navigate(`/fta/general-chart?chart=tree&id=${item?.id}`, {
        state: pageCurrent ? App.YOUR_PROJECTS : App.DATA_FROM_CLOUD_FTA,
      });
    } else if (chartType === ChartType.RECENT_FILES) {
      if (item?.type === ChartType.FISHBONE) {
        navigate(`/diagram/general-chart?chart=fishbone&id=${item?.id}`, {
          state: pageCurrent ? App.YOUR_PROJECTS : App.DATA_FROM_CLOUD_FISHBONE,
        });
      } else if (item?.type === ChartType.FTA) {
        navigate(`/fta/general-chart?chart=tree&id=${item?.id}`, {
          state: pageCurrent ? App.YOUR_PROJECTS : App.DATA_FROM_CLOUD_FTA,
        });
      } else {
        handleRedirect(item);
      }
    } else if (chartType === ChartType.WHYWHY) {
      console.log(item);
      if (item?.children_count && item?.children_count > 0) {
        navigate(`/whywhy/children/${item?.id}`);
      } else {
        navigate(`/whywhy/view/${item?.id}`);
      }
    } else {
      handleRedirect(item);
    }
  }, []);

  useEffect(() => {
    if (location.pathname === App.DATA_FROM_CLOUD) {
      setBreadcrumbItems([
        { label: "パレート図作成ツール", href: "#", onClick: () => navigate("/pareto") },
        { label: "保存したデータ", href: "#" },
      ]);
    } else if (location.pathname === App.DATA_FROM_CLOUD_FISHBONE) {
      setBreadcrumbItems([
        { label: "特性要因図作成ツール", href: "#", onClick: () => navigate("/diagram") },
        { label: "保存したデータ", href: "#" },
      ]);
    }
  }, [location.pathname]);
  const memoList = useMemo(() => {
    return (
      <>
        <div className="grid grid-cols-12 gap-4 items-center mb-4 cursor-context-menu font-bold">
          <div className="col-span-4"><span key="header-filename">ファイル名</span></div>
          <div className="col-span-2"><span key="header-updated">最終更新日時</span></div>
          <div className="col-span-2"><span key="header-size">サイズ</span></div>
          {chartType === ChartType.WHYWHY && <div className="col-span-2"><span key="header-scope">公開範囲</span></div>}
          <div className="col-span-2"></div>
        </div>
        {data.map((item: any, index: number) => {
          const size = calculateSize(item, chartType);

          return (
            <div
              key={index}
              className="grid grid-cols-12 gap-4 items-center mb-6 relative"
            >
              <div className="col-span-4">
                <div
                  className="space-y-1 cursor-pointer flex justify-start"
                  onClick={() => handleUploadDataChart(item)}
                >
                  <div
                    className="flex justify-center items-center border border-bottom border-l-[0px] border-r-[0px] border-t-[0px] gap-1 w-[28px] h-[28px] rounded-[50%] mt-1 mr-2"
                    onClick={() => handleUploadDataChart(item)}
                  >
                    {(item?.singleId
                      ? item?.singlePareto?.image
                      : item?.beforeId
                        ? item?.beforePareto?.image
                        : item?.image) && (
                      <img
                        src={
                          item?.singleId
                            ? item?.singlePareto?.image
                            : item?.beforeId
                              ? item?.beforePareto?.image
                              : item?.image
                        }
                        alt={item?.name}
                        className={`${item?.afterId && item?.beforeId ? "h-[10px] w-[10px]" : "h-[20px] w-[20px]"} object-cover  cursor-pointer`}
                      />
                    )}
                    {item?.afterId && (
                      <img
                        src={item?.afterId && item?.afterPareto?.image}
                        alt={item?.name}
                        className="h-[10px] w-[10px] object-cover  cursor-pointer"
                      />
                    )}
                  </div>

                  <Tooltip
                    title={
                      item?.name ||
                      (typeof item?.parameters === "object"
                        ? item?.parameters?.name
                        : item?.parameters
                          ? JSON.parse(item?.parameters)?.name
                          : "")
                    }
                    arrow
                  >
                    <Typography
                      variant="subtitle1"
                      className="truncate flex-1"
                    >
                      <span key={`item-name-${item?.id || index}`}>
                        {item?.name ||
                          (typeof item?.parameters === "object"
                            ? item?.parameters?.name
                            : item?.parameters
                              ? JSON.parse(item?.parameters)?.name
                              : "")}
                      </span>
                    </Typography>
                  </Tooltip>
                </div>
              </div>

              <div className="col-span-2 cursor-context-menu">
                <Typography
                  variant="body2"
                  className="truncate"
                >
                  <span key={`item-date-${item?.id || index}`}>
                    {tranFormDate(homepage ? item?.recentlyAt : item?.updatedAt)}
                  </span>
                </Typography>
              </div>

              <div className="col-span-2">
                <span key={`item-size-${item?.id || index}`}>{handleCalculateSize(size)}</span>
              </div>

              {chartType === ChartType.WHYWHY && (
                <div className="col-span-2">
                  <Typography
                    variant="body2"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Only allow editing if status is "completed"
                      if (item.status === "completed") {
                        setSelectedThreadForVisibility({
                          id: item.id,
                          publicScope: item.publicScope,
                          hideAuthorName: item.hideAuthorName,
                        });
                        setOpenVisibilityDialog(true);
                      } else {
                        // Show toast message if status is not completed
                        toast.error("なぜなぜ分析がまだ完了していないため、公開範囲の設定はまだ実施できていません。");
                      }
                    }}
                    sx={{
                      cursor: "pointer",
                      color: "#4B73FF",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    <span key={`item-scope-${item?.id || index}`}>
                      {item.publicScope === "private" || !item.publicScope
                        ? "公開しない"
                        : item.publicScope === "group"
                          ? "同一グループ内"
                          : item.publicScope === "company"
                            ? "社内"
                            : "未設定"}
                    </span>
                  </Typography>
                </div>
              )}

              {show && (
                <div className="col-span-2">
                  <div className="relative group">
                    <IconButton className="focus:outline-none">
                      <MoreHorizIcon />
                    </IconButton>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => {
                        typeSelectRef.current = item.type;
                        handleDeleteClick(item.id);
                      }}
                      className="absolute left-0 top-full mt-1 transform translate-x-[-52px] translate-y-[38px] flex items-center border-red-500 text-red-500 hover:bg-red-100 focus:outline-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <span key={`delete-btn-list-${item?.id || index}`}>削除</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  }, [data, pageCurrent]);

  const memoGrid = useMemo(() => {
    return (
      <>
        {/* <div className="cursor-context-menu font-bold mb-4">
          <div className="col-span-6">ファイル名</div>
        </div> */}
        <div className="grid lgx:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 lgx:gap-12 md:gap-10 sm:gap-4 gap-4">
          {data.map((item: any, index: number) => {
            const size = calculateSize(item, chartType);

            return (
              <div
                key={index}
                className="bg-white border rounded-lg relative"
              >
                <div
                  className="flex justify-center items-center border border-bottom border-l-[0px] border-r-[0px] border-t-[0px] gap-1"
                  onClick={() => handleUploadDataChart(item)}
                >
                  {(item?.singleId
                    ? item?.singlePareto?.image
                    : item?.beforeId
                      ? item?.beforePareto?.image
                      : item?.image) && (
                    <img
                      src={
                        item?.singleId
                          ? item?.singlePareto?.image
                          : item?.beforeId
                            ? item?.beforePareto?.image
                            : item?.image
                      }
                      alt={item?.name}
                      className={`w-[40%] h-52 ${chartType === ChartType.FTA ? "" : "object-cover"}  cursor-pointer rounded-tl-[1px]`}
                    />
                  )}
                  {item?.afterId && (
                    <img
                      src={item?.afterId && item?.afterPareto?.image}
                      alt={item?.name}
                      className={`w-[40%] h-52 ${chartType === ChartType.FTA ? "" : "object-cover"}  cursor-pointer rounded-tl-[1px]`}
                    />
                  )}
                </div>
                <div className="flex items-center">
                  <div className="w-[85%] p-4 pt-[24px] cursor-context-menu">
                    <Tooltip
                      title={
                        item?.name ||
                        (item?.parameters && typeof item?.parameters === "object"
                          ? item?.parameters?.name
                          : item?.parameters
                            ? JSON.parse(item?.parameters)?.name
                            : "")
                      }
                      arrow
                      placement="bottom-start"
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight="normal"
                        className={`cursor-pointer ${(item?.parameters && typeof item?.parameters === "object" ? item?.parameters?.name?.length >= 30 : item?.parameters ? JSON.parse(item?.parameters)?.name?.length >= 30 : false) || item?.name?.length >= 30 ? "truncate" : ""}`}
                        onClick={() => handleUploadDataChart(item)}
                      >
                        <span key={`grid-item-name-${item?.id || index}`}>
                          {`${item?.name?.slice(0, item?.name?.length) || (item?.parameters && typeof item?.parameters === "object" ? item?.parameters?.name?.slice(0, item?.parameters?.name?.length) : item?.parameters ? JSON.parse(item?.parameters)?.name?.slice(0, JSON.parse(item?.parameters)?.name?.length) : "")}`}
                        </span>
                        <span className="opacity-0 px-[200px]"></span>
                      </Typography>
                    </Tooltip>
                    <Tooltip
                      title={`最終更新日 ${tranFormDate(homepage ? item?.recentlyAt : item?.updatedAt)}`}
                      arrow
                    >
                      <Typography
                        variant="body2"
                        className={item?.fileType?.includes("PDF") ? "text-[#C8AA62]" : "text-[#6E9BC5]"}
                      >
                        <span key={`grid-date-${item?.id || index}`}>最終更新日 {`${tranFormDate(homepage ? item?.recentlyAt : item?.updatedAt)}`}</span>
                        <span key={`grid-size-${item?.id || index}`} className="ml-4">サイズ :{handleCalculateSize(size)}</span>
                      </Typography>
                    </Tooltip>
                  </div>
                  <div className="w-[15%] relative group">
                    <IconButton className="focus:outline-none">
                      <MoreHorizIcon />
                    </IconButton>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => {
                        typeSelectRef.current = item.type;
                        handleDeleteClick(item.id);
                      }}
                      className="absolute left-[-10%] mt-1 transform flex items-center border-red-500 text-red-500 hover:bg-red-100 focus:outline-none z-[100] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <span key={`delete-btn-grid-${item?.id || index}`}>削除</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }, [data, pageCurrent]);

  const handleRedirect = (item: any) => {
    return item.singleId
      ? navigate(`/pareto/singlemode?id=${item.id}`, { state: pageCurrent ? App.YOUR_PROJECTS : App.DATA_FROM_CLOUD })
      : navigate(`/pareto/comparemode?id=${item.id}`, { state: pageCurrent ? App.YOUR_PROJECTS : App.DATA_FROM_CLOUD });
  };

  const handleChangePagination = (_: any, page: any) => {
    setPage(page);
  };

  const getList = async (page: number) => {
    setIsLoading(true);
    //@ts-ignore
    const [res, error] = await handleApi(
      api[chartType][TypeApi.LIST]({ orderBy: "desc", page: page, size: 12, ...params }),
    );
    if (res) {
      const totalPages = "totalPage" in res.data ? res.data.totalPage : res.data.meta.totalPages;
      
      // If current page has no data and we're not on page 1, go to previous page or page 1
      if (res.data.data.length === 0 && page > 1) {
        // If totalPages is less than current page, go to totalPages
        // Otherwise, go to previous page (or page 1 if page - 1 < 1)
        const newPage = totalPages > 0 && totalPages < page ? totalPages : Math.max(1, page - 1);
        setPage(newPage);
        setIsLoading(false);
        // Recursively call getList with the new page
        if (newPage !== page) {
          await getList(newPage);
          return;
        }
      }

      // If totalPages is less than current page (but we have data), adjust page
      if (totalPages < page && res.data.data.length > 0) {
        setPage(totalPages);
      }

      setTotalPage(totalPages);

      if (chartType === ChartType.RECENT_FILES) {
        setData(
          res.data.data.map((item: any) => {
            if (item.fishBone) {
              return { ...item.fishBone, type: ChartType.FISHBONE, recentlyAt: item?.recentlyAt };
            } else if (item.fta) {
              return { ...item.fta, type: ChartType.FTA, recentlyAt: item?.recentlyAt };
            } else if (item.parento) {
              return { ...item.parento, type: ChartType.PARETO, recentlyAt: item?.recentlyAt };
            }
          }),
        );
      } else if (chartType === ChartType.WHYWHY) {
        setData(
          res.data.data.map((item: Thread & { publicScope?: string; hideAuthorName?: boolean }) => {
            return {
              id: item.thread_id,
              name: item.problem.title || "無題",
              updatedAt: item.updated_at,
              children_count: item.children_count,
              status: item.status,
              publicScope: (item as any).publicScope || (item as any).public_scope || "private",
              hideAuthorName: (item as any).hideAuthorName || (item as any).hide_author_name || false,
            };
          }),
        );
      } else {
        setData(res.data.data);
      }

      setIsLoading(false);
      return;
    }
    if (error) {
      console.log(error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    page && getList(page);
  }, [shouldCallAgain, page, chartType]);

  useEffect(() => {
    // Fetch data on component mount
    getList(page);
  }, []);

  return (
    <>
      {show && showBreadcrumb && (
        <CommonBreadcrumbs
          items={[
            {
              label:
                chartType === ChartType.FISHBONE
                  ? "特性要因図作成ツール"
                  : chartType === ChartType.FTA
                    ? "FTA（フォルトツリー解析）ツール"
                    : "パレート図作成ツール",
              href: "#",
              onClick:
                chartType === ChartType.FISHBONE
                  ? () => navigate("/diagram")
                  : chartType === ChartType.FTA
                    ? () => navigate(App.FTA, { state: App.DATA_FROM_CLOUD_FTA })
                    : () => navigate("/pareto"),
            },
            { label: "保存したデータ" },
          ]}
        />
      )}
      <Paper
        elevation={3}
        sx={{ p: 2, mb: 2 }}
      >
        <div className="p-4">
          <div className="flex mb-4 justify-between">
            <div>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  padding: {
                    xs: "6px 0px",
                    sm: "6px 0px",
                    md: "6px 0px",
                    lg: "6px 0px",
                  },
                  fontSize: {
                    xs: "20px",
                    sm: "24px",
                    md: "28px",
                    lg: "32px",
                  },
                  cursor: "context-menu",
                  fontWeight: "semibold",
                }}
              >
                <span key="data-title">{title}</span>
              </Typography>
            </div>
            <div>
              <IconButton
                onClick={() => setViewMode("list")}
                className="focus:outline-none"
              >
                <ReorderIcon />
              </IconButton>
              <IconButton
                onClick={() => setViewMode("grid")}
                className="focus:outline-none"
              >
                <AppsIcon />
              </IconButton>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center flex-col items-center mt-[30px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">
                <span key="loading-text">データを読み込み中...</span>
              </p>
            </div>
          ) : (
            <>
              <div className={`transition-all ${viewMode === "list" ? "block" : "hidden"}`}>{memoList}</div>
              <div className={`transition-all ${viewMode === "grid" ? "block" : "hidden"}`}>{memoGrid}</div>
              {data.length === 0 && (
                <div className="flex justify-center flex-col items-center mt-[30px]">
                  <div>
                    <img
                      src="/image/no_data.svg"
                      alt=""
                    />
                  </div>
                  <p>
                    <span key="no-data-text">データなし</span>
                  </p>
                </div>
              )}
            </>
          )}
          {data.length > 12 || totalPage > 1 ? (
            <Stack
              spacing={2}
              className="mt-4 flex justify-center"
            >
              <Pagination
                count={totalPage}
                page={page}
                onChange={handleChangePagination}
                color="primary"
                size="large"
                variant="outlined"
                shape="rounded"
              />
            </Stack>
          ) : (
            <div></div>
          )}
          <Dialog
            open={openDialog}
            onClose={handleCancelDelete}
          >
            <DialogTitle>
              <span key="dialog-title">削除を確認</span>
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                <span key="dialog-content">このアイテムを削除してもよろしいですか?</span>
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleCancelDelete}
                color="primary"
                className="focus:outline-none"
              >
                <span key="dialog-cancel">キャンセル</span>
              </Button>
              <Button
                onClick={handleConfirmDelete}
                color="secondary"
                className="focus:outline-none"
                autoFocus
              >
                <span key="dialog-delete">削除</span>
              </Button>
            </DialogActions>
          </Dialog>
          {chartType === ChartType.WHYWHY && selectedThreadForVisibility && (
            <VisibilitySettingsDialog
              open={openVisibilityDialog}
              threadId={selectedThreadForVisibility.id}
              currentPublicScope={selectedThreadForVisibility.publicScope as "private" | "group" | "company"}
              currentHideAuthorName={selectedThreadForVisibility.hideAuthorName}
              onClose={() => {
                setOpenVisibilityDialog(false);
                setSelectedThreadForVisibility(null);
              }}
              onSave={async () => {
                setOpenVisibilityDialog(false);
                setSelectedThreadForVisibility(null);
                // Refresh data
                await getList(page);
              }}
            />
          )}
        </div>
      </Paper>
    </>
  );
};

export default memo(DataFromCloud);
