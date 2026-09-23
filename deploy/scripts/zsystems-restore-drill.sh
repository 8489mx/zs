#!/bin/bash
# تمرين استرجاع آلي أسبوعي — DEPLOY-8.
#
# السبب: نسخة احتياطية لم تُسترجَع مرة واحدة ليست نسخة احتياطية، هي ملف. التجربة اليدوية
# (docs/DISASTER_RECOVERY.md — سجل تجارب الاسترجاع) تحصل كل ثلاثة شهور بقرار بشري، وبين
# التجربتين يمكن أن يفسد الملف أو تتغير كلمة السر أو يتوقف الرفع بلا أن يلاحظ أحد.
#
# ما يفعله: يأخذ **أحدث نسخة موجودة فعلاً**، يفكّ تشفيرها، يسترجعها في قاعدة بيانات منفصلة
# مؤقتة داخل نفس الحاوية، يقارنها بقاعدة الإنتاج (قراءة فقط)، ثم يحذف القاعدة المؤقتة ويرسل
# تنبيه تليجرام إن فشل شيء.
#
# التثبيت على السيرفر: /var/www/zsystems/restore-drill.sh ويُشغَّل من crontab المستخدم ubuntu:
#   15 4 * * 0 /var/www/zsystems/restore-drill.sh >> /var/backups/zsystems/restore-drill.log 2>&1
#
# **قاعدة الإنتاج لا تُمسّ إطلاقاً:** السكربت ينشئ ويحذف قاعدة اسمها zsystems_restore_drill
# وحدها، وكل استعلاماته على قاعدة الإنتاج قراءة (SELECT) فقط. هذا مفروض بالحارس
# backend/test/critical/deploy-pipeline.spec.ts.
set -uo pipefail

BACKUP_DIR="/var/backups/zsystems"
PASSPHRASE_FILE="/etc/zsystems/backup-passphrase"
TELEGRAM_FILE="/etc/zsystems/telegram.env"
APP_BACKEND="/var/www/zsystems/app/backend"
CONTAINER="zsystems-postgres"
DB_NAME="zsystems_db"
DB_USER="postgres"
DRILL_DB="zsystems_restore_drill"
WORK_DIR=$(mktemp -d /tmp/zs-drill-XXXXXX)
HOST_LABEL="$(hostname)"

# أقل عدد جداول تُعد النسخة بعده معقولة. النسخة الحقيقية فيها 240 جدولاً (سبتمبر 2026)؛
# الرقم هنا متحفظ عمداً حتى لا يفشل التمرين لمجرد أن هجرة جديدة أضافت أو دمجت جدولاً.
MIN_TABLES=150

FAILURES=()
NOTES=()

send() {
  local text="$1"
  echo "[$(date)] $text"
  if [ -r "$TELEGRAM_FILE" ]; then
    # shellcheck disable=SC1090
    source "$TELEGRAM_FILE"
    if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
      curl -s -m 15 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=${text}" > /dev/null \
        || echo "[$(date)] WARNING: Telegram send failed"
    fi
  fi
}

