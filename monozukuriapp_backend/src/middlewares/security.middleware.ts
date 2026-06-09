import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Permissions Policy
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

    // Get backend URL from request (where socket server is running)
    const backendUrl = req.protocol + "://" + req.get("host");

    // Convert HTTP to WebSocket protocol
    const wsUrl = backendUrl.replace(/^http/, "ws");
    const wssUrl = backendUrl.replace(/^http/, "wss");

    // Get frontend URL for CORS (if set)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const frontendWsUrl = frontendUrl ? frontendUrl.replace(/^http/, "ws") : null;
    const frontendWssUrl = frontendUrl ? frontendUrl.replace(/^http/, "wss") : null;

    // Content Security Policy - Allow WebSocket connections to backend
    // Also allow connections to frontend URL if set
    const connectSrc = [
      "'self'",
      backendUrl,
      wsUrl,
      wssUrl,
      frontendUrl,
      frontendWsUrl,
      frontendWssUrl,
      "ws://localhost:*",
      "wss://localhost:*",
      "http://localhost:*",
      "https://localhost:*",
      // Cognito (Singapore + Tokyo)

      "https://cognito-idp.ap-southeast-1.amazonaws.com",
      "https://cognito-idp.ap-northeast-1.amazonaws.com",
      // S3 buckets
      "https://jatco-dev.s3.ap-southeast-1.amazonaws.com",
      "https://jatco-staging-dev.s3.ap-northeast-1.amazonaws.com",
    ]
      .filter(Boolean) // Remove null/undefined values
      .join(" ");

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src ${connectSrc}`,
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);

    next();
  }
}
