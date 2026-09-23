#!/bin/bash
# النسخ الاحتياطي لقاعدة بيانات الإنتاج على سيرفر أوراكل. وضعان:
#
#   backup.sh            (daily)  النسخة الكاملة المجمّعة — كل الوجهات. الافتراضي.
#   backup.sh hourly     (hourly) نسخة خفيفة كل ساعة لتقليص ما يضيع عند العطل.
#
# التثبيت على السيرفر: /var/www/zsystems/backup.sh ويُشغَّل من crontab المستخدم ubuntu:
#   0 3 * * *  /var/www/zsystems/backup.sh        >> /var/backups/zsystems/backup.log 2>&1
#   30 * * * * /var/www/zsystems/backup.sh hourly >> /var/backups/zsystems/backup.log 2>&1
#
# --- الوضع اليومي (daily) ---
# الناتج ملف واحد مجمّع (bundle) فيه:
#   full/zsystems_db.sql.gz   نسخة السيرفر كله (pg_dump) لإعادة بناء سيرفر كامل
#   tenants/<slug>__<id>.zsbak حزمة جاهزة لكل عميل، لنقله لنسخة الديسكتوب أو استرجاعه وحده
#   manifest.json             القائمة وبصمة كل ملف
# الوجهات: محلياً في /var/backups/zsystems (14 يوماً)، وOracle Object Storage عبر رابط PAR في
# /etc/zsystems/backup-par-url، وGoogle Drive عبر rclone remote اسمه gdrive (90 يوماً).
#
# --- الوضع الساعي (hourly) — DEPLOY-7 ---
# النسخة اليومية وحدها تعني أن عطلاً الساعة الخامسة مساءً يضيّع يوم عمل كامل (RPO = 24 ساعة).
# الوضع الساعي يقصّ ذلك إلى ساعة واحدة: `pg_dump` مضغوط ومشفَّر، بلا تجميع حزم العملاء (وهو
# الجزء الثقيل)، يُحفظ محلياً 3 أيام ويُرفع إلى Google Drive بعمر 7 أيام.
# **لا يُرفع إلى Oracle Object Storage عمداً:** رابط الـPAR للكتابة فقط ولا يستطيع حذف القديم،
# فرفع 24 ملفاً يومياً إلى حساب Free Tier يملأ الحاوية بلا حدّ. الحماية الجغرافية الكاملة تبقى
# على النسخة اليومية، والساعية تحمي من الأعطال والحذف الخاطئ وفساد القاعدة.
#
# مشفّر إن وُجد /etc/zsystems/backup-passphrase (متوافق مع openssl enc -aes-256-cbc -pbkdf2).
# الاسترجاع: deploy/scripts/zsystems-restore.sh — ودليل كامل في docs/DISASTER_RECOVERY.md.
# تمرين استرجاع آلي أسبوعي: deploy/scripts/zsystems-restore-drill.sh (DEPLOY-8).
#
# الوجهتان الخارجيتان مستقلتان: فشل واحدة لا يمنع الأخرى، لكن السكربت يخرج بخطأ في النهاية.
#
# لو فشل تجميع الحزم لأي سبب، تُرفع نسخة pg_dump العادية بدلاً منها: نسخة السيرفر لا تضيع أبداً
# بسبب خطأ في الحزم.
set -euo pipefail

MODE="${1:-daily}"
case "$MODE" in
  daily|hourly) ;;
  *) echo "Usage: $0 [daily|hourly]" >&2; exit 1 ;;
esac

BACKUP_DIR="/var/backups/zsystems"
PAR_URL_FILE="/etc/zsystems/backup-par-url"
PASSPHRASE_FILE="/etc/zsystems/backup-passphrase"
APP_BACKEND="/var/www/zsystems/app/backend"
GDRIVE_REMOTE="gdrive"
GDRIVE_DIR="zsystems-backups"
GDRIVE_KEEP_DAYS=90
GDRIVE_HOURLY_KEEP_DAYS=7
CONTAINER="zsystems-postgres"
DB_NAME="zsystems_db"
DB_USER="postgres"
KEEP_DAYS=14
HOURLY_KEEP_DAYS=3

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
if [ "$MODE" = "hourly" ]; then
  DUMP_FILE="$BACKUP_DIR/zsystems_hourly_$TIMESTAMP.sql.gz"
else
  DUMP_FILE="$BACKUP_DIR/zsystems_db_$TIMESTAMP.sql.gz"
fi
TMP_FILE="$DUMP_FILE.partial"
FAILED=0

# بدون -t: الطرفية الوهمية تحقن \r في المخرجات فتفسد ملف SQL.
sudo docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$TMP_FILE"

# نسخة سليمة يجب أن تنتهي بسطر إكمال pg_dump.
if ! gzip -cd "$TMP_FILE" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  rm -f "$TMP_FILE"
  echo "[$(date)] ERROR: pg_dump output incomplete, backup discarded" >&2
  exit 1
fi
mv "$TMP_FILE" "$DUMP_FILE"
echo "[$(date)] [$MODE] Database dump created: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

