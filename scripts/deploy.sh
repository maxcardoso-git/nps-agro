#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="${APP_NAME:-nps-agro-api}"

cd "$ROOT_DIR"

if [[ ! -f "$ROOT_DIR/.env.production" ]]; then
  echo ".env.production not found in $ROOT_DIR"
  exit 1
fi

set -a
. "$ROOT_DIR/.env.production"
set +a

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT:-3000}/health}"

echo "[1/7] Pulling latest code"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git rev-parse --verify HEAD >/dev/null 2>&1; then
  git pull origin main
else
  echo "Skipping git pull: repository not fully initialized for pull."
fi

echo "[2/7] Installing dependencies"
npm install --include=dev

echo "[3/7] Building application"
npm run build

echo "[4/7] Running migrations"
"$ROOT_DIR/scripts/run-migrations.sh"

echo "[5/7] Restarting application with PM2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  mkdir -p /var/log/nps-agro-api
  pm2 start ecosystem.config.js --only "$APP_NAME"
fi

echo "[6/7] Persisting PM2 process list"
pm2 save

echo "[7/7] Validating health endpoint"
curl -fsS "$HEALTH_URL" >/dev/null
echo "Deploy completed successfully."
