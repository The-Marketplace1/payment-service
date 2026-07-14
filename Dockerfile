FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Builder stage
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/payment-service/package.json ./artifacts/payment-service/
COPY tsconfig.base.json ./

RUN pnpm install --frozen-lockfile --filter @workspace/payment-service

COPY artifacts/payment-service ./artifacts/payment-service

WORKDIR /app/artifacts/payment-service
RUN pnpm run db:generate
RUN pnpm run build

# Production stage
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/artifacts/payment-service/dist ./dist
COPY --from=builder /app/artifacts/payment-service/package.json ./
COPY --from=builder /app/artifacts/payment-service/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

ENV NODE_ENV=production
EXPOSE 5001

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
