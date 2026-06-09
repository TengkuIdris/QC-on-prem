import { PipeTransform, Injectable, ArgumentMetadata, HttpException, HttpStatus } from "@nestjs/common";
import { extname } from "path";
import { httpErrors } from "src/exceptions/index.exceptions";

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(value: any, _: ArgumentMetadata) {
    const MAX_SIZE = 10 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".xlsx"];

    if (!value || (Array.isArray(value) && value.length === 0)) {
      throw new HttpException(httpErrors.INVALID_FILE, HttpStatus.BAD_REQUEST);
    }

    if (Array.isArray(value)) {
      value.forEach((file) => {
        const extension = extname(file.originalname);
        if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
          throw new HttpException(httpErrors.INVALID_FILE_TYPE, HttpStatus.BAD_REQUEST);
        }

        if (file.size > MAX_SIZE) {
          throw new HttpException(httpErrors.FILE_SIZE_EXCEEDED, HttpStatus.PAYLOAD_TOO_LARGE);
        }
      });
    } else {
      const extension = extname(value.originalname);
      if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
        throw new HttpException(httpErrors.INVALID_FILE_TYPE, HttpStatus.BAD_REQUEST);
      }

      if (value.size > MAX_SIZE) {
        throw new HttpException(httpErrors.FILE_SIZE_EXCEEDED, HttpStatus.PAYLOAD_TOO_LARGE);
      }
    }

    return value;
  }
}