if [ "$MODE" = "hourly" ]; then
  # نسخة الساعة: تشفير مباشر بلا تجميع حزم العملاء. نفس خوارزمية الملف المجمّع
  # حتى يفكّها نفس الأمر المذكور في دليل الاسترجاع.
  UPLOAD_FILE="$DUMP_FILE"
  if [ -r "$PASSPHRASE_FILE" ]; then
    ENC_FILE="$DUMP_FILE.enc"
    if openssl enc -aes-256-cbc -pbkdf2 -salt -in "$DUMP_FILE" -out "$ENC_FILE" -pass "file:$PASSPHRASE_FILE"; then
      rm -f "$DUMP_FILE"
      UPLOAD_FILE="$ENC_FILE"
    else
      rm -f "$ENC_FILE"
      echo "[$(date)] ERROR: hourly encryption failed - keeping the plain local copy and NOT uploading it" >&2
      exit 1
    fi
  else
    echo "[$(date)] WARNING: $PASSPHRASE_FILE missing - hourly copy is NOT encrypted" >&2
  fi

  find "$BACKUP_DIR" -type f -name "zsystems_hourly_*" -mtime +"$HOURLY_KEEP_DAYS" -delete

  if command -v rclone > /dev/null && rclone listremotes 2>/dev/null | grep -qx "$GDRIVE_REMOTE:"; then
    if rclone copy "$UPLOAD_FILE" "$GDRIVE_REMOTE:$GDRIVE_DIR" --retries 3; then
      echo "[$(date)] [hourly] Google Drive copy uploaded: $(basename "$UPLOAD_FILE")"
      rclone delete "$GDRIVE_REMOTE:$GDRIVE_DIR" --min-age "${GDRIVE_HOURLY_KEEP_DAYS}d" \
        --include "zsystems_hourly_*" \
        || echo "[$(date)] WARNING: Google Drive cleanup of old hourly backups failed" >&2
    else
      echo "[$(date)] ERROR: [hourly] Google Drive upload failed" >&2
      FAILED=1
    fi
  else
    echo "[$(date)] WARNING: rclone remote '$GDRIVE_REMOTE' not configured - hourly copy stays on this server only" >&2
    FAILED=1
  fi

  exit "$FAILED"
fi

# الملف المجمّع
UPLOAD_FILE="$DUMP_FILE"
BUNDLE_FILE="$BACKUP_DIR/zsystems_backup_$TIMESTAMP.zip"
PASS_ARGS=()
if [ -r "$PASSPHRASE_FILE" ]; then
  BUNDLE_FILE="$BUNDLE_FILE.enc"
  PASS_ARGS=(--passphrase-file "$PASSPHRASE_FILE")
else
  echo "[$(date)] WARNING: $PASSPHRASE_FILE missing - bundle is NOT encrypted" >&2
fi

set +e
(cd "$APP_BACKEND" && /usr/bin/node --env-file=.env dist/tools/zs-backup-tool.js bundle \
  --full "$DUMP_FILE" --out "$BUNDLE_FILE" "${PASS_ARGS[@]}")
BUNDLE_STATUS=$?
set -e

if [ "$BUNDLE_STATUS" -eq 0 ] || [ "$BUNDLE_STATUS" -eq 2 ]; then
  [ "$BUNDLE_STATUS" -eq 2 ] && FAILED=1   # some tenants could not be packaged; the full dump has them
  UPLOAD_FILE="$BUNDLE_FILE"
  rm -f "$DUMP_FILE"                        # the bundle contains it
  echo "[$(date)] Bundle created: $BUNDLE_FILE ($(du -h "$BUNDLE_FILE" | cut -f1))"
else
  rm -f "$BUNDLE_FILE"
  FAILED=1
  echo "[$(date)] ERROR: bundle failed (exit $BUNDLE_STATUS) - uploading the plain database dump instead" >&2
fi

find "$BACKUP_DIR" -type f \( -name "zsystems_db_*.sql.gz" -o -name "zsystems_backup_*" \) -mtime +"$KEEP_DAYS" -delete

OBJECT_NAME=$(basename "$UPLOAD_FILE")

if [ -r "$PAR_URL_FILE" ]; then
  PAR_URL=$(tr -d '[:space:]' < "$PAR_URL_FILE")
  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 900 -X PUT \
    --data-binary @"$UPLOAD_FILE" "${PAR_URL%/}/$OBJECT_NAME" || echo "000")
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
  if rclone copy "$UPLOAD_FILE" "$GDRIVE_REMOTE:$GDRIVE_DIR" --retries 3; then
    echo "[$(date)] Google Drive copy uploaded: $OBJECT_NAME"
    rclone delete "$GDRIVE_REMOTE:$GDRIVE_DIR" --min-age "${GDRIVE_KEEP_DAYS}d" \
      --include "zsystems_db_*.sql.gz" --include "zsystems_backup_*" \
      || echo "[$(date)] WARNING: Google Drive cleanup of old backups failed" >&2
  else
    echo "[$(date)] ERROR: Google Drive upload failed" >&2
    FAILED=1
  fi
else
  echo "[$(date)] WARNING: rclone remote '$GDRIVE_REMOTE' not configured - no Google Drive copy" >&2
fi

exit "$FAILED"
