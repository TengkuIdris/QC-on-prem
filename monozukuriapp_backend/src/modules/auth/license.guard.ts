import { Injectable, CanActivate, ExecutionContext, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { ActionEnum } from "@prisma/client";
import { httpErrors } from "src/exceptions/index.exceptions";

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(@Inject(AuthService) private authService: AuthService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const actionEnum = this.reflector.get<ActionEnum>("action", context.getHandler());

    if (!user || !actionEnum) {
      throw new HttpException(httpErrors.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    if (!(await this.isAuthorized(user.id, actionEnum))) {
      throw new HttpException(httpErrors.FORBIDDEN, HttpStatus.FORBIDDEN);
    }
    return true;
  }

  //check whether allowed to excute this action or not
  private async isAuthorized(userId: number, action: ActionEnum): Promise<boolean> {
    return await this.authService.checkUserAction(userId, action);
  }
}
