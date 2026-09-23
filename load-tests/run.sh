#!/usr/bin/env bash
# تشغيل أجنحة اختبار الحمل (k6).
#
#   bash run.sh                                    ملف افتراضي خفيف (stress-all)
#   PROFILE=heavy   bash run.sh                    حمل ثقيل
#   PROFILE=extreme bash run.sh                    ضغط حتى الانحناء
#   PROFILE=soak    bash run.sh                    نقع طويل لكشف تسريب الذاكرة
#   bash run.sh scenarios/pos-catalog-sync.js      سيناريو بعينه
#
# الأحجام معايَرة على مواصفات سيرفر الإنتاج (نواتان / 12 جيجا / 4 جيجا Swap) وعلى أن الباك إند
# يعمل في **عملية واحدة** (PM2 في وضع fork لا cluster — انظر ARCHITECTURE_INVARIANTS.md §2.7).
# أي أن نواةً واحدة فعلياً تخدم كل الطلبات والأخرى لقاعدة البيانات، فالتزاحم يظهر مبكراً وهذا
# هو المقصود قياسه.
#
# متغيرات مهمة:
#   TARGET_URL=http://127.0.0.1:3000   عنوان الباك إند (الإنتاج على 3000 لا 3001)
#   STOREFRONT_SLUG=<slug>             المتجر الذي تُنشأ عليه الطلبات في سيناريو الشراء
#   SPOOF_CLIENT_IPS=true              عنوان عميل مختلف لكل VU — انظر config.js
#   PEAK_VUS / RAMP_SECONDS / HOLD_SECONDS   ضبط يدوي يتجاوز PROFILE
#
# تحذير: سيناريو الشراء **يُنشئ طلبات حقيقية** في المتجر المستهدف (مع خصم مخزون وإشعار واتساب
# إن كانت البوابة مفعّلة لتلك المنشأة). لا تشغّله على متجر حي دون قصد.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO="${1:-scenarios/stress-all.js}"
PROFILE="${PROFILE:-default}"

# الأحجام: الذروة، ثواني التصاعد، ثواني الثبات على الذروة.
case "$PROFILE" in
  default) DEF_PEAK=50;  DEF_RAMP=15; DEF_HOLD=30 ;;
  heavy)   DEF_PEAK=150; DEF_RAMP=30; DEF_HOLD=90 ;;
  extreme) DEF_PEAK=300; DEF_RAMP=45; DEF_HOLD=120 ;;
  soak)    DEF_PEAK=40;  DEF_RAMP=30; DEF_HOLD=600 ;;
  *) echo "[ERROR] PROFILE غير معروف: $PROFILE (default|heavy|extreme|soak)" >&2; exit 1 ;;
esac

# بيانات الدخول للسيناريوهات التي تحتاج جلسة (مسار الكاشير).
# تُقرأ من ملف على السيرفر بدل كتابتها في سطر الأوامر — نفس نمط `/etc/zsystems/backup-passphrase`
# و`/etc/zsystems/telegram.env`: السر لا يدخل سجل الصدفة ولا يُرى في `ps`.
#   sudo install -m 600 -o $USER /dev/null /etc/zsystems/loadtest.env
#   sudo tee /etc/zsystems/loadtest.env <<'EOF'
#   AUTH_USERNAME=...
#   AUTH_PASSWORD=...
#   EOF
CREDENTIALS_FILE="${CREDENTIALS_FILE:-/etc/zsystems/loadtest.env}"
if [ -r "$CREDENTIALS_FILE" ]; then
  # shellcheck disable=SC1090
  . "$CREDENTIALS_FILE"
  export AUTH_USERNAME AUTH_PASSWORD
  echo "[INFO] بيانات الدخول من ${CREDENTIALS_FILE}"
fi

export PEAK_VUS="${PEAK_VUS:-$DEF_PEAK}"
export RAMP_SECONDS="${RAMP_SECONDS:-$DEF_RAMP}"
export HOLD_SECONDS="${HOLD_SECONDS:-$DEF_HOLD}"

