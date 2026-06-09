import { ServiceBase } from "./baseService";
class FishboneService extends ServiceBase {
  createFishbone = async (body: FormData) => {
    return this.post("/fishbone/create", body);
  };

  updateFishbone = async (id: number | string, body: FormData) => {
    return this.patch(`/fishbone/update/${id}`, body);
  };

  getFishbone = async (id: number | string) => {
    return this.get(`/fishbone/${id}`);
  };

  reviewFishBone = async (body: any) => {
    return this.post("/fishbone/review-assistant", body);
  };
}

const fishboneService = new FishboneService();
export default fishboneService;
