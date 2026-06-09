import { HttpException, HttpStatus, Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { signUp, confirmSignUp, resendSignUpCode, SignUpOutput } from "aws-amplify/auth";
import { prismaClient } from "prisma/client/instance";
import { CreateUserDto } from "./dto/create.dto";
import { httpErrors } from "src/exceptions/index.exceptions";
import { VerifyDto } from "./dto/verify-code";
import { CognitoService } from "../cognito/cognito.service";
import { ActionEnum } from "@prisma/client";
import { decryptPrivateKey } from "src/utils/aes";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import awsmobile from "../../../aws-export";
import { AuditLogService } from "../audit-log/audit-log.service";
import { UserService } from "../user/user.service";
import Redis from "ioredis";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cognitoService: CognitoService,
    private readonly auditLogService: AuditLogService,
    private readonly userService: UserService
  ) { }

  /**
   * On-prem boot: when DISABLE_AUTH=true the CognitoGuard injects a stub user
   * with id=1. That id must actually exist in the User table, otherwise every
   * write that sets `ownerId` on an AnalysisSession (and similar FKs across
   * pareto/fishbone/fta/related-documents) explodes with a constraint error.
   *
   * We upsert a Company id=1 and a User id=1 once on boot. Idempotent —
   * safe to run on every container start.
   */
  async onModuleInit() {
    if (process.env.DISABLE_AUTH !== "true") return;
    try {
      await prismaClient.company.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, company_name: "On-prem Dev Co", is_active: true },
      });
      await prismaClient.user.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          email: "dev@local",
          name: "Dev User",
          full_name: "Dev User",
          affiliation: "on-prem",
          user_type: "Admin",
          is_active: true,
          isConfirmed: true,
          indenty: "dev",
          company_id: 1,
        },
      });
      this.logger.log("On-prem dev user (id=1) ensured.");
    } catch (err) {
      this.logger.error("Failed to seed on-prem dev user — DB writes will fail on FK references.", err as Error);
    }
  }
  // On-prem: lazily built so missing AWS_USER_POOLS_ID at boot does not crash
  // the AuthService constructor. Only the legacy Cognito-only flows
  // (getPlanToAccess, updateIndenty) ever reach these; they are not invoked
  // when DISABLE_AUTH=true.
  private _verifierAccessToken: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
  private _verifierIdToken: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
  private get verifierAccessToken() {
    if (!this._verifierAccessToken) {
      this._verifierAccessToken = CognitoJwtVerifier.create({
        userPoolId: awsmobile.aws_user_pools_id,
        tokenUse: "access",
        clientId: awsmobile.aws_user_pools_web_client_id,
      });
    }
    return this._verifierAccessToken;
  }
  private get verifierIdToken() {
    if (!this._verifierIdToken) {
      this._verifierIdToken = CognitoJwtVerifier.create({
        userPoolId: awsmobile.aws_user_pools_id,
        tokenUse: "id",
        clientId: awsmobile.aws_user_pools_web_client_id,
      });
    }
    return this._verifierIdToken;
  }
  private redis: Redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  });

  async validateUserByEmail(email: string) {
    return await prismaClient.user.findFirst({
      where: {
        email,
      },
    });
  }


  async createUser(createUserDto: CreateUserDto) {
    const { email, password, name } = createUserDto;

    const userExisted = await prismaClient.user.findFirst({
      where: {
        email,
      },
    });

    if (userExisted && !userExisted.isConfirmed) {
      const resultChangePass = await this.cognitoService.deleteUser(email);
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      if (!resultChangePass) {
        throw new HttpException(httpErrors.CHANGE_PASSWORD_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      try {
        return await prismaClient.user.update({
          where: { email },
          data: {
            name,
          },
        });
      } catch {
        throw new HttpException(httpErrors.UPDATE_USER_INFO_FAILED, HttpStatus.BAD_REQUEST);
      }
    }

    if (userExisted) {
      throw new HttpException(httpErrors.USER_EXISTED, HttpStatus.BAD_REQUEST);
    }
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      return {
        ...(await prismaClient.user.create({
          data: {
            email,
            name,
            affiliation: null,
            user_type: null,
            company_id: null,
            full_name: null,
          },
        })),
        isCreatedBefore: false,
      };
    } catch (error) {
      throw new HttpException(httpErrors.CREATE_USER_FAILED, HttpStatus.BAD_REQUEST);
    }
  }

  async verifyCodeSignUp(verifyDto: VerifyDto, ipAddress?: string): Promise<SignUpOutput> {
    const { email, code } = verifyDto;

    const userExisted = await prismaClient.user.findFirst({
      where: {
        email,
      },
    });

    if (!userExisted) {
      throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.BAD_REQUEST);
    }

    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      if (!isSignUpComplete || nextStep?.signUpStep != "DONE") {
        throw new HttpException(httpErrors.CONFIRM_SIGN_UP_FAILED, HttpStatus.BAD_REQUEST);
      }

      await prismaClient.user.update({
        where: { email },
        data: { isConfirmed: true },
      });
      // Log login action
      await this.auditLogService.logAction({
        userId: userExisted.id,
        actionType: "USER_LOGIN",
        resourceType: "user",
        resourceId: userExisted.id,
        metadata: { source: "auth_service", action: "login_verify_code" },
        ipAddress,
      });
      return { isSignUpComplete, nextStep };
    } catch {
      throw new HttpException(httpErrors.CONFIRM_SIGN_UP_FAILED, HttpStatus.BAD_REQUEST);
    }
  }

  async resendSignUpCode(email: string) {
    const user = await this.validateUserByEmail(email);
    if (!user) {
      throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.BAD_REQUEST);
    }
    if (user && user.isConfirmed) {
      throw new HttpException(httpErrors.USER_EXISTED, HttpStatus.BAD_REQUEST);
    }
    try {
      return await resendSignUpCode({
        username: email,
      });
    } catch (e) {
      console.log(e);

      throw new HttpException(httpErrors.RESEND_SIGN_UP_CODE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async checkUserAction(userId: number, actionEnum: ActionEnum): Promise<boolean> {
    const user = await this.userService.getMe(userId);
    const planDetail = user.plansDetails.find((plan) => plan.action.type === actionEnum);

    return planDetail && planDetail?.enableFlag ? planDetail?.enableFlag : false;
  }

  async getPlanToAccess(authorization: string) {
    const actionForPlanA = await prismaClient.planDetail.findMany({
      where: {
        // plan: {
        //   type: PlanTypeEnum.PLAN_A,
        // },
      },
      include: {
        action: true,
      },
    });

    // const actionForPlanB = await prismaClient.planDetail.findMany({
    //   where: {
    //     plan: {
    //       type: PlanTypeEnum.PLAN_B,
    //     },
    //   },
    //   include: {
    //     action: true,
    //   },
    // });

    //using plan D to UET temporarily

    const actionForPlanD = await prismaClient.planDetail.findMany({
      where: {
        // plan: {
        //   type: PlanTypeEnum.PLAN_D,
        // },
      },
      include: {
        action: true,
      },
    });

    if (!authorization) {
      return actionForPlanA;
    }

    const token: string[] = authorization.replace("Bearer", "").trim().split(" ");
    if (token.length < 1) {
      return actionForPlanA;
    }

    try {
      const verifierAccessToken = CognitoJwtVerifier.create({
        userPoolId: process.env.AWS_USER_POOLS_ID,
        tokenUse: "access",
        clientId: process.env.AWS_USER_POOLS_WEB_CLIENT_ID,
      });
      const verifierIdToken = CognitoJwtVerifier.create({
        userPoolId: process.env.AWS_USER_POOLS_ID,
        tokenUse: "id",
        clientId: process.env.AWS_USER_POOLS_WEB_CLIENT_ID,
      });

      const accessToken = token[0];
      const encryptIdToken = token[1];
      const idToken = await decryptPrivateKey(encryptIdToken);
      await verifierAccessToken.verify(accessToken);
      const userInfo = await verifierIdToken.verify(idToken);
      const user = await this.validateUserByEmail(userInfo?.email as string);

      if (!user) {
        return actionForPlanA;
      }

      const respectivePlan = await prismaClient.planDetail.findMany({
        where: {
          plan: {
            userPlans: {
              some: {
                userId: user.id,
                isActive: true,
              },
            },
          },
        },
        include: {
          action: true,
        },
      });

      if (respectivePlan.length > 0) {
        return respectivePlan;
      }
      return actionForPlanD;
    } catch (err) {
      return actionForPlanA;
    }
  }

  async updateIndenty(indenty: string, tokens: string, ipAddress?: string) {
    let email: string;
    try {
      const token = tokens.trim().split(" ");
      const accessToken = token[0];
      const encryptIdToken = token[1];
      const idToken = await decryptPrivateKey(encryptIdToken);
      await this.verifierAccessToken.verify(accessToken);
      email = (await this.verifierIdToken.verify(idToken)).email as string;
    } catch {
      throw new HttpException(httpErrors.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    try {
      const user = await this.validateUserByEmail(email);
      if (!user) {
        throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.UNAUTHORIZED);
      }

      if (user.user_type !== 'MEMBER' && user.user_type !== 'Member') {
        throw new HttpException('Only Member role is allowed to login', HttpStatus.FORBIDDEN);
      }
      if (!user.is_active) {
        throw new HttpException('User is not active', HttpStatus.FORBIDDEN);
      }
      await prismaClient.user.update({
        where: {
          email: email,
        },
        data: {
          indenty: indenty,
          last_login_at: new Date(), // Update last_login_at
        },
      });
      // Log login action
      await this.auditLogService.logAction({
        userId: user.id,
        actionType: "USER_LOGIN",
        resourceType: "user",
        resourceId: user.id,
        metadata: { source: "auth_service", action: "login_update_indenty" },
        ipAddress,
      });
    } catch (error) {
      console.log("error=========================", error)
      throw new HttpException(
        httpErrors.AN_ERROR_OCCURRED_WHILE_UPDATING_DATA_IN_THE_DATABASE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout({ email, userId }: { email?: string; userId?: number }, ipAddress?: string) {
    let user = null
    if (userId) {
      user = await prismaClient.user.findUnique({ where: { id: userId } })
    } else if (email) {
      user = await prismaClient.user.findFirst({ where: { email } })
    }
    if (!user) {
      throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.UNAUTHORIZED)
    }

    // if (this.auditLogService?.logAction) {
    //   await this.auditLogService.logAction({
    //     userId: user.id.toString(),
    //     actionType: 'USER_LOGOUT',
    //     resourceType: 'user',
    //     resourceId: user.id.toString(),
    //     metadata: { source: 'auth_service', action: 'logout' },
    //     ipAddress
    //   });
    // }
    return { success: true }
  }

  async setPasswordForInvitedUser(userId: string, password: string, ipAddress?: string) {
    // Get user from DB
    const user = await prismaClient.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
      throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.BAD_REQUEST);
    }
    if (user.is_active) {
      throw new HttpException("ユーザーは既にアクティブです", HttpStatus.BAD_REQUEST);
    }
    // Trước khi đăng ký Cognito cho user được invite, đảm bảo không còn user cũ trên Cognito
    // (case: đã từng tạo user trên Cognito nhưng DB vẫn ở trạng thái invite)
    try {
      await this.cognitoService.deleteUser(user.email);
    } catch (cleanupError) {
      // Không chặn flow set-password nếu chỉ là lỗi credential/permission;
      // hàm deleteUser đã tự handle UserNotFound và các lỗi phổ biến.
      console.error("Pre-registration Cognito delete failed (continuing set-password flow):", cleanupError);
    }

    // Register Cognito
    try {
      const requireOtp = user.user_type === "Admin" || user.user_type === "Support";
      let cognitoRes;

      if (requireOtp) {
        // Admin/Support: Use SignUpCommand (will send OTP email)
        cognitoRes = await this.cognitoService.signUpWithEmail(user.email, password);
      } else {
        // Member/ReadOnly: Use AdminCreateUser with SUPPRESS to avoid sending OTP email
        cognitoRes = await this.cognitoService.adminCreateUserWithoutEmail(user.email, password);
      }

      // Save cognito_user_id to DB (link local user with Cognito)
      // AdminCreateUser returns User.Username, SignUpCommand returns UserSub
      const cognitoUserId = requireOtp
        ? cognitoRes.UserSub
        : cognitoRes.UserSub || cognitoRes.User?.Username;

      const updatedUser = await prismaClient.user.update({
        where: { id: Number(userId) },
        data: {
          is_active: !requireOtp, // only activate immediately if no OTP required
          cognito_user_id: cognitoUserId,
        },
      });
      // Log audit for password setting nếu có auditLogService
      if (this.auditLogService?.logAction) {
        await this.auditLogService.logAction({
          userId: updatedUser.id.toString(),
          actionType: 'PASSWORD_SET',
          resourceType: 'user',
          resourceId: updatedUser.id.toString(),
          oldValues: {
            is_active: user.is_active,
            cognito_user_id: user.cognito_user_id
          },
          newValues: {
            is_active: !requireOtp,
            cognito_user_id: cognitoRes.UserSub
          },
          metadata: {
            source: 'auth_service',
            action: 'set_password',
            requireOtp,
            user_type: user.user_type
          },
          ipAddress
        });
      }
      return {
        message: requireOtp
          ? "パスワードを設定しました。認証コードをご確認ください。"
          : "パスワードを設定し、Cognitoアカウントを確認しました。",
        email: user.email, // Return email for FE to use
        requireOtp,
      };
    } catch (error) {
      // Log detailed error for debugging (not shown to user)
      console.error("Cognito registration error:", error);
      // Only show simple error message to user
      throw new HttpException("Cognito登録に失敗しました", HttpStatus.BAD_REQUEST);
    }
  }

  async sendVerifyOtp(email: string) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Save to Redis with 10-minute TTL
    await this.redis.set(`otp:${email}`, otp, "EX", 600); // 600 seconds = 10 minutes
    // Send email via SES
    const ses = new SESClient({ region: process.env.AWS_CONFIG_REGION });
    const params = {
      Destination: { ToAddresses: [email] },
      Message: {
        Body: { Text: { Data: `Your verification code is: ${otp}` } },
        Subject: { Data: "Your verification code" },
      },
      Source: process.env.AWS_SES_EMAIL_FROM!,
    };
    await ses.send(new SendEmailCommand(params));
    return { message: "認証コードを送信しました" };
  }

  async verifyOtp(email: string, otp: string, ipAddress?: string) {
    const cachedOtp = await this.redis.get(`otp:${email}`);
    if (!cachedOtp || cachedOtp !== otp) {
      throw new HttpException("無効または期限切れの認証コードです", HttpStatus.BAD_REQUEST);
    }
    // Confirm email on Cognito (nếu có hàm setEmailVerified thì gọi, nếu không thì chỉ update user)
    await this.cognitoService.setEmailVerified(email, true); // Nếu có
    await this.redis.del(`otp:${email}`);
    // Update user status to active if họ inactive do MFA reset
    const updatedUser = await prismaClient.user.update({
      where: { email },
      data: { is_active: true },
    });
    // Log audit cho OTP verification nếu có
    if (this.auditLogService?.logAction) {
      await this.auditLogService.logAction({
        userId: updatedUser.id.toString(),
        actionType: 'EMAIL_VERIFIED',
        resourceType: 'user',
        resourceId: updatedUser.id.toString(),
        oldValues: { is_active: false },
        newValues: { is_active: true },
        metadata: {
          source: 'auth_service',
          action: 'otp_verification',
          email_verified: true
        },
        ipAddress
      });
    }
    return {
      message: "メール認証が完了しました",
      userVerified: true,
    };
  }
}
