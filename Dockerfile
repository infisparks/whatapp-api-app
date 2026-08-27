# Multi-stage Production Dockerfile for WhatsApp Business Platform (Coolify / Docker)

# 1. Base Image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 2. Dependencies Stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --include=dev

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy environment variables for build-time Next.js static generation
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_db?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Public Meta App IDs for standalone build
ENV NEXT_PUBLIC_META_APP_ID="3457567954401110"
ENV NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID="1084755870646567"
ENV NEXT_PUBLIC_META_JS_SDK_VERSION="v26.0"

RUN npx prisma generate
RUN npm run build

# 4. Production Runner Stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package and node_modules for Prisma CLI migrations
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Copy Next.js standalone build and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
