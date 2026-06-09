import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

@Injectable()
export class InternalApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-internal-api-key"];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      throw new HttpException(
        "Internal API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}
