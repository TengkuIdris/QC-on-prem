import { ServiceBase } from "./baseService";

export interface MailBody {
  name: string;
  email: string;
  company: string;
  role: string;
  detail: string;
}

class SESService extends ServiceBase {
  sendMail = async (body: MailBody) => {
    return await this.post("ses/send-mail-contact", body);
  };
}
const sesService = new SESService();
export default sesService;
