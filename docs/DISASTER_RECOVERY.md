# دليل الاسترجاع والنقل لسيرفر جديد (Disaster Recovery)

> **آخر تجربة استرجاع فعلية:** 22 سبتمبر 2026 على نسخة `zsystems_db_20260922_094344.sql.gz`
> (انظر §6). الوقت المتوقع للنقل الكامل: **ساعة تقريباً**.
>
> استخدم هذا الدليل إذا: السيرفر باظ أو اتمسح، أو أوراكل قفلت الحساب، أو قررت تنقل لمزود آخر.

---

## 0. محتاج إيه قبل ما تبدأ

| الحاجة | مكانها | من غيرها |
|---|---|---|
| آخر نسخة من قاعدة البيانات `zsystems_db_*.sql.gz` | Google Drive فولدر `zsystems-backups` · أو Oracle Bucket `zsystems-backups` · أو `/var/backups/zsystems` على السيرفر القديم | **مفيش استرجاع** |
| ملف الإعدادات السري `backend/.env` | نسختك على الفلاشة / Password Manager (`zsystems-production.env`) | الجلسات تتقفل، وبوابات الدفع والإيميل تقف لحد ما تجمع المفاتيح تاني |
| مفتاح SSH للسيرفر الجديد | بيتعمل مع السيرفر الجديد | — |
| صلاحية على GitHub `8489mx/zs` | حسابك | — |

**لو أوراكل قفلت الحساب:** الـ Bucket راح معاه. خد النسخة من **Google Drive**.

---

## 1. تجهيز السيرفر الجديد

Ubuntu 24.04. أي معالج (ARM أو x86)، والحد الأدنى 2 نواة و4 جيجا رام. السيرفر الحالي 4 أنوية و24 جيجا.

```bash
# Swap 4 جيجا (مهم على أي سيرفر رامه أقل من 8 جيجا)
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-zsystems.conf && sudo sysctl -p /etc/sysctl.d/99-zsystems.conf

# البرامج
sudo apt-get update && sudo apt-get install -y docker.io nginx certbot python3-certbot-nginx git rclone
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
sudo npm install -g pm2
```

افتح المنافذ 80 و443 في جدار حماية المزود (في أوراكل اسمه Security List).

---

## 2. قاعدة البيانات

```bash
# كلمة السر = قيمة DATABASE_PASSWORD من ملف .env بتاعك
sudo docker run -d --name zsystems-postgres --restart always \
  -e POSTGRES_DB=zsystems_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD='ضع_كلمة_السر_هنا' \
  -p 127.0.0.1:5432:5432 -v pgdata:/var/lib/postgresql/data postgres:16-alpine

sleep 10
# ارفع ملف النسخة للسيرفر الجديد الأول (scp من جهازك)، وبعدين:
gunzip -c zsystems_db_XXXXXXXX_XXXXXX.sql.gz | sudo docker exec -i zsystems-postgres psql -U postgres -d zsystems_db 2>&1 | grep ERROR
```

**النتيجة المتوقعة:** **مفيش ولا خطأ.** لو ظهر أي سطر فيه `ERROR`، وقّف وراجع قبل ما تكمل.

استثناء واحد: لو النسخة **أقدم** من تشغيل سكربت إصلاح O65 على الإنتاج (`deploy/scripts/repair-o65-almhnds-journal-accounts.sql`)، هيظهر خطأ واحد بس، وهو ده:
`insert or update on table "journal_entry_lines" violates foreign key constraint "journal_entry_lines_account_id_fkey"`
البيانات برضه بترجع كلها. شغّل سكربت الإصلاح على السيرفر الجديد، وبعدها اعمل القيد بالأمر ده:
`sudo docker exec zsystems-postgres psql -U postgres -d zsystems_db -c "alter table journal_entry_lines add constraint journal_entry_lines_account_id_fkey foreign key (account_id) references accounting_accounts(id) on delete restrict"`

---

## 3. التطبيق

```bash
sudo mkdir -p /var/www/zsystems && sudo chown ubuntu:ubuntu /var/www/zsystems
git clone https://github.com/8489mx/zs.git /var/www/zsystems/app
# انسخ ملف .env بتاعك من جهازك:  scp -i KEY zsystems-production.env ubuntu@NEW_IP:/var/www/zsystems/app/backend/.env

cd /var/www/zsystems/app/backend
npm ci && npm run build && npm run migration:run
pm2 start dist/main.js --name zsystems-backend --cwd /var/www/zsystems/app/backend --node-args="--env-file=/var/www/zsystems/app/backend/.env"
pm2 save && pm2 startup   # نفّذ السطر اللي pm2 startup بيطبعه

cd /var/www/zsystems/app/frontend
printf 'VITE_API_BASE_URL=\nVITE_CSRF_COOKIE_NAME=zs_cloud_csrf_token\nVITE_PLATFORM_TENANT_ID=zsystems-main\n' > .env.production
npm ci && npm run build
```

