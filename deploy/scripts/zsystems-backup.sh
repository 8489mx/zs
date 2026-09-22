#!/bin/bash
# نسخة احتياطية يومية لقاعدة بيانات الإنتاج على سيرفر أوراكل.
# التثبيت على السيرفر: /var/www/zsystems/backup.sh ويُشغَّل من crontab المستخدم ubuntu.
#
# 1) نسخة محلية في /var/backups/zsystems (تُحذف بعد 14 يوماً).
# 2) نسخة خارج السيرفر: إن وُجد الملف /etc/zsystems/backup-par-url وفيه رابط
#    Pre-Authenticated Request لحاوية Oracle Object Storage (صلاحية كتابة فقط)،
#    تُرفع النسخة إليه. بدونه تبقى النسخة محلية فقط ويُكتب تحذير في السجل.
set -euo pipefail

BACKUP_DIR="/var/backups/zsystems"
PAR_URL_FILE="/etc/zsystems/backup-par-url"
CONTAINER="zsystems-postgres"
DB_NAME="zsystems_db"
DB_USER="postgres"
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/zsystems_db_$TIMESTAMP.sql.gz"
TMP_FILE="$BACKUP_FILE.partial"

# بدون -t: الطرفية الوهمية تحقن \r في المخرجات فتفسد ملف SQL.
sudo docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$TMP_FILE"

# نسخة سليمة يجب أن تنتهي بسطر إكمال pg_dump.
if ! gzip -cd "$TMP_FILE" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  rm -f "$TMP_FILE"
  echo "[$(date)] ERROR: pg_dump output incomplete, backup discarded" >&2
  exit 1
fi
mv "$TMP_FILE" "$BACKUP_FILE"
echo "[$(date)] Local backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$KEEP_DAYS" -delete

if [ -r "$PAR_URL_FILE" ]; then
  PAR_URL=$(tr -d '[:space:]' < "$PAR_URL_FILE")
  OBJECT_NAME=$(basename "$BACKUP_FILE")
  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 600 -X PUT \
    --data-binary @"$BACKUP_FILE" "${PAR_URL%/}/$OBJECT_NAME")
  if [ "$HTTP_CODE" != "200" ]; then
    echo "[$(date)] ERROR: off-site upload failed (HTTP $HTTP_CODE)" >&2
    exit 1
  fi
  echo "[$(date)] Off-site copy uploaded: $OBJECT_NAME"
else
  echo "[$(date)] WARNING: $PAR_URL_FILE missing - backup is on this server only" >&2
fi