cleanup() {
  sudo docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -q \
    -c "DROP DATABASE IF EXISTS $DRILL_DB WITH (FORCE)" > /dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

live_q() { sudo docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c "$1" 2>/dev/null; }
drill_q() { sudo docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DRILL_DB" -At -c "$1" 2>/dev/null; }

# ── 1. أحدث نسخة موجودة فعلاً ─────────────────────────────────────────────────
LATEST=$(find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'zsystems_hourly_*' -o -name 'zsystems_db_*.sql.gz' -o -name 'zsystems_backup_*' \) \
  -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST" ]; then
  send "تمرين الاسترجاع - ${HOST_LABEL}: فشل. مفيش أي ملف نسخة احتياطية في ${BACKUP_DIR}."
  exit 1
fi

AGE_HOURS=$(( ( $(date +%s) - $(stat -c %Y "$LATEST") ) / 3600 ))
echo "[$(date)] Drill source: $LATEST (عمرها ${AGE_HOURS} ساعة)"
[ "$AGE_HOURS" -gt 26 ] && FAILURES+=("أحدث نسخة عمرها ${AGE_HOURS} ساعة — النسخ المجدولة متوقفة")

# ── 2. استخراج ملف SQL قابل للاسترجاع ────────────────────────────────────────
SQL_GZ="$WORK_DIR/dump.sql.gz"
case "$LATEST" in
  *.zip|*.zip.enc)
    PASS_ARGS=()
    [ -r "$PASSPHRASE_FILE" ] && PASS_ARGS=(--passphrase-file "$PASSPHRASE_FILE")
    if ! (cd "$APP_BACKEND" && /usr/bin/node --env-file=.env dist/tools/zs-backup-tool.js extract \
          --in "$LATEST" --entry full/zsystems_db.sql.gz --out - "${PASS_ARGS[@]}") > "$SQL_GZ"; then
      send "تمرين الاسترجاع - ${HOST_LABEL}: فشل استخراج النسخة الكاملة من الملف المجمّع $(basename "$LATEST")."
      exit 1
    fi
    ;;
  *.sql.gz.enc)
    if ! openssl enc -d -aes-256-cbc -pbkdf2 -in "$LATEST" -out "$SQL_GZ" -pass "file:$PASSPHRASE_FILE"; then
      send "تمرين الاسترجاع - ${HOST_LABEL}: فشل فك تشفير $(basename "$LATEST"). راجع ${PASSPHRASE_FILE}."
      exit 1
    fi
    ;;
  *.sql.gz)
    cp "$LATEST" "$SQL_GZ"
    ;;
  *)
    send "تمرين الاسترجاع - ${HOST_LABEL}: نوع ملف غير معروف $(basename "$LATEST")."
    exit 1
    ;;
esac

if ! gzip -cd "$SQL_GZ" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  send "تمرين الاسترجاع - ${HOST_LABEL}: الملف $(basename "$LATEST") ناقص — مش منتهي بسطر إكمال pg_dump."
  exit 1
fi

# ── 3. الاسترجاع في قاعدة مؤقتة منفصلة ───────────────────────────────────────
sudo docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -q \
  -c "DROP DATABASE IF EXISTS $DRILL_DB WITH (FORCE)" > /dev/null 2>&1 || true
if ! sudo docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -q -c "CREATE DATABASE $DRILL_DB"; then
  send "تمرين الاسترجاع - ${HOST_LABEL}: تعذر إنشاء قاعدة التمرين ${DRILL_DB}."
  exit 1
fi

START=$(date +%s)
RESTORE_LOG="$WORK_DIR/restore.log"
gzip -cd "$SQL_GZ" \
  | sudo docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DRILL_DB" -q > "$RESTORE_LOG" 2>&1 || true
ELAPSED=$(( $(date +%s) - START ))
NOTES+=("الاسترجاع خلص في ${ELAPSED} ثانية")

RESTORE_ERRORS=$(grep -c "^ERROR" "$RESTORE_LOG" || true)
if [ "${RESTORE_ERRORS:-0}" -gt 0 ]; then
  # نص الخطأ نفسه، لا مجرد عدده. التمرين الأول قال "قيد سقط" بلا اسم، فاحتاج تشخيصاً يدوياً
  # كاملاً لمعرفة أيّ قيد ولماذا — وهو ما يُفترض أن يحمله التنبيه.
  FIRST_ERROR=$(grep -m1 -A1 "^ERROR" "$RESTORE_LOG" | tr '\n' ' ' | cut -c1-300)
  FAILURES+=("${RESTORE_ERRORS} سطر ERROR أثناء الاسترجاع: ${FIRST_ERROR}")
fi

