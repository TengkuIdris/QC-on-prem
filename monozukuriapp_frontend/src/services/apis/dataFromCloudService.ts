import { ServiceBase } from "./baseService";

class DataFromCloudService extends ServiceBase {
  getListPareto = async (params: any) => {
    return this.get("/pareto", { params: params });
  };

  getListFishBone = async (params: any) => {
    return this.get("/fishbone", { params: params });
  };
  getListFTA = async (params: any) => {
    return this.get("/fta", { params: params });
  };

  deletePareto = async (id: number | string) => {
    return this.delete(`/pareto/delete`, id);
  };
  deleteFTA = async (id: number | string) => {
    return this.delete(`/fta/delete`, id);
  };

  deleteFishBone = async (id: number | string) => {
    return this.delete("/fishbone", id);
  };

  getListRecentFiles = async (params: any) => {
    return this.get("/recent-files", { params: params });
  };

  getListWhyWhy = async (params: any) => {
    return this.get("/threads", { params: params });
  };

  deleteWhyWhy = async (id: number | string) => {
    return this.delete(`/threads`, id);
  };
}

const dataFromCloudService = new DataFromCloudService();
export default dataFromCloudService;
