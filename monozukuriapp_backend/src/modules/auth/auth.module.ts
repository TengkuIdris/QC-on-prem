import { Global, Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { CognitoService } from "../cognito/cognito.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { UserModule } from "../user/user.module";

@Global()
@Module({
  imports: [AuditLogModule, UserModule],
  providers: [AuthService, CognitoService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
