#!/bin/sh
set -eu

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MONGO_URI="${MONGO_URI:-mongodb://mongo:27017/skillswap}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
ARCHIVE="$BACKUP_DIR/mongo-$TIMESTAMP.archive.gz"

mongodump --uri="$MONGO_URI" --archive="$ARCHIVE" --gzip

# Remove old backups based on retention
find "$BACKUP_DIR" -type f -name 'mongo-*.archive.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[$(date -Iseconds)] Backup created: $ARCHIVE"
