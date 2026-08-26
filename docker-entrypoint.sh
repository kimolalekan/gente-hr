#!/bin/sh
# Entrypoint for the Gente HR container. Runs optional database
# migrate/seed steps, then execs the app command (`node server.js`).
set -e

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "> Applying database migrations…"
  pnpm db:migrate
fi

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "> Seeding database (idempotent)…"
  pnpm db:seed
fi

echo "> Starting Gente HR on port ${PORT:-4001}…"
exec "$@"
