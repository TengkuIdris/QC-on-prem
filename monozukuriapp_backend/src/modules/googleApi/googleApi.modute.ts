import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { GoogleApiService } from "./googleApi.service";

@Module({
  imports: [HttpModule],
  providers: [GoogleApiService],
  exports: [GoogleApiService],
})
export class GoogleApiModule {}
