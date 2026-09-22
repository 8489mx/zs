#!/bin/bash
# مراقبة السيرفر من الداخل وإرسال تنبيه تليجرام لو حصل حاجة من غير ما حد يقول.
# السبب: أوراكل خفّضت حد السيرفرات المجانية للنص (يونيو 2026) من غير إعلان، ووقفت سيرفرات.
#
# التثبيت على السيرفر: /var/www/zsystems/watch.sh ويُشغَّل من crontab المستخدم ubuntu:
#   @reboot sleep 90 && /var/www/zsystems/watch.sh reboot >> /var/backups/zsystems/watch.log 2>&1
#   0 7 * * * /var/www/zsystems/watch.sh daily >> /var/backups/zsystems/watch.log 2>&1
#
# الفحوص:
#   - عدد الأنوية والرام أقل من المتوقع (المتوقع يُحفظ أول مرة في /etc/zsystems/expected-shape)
#   - السيرفر عمل restart (أوراكل بتعمل restart لما تغيّر المواصفات أو للصيانة)
#   - مفيش نسخة احتياطية جديدة من أكتر من 26 ساعة، أو آخر نسخة كتبت ERROR
#   - القرص أكتر من 85%
#   - الباك إند أو قاعدة البيانات مش شغالين
#
# إعداد تليجرام في /etc/zsystems/telegram.env (صاحبه ubuntu، صلاحية 600):
#   TELEGRAM_BOT_TOKEN=...
#   TELEGRAM_CHAT_ID=...
# بدونه تُكتب التنبيهات في السجل فقط.
set -uo pipefail

MODE="${1:-daily}"
EXPECTED_FILE="/etc/zsystems/expected-shape"
TELEGRAM_FILE="/etc/zsystems/telegram.env"
BACKUP_DIR="/var/backups/zsystems"
BACKUP_LOG="$BACKUP_DIR/backup.log"
HOST_LABEL="$(hostname) ($(curl -s -m 5 https://ifconfig.me 2>/dev/null || echo '?'))"

CPUS=$(nproc)
MEM_GB=$(awk '/MemTotal/ {printf "%d", $2/1024/1024}' /proc/meminfo)
ALERTS=()
INFO=()

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

# 1. Shape: first run records the current shape as expected.
if [ ! -r "$EXPECTED_FILE" ]; then
  if sudo mkdir -p /etc/zsystems && printf 'CPUS=%s\nMEM_GB=%s\n' "$CPUS" "$MEM_GB" | sudo tee "$EXPECTED_FILE" > /dev/null; then
    INFO+=("تم تسجيل المواصفات المتوقعة: ${CPUS} نواة و${MEM_GB} جيجا رام")
  fi
else
  EXP_CPUS=$(grep -E '^CPUS=' "$EXPECTED_FILE" | cut -d= -f2)
  EXP_MEM=$(grep -E '^MEM_GB=' "$EXPECTED_FILE" | cut -d= -f2)
  if [ "$CPUS" -lt "$EXP_CPUS" ] || [ "$MEM_GB" -lt "$((EXP_MEM - 1))" ]; then
    ALERTS+=("مواصفات السيرفر اتغيرت! دلوقتي ${CPUS} نواة و${MEM_GB} جيجا، والمتوقع ${EXP_CPUS} نواة و${EXP_MEM} جيجا. غالباً أوراكل صغّرت السيرفر.")
  elif [ "$CPUS" -gt "$EXP_CPUS" ] || [ "$MEM_GB" -gt "$((EXP_MEM + 1))" ]; then
    INFO+=("المواصفات زادت إلى ${CPUS} نواة و${MEM_GB} جيجا. لو ده مقصود حدّث ${EXPECTED_FILE}، ولو مش مقصود راجع الفاتورة.")
  fi
fi

# 2. Reboot notice
if [ "$MODE" = "reboot" ]; then
  INFO+=("السيرفر عمل restart الساعة $(uptime -s). لو إنت ماعملتوش، يبقى أوراكل (صيانة أو تغيير مواصفات).")
fi

# 3. Backup freshness
LATEST=$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'zsystems_backup_*' -o -name 'zsystems_db_*.sql.gz' \) -mmin -1560 -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
if [ -z "$LATEST" ]; then
  ALERTS+=("مفيش نسخة احتياطية جديدة من أكتر من 26 ساعة. راجع ${BACKUP_LOG}")
elif [ -r "$BACKUP_LOG" ] && tail -n 15 "$BACKUP_LOG" | grep -q "ERROR"; then
  ALERTS+=("آخر نسخة احتياطية فيها خطأ: $(tail -n 15 "$BACKUP_LOG" | grep ERROR | tail -1 | cut -c1-200)")
fi

# 4. Disk
DISK=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ "${DISK:-0}" -ge 85 ]; then
  ALERTS+=("القرص ممتلئ ${DISK}%")
fi

# 5. Application
READY=$(curl -s -m 10 -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health/ready || echo 000)
if [ "$READY" != "200" ]; then
  ALERTS+=("الباك إند أو قاعدة البيانات مش شغالين (health/ready = ${READY})")
fi

if [ ${#ALERTS[@]} -gt 0 ]; then
  MSG="تنبيه Z-Systems - ${HOST_LABEL}"
  for a in "${ALERTS[@]}"; do MSG+=$'\n- '"$a"; done
  for i in "${INFO[@]}"; do MSG+=$'\n- '"$i"; done
  send "$MSG"
  exit 1
fi

if [ ${#INFO[@]} -gt 0 ]; then
  MSG="Z-Systems - ${HOST_LABEL}"
  for i in "${INFO[@]}"; do MSG+=$'\n- '"$i"; done
  send "$MSG"
fi
echo "[$(date)] OK: ${CPUS} cpu, ${MEM_GB} GB, disk ${DISK}%, backup ${LATEST:-none}, ready ${READY}"
