import { HttpException, HttpStatus } from "@nestjs/common";
import { httpErrors } from "src/exceptions/index.exceptions";

export const imageFileInterceptor = (_, file: Express.Multer.File, cb: (error: Error, acceptFile: boolean) => void) => {
  if (file.mimetype.match(/^image\/.*/)) {
    return cb(null, true);
  }
  cb(new HttpException(httpErrors.IMAGE_ONLY, HttpStatus.BAD_REQUEST), false);
};
