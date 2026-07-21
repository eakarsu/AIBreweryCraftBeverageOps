#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$project_dir"; set -a; . ./.env; set +a
for migration in backend/migrations/*.sql; do PGPASSWORD="${DB_PASSWORD:-}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:?DB_USER required}" -d "${DB_NAME:?DB_NAME required}" -v ON_ERROR_STOP=1 -f "$migration"; done
