#!/bin/sh
set -e

# --- Environment guard: refuse to start when misconfigured. ---
if [ -z "$JWT_SECRET" ]; then
  echo "FATAL: JWT_SECRET is not set." >&2
  exit 1
fi
if [ "${#JWT_SECRET}" -lt 32 ]; then
  echo "FATAL: JWT_SECRET must be at least 32 characters (got ${#JWT_SECRET})." >&2
  exit 1
fi
if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "FATAL: ADMIN_USERNAME and ADMIN_PASSWORD must both be set." >&2
  exit 1
fi
if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is not set." >&2
  exit 1
fi

# --- Apply database migrations (creates the SQLite file + tables on first run). ---
# Uses the isolated Prisma CLI under ./.migrate when present (Docker image),
# falling back to the project's own CLI for local use.
echo "Running database migrations..."
if [ -f ./.migrate/node_modules/prisma/build/index.js ]; then
  node ./.migrate/node_modules/prisma/build/index.js migrate deploy --schema ./prisma/schema.prisma
else
  node ./node_modules/prisma/build/index.js migrate deploy
fi

# --- Start the Next.js standalone server. ---
echo "Starting LightRoast Deliver on port ${PORT:-3000}..."
exec node server.js
