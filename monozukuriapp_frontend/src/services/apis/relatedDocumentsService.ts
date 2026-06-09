import { ServiceBase } from "./baseService";

class RelatedDocumentsService extends ServiceBase {
  private readonly baseUrl = "/related-documents";

  createDocument(data: FormData) {
    return this.post(`${this.baseUrl}`, data);
  }

  deleteDocument(id: number) {
    return this.delete(`${this.baseUrl}`, id);
  }
}

export const relatedDocumentsService = new RelatedDocumentsService();
