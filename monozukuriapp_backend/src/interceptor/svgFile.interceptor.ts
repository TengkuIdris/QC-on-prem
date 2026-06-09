import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from "@nestjs/common";
import { Observable } from "rxjs";
import * as xml2js from "xml2js";

@Injectable()
export class SVGFileInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const files = request.files;

    // If no files are uploaded, proceed without validation
    if (!files || Object.keys(files).length === 0) {
      return next.handle();
    }

    // Loop through all file fields in request.files
    for (const field in files) {
      for (const file of files[field]) {
        // Skip validation if the file is not an SVG
        if (!file.mimetype.includes("svg")) continue;

        const fileContent = file.buffer.toString(); // Convert file buffer to string

        // Define forbidden patterns to detect malicious scripts inside the SVG file
        const forbiddenPatterns = [
          /<script[\s\S]*?>/gi, // Block <script> tags
          /on\w+="[^"]*"/gi, // Block inline JavaScript event handlers (onclick, onload, onerror, etc.)
          /javascript:/gi, // Block "javascript:" URLs
          /eval\(/gi, // Block eval() function
          /setTimeout\(/gi, // Block setTimeout() function
          /setInterval\(/gi, // Block setInterval() function
        ];

        // Check if the file contains any forbidden patterns (potential security risk)
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(fileContent)) {
            throw new BadRequestException("無効なSVGファイル: 不正なスクリプトが含まれています。");
          }
        }

        // Try parsing the SVG file as XML to ensure it's a valid XML format
        try {
          await xml2js.parseStringPromise(fileContent);
        } catch (error) {
          throw new BadRequestException("無効なSVGファイル: XMLの解析に失敗しました。");
        }
      }
    }

    return next.handle();
  }
}
