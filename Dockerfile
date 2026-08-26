# syntax=docker/dockerfile:1
#
# Gente HR — multi-stage production image.
#
#   Build:  docker build -t gente .
#   Run:    docker run --rm -p 4001:4001 \
#             -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/gente \
#             -e AUTH_SESSION_SECRET=change-me \
#             gente
#
# The runtime image keeps the full dependency tree on purpose: the app
# entrypoint (`docker-entrypoint.sh`) runs `db:migrate`/`db:seed` (via tsx)
# before booting, so the same image works as app, migrator and seeder.

# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
# Enable pnpm (lockfile v9 → pnpm 9.x) without needing a package.json
# `packageManager` field.
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ─── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Production build (lint is intentionally non-blocking — see next.config.ts).
RUN pnpm build

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=4001 \
    # Apply pending Drizzle migrations on boot.
    RUN_MIGRATIONS=1 \
    # Seed the demo dataset on first boot (idempotent; disable in prod).
    RUN_SEED=0

# Runtime: compiled app + server + full node_modules (tsx/drizzle for db scripts).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/db ./db
# Seeder imports DEFAULT_TENANT_THEME from src/lib/theme-config at runtime.
COPY --from=builder /app/src ./src

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4001/login >/dev/null 2>&1 || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
