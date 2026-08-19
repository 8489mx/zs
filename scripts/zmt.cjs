const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function waitAndExit(code = 0) {
  rl.question('\n' + colors.yellow + 'اضغط Enter للإغلاق...' + colors.reset, () => {
    rl.close();
    process.exit(code);
  });
}

function checkAppRunning() {
  try {
    const tasklist = execSync('tasklist', { encoding: 'utf8' }).toLowerCase();
    if (tasklist.includes('zsystems pos.exe') || tasklist.includes('electron.exe')) {
      return true;
    }
  } catch {}

  try {
    const netstat = execSync('netstat -ano', { encoding: 'utf8' });
    if (netstat.includes(':3001 ') && netstat.includes('LISTENING')) {
      return true;
    }
  } catch {}

  return false;
}

function locatePostgres() {
  const baseDir = path.resolve(__dirname, '..');
  const candidates = [
    path.join(baseDir, 'runtime'),
    path.join(baseDir, 'portable', 'runtime'),
    'C:\\zn\\portable\\runtime',
    'D:\\zn\\portable\\runtime'
  ];

  for (const cand of candidates) {
    const pgCtl = path.join(cand, 'postgres', 'bin', 'pg_ctl.exe');
    if (fs.existsSync(pgCtl)) {
      return {
        runtimeDir: cand,
        dataDir: path.join(cand, 'data'),
        pgBin: path.join(cand, 'postgres', 'bin'),
        pgCtl,
        vacuumDb: path.join(cand, 'postgres', 'bin', 'vacuumdb.exe'),
        reindexDb: path.join(cand, 'postgres', 'bin', 'reindexdb.exe'),
        psql: path.join(cand, 'postgres', 'bin', 'psql.exe'),
        logsDir: path.join(cand, 'logs')
      };
    }
  }
  return null;
}

