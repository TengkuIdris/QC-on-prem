import { Injectable } from "@nestjs/common";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { User } from "@prisma/client";
import { SendMailContactDto } from "./dto/sendMailContact.dto";
import { Response } from "src/types/enums/response.enum";
import { prismaClient } from "prisma/client/instance";

@Injectable()
export class AwsSESService {
  private ses: SESClient;

  constructor() {
    this.ses = new SESClient({
      region: process.env.AWS_CONFIG_REGION,
      credentials: {
        accessKeyId: process.env.AWS_CONFIG_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_CONFIG_SECRET_ACCESS_KEY,
      },
    });
  }

  private isValidEmail(email?: string | null) {
    if (!email) return false;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private normalizeEmails(...sources: Array<string | string[] | undefined>) {
    return sources
      .flatMap((source) => {
        if (!source) return [];
        return Array.isArray(source) ? source : source.split(",");
      })
      .map((email) => email.trim())
      .filter((email) => this.isValidEmail(email));
  }

  async sendMail(body: string, subject: string, to: string[], from?: string) {
    try {
      const params = {
        Destination: { ToAddresses: to },
        Message: {
          Body: { Text: { Data: body } },
          Subject: { Data: subject },
        },
        Source: from || process.env.AWS_SES_EMAIL_FROM,
      };
      await this.ses.send(new SendEmailCommand(params));
      return Response.SUCCESS;
    } catch (error) {
      return Response.FAIL;
    }
  }

  private formatImprovementRequestDate(date: Date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${day}日${month}月${year}`;
  }

  async sendImprovementRequestMail(user: User, feedback: string) {
    const sentAt = new Date();
    const subject = `【品質改善の新時代へ】ご意見・要望__${this.formatImprovementRequestDate(sentAt)}`;
    const recipients = this.normalizeEmails(process.env.AWS_SES_TO_EMAIL_FEEDBACK);
    const company = await prismaClient.company.findUnique({ where: { id: user.company_id } });
    const body = `会社名： ${company?.company_name || "-"}
所属： ${user.affiliation || "-"}
氏名： ${user.name || "-"}
送信元アドレス： ${user.email || "-"}

から以下の要望がありました

------------------------------------------

${feedback}

以上`;

    return this.sendMail(body, subject, recipients, process.env.AWS_SES_FROM_EMAIL_FEEDBACK);
  }

  async sendMailToAdmin(sendMailContactDto: SendMailContactDto) {
    const detailSection = sendMailContactDto.detail != null ? `お問い合わせ内容:   ${sendMailContactDto.detail}` : "";
    const subject =
      sendMailContactDto.detail != null
        ? "【JATCO】お客様からのお問い合わせがありました"
        : "【JATCO】お客様からの資料請求がありました";

    const body = `
    このメールはJATCOから配信されています

    お客様からのお問い合わせがありました。
    お問い合わせ内容をご確認のうえ、お客様へご返信をお願いいたします。
    お問い合わせ内容は以下の通りとなります。
    
    ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
    お客様情報

    お名前: ${sendMailContactDto.name}
    メールアドレス:  ${sendMailContactDto.email}
    会社名:   ${sendMailContactDto.company}
    部署名： ${sendMailContactDto.departmentName}

    ${detailSection}
    
    

    ------------------------------------

    どうぞ引き続き、JATCOをよろしくお願いいたします。`;
    try {
      await this.sendMail(body, subject, this.normalizeEmails(process.env.AWS_SES_EMAIL_TO));
      return Response.SUCCESS;
    } catch (error) {
      return Response.FAIL;
    }
  }
  async sendMailToClient(sendMailContactDto: SendMailContactDto) {
    const detailSection = sendMailContactDto.detail != null ? `お問い合わせ内容:   ${sendMailContactDto.detail}` : "";
    const subject =
      sendMailContactDto.detail != null
        ? "【JATCO】お問い合わせありがとうございました"
        : "【JATCO】資料請求ありがとうございました";

    const body = `
    ${sendMailContactDto.name}様

    このたびはお問い合わせありがとうございます。
    ご入力された内容は下記のとおりです。
    追って担当者より確認のご返信をいたしますのでもう少々お待ちください。
    
    ==========
    お名前: ${sendMailContactDto.name}
    
    メールアドレス:  ${sendMailContactDto.email}
    
    会社名:   ${sendMailContactDto.company}
    
    部署名： ${sendMailContactDto.departmentName}
    
    ${detailSection}
    
    ==========

    どうぞよろしくお願いいたします。`;
    try {
      await this.sendMail(body, subject, this.normalizeEmails(sendMailContactDto.email));
      return Response.SUCCESS;
    } catch (error) {
      return Response.FAIL;
    }
  }

  async handleSendContactMail(sendMailContactDto: SendMailContactDto) {
    const adminResponse = await this.sendMailToAdmin(sendMailContactDto);
    const clientResponse = await this.sendMailToClient(sendMailContactDto);
    if (adminResponse === Response.SUCCESS && clientResponse === Response.SUCCESS) {
      return Response.SUCCESS;
    } else {
      return Response.FAIL;
    }
  }
}
