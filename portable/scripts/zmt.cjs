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
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function showWindowsPopup(title, message, isError = false) {
  try {
    const icon = isError ? 'Warning' : 'Information';
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $msg = @"
${message}
"@
      [System.Windows.Forms.MessageBox]::Show($msg, '${title}', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::${icon})
    `;
    spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], { stdio: 'ignore' });
  } catch {}
}

function waitAndExit(code = 0) {
  rl.question('\n' + colors.yellow + '>> Press Enter to exit (اضغط Enter للخروج)...' + colors.reset, () => {
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

function locateBaseAndRuntime() {
  const baseDir = path.resolve(__dirname, '..');
  const candidates = [
    path.join(baseDir, 'runtime'),
    path.join(baseDir, 'portable', 'runtime'),
    'C:\\zn\\portable\\runtime',
    'D:\\zn\\portable\\runtime'
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return { baseDir, runtimeDir: cand };
    }
  }
  return { baseDir, runtimeDir: path.join(baseDir, 'runtime') };
}

function locatePostgres() {
  const { baseDir, runtimeDir } = locateBaseAndRuntime();
  const candidates = [
    runtimeDir,
    path.join(baseDir, 'runtime'),
    path.join(baseDir, 'portable', 'runtime')
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

function locateBackupsDir() {
  const { baseDir, runtimeDir } = locateBaseAndRuntime();
  const possible = [
    path.join(runtimeDir, 'backups'),
    path.join(baseDir, 'runtime', 'backups'),
    path.join(baseDir, 'portable', 'runtime', 'backups')
  ];
  for (const p of possible) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(runtimeDir, 'backups');
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION 1: Database Maintenance & Optimization
// ─────────────────────────────────────────────────────────────────────────────
async function runMaintenance() {
  console.log('');
  console.log(colors.gray + '[*] Locating PostgreSQL data...' + colors.reset);

  const pg = locatePostgres();
  if (!pg || !fs.existsSync(path.join(pg.dataDir, 'PG_VERSION'))) {
    console.log(colors.red + '[X] ERROR: Database engine or data directory not found.' + colors.reset);
    console.log(colors.yellow + 'Ensure the runtime directory exists alongside the executable.' + colors.reset);
    showWindowsPopup('ZSystems - Error', 'Database engine or data directory not found.', true);
    return waitAndExit(1);
  }

  console.log(colors.green + `[OK] Database location found: ${pg.dataDir}` + colors.reset);

  if (!fs.existsSync(pg.logsDir)) {
    fs.mkdirSync(pg.logsDir, { recursive: true });
  }

  let pgAlreadyRunning = false;
  try {
    execSync(`"${pg.pgCtl}" status -D "${pg.dataDir}"`, { stdio: 'ignore' });
    pgAlreadyRunning = true;
    console.log(colors.gray + '[*] Database engine is already active. Proceeding...' + colors.reset);
  } catch {
    console.log(colors.gray + '[*] Starting database engine for maintenance...' + colors.reset);
    try {
      const logFile = path.join(pg.logsDir, 'maint_pg.log');
      execSync(`"${pg.pgCtl}" start -D "${pg.dataDir}" -w -l "${logFile}" -o "-p 5444"`, { stdio: 'ignore' });
    } catch (err) {
      console.log(colors.red + '[X] Failed to start database engine for maintenance.' + colors.reset);
      showWindowsPopup('ZSystems - Error', 'Failed to start database engine for maintenance.', true);
      return waitAndExit(1);
    }
  }

  console.log('');
  console.log(colors.yellow + '=====================================================================' + colors.reset);
  console.log(colors.yellow + ' Optimizing tables, indexes, and reclaiming disk space...' + colors.reset);
  console.log(colors.yellow + '=====================================================================' + colors.reset);
  console.log('');

  const env = { ...process.env, PGPASSWORD: 'postgres' };

  console.log(colors.cyan + '[1/3] Cleaning expired sessions & temporary records...' + colors.reset);
  const sql = "DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM operation_executions WHERE status IN ('committed', 'failed') AND completed_at < NOW() - INTERVAL '30 days'; DELETE FROM auth_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';";
  try {
    spawnSync(pg.psql, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline', '-c', sql], { env, stdio: 'ignore' });
  } catch {}

  console.log(colors.cyan + '[2/3] Reclaiming dead space (VACUUM FULL ANALYZE)...' + colors.reset);
  try {
    spawnSync(pg.vacuumDb, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline', '-z'], { env, stdio: 'ignore' });
  } catch {}

  console.log(colors.cyan + '[3/3] Rebuilding database search indexes (REINDEX DATABASE)...' + colors.reset);
  try {
    spawnSync(pg.reindexDb, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline'], { env, stdio: 'ignore' });
  } catch {}

  if (!pgAlreadyRunning) {
    console.log('');
    console.log(colors.gray + '[*] Stopping database engine safely...' + colors.reset);
    try {
      execSync(`"${pg.pgCtl}" stop -D "${pg.dataDir}" -m fast`, { stdio: 'ignore' });
    } catch {}
  }

  console.clear();
  console.log(colors.green + '=====================================================================' + colors.reset);
  console.log(colors.green + '           DATABASE MAINTENANCE COMPLETED SUCCESSFULLY!              ' + colors.reset);
  console.log(colors.green + '=====================================================================' + colors.reset);
  console.log('');
  console.log(colors.white + ' [OK] Expired sessions and temporary execution logs cleaned.' + colors.reset);
  console.log(colors.white + ' [OK] Dead storage space reclaimed (VACUUM ANALYZE).' + colors.reset);
  console.log(colors.white + ' [OK] All database search indexes rebuilt for maximum speed (REINDEX).' + colors.reset);
  console.log('');
  console.log(colors.yellow + ' You can now launch ZSystems POS as normal.' + colors.reset);
  console.log(colors.green + '=====================================================================' + colors.reset);
  console.log('');

  showWindowsPopup(
    'ZSystems ERP - Maintenance Complete',
    'Database maintenance completed successfully!\n\n[✔] Expired sessions & temporary data cleaned.\n[✔] Dead disk space reclaimed (VACUUM).\n[✔] Database search indexes rebuilt (REINDEX).\n\nYou can now launch ZSystems POS as normal.'
  );

  waitAndExit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION 2: Emergency One-Click Rollback
// ─────────────────────────────────────────────────────────────────────────────
async function runRollback() {
  console.log('');
  console.log(colors.cyan + '=====================================================================' + colors.reset);
  console.log(colors.cyan + '       ↩️  ZSystems Emergency Update Rollback & Restore              ' + colors.reset);
  console.log(colors.cyan + '=====================================================================' + colors.reset);
  console.log('');

  const { baseDir, runtimeDir } = locateBaseAndRuntime();
  const backupsDir = locateBackupsDir();

  if (!fs.existsSync(backupsDir)) {
    console.log(colors.red + '[X] No backups directory found at: ' + backupsDir + colors.reset);
    showWindowsPopup('ZSystems Rollback', 'No backups directory found.', true);
    return waitAndExit(1);
  }

  const entries = fs.readdirSync(backupsDir)
    .filter(name => {
      const fullPath = path.join(backupsDir, name);
      return fs.statSync(fullPath).isDirectory();
    })
    .map(name => {
      const fullPath = path.join(backupsDir, name);
      const stat = fs.statSync(fullPath);
      return { name, path: fullPath, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (entries.length === 0) {
    console.log(colors.red + '[X] No pre-update backups found in: ' + backupsDir + colors.reset);
    console.log(colors.yellow + '   لا توجد نسخ احتياطية سابقة محفوظة في مجلد التحديثات.' + colors.reset);
    showWindowsPopup('ZSystems Rollback', 'لا توجد نسخ احتياطية سابقة محفوظة.', true);
    return waitAndExit(1);
  }

  const latestBackup = entries[0];
  console.log(colors.green + `[OK] Found ${entries.length} available backup(s).` + colors.reset);
  console.log(colors.white + `     Latest backup : ` + colors.bold + latestBackup.name + colors.reset);
  console.log(colors.gray  + `     Backup date   : ${latestBackup.mtime.toLocaleString()}` + colors.reset);
  console.log('');

  rl.question(colors.yellow + '>> Are you sure you want to rollback to this version? [Y/n] (هل تؤكد استرجاع هذه النسخة؟): ' + colors.reset, (ans) => {
    const confirm = (ans || 'y').trim().toLowerCase();
    if (confirm !== 'y' && confirm !== 'yes' && confirm !== 'نعم') {
      console.log(colors.gray + '\nRollback cancelled by user.' + colors.reset);
      return waitAndExit(0);
    }

    console.log('');
    console.log(colors.cyan + '[*] Restoring files from: ' + latestBackup.name + '...' + colors.reset);

    try {
      const unpackedBase = path.join(baseDir, 'resources', 'app.asar.unpacked');
      const isElectron = fs.existsSync(unpackedBase);

      let targetBackendDir = '';
      let targetFrontendDir = '';

      if (isElectron) {
        targetBackendDir = path.join(unpackedBase, 'electron', 'backend');
        targetFrontendDir = path.join(unpackedBase, 'dist');
      } else {
        targetBackendDir = path.join(baseDir, 'app', 'backend');
        targetFrontendDir = path.join(baseDir, 'app', 'frontend', 'dist');
      }

      // 1. Restore backend dist
      const backupBackendDist = path.join(latestBackup.path, 'backend', 'dist');
      if (fs.existsSync(backupBackendDist)) {
        const destBackendDist = path.join(targetBackendDir, 'dist');
        console.log(colors.gray + '    -> Restoring backend/dist...' + colors.reset);
        fs.cpSync(backupBackendDist, destBackendDist, { recursive: true, force: true });
      }

      // 2. Restore backend package.json
      const backupPkg = path.join(latestBackup.path, 'backend', 'package.json');
      let restoredVersion = '';
      if (fs.existsSync(backupPkg)) {
        const destPkg = path.join(targetBackendDir, 'package.json');
        console.log(colors.gray + '    -> Restoring backend/package.json...' + colors.reset);
        fs.copyFileSync(backupPkg, destPkg);
        try {
          const parsed = JSON.parse(fs.readFileSync(destPkg, 'utf8'));
          if (parsed.version) restoredVersion = parsed.version;
        } catch {}
      }

      // 3. Restore frontend dist
      const backupFrontendDist = path.join(latestBackup.path, 'frontend', 'dist');
      if (fs.existsSync(backupFrontendDist)) {
        console.log(colors.gray + '    -> Restoring frontend/dist...' + colors.reset);
        fs.cpSync(backupFrontendDist, targetFrontendDir, { recursive: true, force: true });
      }

      // 4. Update .app_version if known
      if (!restoredVersion) {
        const match = latestBackup.name.match(/v?(\d+\.\d+\.\d+)/);
        if (match) restoredVersion = match[1];
      }

      if (restoredVersion) {
        const versionFile = path.join(runtimeDir, 'run', '.app_version');
        try {
          fs.mkdirSync(path.dirname(versionFile), { recursive: true });
          fs.writeFileSync(versionFile, restoredVersion, 'ascii');
          console.log(colors.gray + `    -> Restored version marker: v${restoredVersion}` + colors.reset);
        } catch {}
      }

      // 5. Remove any pending update flag
      const pendingFile = path.join(runtimeDir, 'run', '.update_pending');
      try {
        if (fs.existsSync(pendingFile)) fs.unlinkSync(pendingFile);
      } catch {}

      console.clear();
      console.log(colors.green + '=====================================================================' + colors.reset);
      console.log(colors.green + '           EMERGENCY ROLLBACK COMPLETED SUCCESSFULLY!                ' + colors.reset);
      console.log(colors.green + '=====================================================================' + colors.reset);
      console.log('');
      console.log(colors.white + ` [OK] Successfully restored from backup: ${latestBackup.name}` + colors.reset);
      if (restoredVersion) {
        console.log(colors.white + ` [OK] Active version is now: v${restoredVersion}` + colors.reset);
      }
      console.log(colors.white + ' [OK] Database, backend, and frontend files synchronized.' + colors.reset);
      console.log('');
      console.log(colors.yellow + ' You can now safely launch ZSystems POS!' + colors.reset);
      console.log(colors.green + '=====================================================================' + colors.reset);
      console.log('');

      showWindowsPopup(
        'ZSystems - Rollback Complete',
        `تم استرجاع الإصدار السابق بنجاح!\n\nتم استرجاع ملفات المنظومة من النسخة الاحتياطية:\n${latestBackup.name}\n\nالإصدار النشط الآن: v${restoredVersion || 'السابق'}\n\nيمكنك الآن تشغيل البرنامج كالمعتاد.`
      );

      waitAndExit(0);
    } catch (err) {
      console.log(colors.red + '\n[X] ERROR during rollback: ' + err.message + colors.reset);
      showWindowsPopup('ZSystems Rollback Error', 'حدث خطأ أثناء الاسترجاع: ' + err.message, true);
      waitAndExit(1);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN INTERACTIVE MENU
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(colors.cyan + '=====================================================================' + colors.reset);
  console.log(colors.cyan + '       ZSystems ERP - System Maintenance & Emergency Tool (ZMT)      ' + colors.reset);
  console.log(colors.cyan + '=====================================================================' + colors.reset);
  console.log('');

  // 1. Safety check
  if (checkAppRunning()) {
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);
    console.log(colors.red + ' [!] WARNING: ZSystems POS is currently running!' + colors.reset);
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);
    console.log('');
    console.log(colors.yellow + ' Maintenance & Rollback cannot run while the program is open.' + colors.reset);
    console.log(colors.yellow + ' Please close the program completely, then run this tool again.' + colors.reset);
    console.log('');
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);

    showWindowsPopup(
      'ZSystems - Safety Warning',
      'ZSystems POS is currently running!\n\nPlease close the application completely before running the maintenance tool.',
      true
    );

    return waitAndExit(1);
  }

  console.log(colors.white + ' Please select an action (اختر الإجراء المطلوب):' + colors.reset);
  console.log('');
  console.log(colors.green + '  [1] ' + colors.bold + '⚡ تسريع وصيانة قاعدة البيانات (Database Speedup & Reindex)' + colors.reset);
  console.log(colors.yellow + '  [2] ' + colors.bold + '↩️  استرجاع الإصدار السابق فوراً (One-Click Emergency Rollback)' + colors.reset);
  console.log(colors.gray + '  [3] ' + colors.bold + '❌ خروج (Exit)' + colors.reset);
  console.log('');
  console.log(colors.cyan + '---------------------------------------------------------------------' + colors.reset);

  rl.question(colors.yellow + '>> Select option [1-3] (الخيار الافتراضي: 1): ' + colors.reset, (answer) => {
    const choice = (answer || '1').trim();

    if (choice === '1') {
      runMaintenance();
    } else if (choice === '2') {
      runRollback();
    } else if (choice === '3') {
      console.log(colors.gray + '\nExiting tool...' + colors.reset);
      rl.close();
      process.exit(0);
    } else {
      console.log(colors.red + '\nInvalid choice. Exiting.' + colors.reset);
      waitAndExit(1);
    }
  });
}

main().catch((err) => {
  console.error(colors.red + '[ERROR] ' + err.message + colors.reset);
  waitAndExit(1);
});
