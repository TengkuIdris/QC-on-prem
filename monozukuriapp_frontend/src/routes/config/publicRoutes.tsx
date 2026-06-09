import { Navigate } from "react-router-dom";
import { App } from "@/enum/pathnames";
import InitialPage from "@/pages/InitialPage/InitialPage";
import InitialPageEn from "@/pages/InitialPage/en/InitialPageEn";
import PrivacyPolicy from "@/pages/PrivacyandPolicy/PrivacyandPolicy";
import FeatureCauseTool from "@/pages/ProductPage/FeatureCauseTool";
import ProductParetoPage from "@/pages/ProductPage/ProductParetoPage";
import ProductFishbonePage from "@/pages/ProductPage/ProductFishbonePage";
import ProductWhyWhyPage from "@/pages/ProductPage/ProductWhyWhyPage";
import ProductWebsavePage from "@/pages/ProductPage/ProductWebsavePage";
import ProductServiceSupportPage from "@/pages/ProductPage/ProductServiceSupportPage";
import Contact from "@/pages/HomePage/Contact";
import ErrorPage from "@/pages/ErrorPage/ErrorPage";
import UseCasesPage from "@/pages/SolutionPage/UseCasesPage";
import BlogIndexPage from "@/pages/SolutionPage/BlogIndexPage";
import BlogPostPage from "@/pages/SolutionPage/BlogPostPage";
import CompanyInfoPage from "@/pages/CompanyPage/CompanyInfoPage";
import TeamPage from "@/pages/CompanyPage/TeamPage";
import { RouteConfig } from "../types";

export function createPublicRoutes(): RouteConfig[] {
  return [
    { path: App.INDEX, element: <InitialPage /> },
    { path: "/en", element: <InitialPageEn /> },
    { path: App.PRIVACYANDPOLICY, element: <PrivacyPolicy /> },
    { path: App.FEATURE_CAUSE_TOOL, element: <FeatureCauseTool /> },
    { path: App.PRODUCT_PARETO, element: <ProductParetoPage /> },
    { path: App.PRODUCT_FISHBONE, element: <ProductFishbonePage /> },
    { path: App.PRODUCT_WHYWHY, element: <ProductWhyWhyPage /> },
    { path: App.PRODUCT_WEBSAVE, element: <ProductWebsavePage /> },
    { path: App.PRODUCT_SERVICE_SUPPORT, element: <ProductServiceSupportPage /> },
    { path: App.CONTACT, element: <Contact /> },
    {
      path: App.SOLUTIONS,
      element: (
        <Navigate
          to={App.SOLUTIONS_USE_CASES}
          replace
        />
      ),
    },
    { path: App.SOLUTIONS_USE_CASES, element: <UseCasesPage /> },
    { path: App.SOLUTIONS_BLOG, element: <BlogIndexPage /> },
    { path: App.SOLUTIONS_BLOG_POST, element: <BlogPostPage /> },
    { path: App.COMPANY, element: <CompanyInfoPage /> },
    { path: App.COMPANY_INFO, element: <CompanyInfoPage /> },
    { path: App.COMPANY_TEAM, element: <TeamPage /> },
    { path: "*", element: <ErrorPage /> },
  ];
}
