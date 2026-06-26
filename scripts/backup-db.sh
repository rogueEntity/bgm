#!/usr/bin/env bash

set -euo pipefail

# =========================
# BGM PostgreSQL Backup
# Uses pg_dump from PostgreSQL Docker image
# =========================

BACKUP_DIR="${BGM_BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BGM_BACKUP_RETENTION_DAYS:-14}"

DB_HOST="${BGM_DB_HOST:-127.0.0.1}"
DB_PORT="${BGM_DB_PORT:-5432}"
DB_NAME="${BGM_DB_NAME:-bgm}"
DB_USER="${BGM_DB_USER:-postgres}"
DB_PASSWORD="${BGM_DB_PASSWORD:-}"

POSTGRES_IMAGE="${BGM_POSTGRES_IMAGE:-postgres:17}"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/bgm_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "📦 BGM DB backup started"
echo "Host: ${DB_HOST}"
echo "Port: ${DB_PORT}"
echo "DB: ${DB_NAME}"
echo "User: ${DB_USER}"
echo "Image: ${POSTGRES_IMAGE}"
echo "Output: ${BACKUP_FILE}"

docker run --rm \
  --network host \
  -e PGPASSWORD="${DB_PASSWORD}" \
  -v "${BACKUP_DIR}:/backups" \
  "${POSTGRES_IMAGE}" \
  pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="/backups/$(basename "${BACKUP_FILE}")"

echo "✅ Backup completed: ${BACKUP_FILE}"

echo "🧹 Removing backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -type f -name "bgm_*.dump" -mtime +"${RETENTION_DAYS}" -delete

echo "✅ Cleanup completed"