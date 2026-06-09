import { ServiceBase } from "./baseService";

class Categories extends ServiceBase {
  private readonly baseUrl = "/categories";

  getAll = async () => {
    return await this.get(this.baseUrl);
  };
}

export const categoriesService = new Categories();
