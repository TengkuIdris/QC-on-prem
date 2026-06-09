import { HttpException, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { httpErrors } from "src/exceptions/index.exceptions";

@Injectable()
export class BlockHiddenFilesMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.url.startsWith("/.") || req.url.endsWith(".htaccess")) {
      return new HttpException(httpErrors.FORBIDDEN, 403);
    }
    next();
  }
}
