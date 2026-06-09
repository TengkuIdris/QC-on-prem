import { App } from "@/enum/pathnames";
import Layout from "@/components/layout/Layout";
import ReportCreationPage from "@/features/whywhy/components/ReportCreationPage";
import ReportPreviewExact from "@/features/whywhy/components/ReportPreviewExact";
import HomePage from "@/pages/HomePage/HomePage";
import ParetoModeSelectionNew from "@/features/newpareto/components/ParetoModeSelection";
import SingleMode from "@/features/pareto/components/SingleMode";
import CompareMode from "@/features/pareto/components/CompareMode";
import DiagramPage from "@/features/diagram/DiagramPage";
import WhyWhyPage from "@/features/whywhy/WhyWhyPage";
import WhyWhyPageView from "@/features/whywhy/WhyWhyPageView";
import WhyWhyCreatePage from "@/features/whywhy/WhyWhyCreatePage";
import WhyWhyAnalysisView from "@/features/whywhy/WhyWhyAnalysisView";
import HistoryPage from "@/pages/whywhy/HistoryPage";
import ThreadChildrenList from "@/features/whywhy/components/ThreadChildrenList";
import InternalCasesSearchPage from "@/features/whywhy/InternalCasesSearchPage";
import InternalCaseDetailView from "@/features/whywhy/InternalCaseDetailView";
import GeneralChart from "@/components/chart/GeneralChart";
import FishboneChartComponent from "@/features/diagram/FishBoneChart";
import AIFishboneChart from "@/features/diagram/AIFishboneChart";
import SettingsPage from "@/features/settings/SettingsPage";
import YourProjects from "@/features/your_projects/components/your_project";
import Feedback from "@/pages/Feedback";
import LazySingleModeProvider from "@/store/singlemodeProvider/singlemode";
import { ChartType } from "@/features/pareto/components/DataFromCloud";
import { createDataFromCloudRoute } from "../builders/dataFromCloudRouteBuilder";
import { RouteConfig } from "../types";

export function createLayoutRoutes(): RouteConfig {
  return {
    element: <Layout />,
    children: [
      { path: App.REPORT_CREATION_PAGE, element: <ReportCreationPage /> },
      { path: App.REPORT_PREVIEW_PAGE, element: <ReportPreviewExact /> },
      createDataFromCloudRoute({
        path: App.DATA_FROM_CLOUD,
        chartType: ChartType.PARETO,
        title: "すべてのパレート図",
        show: true,
        showBreadcrumb: false,
      }),
      createDataFromCloudRoute({
        path: App.DATA_FROM_CLOUD_FISHBONE,
        chartType: ChartType.FISHBONE,
        title: "すべての特性要因図",
        show: true,
        showBreadcrumb: false,
      }),
      createDataFromCloudRoute({
        path: App.DATA_FROM_CLOUD_FTA,
        chartType: ChartType.FTA,
        title: "すべてのFTA図",
      }),
      { path: App.HOME, element: <HomePage /> },
      { path: App.PARETO, element: <ParetoModeSelectionNew /> },
      {
        path: App.SINGLE_MODE,
        element: (
          <LazySingleModeProvider>
            <SingleMode />
          </LazySingleModeProvider>
        ),
      },
      { path: App.COMPARE_MODE, element: <CompareMode /> },
      { path: App.DIAGRAM, element: <DiagramPage /> },
      { path: App.WHYWHY, element: <WhyWhyPage /> },
      { path: App.WHYWHY_CREATE, element: <WhyWhyCreatePage /> },
      { path: App.WHYWHY_VIEW, element: <WhyWhyPageView /> },
      { path: App.WHYWHY_ANALYSIS_VIEW, element: <WhyWhyAnalysisView /> },
      { path: App.WHYWHY_HISTORY, element: <HistoryPage /> },
      { path: "/whywhy/children/:parentId", element: <ThreadChildrenList /> },
      { path: App.WHYWHY_INTERNAL_CASES, element: <InternalCasesSearchPage /> },
      { path: App.WHYWHY_INTERNAL_CASE_DETAIL, element: <InternalCaseDetailView /> },
      { path: App.GENERAL_CHART, element: <GeneralChart /> },
      { path: App.FISHBONE_DIAGRAM, element: <FishboneChartComponent openTree={false} /> },
      { path: App.AI_FISHBONE_DIAGRAM, element: <AIFishboneChart openTree={false} /> },
      { path: App.SETTINGS, element: <SettingsPage /> },
      { path: App.YOUR_PROJECTS, element: <YourProjects /> },
      { path: App.FEEDBACK, element: <Feedback /> },
    ],
  };
}
