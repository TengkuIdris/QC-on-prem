import { Controller, Post, Body } from "@nestjs/common";
import { AwsSESService } from "./ses.service";
import { ApiTags } from "@nestjs/swagger";
import { SendMailContactDto } from "./dto/sendMailContact.dto";

@Controller("ses")
@ApiTags("SES")
export class AwsSESController {
  constructor(private readonly awsSESService: AwsSESService) {}

  @Post("send-mail-contact")
  async resendSignUpCodeDto(@Body() sendMailContactDto: SendMailContactDto) {
    return this.awsSESService.handleSendContactMail(sendMailContactDto);
  }
}
