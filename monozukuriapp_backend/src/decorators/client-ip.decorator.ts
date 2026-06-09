import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ClientIP = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  // Lấy IP thật từ x-forwarded-for, nếu không có thì lấy remoteAddress
  let ip =
    request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    request.ip ||
    "unknown";
  // Chuẩn hóa IPv6 localhost về IPv4
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  return ip;
});