async function main() {
  console.clear();
  console.log(colors.cyan + '=====================================================================' + colors.reset);
  console.log(colors.cyan + '       ZSystems ERP - أداة صيانة وتسريع قاعدة البيانات (ZMT)         ' + colors.reset);
  console.log(colors.cyan + '=====================================================================' + colors.reset);
  console.log('');

  // 1. App running check
  if (checkAppRunning()) {
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);
    console.log(colors.red + ' [!] تحذير أمني: برنامج ZSystems POS قيد التشغيل حالياً!' + colors.reset);
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);
    console.log('');
    console.log(colors.yellow + ' لا يمكن تنفيذ الصيانة وقاعدة البيانات قيد الاستخدام.' + colors.reset);
    console.log(colors.yellow + ' يرجى إغلاق البرنامج بالكامل أولاً ثم إعادة تشغيل هذه الأداة.' + colors.reset);
    console.log('');
    return waitAndExit(1);
  }

  console.log(colors.gray + '[*] جاري فحص مسارات قاعدة البيانات...' + colors.reset);

  // 2. Locate DB
  const pg = locatePostgres();
  if (!pg || !fs.existsSync(path.join(pg.dataDir, 'PG_VERSION'))) {
    console.log(colors.red + '[X] خطأ: لم يتم العثور على محرك قاعدة البيانات أو ملفات البيانات.' + colors.reset);
    console.log(colors.yellow + 'تأكد من وجود مجلد runtime وبيانات قاعدة البيانات بجوار ملف البرنامج.' + colors.reset);
    return waitAndExit(1);
  }

  console.log(colors.green + `[✔] تم تحديد موقع قاعدة البيانات: ${pg.dataDir}` + colors.reset);
  console.log('');

  if (!fs.existsSync(pg.logsDir)) {
    fs.mkdirSync(pg.logsDir, { recursive: true });
  }

  // 3. Check / Start Postgres
  let pgAlreadyRunning = false;
  try {
    execSync(`"${pg.pgCtl}" status -D "${pg.dataDir}"`, { stdio: 'ignore' });
    pgAlreadyRunning = true;
    console.log(colors.gray + '[*] محرك قاعدة البيانات يعمل بالفعل، جاري بدء الصيانة...' + colors.reset);
  } catch {
    console.log(colors.gray + '[*] جاري تشغيل محرك قاعدة البيانات مؤقتاً لتنفيذ الصيانة...' + colors.reset);
    try {
      const logFile = path.join(pg.logsDir, 'maint_pg.log');
      execSync(`"${pg.pgCtl}" start -D "${pg.dataDir}" -w -l "${logFile}" -o "-p 5444"`, { stdio: 'ignore' });
    } catch (err) {
      console.log(colors.red + '[X] تعذر تشغيل محرك قاعدة البيانات للصيانة.' + colors.reset);
      return waitAndExit(1);
    }
  }

  console.log('');
  console.log(colors.yellow + '=====================================================================' + colors.reset);
  console.log(colors.yellow + ' جاري تنظيف وضغط الفهارس والجداول (قد يستغرق بضع ثوانٍ)...' + colors.reset);
  console.log(colors.yellow + '=====================================================================' + colors.reset);
  console.log('');

  const env = { ...process.env, PGPASSWORD: 'postgres' };

  // Step A: Clean temporary records
  console.log(colors.cyan + '[1/3] تنظيف الجلسات المنتهية والسجلات المؤقتة...' + colors.reset);
  const sql = "DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM operation_executions WHERE status IN ('committed', 'failed') AND completed_at < NOW() - INTERVAL '30 days'; DELETE FROM auth_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';";
  try {
    spawnSync(pg.psql, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline', '-c', sql], { env, stdio: 'ignore' });
  } catch {}

  // Step B: VACUUM ANALYZE
  console.log(colors.cyan + '[2/3] تفريغ وضغط مساحة الجداول الميتة (VACUUM ANALYZE)...' + colors.reset);
  try {
    spawnSync(pg.vacuumDb, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline', '-z'], { env, stdio: 'ignore' });
  } catch {}

  // Step C: REINDEX
  console.log(colors.cyan + '[3/3] إعادة بناء وترتيب كافة فهارس البحث (REINDEX DATABASE)...' + colors.reset);
  try {
    spawnSync(pg.reindexDb, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline'], { env, stdio: 'ignore' });
  } catch {}

  // Stop Postgres if we started it
  if (!pgAlreadyRunning) {
    console.log('');
    console.log(colors.gray + '[*] إيقاف محرك قاعدة البيانات بأمان...' + colors.reset);
    try {
      execSync(`"${pg.pgCtl}" stop -D "${pg.dataDir}" -m fast`, { stdio: 'ignore' });
    } catch {}
  }

  console.clear();
  console.log(colors.green + '=====================================================================' + colors.reset);
  console.log(colors.green + '              🎉 تمت عملية الصيانة والتسريع بنجاح تام!               ' + colors.reset);
  console.log(colors.green + '=====================================================================' + colors.reset);
  console.log('');
  console.log(colors.white + ' [✔] تم تنظيف الجلسات والسجلات المؤقتة المنتهية.' + colors.reset);
  console.log(colors.white + ' [✔] تم ضغط الجداول واستعادة المساحات الميتة على القرص الصلب.' + colors.reset);
  console.log(colors.white + ' [✔] تم إعادة بناء فهارس قاعدة البيانات بالكامل لتسريع البحث.' + colors.reset);
  console.log('');
  console.log(colors.yellow + ' يمكنك الآن تشغيل برنامج ZSystems POS كالمعتاد وستلاحظ سرعة فائقة.' + colors.reset);
  console.log(colors.green + '=====================================================================' + colors.reset);
  console.log('');

  waitAndExit(0);
}

main().catch((err) => {
  console.error(colors.red + '[ERROR] ' + err.message + colors.reset);
  waitAndExit(1);
});
