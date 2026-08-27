#!/bin/sh
set -e

echo "Running Prisma database synchronization..."
npx prisma db push --skip-generate || true

echo "Starting Next.js WhatsApp Business Platform server on port ${PORT:-3000}..."
exec node server.js
