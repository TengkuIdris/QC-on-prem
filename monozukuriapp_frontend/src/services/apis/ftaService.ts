import { ServiceBase } from "./baseService";

class FTAService extends ServiceBase {
  create = async (body: FormData) => {
    return this.post("/fta/create", body);
  };

  update = async (id: number | string, body: FormData) => {
    return this.patch(`/fta/update/${id}`, body);
  };

  getDeatil = async (id: number | string) => {
    return this.get(`/fta/${id}`);
  };
}

const ftaService = new FTAService();
export default ftaService;
