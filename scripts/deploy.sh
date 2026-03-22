#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

# Validate that .env exists — docker-compose.yml uses env_file: .env
if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "ERROR: .env not found in $ROOT_DIR"
  echo "Copy .env.example to .env and fill in the required values before deploying."
  exit 1
fi

echo "[1/4] Pulling latest code"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git rev-parse --verify HEAD >/dev/null 2>&1; then
  git pull origin main
else
  echo "Skipping git pull: repository not fully initialized for pull."
fi

echo "[2/4] Stopping existing containers"
docker compose down --timeout 30

echo "[3/4] Building and starting all services"
# --build rebuilds images with latest code
# Migrations run automatically inside the backend container on startup
docker compose up -d --build

echo "[4/4] Validating health endpoint"
HEALTH_URL="http://127.0.0.1/health"
ATTEMPTS=15
SLEEP_SECONDS=2

for ((i=1; i<=ATTEMPTS; i++)); do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "Health check passed."
    echo "Deploy completed successfully."
    exit 0
  fi

  echo "Health check attempt $i/$ATTEMPTS failed. Retrying in ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
done

echo "Health check failed after $ATTEMPTS attempts. Showing recent logs:"
docker compose logs --tail=50
exit 1