# ── 4. المقارنة بالإنتاج (قراءة فقط) ─────────────────────────────────────────
DRILL_TABLES=$(drill_q "select count(*) from pg_tables where schemaname='public'")
LIVE_TABLES=$(live_q "select count(*) from pg_tables where schemaname='public'")
NOTES+=("الجداول: ${DRILL_TABLES:-0} في النسخة مقابل ${LIVE_TABLES:-0} في الإنتاج")
if [ "${DRILL_TABLES:-0}" -lt "$MIN_TABLES" ]; then
  FAILURES+=("النسخة فيها ${DRILL_TABLES:-0} جدول فقط (الحد الأدنى ${MIN_TABLES})")
fi

# الجداول التي لا يعني النظام شيئاً بدونها. صفر صف في أي منها = نسخة لا تصلح للاسترجاع.
for table in tenants users accounting_accounts products; do
  COUNT=$(drill_q "select count(*) from $table")
  if [ -z "$COUNT" ] || [ "$COUNT" -eq 0 ] 2>/dev/null; then
    FAILURES+=("جدول $table فاضي أو مفقود في النسخة")
  else
    NOTES+=("$table: ${COUNT} صف")
  fi
done

# الهجرات: نسخة أقدم من مخطط الإنتاج تُسترجَع ناقصة الأعمدة.
DRILL_MIG=$(drill_q "select count(*) from kysely_migration")
LIVE_MIG=$(live_q "select count(*) from kysely_migration")
if [ -n "${DRILL_MIG:-}" ] && [ -n "${LIVE_MIG:-}" ] && [ "$DRILL_MIG" -lt "$LIVE_MIG" ]; then
  FAILURES+=("النسخة فيها ${DRILL_MIG} هجرة والإنتاج ${LIVE_MIG} — النسخة أقدم من المخطط الحالي")
else
  NOTES+=("الهجرات: ${DRILL_MIG:-?} مقابل ${LIVE_MIG:-?}")
fi

# المفاتيح المرجعية: O65 كشف أن قيداً واحداً يسقط بصمت أثناء الاسترجاع ويكسر ربط القيود بالحسابات.
DRILL_FK=$(drill_q "select count(*) from pg_constraint where contype='f'")
LIVE_FK=$(live_q "select count(*) from pg_constraint where contype='f'")
if [ -n "${DRILL_FK:-}" ] && [ -n "${LIVE_FK:-}" ] && [ "$DRILL_FK" -lt "$LIVE_FK" ]; then
  # القيد الساقط بالاسم: الفرق بين قائمة قيود الإنتاج وقائمة قيود النسخة.
  MISSING_FK=$(comm -23 \
    <(live_q "select conname from pg_constraint where contype='f' order by conname" | sort) \
    <(drill_q "select conname from pg_constraint where contype='f' order by conname" | sort) \
    | tr '\n' ' ' | cut -c1-200)
  FAILURES+=("المفاتيح المرجعية: ${DRILL_FK} في النسخة مقابل ${LIVE_FK} في الإنتاج — الساقط: ${MISSING_FK:-؟} (نمط O65)")
else
  NOTES+=("المفاتيح المرجعية: ${DRILL_FK:-?} مقابل ${LIVE_FK:-?}")
fi

# ── 5. النتيجة ───────────────────────────────────────────────────────────────
SUMMARY="المصدر: $(basename "$LATEST") (عمرها ${AGE_HOURS} ساعة)"
for n in "${NOTES[@]}"; do SUMMARY+=$'\n- '"$n"; done

if [ ${#FAILURES[@]} -gt 0 ]; then
  MSG="تمرين الاسترجاع فشل - ${HOST_LABEL}"
  for f in "${FAILURES[@]}"; do MSG+=$'\n- '"$f"; done
  MSG+=$'\n'"$SUMMARY"
  send "$MSG"
  exit 1
fi

echo "[$(date)] RESTORE DRILL OK - $SUMMARY"
exit 0