echo "======================================================="
echo "  Z-Systems Enterprise Load & Stress Testing (k6)"
echo "-------------------------------------------------------"
echo "  السيناريو : ${SCENARIO}"
echo "  الملف     : ${PROFILE}  (ذروة ${PEAK_VUS} مستخدم · تصاعد ${RAMP_SECONDS}ث · ثبات ${HOLD_SECONDS}ث)"
echo "  الهدف     : ${TARGET_URL:-http://localhost:3001}"
echo "  المتجر    : ${STOREFRONT_SLUG:-almhnds}"
echo "  عناوين لكل مستخدم: ${SPOOF_CLIENT_IPS:-false}"
echo "======================================================="

# ملف الضغط الأقصى غرضه **قياس حدّ السيرفر** لا إثبات اتفاقية خدمة: عند 300 مستخدم متزامن على
# نواتين ستُخرق عتبات الـp95 حتماً، وk6 يخرج بكود فشل عند خرق أي عتبة — فتبدو النتيجة "فشلاً"
# بينما هي الرقم المطلوب نفسه. لذلك تُطفأ العتبات هنا وتُقرأ الأرقام.
K6_EXTRA_ARGS=()
if [ "$PROFILE" = "extreme" ]; then
  K6_EXTRA_ARGS+=(--no-thresholds)
  echo "  ملاحظة   : العتبات مُطفأة — هذه جولة قياس لحدّ السيرفر، لا نجاح/رسوب."
  echo "======================================================="
fi

# المتغيرات تُمرَّر صراحةً لأن k6 لا يرث بيئة الصدفة إلا عبر -e (وفي دوكر عبر --env).
K6_ENV_ARGS=()
for var in TARGET_URL STOREFRONT_SLUG AUTH_USERNAME AUTH_PASSWORD TENANT_ID \
           PEAK_VUS RAMP_SECONDS HOLD_SECONDS SPOOF_CLIENT_IPS; do
  if [ -n "${!var:-}" ]; then
    K6_ENV_ARGS+=(-e "${var}=${!var}")
  fi
done

if command -v k6 > /dev/null 2>&1; then
    echo "[INFO] k6 محلي."
    exec k6 run "${K6_EXTRA_ARGS[@]}" "${K6_ENV_ARGS[@]}" "${DIR}/${SCENARIO}"
fi

# المستخدم `ubuntu` على سيرفر الإنتاج ليس في مجموعة `docker`، فكل سكربتات المستودع تنادي
# `sudo docker`. نجرّب المباشر أولاً ثم بـsudo بلا كلمة مرور — بدل أن نفشل بـ"permission denied"
# بعد طباعة رأس جميل يوهم أن الاختبار يعمل. ولاحظ أن `docker --version` ينجح حتى بلا صلاحية
# على المقبس، فالفحص الصحيح هو `docker info`.
DOCKER_CMD=""
if command -v docker > /dev/null 2>&1; then
  if docker info > /dev/null 2>&1; then
    DOCKER_CMD="docker"
  elif sudo -n docker info > /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
  fi
fi

if [ -n "$DOCKER_CMD" ]; then
    echo "[INFO] k6 غير مثبّت — التشغيل عبر حاوية grafana/k6 (${DOCKER_CMD})."
    echo "[WARN] الحاوية تتنافس مع التطبيق على نفس النواتين، فأرقام الضغط الأقصى تصير متحفظة."
    echo "[WARN] لقياس أدق ثبّت k6 محلياً — التعليمات في docs/LOAD_TESTING.md §3."
    exec $DOCKER_CMD run --rm -i --network=host \
      -v "${DIR}/..:/work" -w /work/load-tests \
      grafana/k6 run "${K6_EXTRA_ARGS[@]}" "${K6_ENV_ARGS[@]}" "${SCENARIO}"
fi

echo "[ERROR] لا k6 ولا docker موجودان." >&2
echo "ثبّت k6 أو شغّل عبر دوكر. التفاصيل في docs/LOAD_TESTING.md" >&2
exit 1
