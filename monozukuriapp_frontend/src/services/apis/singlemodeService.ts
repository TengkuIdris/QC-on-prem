import { ServiceBase } from "./baseService";

class SingleModeService extends ServiceBase {
  createPareto = async (body: FormData) => {
    return this.post("/pareto/create-pareto", body);
  };

  getDetailPareto = async (id: any) => {
    return this.get(`/pareto/${id}`);
  };

  updateUserInfor = async (body: any, id: number) => {
    return this.patch(`/pareto/update-user/${id}`, body);
  };

  updatePareto = async (body: FormData, id: number | string) => {
    return this.put(`/pareto/update/${id}`, body);
  };
}

const singleModeService = new SingleModeService();
export default singleModeService;
