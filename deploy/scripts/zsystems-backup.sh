#!/bin/bash
# نسخة احتياطية يومية لقاعدة بيانات الإنتاج على سيرفر أوراكل.
# التثبيت على السيرفر: /var/www/zsystems/backup.sh ويُشغَّل من crontab المستخدم ubuntu.
#
# 1) نسخة محلية في /var/backups/zsystems (تُحذف بعد 14 يوماً).
# 2) Oracle Object Storage: إن وُجد الملف /etc/zsystems/backup-par-url وفيه رابط
#    Pre-Authenticated Request (صلاحية كتابة فقط)، تُرفع النسخة إليه.
# 3) Google Drive (خارج حساب أوراكل بالكامل): إن كان rclone مضبوطاً بـ remote اسمه
#    gdrive للمستخدم ubuntu، تُنسخ إلى gdrive:zsystems-backups وتُحذف منه بعد 90 يوماً.
#
# الوجهتان الخارجيتان مستقلتان: فشل واحدة لا يمنع الأخرى، لكن السكربت يخرج بخطأ
# في النهاية حتى يظهر الفشل في السجل.
set -euo pipefail

BACKUP_DIR="/var/backups/zsystems"
PAR_URL_FILE="/etc/zsystems/backup-par-url"
GDRIVE_REMOTE="gdrive"
GDRIVE_DIR="zsystems-backups"
GDRIVE_KEEP_DAYS=90
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

OBJECT_NAME=$(basename "$BACKUP_FILE")
FAILED=0

if [ -r "$PAR_URL_FILE" ]; then
  PAR_URL=$(tr -d '[:space:]' < "$PAR_URL_FILE")
  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 600 -X PUT \
    --data-binary @"$BACKUP_FILE" "${PAR_URL%/}/$OBJECT_NAME" || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date)] Oracle Object Storage copy uploaded: $OBJECT_NAME"
  else
    echo "[$(date)] ERROR: Oracle Object Storage upload failed (HTTP $HTTP_CODE)" >&2
    FAILED=1
  fi
else
  echo "[$(date)] WARNING: $PAR_URL_FILE missing - no Oracle Object Storage copy" >&2
fi

if command -v rclone > /dev/null && rclone listremotes 2>/dev/null | grep -qx "$GDRIVE_REMOTE:"; then
  if rclone copy "$BACKUP_FILE" "$GDRIVE_REMOTE:$GDRIVE_DIR" --retries 3; then
    echo "[$(date)] Google Drive copy uploaded: $OBJECT_NAME"
    rclone delete "$GDRIVE_REMOTE:$GDRIVE_DIR" --min-age "${GDRIVE_KEEP_DAYS}d" --include "zsystems_db_*.sql.gz" \
      || echo "[$(date)] WARNING: Google Drive cleanup of old backups failed" >&2
  else
    echo "[$(date)] ERROR: Google Drive upload failed" >&2
    FAILED=1
  fi
else
  echo "[$(date)] WARNING: rclone remote '$GDRIVE_REMOTE' not configured - no Google Drive copy" >&2
fi

exit "$FAILED"
