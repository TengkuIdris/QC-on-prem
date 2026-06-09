import { App } from "@/enum/pathnames";
import { setFileContent } from "@/store/slices/fileSlice";
import { setRootNode } from "@/store/slices/treeSlice";
import { handleApi } from "@/utils/handleApi";
import { differenceInDays, parseISO } from "date-fns";
import { FileText, FilePlus, FolderOpen, Copy } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { api, ChartType, TypeApi } from "./DataFromCloud";
import { Tooltip, Typography } from "@mui/material";

interface AppUiProps {
  chartType: ChartType;
}
const AppUI = ({ chartType }: AppUiProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const dispatch = useDispatch();

  const [page, setPage] = useState<number>(1);

  const getList = async (page: number) => {
    const [res, error] = await handleApi(api[chartType][TypeApi.LIST]({ orderBy: "desc", page: page, size: 12 }));
    if (res) {
      if (res.data.totalPage < page) {
        setPage(res.data.totalPage);
      }
      setData(res.data.data);
      return;
    }
    if (error) {
      console.log(error);
    }
  };

  const handleRedirect = (item: any) => {
    return item.singleId
      ? navigate(`/pareto/singlemode?id=${item.id}`, { state: App.DATA_FROM_CLOUD })
      : navigate(`/pareto/comparemode?id=${item.id}`, { state: App.DATA_FROM_CLOUD });
  };
  const pageInfo: any = {
    title: "パレート図作成ツール",
    block1: {
      title: "新規作成",
      des: "1つのパレート図を作成します",
      textButton: "Create New",
      onClick: () => {
        navigate("/pareto/singlemode", { state: App.PARETO });
      },
    },
    block2: {
      title: "新規作成",
      des: "2つのグラフを比較作成します",
      textButton: "Create Compare",
      onClick: () => {
        navigate("/pareto/comparemode", { state: App.PARETO });
      },
    },
    block3: {
      title: "つづきから",
      des: "過去のデータから再開します",
      textButton: "Open Recent",
      onClick: () => {
        navigate("/pareto/datafromcloud", { state: App.PARETO });
      },
    },
  };
  if (chartType === ChartType.FISHBONE) {
    pageInfo.title = "特性要因図作成ツール";
    pageInfo.block2 = undefined;
    pageInfo.block1 = {
      title: "新規作成",
      des: "新規特性要因図を作成",
      textButton: "Create New",
      onClick: () => {
        dispatch(setFileContent(""));
        dispatch(setRootNode({ id: 0, name: "Root", level: 0, children: [] }));
        navigate("/diagram/general-chart?chart=fishbone", { state: App.DIAGRAM });
      },
    };
    pageInfo.block3 = {
      title: "続きから",
      des: "過去のデータから再開",
      textButton: "Open Recent",
      onClick: () => {
        navigate("/diagram/fishbone/datafromcloud", { state: App.DIAGRAM });
      },
    };
  } else if (chartType === ChartType.FTA) {
    pageInfo.title = "FTA（フォルトツリー解析）ツール";
    pageInfo.block2 = undefined;
    pageInfo.block1 = {
      title: "新規作成",
      des: "新規FTA図を作成",
      textButton: "Create New",
      onClick: () => {
        dispatch(setFileContent(""));
        dispatch(setRootNode({ id: 0, name: "Root", level: 0, children: [] }));
        navigate(`${App.FTA_GENERAL_CHART}?chart=tree`);
      },
    };
    pageInfo.block3 = {
      title: "続きから",
      des: "過去のデータから再開",
      textButton: "Open Recent",
      onClick: () => {
        navigate("/fta/datafromcloudFTA", { state: App.DIAGRAM });
      },
    };
  }
  useEffect(() => {
    page && getList(page);
  }, [page]);
  const handleUploadDataChart = useCallback((item: any) => {
    if (chartType === ChartType.FISHBONE) {
      navigate(`/diagram/general-chart?chart=fishbone&id=${item?.id}`, {
        state: App.DATA_FROM_CLOUD_FISHBONE,
      });
    } else if (chartType === ChartType.FTA) {
      navigate(`/fta/general-chart?chart=tree&id=${item?.id}`, {
        state: App.DATA_FROM_CLOUD_FTA,
      });
    } else {
      handleRedirect(item);
    }
  }, []);
  return (
    <div className="bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* タイトルは削除 */}
        {/* Action Cards */}
        <div
          className={`grid grid-cols-1 gap-6 place-items-center md:grid-cols-2 ${
            chartType === ChartType.FTA
              ? "md:max-w-[624px] md:mx-auto place-items-center"
              : "lg:grid-cols-3 place-items-center"
          }`}
        >
          {/* Menu 1 Card */}
          {pageInfo?.block1 && (
            <div
              className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center w-full min-w-[220px] max-w-[300px] cursor-pointer transition-transform hover:scale-105"
              tabIndex={0}
              role="button"
              onClick={pageInfo?.block1?.onClick}
              onKeyPress={(e) => {
                if (e.key === "Enter") pageInfo?.block1?.onClick();
              }}
            >
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <FilePlus className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-base font-medium text-gray-900 mb-1">{pageInfo?.block1?.title}</h2>
              <p className="text-sm text-gray-500 mb-3">{pageInfo?.block1?.des}</p>
              <button
                className="w-full bg-blue-600 text-white rounded-md py-2 text-sm hover:bg-blue-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  pageInfo?.block1?.onClick();
                }}
              >
                {pageInfo?.block1?.textButton}
              </button>
            </div>
          )}

          {pageInfo?.block2 && (
            <div
              className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center w-full min-w-[220px] max-w-[300px] cursor-pointer transition-transform hover:scale-105"
              tabIndex={0}
              role="button"
              onClick={pageInfo?.block2?.onClick}
              onKeyPress={(e) => {
                if (e.key === "Enter") pageInfo?.block2?.onClick();
              }}
            >
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                <Copy className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-base font-medium text-gray-900 mb-1">{pageInfo?.block2?.title}</h2>
              <p className="text-sm text-gray-500 mb-3">{pageInfo?.block2?.des}</p>
              <button
                className="w-full bg-emerald-600 text-white rounded-md py-2 text-sm hover:bg-emerald-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  pageInfo?.block2?.onClick();
                }}
              >
                {pageInfo?.block2?.textButton}
              </button>
            </div>
          )}

          {/* Resume Card */}
          {pageInfo?.block3 && (
            <div
              className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center w-full min-w-[220px] max-w-[300px] cursor-pointer transition-transform hover:scale-105"
              tabIndex={0}
              role="button"
              onClick={pageInfo?.block3?.onClick}
              onKeyPress={(e) => {
                if (e.key === "Enter") pageInfo?.block3?.onClick();
              }}
            >
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                <FolderOpen className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-base font-medium text-gray-900 mb-1">{pageInfo?.block3?.title}</h2>
              <p className="text-sm text-gray-500 mb-3">{pageInfo?.block3?.des}</p>
              <button
                className="w-full bg-amber-600 text-white rounded-md py-2 text-sm hover:bg-amber-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  pageInfo?.block3?.onClick();
                }}
              >
                {pageInfo?.block3?.textButton}
              </button>
            </div>
          )}
          {chartType === ChartType.FISHBONE && (
            <div
              className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center w-full min-w-[220px] max-w-[300px] cursor-pointer transition-transform hover:scale-105"
              tabIndex={0}
              role="button"
              onClick={() => navigate(App.AI_FISHBONE_DIAGRAM)}
              onKeyPress={(e) => {
                if (e.key === "Enter") navigate(App.AI_FISHBONE_DIAGRAM);
              }}
            >
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3 font-bold ">
                AI
              </div>
              <h2 className="text-base font-medium text-gray-900 mb-1">{"AI生成"}</h2>
              <p className="text-sm text-gray-500 mb-3">{"生成AIで特性要因図を作成"}</p>
              <button
                className="w-full bg-emerald-600 text-white rounded-md py-2 text-sm hover:bg-emerald-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(App.AI_FISHBONE_DIAGRAM);
                }}
              >
                Al Generate
              </button>
            </div>
          )}
        </div>

        {/* Recent Files Section */}
        <div className="mt-10">
          {data.length > 0 && <h2 className="text-lg font-medium text-gray-900 mb-4">最近のファイル</h2>}
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
            {data.map((file: any, index) => {
              const updatedAt = file?.updatedAt ? parseISO(file.updatedAt) : null;

              const daysAgo = updatedAt ? differenceInDays(new Date(), updatedAt) : "N/A";

              return (
                <div
                  key={index}
                  className="p-3 flex items-center gap-2 justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleUploadDataChart(file)}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-3" />
                    <Tooltip
                      title={
                        file?.name ||
                        (typeof file?.parameters === "object"
                          ? file?.parameters?.name
                          : file?.parameters
                            ? JSON.parse(file?.parameters)?.name
                            : "")
                      }
                      arrow
                    >
                      <Typography
                        variant="subtitle1"
                        className="line-clamp-1 flex-1"
                      >
                        {file?.name ||
                          (typeof file?.parameters === "object"
                            ? file?.parameters?.name
                            : file?.parameters
                              ? JSON.parse(file?.parameters)?.name
                              : "")}
                      </Typography>
                    </Tooltip>
                  </div>
                  <span className="text-sm text-gray-500 text-nowrap">{`Modified ${daysAgo} days ago`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppUI;
