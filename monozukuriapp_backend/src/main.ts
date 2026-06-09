import * as dotenv from "dotenv";
dotenv.config();
import { NestFactory } from "@nestjs/core";
import { Amplify } from "aws-amplify";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as compression from "compression";
import { ResponseTransformInterceptor } from "./interceptor/index.interceptor";
import awsmobile from "aws-export";
import helmet from "helmet";
import * as express from "express";

Amplify.configure(awsmobile);

const appPort = process.env.APP_PORT;
const prefix = process.env.APP_PREFIX;
const appName = process.env.APP_NAME;
const corsOrigin = process.env.CORS_ORIGIN?.trim() || "https://kznhub.com";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV || process.env.NODE_ENV === "";

  // Configure body parser to increase request body size limit
  // Default limit is 100kb, increase to 10MB to support large text fields (e.g., description, 5M1E details)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  app.setGlobalPrefix(prefix);

  // Configure CORS - use middleware for flexible header handling in development
  if (isDevelopment) {
    // In development, disable default CORS and use custom middleware
    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          "http://localhost:5173",
          "http://localhost:3000",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:3000",
          corsOrigin,
        ];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all in development
        }
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Cache-Control",
        "Pragma",
        "Expires",
        "Accept",
        "Accept-Language",
        "Origin",
        "X-HTTP-Method-Override",
        "If-Modified-Since",
        "If-None-Match",
        "X-Forwarded-For",
        "X-Forwarded-Proto",
        "X-Real-IP",
      ],
      exposedHeaders: ["Content-Length", "Content-Type"],
    });
  } else {
    // Production CORS configuration
    app.enableCors({
      origin: corsOrigin,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Cache-Control",
        "Pragma",
        "Expires",
        "Accept",
        "Accept-Language",
        "Origin",
        "X-HTTP-Method-Override",
        "If-Modified-Since",
        "If-None-Match",
        "X-Forwarded-For",
        "X-Forwarded-Proto",
        "X-Real-IP",
      ],
      exposedHeaders: ["Content-Length", "Content-Type"],
    });
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
  );

  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle(appName)
    .setDescription(appName)
    .setVersion(prefix)
    .addTag(prefix)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${prefix}/swagger`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.use(compression());

  // Enable Socket.IO (attach to existing HTTP server before listen)
  const { SocketService } = await import("./modules/socket/socket.service");
  const socketService = app.get<import("./modules/socket/socket.service").SocketService>(SocketService);
  await socketService.enableSocketIO(app);

  // CORS middleware must be last to override any headers set by other middlewares
  if (isDevelopment) {
    app.use((req: any, res: any, next: any) => {
      const origin = req.headers.origin;
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        corsOrigin,
      ];

      // Always set CORS headers if origin matches or in development
      if (origin && (allowedOrigins.includes(origin) || isDevelopment)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

        // In development, allow all requested headers
        const requestedHeaders = req.headers["access-control-request-headers"];
        if (requestedHeaders) {
          res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
        } else {
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires, Accept, Accept-Language, Origin, X-HTTP-Method-Override, If-Modified-Since, If-None-Match, X-Forwarded-For, X-Forwarded-Proto, X-Real-IP",
          );
        }

        res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type");

        if (req.method === "OPTIONS") {
          return res.sendStatus(200);
        }
      }
      next();
    });
  }

  await app.listen(appPort);
  console.log(`Application is running on: http://localhost:${appPort}`);
}
bootstrap();
