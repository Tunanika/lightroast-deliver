# syntax=docker/dockerfile:1

# ---- base ----
FROM node:20-alpine AS base
# libc6-compat + openssl are required by Prisma engines on Alpine (musl).
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json* ./
# Schema is needed because the postinstall script runs `prisma generate`.
COPY prisma ./prisma
RUN npm ci

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` runs `prisma generate && next build`.
RUN npm run build

# ---- migrator ----
# A minimal, isolated Prisma CLI (+ musl engines) used only for `migrate deploy`
# at startup. Kept separate from the app so the lean standalone image isn't
# bloated by re-shipping next/react/swc.
FROM base AS migrator
WORKDIR /m
RUN npm init -y >/dev/null \
  && npm install prisma@6.19.3 --no-audit --no-fund

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output (the app + its traced node_modules + server.js).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The generated Prisma client engine for the app (standalone tracing can miss it).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Schema + committed migrations, and the isolated Prisma CLI for migrate deploy.
COPY --from=builder /app/prisma ./prisma
COPY --from=migrator /m/node_modules ./.migrate/node_modules

# Entrypoint.
COPY --from=builder /app/start.sh ./start.sh
RUN chmod +x ./start.sh \
  && mkdir -p /data \
  && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./start.sh"]
