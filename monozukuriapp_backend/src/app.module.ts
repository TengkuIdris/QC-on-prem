import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { RedisClientOptions } from "redis";
import { BullModule } from "@nestjs/bull";
import * as redisStore from "cache-manager-redis-store";
import { AuthModule } from "./modules/auth/auth.module";
import { redisConfig } from "./configs/redis..config";
import { UserModule } from "./modules/user/user.module";
import { KaizendhubModule } from "./modules/kaizenhub/kaizenhub.module";
import { ParetoModule } from "./modules/pareto/pareto.module";
import { FishBoneModule } from "./modules/fishbone/fishbone.module";
import { FTAModule } from "./modules/fta/fta.module";
import { AwsSESModule } from "./modules/ses/ses.module";
import { GoogleApiModule } from "./modules/googleApi/googleApi.modute";
import { RecentFilesModule } from "./modules/recent-files/recent-files.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";
import { AnalysisModule } from "./modules/analysis.module";
import { CategoryModule } from "./modules/categories/category.module";
import { RelatedDocumentsModule } from "./modules/related-documents/related-document.module";
import { ImplementationStepsModule } from "./modules/implementation-steps/implementation-steps.module";
import { ScheduleModule } from "@nestjs/schedule";
import { SocketModule } from "./modules/socket/socket.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { SecurityMiddleware } from "./middlewares/security.middleware";
import { BlockHiddenFilesMiddleware } from "./middlewares/block-hidden-files.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    CacheModule.register<RedisClientOptions>({
      store: redisStore as any,
      url: `redis://${redisConfig.host}:${redisConfig.port}`,
      isGlobal: true,
    }),
    BullModule.forRoot({
      redis: redisConfig,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    KaizendhubModule,
    ParetoModule,
    FishBoneModule,
    FTAModule,
    AwsSESModule,
    GoogleApiModule,
    RecentFilesModule,
    FeedbackModule,
    AnalysisModule,
    CategoryModule,
    RelatedDocumentsModule,
    ImplementationStepsModule,
    SocketModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware, BlockHiddenFilesMiddleware).forRoutes("*");
  }
}
