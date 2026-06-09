import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User as UserPrisma } from "@prisma/client";

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as UserPrisma;
});

export const Authorization = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.headers.authorization;
});
