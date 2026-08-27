#!/bin/sh
set -e

echo "=== Starting WhatsApp Business Platform (Coolify / Docker) ==="

# Wait for database connection and run prisma db push with retries
echo "Checking and synchronizing database schema..."
MAX_RETRIES=10
RETRY_COUNT=0

until npx prisma db push --skip-generate || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "Database not ready yet... Retrying in 2 seconds ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Warning: Database synchronization timed out, continuing startup..."
fi

echo "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
