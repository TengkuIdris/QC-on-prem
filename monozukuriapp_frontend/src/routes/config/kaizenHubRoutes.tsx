import { Navigate } from "react-router-dom";
import { App } from "@/enum/pathnames";
import KaizenHubTab from "@/pages/kaizen-hub/kaizen-hub-tab";
import KaizenHub from "@/pages/kaizen-hub/kaizen-hub";
import KaizenHubTabSearch from "@/pages/kaizen-hub/kaizen-hub-tab-search";
import KaizenHubTabInfo from "@/pages/kaizen-hub/kaizen-hub-tab-info";
import KaizenHubDetailPost from "@/pages/kaizen-hub/kaizen-hub-detail-post";
import SubmitRecipePage from "@/pages/kaizen-hub/submit-recipe";
import PostReviewList from "@/pages/kaizen-hub/post-review/PostReviewList";
import PostRecipe from "@/pages/kaizen-hub/kaizen-hub-demo-post";
import PostReview from "@/pages/kaizen-hub/post-review/PostReviewForm";
import KaizenHubUser from "@/pages/kaizen-hub/kaizen-hub-user";
import { RouteConfig } from "../types";

interface KaizenHubRoutesOptions {
  viewKaizenhub: boolean;
  postAndViewKaizenhub: boolean;
}

export function createKaizenHubRoutes({
  viewKaizenhub,
  postAndViewKaizenhub,
}: KaizenHubRoutesOptions): RouteConfig | null {
  if (!viewKaizenhub) {
    return null;
  }

  return {
    element: <KaizenHubTab />,
    children: [
      { path: App.KAIZEN_HUB, element: <KaizenHub /> },
      { path: App.KAIZEN_HUB_SEARCH, element: <KaizenHubTabSearch /> },
      { path: App.KAIZEN_HUB_INFO, element: <KaizenHubTabInfo /> },
      { path: `${App.KAIZEN_HUB_INFO}/:id`, element: <KaizenHubDetailPost /> },
      {
        path: App.KAIZEN_HUB_POST,
        element: postAndViewKaizenhub ? <SubmitRecipePage /> : <Navigate to={App.KAIZEN_HUB} />,
      },
      { path: `${App.KAIZEN_HUB_REVIEW_RECIPE}/:id`, element: <PostReviewList /> },
      {
        path: `${App.KAIZEN_HUB_SEARCH}/:id`,
        element: postAndViewKaizenhub ? <KaizenHubDetailPost /> : <Navigate to={App.KAIZEN_HUB} />,
      },
      { path: `${App.KAIZEN_HUB_POST}/:id`, element: <PostRecipe /> },
      { path: `${App.KAIZEN_HUB_SEARCH}/:id/reviews`, element: <PostReview /> },
      { path: `${App.KAIZEN_HUB_USER}/:userId`, element: <KaizenHubUser /> },
    ],
  };
}
