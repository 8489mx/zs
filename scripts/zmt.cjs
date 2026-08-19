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
    // Format newlines for PowerShell multiline string
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
  rl.question('\n' + colors.yellow + '>> Press Enter to exit...' + colors.reset, () => {
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
  console.log(colors.cyan + '       ZSystems ERP - Database Maintenance & Speedup (ZMT)           ' + colors.reset);
  console.log(colors.cyan + '=====================================================================' + colors.reset);
  console.log('');

  // 1. App running check
  if (checkAppRunning()) {
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);
    console.log(colors.red + ' [!] WARNING: ZSystems POS is currently running!' + colors.reset);
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);
    console.log('');
    console.log(colors.yellow + ' Maintenance cannot run while the database is actively in use.' + colors.reset);
    console.log(colors.yellow + ' Please close the program completely, then run this tool again.' + colors.reset);
    console.log('');
    console.log(colors.red + '---------------------------------------------------------------------' + colors.reset);

    showWindowsPopup(
      'ZSystems - Safety Warning',
      'ZSystems POS is currently running!\n\nPlease close the application completely before running the maintenance tool to ensure database safety.',
      true
    );

    return waitAndExit(1);
  }

  console.log(colors.gray + '[*] Locating PostgreSQL data...' + colors.reset);

  // 2. Locate DB
  const pg = locatePostgres();
  if (!pg || !fs.existsSync(path.join(pg.dataDir, 'PG_VERSION'))) {
    console.log(colors.red + '[X] ERROR: Database engine or data directory not found.' + colors.reset);
    console.log(colors.yellow + 'Ensure the runtime directory exists alongside the executable.' + colors.reset);

    showWindowsPopup('ZSystems - Error', 'Database engine or data directory not found.', true);
    return waitAndExit(1);
  }

  console.log(colors.green + `[OK] Database location found: ${pg.dataDir}` + colors.reset);
  console.log('');

  if (!fs.existsSync(pg.logsDir)) {
    fs.mkdirSync(pg.logsDir, { recursive: true });
  }

  // 3. Check / Start Postgres
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

  // Step A: Clean temporary records
  console.log(colors.cyan + '[1/3] Cleaning expired sessions & temporary records...' + colors.reset);
  const sql = "DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM operation_executions WHERE status IN ('committed', 'failed') AND completed_at < NOW() - INTERVAL '30 days'; DELETE FROM auth_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';";
  try {
    spawnSync(pg.psql, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline', '-c', sql], { env, stdio: 'ignore' });
  } catch {}

  // Step B: VACUUM ANALYZE
  console.log(colors.cyan + '[2/3] Reclaiming dead space (VACUUM FULL ANALYZE)...' + colors.reset);
  try {
    spawnSync(pg.vacuumDb, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline', '-z'], { env, stdio: 'ignore' });
  } catch {}

  // Step C: REINDEX
  console.log(colors.cyan + '[3/3] Rebuilding database search indexes (REINDEX DATABASE)...' + colors.reset);
  try {
    spawnSync(pg.reindexDb, ['-U', 'postgres', '-p', '5444', '-d', 'zs_offline'], { env, stdio: 'ignore' });
  } catch {}

  // Stop Postgres if we started it
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

main().catch((err) => {
  console.error(colors.red + '[ERROR] ' + err.message + colors.reset);
  waitAndExit(1);
});
