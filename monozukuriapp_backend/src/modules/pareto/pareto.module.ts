import { Module } from "@nestjs/common";
import { ParetoService } from "./pareto.service";
import { ParetoController } from "./pareto.controller";
import { AwsS3Service } from "../s3/s3.service";
import { UserService } from "../user/user.service";
import { RecentFilesModule } from "../recent-files/recent-files.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [RecentFilesModule, AuditLogModule],
  controllers: [ParetoController],
  providers: [ParetoService, AwsS3Service, UserService],
  exports: [ParetoService],
})
export class ParetoModule {}
