import { Injectable, ExecutionContext, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { AuthService } from "./auth.service";
import { Reflector } from "@nestjs/core";
import awsmobile from "aws-export";
import { httpErrors } from "src/exceptions/index.exceptions";
import { decryptPrivateKey } from "src/utils/aes";
import { setSseCorsHeaders } from "src/utils/cors.util";
import { IS_PUBLIC_KEY } from "src/decorators/public.decorator";

// On-prem dev mode: when DISABLE_AUTH=true the guard short-circuits and injects
// a synthetic user. Used by the local docker-compose stack so the app boots
// without any Cognito / AWS env vars configured.
const AUTH_DISABLED = process.env.DISABLE_AUTH === "true";

// Synthetic user injected into `request.user` when auth is disabled. Shape
// mirrors a real `prisma.user` record enough for downstream controllers that
// just read `id` / `email` / `is_active` / `indenty`.
const DEV_USER = {
  id: 1,
  email: "dev@local",
  name: "Dev User",
  full_name: "Dev User",
  is_active: true,
  indenty: "dev",
  user_type: "Admin",
  company_id: null,
  affiliation: null,
} as const;

@Injectable()
export class CognitoGuard {
  // Lazily initialised so that missing AWS_USER_POOLS_ID at boot (the on-prem
  // case) does not crash module instantiation. The verifiers are only built
  // the first time we actually need to validate a real Cognito token.
  private verifierAccessToken: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
  private verifierIdToken: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

  constructor(@Inject(AuthService) private authService: AuthService, private reflector: Reflector) {}

  private getVerifiers() {
    if (!this.verifierAccessToken) {
      this.verifierAccessToken = CognitoJwtVerifier.create({
        userPoolId: awsmobile.aws_user_pools_id,
        tokenUse: "access",
        clientId: awsmobile.aws_user_pools_web_client_id,
      });
      this.verifierIdToken = CognitoJwtVerifier.create({
        userPoolId: awsmobile.aws_user_pools_id,
        tokenUse: "id",
        clientId: awsmobile.aws_user_pools_web_client_id,
      });
    }
    return { access: this.verifierAccessToken!, id: this.verifierIdToken! };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (AUTH_DISABLED) {
      request["user"] = DEV_USER;
      return true;
    }

    if (!request.headers.authorization) {
      setSseCorsHeaders(response);
      throw new HttpException(httpErrors.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    const token: string[] = request.headers.authorization.replace("Bearer", "").trim().split(" ");
    if (token.length < 1) {
      setSseCorsHeaders(response);
      throw new HttpException(httpErrors.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    try {
      const accessToken = token[0];
      const encryptIdToken = token[1];
      const encryptRandomKey = token[2];
      const idToken = await decryptPrivateKey(encryptIdToken);
      const randomKey = await decryptPrivateKey(encryptRandomKey);
      const { access, id } = this.getVerifiers();
      await access.verify(accessToken);
      const userInfo = await id.verify(idToken);
      const user = await this.authService.validateUserByEmail(userInfo?.email as string);
      if (!user) {
        setSseCorsHeaders(response);
        throw new HttpException(httpErrors.USER_NOT_EXISTED, HttpStatus.UNAUTHORIZED);
      }
      if (!user.is_active) {
        setSseCorsHeaders(response);
        throw new HttpException(httpErrors.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
      }
      if (user.indenty !== randomKey) {
        setSseCorsHeaders(response);
        throw new HttpException(httpErrors.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
      }

      request["user"] = user;
      return true;
    } catch (err) {
      setSseCorsHeaders(response);
      throw new HttpException(httpErrors.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
  }
}
