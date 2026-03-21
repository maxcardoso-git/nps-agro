#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/sql/versioned"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command not found"
  exit 1
fi

FILES=(
  "001_init_schema.sql"
  "002_indexes.sql"
  "003_views.sql"
  "004_phase2_alter_app_user.sql"
)

for file in "${FILES[@]}"; do
  echo "Applying migration: $file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$file"
done

if [[ "${RUN_DEV_SEEDS:-false}" == "true" ]]; then
  echo "Applying dev seeds: 100_seed_dev.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/100_seed_dev.sql"
fi

echo "Migrations applied successfully."