البناء هنا على السيرفر **مرة واحدة بس** للتشغيل الأول. بعد كده كل نشر بيتبني على GitHub (§5).

لو ملف `.env` ضاع: ابدأ من `backend/.env.example`، وخلي `DATABASE_PASSWORD` نفس كلمة سر الخطوة 2. واعمل سر جلسات جديد (`SESSION_*`)، وده هيطلب من كل المستخدمين يسجلوا دخول من جديد. ومفاتيح بوابات الدفع والإيميل والتليجرام هتحتاج تجيبها تاني من كل مزود.

---

## 4. nginx والشهادة والدومين

```bash
sudo cp /var/www/zsystems/app/deploy/nginx/oracle-site.conf /etc/nginx/sites-available/default
sudo sed -i 's/YOUR_DOMAIN/الدومين_بتاعك/' /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d الدومين_بتاعك
```

**مهم عن الدومين:** السيستم دلوقتي شغال على `92-5-178-54.sslip.io`، وده عنوان مبني على IP السيرفر. **سيرفر جديد يعني IP جديد، يعني عنوان جديد.** كل أجهزة الكاشير وروابط المتاجر عند العملاء هتحتاج تتغير. مع دومين حقيقي، كفاية تغير الـ DNS بس.

---

## 5. توصيل النشر التلقائي

في GitHub: `Settings → Secrets and variables → Actions`، وغيّر:
- `ORACLE_HOST` = IP السيرفر الجديد
- `ORACLE_SSH_KEY` = المفتاح الخاص للسيرفر الجديد

وبعدين `Actions → Deploy to Oracle SaaS Server → Run workflow`. المفروض النشر يعدّي وفحص الصحة ينجح.

---

## 6. النسخ الاحتياطي على السيرفر الجديد

```bash
sudo mkdir -p /var/backups/zsystems && sudo chown ubuntu:ubuntu /var/backups/zsystems
sed 's/\r$//' /var/www/zsystems/app/deploy/scripts/zsystems-backup.sh > /tmp/zb.sh && install -m 755 /tmp/zb.sh /var/www/zsystems/backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /var/www/zsystems/backup.sh >> /var/backups/zsystems/backup.log 2>&1") | crontab -
```

- **Google Drive:** `rclone config` بنفس الخطوات (remote اسمه `gdrive` وصلاحية `drive.file`)، عبر نفق `ssh -L 53682:127.0.0.1:53682`.
- **Oracle Bucket (لو لسه على أوراكل):** اعمل رابط Pre-Authenticated Request (كتابة بس)، وحطه في `/etc/zsystems/backup-par-url`، وخلي صاحب الملف `ubuntu` وصلاحياته `600`.
- جرّب: `/var/www/zsystems/backup.sh`

---

## 7. التحقق بعد الاسترجاع

```bash
curl -s http://127.0.0.1:3000/api/health/ready     # لازم "status":"ok" و "database":"up"
pm2 ls                                              # zsystems-backend = online
```

- ادخل بحساب المنصة، وبحساب عميل، واتأكد إن آخر فواتير يوم النسخة موجودة.
- **اللي بيضيع:** أي عمليات حصلت بعد وقت آخر نسخة. النسخ اليومي معناه إنك ممكن تخسر لحد 24 ساعة.

---

## سجل تجارب الاسترجاع

| التاريخ | النسخة | النتيجة |
|---|---|---|
| 22 سبتمبر 2026 | `zsystems_db_20260922_094344.sql.gz` (616 كيلو) | ✅ اتسترجعت في Postgres 16 منفصل في **9 ثواني**. **240 جدول و5670 صف، مطابقين للإنتاج جدول بجدول بالعدد الدقيق.** 805 فهرس و13 trigger مطابقين. 230 هجرة، وآخرها `137_products_catalog_updated_at`. **خطأ واحد:** قيد `journal_entry_lines_account_id_fkey` ما اتعملش بسبب 14 سطر يتيم في الإنتاج (O65)، فبقوا 426 قيد مرجعي بدل 427. **ما اتجربش:** تشغيل الباك إند نفسه على البيانات المسترجعة، لأن ده ممكن يبعت رسايل حقيقية (تليجرام/واتساب/إيميل) من بيانات الإنتاج. |
| 22 سبتمبر 2026 (بعد إصلاح O65) | نفس النسخة، بعد تطبيق سكربت الإصلاح عليها محلياً، ثم `pg_dump` واسترجاعها من جديد | ✅ **صفر أخطاء، و427 من 427 قيد مرجعي.** `migration:run` على البيانات المسترجعة: مفيش هجرات ناقصة. **الباك إند اشتغل فعلاً** على البيانات المسترجعة (بعد ما قفلت تليجرام والإيميل والـ webhooks)، و`/api/health/ready` رد بـ `ok`، وكتالوج متجر `almhnds` الحقيقي ظهر من البيانات المسترجعة. |

كرر التجربة **كل 3 شهور**، أو بعد أي تغيير في سكربت النسخ، وسجّلها هنا.
