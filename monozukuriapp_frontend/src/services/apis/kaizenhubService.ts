import { Metric } from "@/store/slices/submitRecipeSlice";
import { OrderByEnum } from "../../enum";
import { ServiceBase } from "./baseService";

export interface ImprovementListParams {
  orderBy?: OrderByEnum;
  page?: number;
  size?: number;
  title?: string;
  isDraft?: boolean;
  label?: string[];
}

interface ImprovementListQueryParams {
  isViewed?: boolean;
}

export interface ImprovementRequest {
  email?: string;
  fullName?: string;
  companyName?: string;
  department?: string;
  title?: string;
  category?: number;
  summary?: string;
  beforeMetrics?: Metric[];
  afterMetrics?: Metric[];
  tags?: string[];
  relatedDocumentIds?: number[];
  prepDays?: number;
  execDays?: number;
  stepIds?: number[];
  tip?: string;
  caution?: string;
  isDraft?: boolean;
}

class KaiZenHubService extends ServiceBase {
  getImprovementList = async (params: ImprovementListParams) => {
    return await this.get("/kaizenhub/improvement-list", { params: { ...params, size: 6 } });
  };

  getMyImprovement = async (params: ImprovementListParams) => {
    return await this.get("/kaizenhub/my-improvement", { params });
  };

  getImprovementDetail = async (id: number | string, queryParams?: ImprovementListQueryParams) => {
    return await this.get(`/kaizenhub/improvement-detail/${id}`, { params: queryParams });
  };
  createImprovement = async (body: ImprovementRequest) => {
    return await this.post("/kaizenhub/create-improvement", body);
  };

  updateUserInfo = async (body: { fullName: string }) => {
    return await this.put("/kaizenhub/update-user-info", body);
  };
  getImprovementByWeekList = async (params: ImprovementListParams) => {
    return await this.get("/kaizenhub/improvements-by-week", { params: { size: 10, ...params } });
  };

  getLargestLikedImprovementsByWeek = async (params: number) => {
    return await this.get("/kaizenhub/largest-liked-improvements-by-week", { params: { size: params } });
  };

  getListMyFavoriteImproments = async (params: ImprovementListParams) => {
    return await this.get("/kaizenhub/my-favorite-improvements", { params: { ...params } });
  };

  updateImprovement = async (id: number | string, body: ImprovementRequest) => {
    return await this.put(`/kaizenhub/update-improvement/${id}`, body);
  };

  getListDraft = async (params: any) => {
    return await this.get("kaizenhub/my-improvement", { params: params });
  };

  favoriteImprovement = async (improvementId: number) => {
    return await this.post(`/kaizenhub/toggle-favorite-improvements`, { improvementId });
  };

  likeImprovement = async (improvementId: number) => {
    return await this.post(`/kaizenhub/toggle-like-improvements`, { improvementId });
  };

  getLabelList = async () => {
    return await this.get("/kaizenhub/label-list");
  };

  creatReview = async (params: any) => {
    return await this.post("/kaizenhub/create-review", params);
  };
  reviewlist = async (params: any) => {
    return await this.get(`/kaizenhub/review-list/${params.improvementId}`, { params: { ...params } });
  };
  validateTitle = async (payload: { title: string; id?: number }) => {
    return await this.post("/kaizenhub/validate-title", payload);
  };
  getListPostByUser = async (userId: number, params: any) => {
    return await this.get(`/kaizenhub/user-posts/${userId}`, { params: { ...params, size: 6 } });
  };
}

const kaiZenHubService = new KaiZenHubService();
export default kaiZenHubService;
