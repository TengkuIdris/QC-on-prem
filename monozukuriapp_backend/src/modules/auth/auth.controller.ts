import { Controller, Post, Body, HttpStatus, Get, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { VerifyDto } from "./dto/verify-code";
import { CreateUserDto } from "./dto/create.dto";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ResendSignUpCodeDto } from "./dto/resendSignUpCode.dto";
import { Authorization } from "src/decorators/user.decorator";
import { UpdateIndentyDto } from "./dto/updateIndenty.dto";
import { ClientIP } from "src/decorators/client-ip.decorator";
import { Public } from "src/decorators/public.decorator";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("/health-check")
  @ApiResponse({ status: HttpStatus.OK, description: "True" })
  async healthCheck() {
    return {
      status: true,
    };
  }

  @Get("check-memory")
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Node.js is using approximately 100 MB",
  })
  async checkMemory() {
    const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    return {
      memoryUsed,
    };
  }

  @Get("version")
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Get version of app",
  })
  async getVersion() {
    return {
      version: "1.0.1",
    };
  }

  @Post("create-user")
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Create user with amplify and cognito",
  })
  async createUser(@Body() creatUserDto: CreateUserDto) {
    return this.authService.createUser(creatUserDto);
  }
  @Post("verify-code")
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Verify code was sent by cognito vie mail",
  })
  async verifyCode(@Body() verifyDto: VerifyDto, @ClientIP() ipAddress: string) {
    return this.authService.verifyCodeSignUp(verifyDto, ipAddress);
  }

  @Post("resend-code")
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Verify code was sent by cognito vie mail",
  })
  async resendSignUpCodeDto(@Body() resendSignUpCodeDto: ResendSignUpCodeDto) {
    return this.authService.resendSignUpCode(resendSignUpCodeDto.email);
  }

  @Post("logout")
  async logout(@Body() body: { email?: string; userId?: number }, @ClientIP() ipAddress: string) {
    return this.authService.logout(body, ipAddress);
  }

  @Post("set-password")
  async setPassword(@Body() body: { userId: string; password: string }, @ClientIP() ipAddress: string) {
    return this.authService.setPasswordForInvitedUser(body.userId, body.password, ipAddress);
  }

  @Post("send-verify-otp")
  async sendVerifyOtp(@Body() body: { email: string }) {
    return this.authService.sendVerifyOtp(body.email);
  }

  @Post("verify-otp")
  async verifyOtp(@Body() body: { email: string; otp: string }, @ClientIP() ipAddress: string) {
    return this.authService.verifyOtp(body.email, body.otp, ipAddress);
  }

  @Get("get-plan")
  @ApiBearerAuth()
  async getPlanToAccessSystem(@Authorization() authorization: string) {
    return this.authService.getPlanToAccess(authorization);
  }

  @Put("update-indenty")
  @Public()
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Update user identity",
  })
  async updateIndenty(@Body() updateIndentyDto: UpdateIndentyDto, @ClientIP() ipAddress: string) {
    return this.authService.updateIndenty(updateIndentyDto.indenty, updateIndentyDto.tokens, ipAddress);
  }
}
