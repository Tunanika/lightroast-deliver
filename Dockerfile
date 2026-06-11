# syntax=docker/dockerfile:1

# ---- base ----
# Node provides the proven runtime for Next standalone + Prisma; bun is the
# package manager / script runner. Both are musl (Alpine) compatible.
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----
FROM base AS deps
COPY package.json bun.lock ./
# Schema is needed because the postinstall script runs `prisma generate`.
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `bun run build` runs `prisma generate && next build`.
RUN bun run build

# ---- migrator ----
# A minimal, isolated Prisma CLI (+ musl engines) used only for `migrate deploy`
# at startup, so the lean standalone image isn't bloated by re-shipping deps.
FROM base AS migrator
WORKDIR /m
# trustedDependencies makes bun run the engine-download postinstall; the final
# check fails the build early if the musl schema-engine isn't present.
RUN printf '{"name":"m","version":"1.0.0","trustedDependencies":["prisma","@prisma/engines","@prisma/client"]}' > package.json \
  && bun add prisma@6.19.3 \
  && ls node_modules/@prisma/engines/*schema-engine* >/dev/null

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production

# Next.js standalone output (the app + its traced node_modules + server.js).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# The generated Prisma client engine for the app (standalone tracing can miss it).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Schema + committed migrations, and the isolated Prisma CLI for migrate deploy.
COPY --from=builder /app/prisma ./prisma
COPY --from=migrator /m/node_modules ./.migrate/node_modules

# Entrypoint.
COPY --from=builder /app/start.sh ./start.sh
RUN chmod +x ./start.sh \
  && mkdir -p /data \
  && chown -R node:node /data

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./start.sh"]
