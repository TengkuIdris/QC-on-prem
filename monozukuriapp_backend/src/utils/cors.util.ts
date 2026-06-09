import { Response } from "express";

const DEFAULT_CORS_ORIGIN = "https://kznhub.com";

export const setSseCorsHeaders = (res: Response): void => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const configuredOrigins = process.env.CORS_ORIGIN?.trim() || DEFAULT_CORS_ORIGIN;
  const requestOrigin = res.req.headers.origin;

  let allowOrigin = configuredOrigins;

  if (isDevelopment && requestOrigin) {
    const isLocalhost = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
    allowOrigin = isLocalhost ? requestOrigin : configuredOrigins;
  }

  res.header("Access-Control-Allow-Origin", allowOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Expose-Headers", "*");
};
