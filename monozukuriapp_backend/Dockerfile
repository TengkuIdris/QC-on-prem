# On-prem build. No AWS ECR, no GCP service-account file, no env baking at build time.
# All runtime config comes from docker-compose env vars (or a mounted .env).
# Prisma migrate runs at container startup (postgres isn't up at build time).

FROM node:20-alpine AS build

WORKDIR /app
RUN mkdir -p /app && chmod 777 /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/dist ./dist

EXPOSE 3001

# Boot sequence:
#  1. `prisma migrate deploy` — idempotent; applies any unapplied migrations.
#  2. `npm run seed`          — populates Actions / PlanDetails / Categories.
#                               Each seed truncates-and-reinserts, so it's
#                               idempotent. Reference data only — does NOT
#                               touch user-owned rows.
#  3. start the NestJS server.
# If you want to skip seeding on every restart (e.g. for prod), override CMD
# or set SKIP_SEED=true.
CMD ["sh", "-c", "npx prisma migrate deploy && { [ \"$SKIP_SEED\" = \"true\" ] || npm run seed; } && npm run start:prod"]
