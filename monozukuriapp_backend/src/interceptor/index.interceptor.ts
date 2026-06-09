import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus } from "@nestjs/common";
import { classToPlain } from "class-transformer";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
export interface Response<T> {
  data: T;
  metadata: Record<string, unknown>;
}
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((_data) => {
        // @Exclude sensitive data
        const data = classToPlain(_data);
        const req = context.switchToHttp().getRequest();
        
        if (!data) {
          return {
            code: HttpStatus.OK,
            data: null,
            metadata: null,
          };
        }
        const metadata = {
          ...data.metadata,
          apiName: process.env.APP_NAME,
          apiVersion: process.env.APP_PREFIX,
          timestamp: new Date(),
        };

        if (req.query) {
          metadata.query = { ...req.query };
        }

        delete data.metadata;
        
        return {
          code: HttpStatus.OK,
          data,
          metadata: metadata,
        };
      }),
    );
  }
}
