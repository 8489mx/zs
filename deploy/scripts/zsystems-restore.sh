#!/bin/bash
# استرجاع من الملف المجمّع (الباك أب الليلي) مباشرة، من غير فك الضغط يدوياً.
# التثبيت: يُشغَّل من داخل المستودع على السيرفر:
#   bash /var/www/zsystems/app/deploy/scripts/zsystems-restore.sh <أمر> ...
#
#   list   <bundle>                       عرض محتوى الملف (العملاء والنسخة الكاملة)
#   full   <bundle>                       السيرفر كله — على قاعدة بيانات فاضية فقط (سيرفر جديد)
#   tenant <bundle> <slug أو tenant-id>   استرجاع عميل واحد من الملف، باقي العملاء لا يُمسّون
#   tenant-file <file.zsbak> <tenant-id>  استرجاع عميل من حزمة منفردة (مثلاً راجعة من الديسكتوب)
#
# قبل أي استرجاع لعميل تُؤخذ نسخة أمان كاملة من القاعدة في /var/backups/zsystems/pre-restore-*.
# الملف المشفّر يُفك تلقائياً بـ /etc/zsystems/backup-passphrase.
set -euo pipefail

APP_BACKEND="/var/www/zsystems/app/backend"
PASSPHRASE_FILE="/etc/zsystems/backup-passphrase"
CONTAINER="zsystems-postgres"
DB_NAME="zsystems_db"
DB_USER="postgres"
BACKUP_DIR="/var/backups/zsystems"

usage() { sed -n '2,12p' "$0" >&2; exit 1; }
[ $# -ge 2 ] || usage

COMMAND="$1"
INPUT=$(readlink -f "$2")
[ -r "$INPUT" ] || { echo "Cannot read $2" >&2; exit 1; }

PASS_ARGS=()
[ -r "$PASSPHRASE_FILE" ] && PASS_ARGS=(--passphrase-file "$PASSPHRASE_FILE")

tool() { (cd "$APP_BACKEND" && /usr/bin/node --env-file=.env dist/tools/zs-backup-tool.js "$@"); }
psql_q() { sudo docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c "$1"; }

safety_dump() {
  mkdir -p "$BACKUP_DIR"
  local file="$BACKUP_DIR/pre-restore-$(date +%Y%m%d_%H%M%S).sql.gz"
  sudo docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$file"
  gzip -cd "$file" | tail -n 5 | grep -q "PostgreSQL database dump complete" || { echo "Safety dump failed - stopping" >&2; exit 1; }
  echo "Safety copy of the current database: $file"
}

tenant_account() {
  # the account id most users of this tenant carry (tenancy column, not the chart of accounts)
  local acc
  acc=$(psql_q "select account_id from users where tenant_id = '$1' group by 1 order by count(*) desc limit 1")
  echo "${acc:-$1}"
}

case "$COMMAND" in
  list)
    tool list --in "$INPUT" "${PASS_ARGS[@]}"
    ;;

  full)
    TABLES=$(psql_q "select count(*) from pg_tables where schemaname = 'public'")
    if [ "$TABLES" != "0" ]; then
      echo "The database already has $TABLES tables. A full restore is only for an EMPTY database (new server)." >&2
      echo "To restore one shop, use: $0 tenant <bundle> <slug>" >&2
      exit 1
    fi
    tool extract --in "$INPUT" --entry full/zsystems_db.sql.gz --out - "${PASS_ARGS[@]}" \
      | gunzip -c | sudo docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q 2>&1 | grep ERROR || true
    echo "Full restore finished. Any line above starting with ERROR must be reviewed (docs/DISASTER_RECOVERY.md §2)."
    ;;

  tenant|tenant-file)
    [ $# -ge 3 ] || usage
    PICK="$3"
    [[ "$PICK" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "Invalid tenant name: $PICK" >&2; exit 1; }
    if [ "$COMMAND" = "tenant" ]; then
      TENANT_ID=$(psql_q "select id from tenants where id = '$PICK' or slug = '$PICK' limit 1")
    else
      TENANT_ID=$(psql_q "select id from tenants where id = '$PICK' limit 1")
    fi
    [ -n "$TENANT_ID" ] || { echo "No tenant '$PICK' on this server" >&2; exit 1; }
    ACCOUNT_ID=$(tenant_account "$TENANT_ID")
    echo "Restoring tenant $TENANT_ID (account $ACCOUNT_ID). Other tenants are not touched."
    safety_dump
    if [ "$COMMAND" = "tenant" ]; then
      tool import-tenant --in "$INPUT" --pick "$PICK" --tenant "$TENANT_ID" --account "$ACCOUNT_ID" --mode cloud "${PASS_ARGS[@]}"
    else
      tool import-tenant --in "$INPUT" --tenant "$TENANT_ID" --account "$ACCOUNT_ID" --mode cloud "${PASS_ARGS[@]}"
    fi
    ;;

  *)
    usage
    ;;
esac
