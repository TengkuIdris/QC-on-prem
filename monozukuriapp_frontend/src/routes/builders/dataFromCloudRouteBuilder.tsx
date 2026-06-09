import { ReactElement } from "react";
import { App } from "@/enum/pathnames";
import DataFromCloud, { ChartType } from "@/features/pareto/components/DataFromCloud";
import LazySingleModeProvider from "@/store/singlemodeProvider/singlemode";
import { RouteConfig } from "../types";

interface DataFromCloudRouteOptions {
  path: App.DATA_FROM_CLOUD | App.DATA_FROM_CLOUD_FISHBONE | App.DATA_FROM_CLOUD_FTA;
  chartType: ChartType;
  title: string;
  show?: boolean;
  showBreadcrumb?: boolean;
}

export function createDataFromCloudRoute({
  path,
  chartType,
  title,
  show = true,
  showBreadcrumb = false,
}: DataFromCloudRouteOptions): RouteConfig {
  return {
    path,
    element: (
      <LazySingleModeProvider>
        {showBreadcrumb ? (
          <DataFromCloud
            chartType={chartType}
            title={title}
            show={show}
            showBreadcrumb={showBreadcrumb}
          />
        ) : (
          <div className="mt-4">
            <DataFromCloud
              chartType={chartType}
              title={title}
              show={show}
              showBreadcrumb={showBreadcrumb}
            />
          </div>
        )}
      </LazySingleModeProvider>
    ),
  };
}
