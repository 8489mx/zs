const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PostgresManager {
  constructor(appPath, isPackaged) {
    this.isPackaged = isPackaged;
    this.dbUser = 'postgres';
    this.dbPass = 'postgres';
    this.dbName = 'zs_offline';
    this.dbPort = '5444';

    // In production, expect the runtime folder alongside the exe
    // In dev, use the existing C:\zn\portable\runtime
    this.runtimeDir = isPackaged 
      ? path.join(path.dirname(process.execPath), 'runtime')
      : 'C:\\zn\\portable\\runtime';
    
    this.postgresBinDir = path.join(this.runtimeDir, 'postgres', 'bin');
    this.postgresDataDir = path.join(this.runtimeDir, 'data');
    this.postgresLogsDir = path.join(this.runtimeDir, 'logs');
    
    this.pgProcess = null;
  }

  ensureDirectories() {
    if (!fs.existsSync(this.postgresDataDir)) {
      fs.mkdirSync(this.postgresDataDir, { recursive: true });
    }
    if (!fs.existsSync(this.postgresLogsDir)) {
      fs.mkdirSync(this.postgresLogsDir, { recursive: true });
    }
  }

  isInitialized() {
    return fs.existsSync(path.join(this.postgresDataDir, 'PG_VERSION'));
  }

  initializeDatabase() {
    return new Promise((resolve, reject) => {
      console.log('Initializing PostgreSQL data directory (first run).');
      const passwordFile = path.join(this.runtimeDir, 'postgres.pw');
      fs.writeFileSync(passwordFile, this.dbPass, 'utf8');

      const initDbExe = path.join(this.postgresBinDir, 'initdb.exe');
      
      const args = [
        '-D', this.postgresDataDir,
        '-U', this.dbUser,
        '-A', 'scram-sha-256',
        `--pwfile=${passwordFile}`,
        '--encoding=UTF8'
      ];

      const initProcess = spawn(initDbExe, args);

      initProcess.stdout.on('data', data => console.log(`initdb: ${data}`));
      initProcess.stderr.on('data', data => console.error(`initdb err: ${data}`));

      initProcess.on('close', (code) => {
        if (fs.existsSync(passwordFile)) {
          fs.unlinkSync(passwordFile);
        }
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`initdb failed with exit code ${code}`));
        }
      });
    });
  }

  startServer() {
    return new Promise((resolve, reject) => {
      console.log('Starting PostgreSQL runtime.');
      
      const pgCtlExe = path.join(this.postgresBinDir, 'pg_ctl.exe');
      const logFile = path.join(this.postgresLogsDir, 'postgresql.log');
      
      const args = [
        '-D', this.postgresDataDir,
        '-l', logFile,
        '-o', `-p ${this.dbPort} -h 127.0.0.1`,
        'start'
      ];

      try {
        execSync(`"${pgCtlExe}" -D "${this.postgresDataDir}" -l "${logFile}" -o "-p ${this.dbPort} -h 127.0.0.1" start`, { stdio: 'ignore' });
        resolve();
      } catch (err) {
        console.log(`pg_ctl start returned an error (might already be running). Err: ${err.message}`);
        resolve(); // resolve anyway to proceed to waitForReady
      }
    });
  }

  async waitForReady(retries = 50) {
    console.log('Waiting for PostgreSQL to accept connections...');
    const psqlExe = path.join(this.postgresBinDir, 'psql.exe');
    
    for (let i = 0; i < retries; i++) {
      try {
        execSync(`"${psqlExe}" -h 127.0.0.1 -p ${this.dbPort} -U ${this.dbUser} -d postgres -c "SELECT 1;"`, {
          env: { ...process.env, PGPASSWORD: this.dbPass },
          stdio: 'ignore'
        });
        console.log('PostgreSQL is ready.');
        return true;
      } catch (err) {
        await new Promise(res => setTimeout(res, 100));
      }
    }
    throw new Error('PostgreSQL did not become ready in time.');
  }

  ensureDatabaseExists() {
    return new Promise((resolve, reject) => {
      const psqlExe = path.join(this.postgresBinDir, 'psql.exe');
      const createdbExe = path.join(this.postgresBinDir, 'createdb.exe');
      
      const flagFile = path.join(this.postgresDataDir, 'db_created.flag');
      if (fs.existsSync(flagFile)) {
        return resolve();
      }

      try {
        // Check if database exists
        const checkCmd = `"${psqlExe}" -h 127.0.0.1 -p ${this.dbPort} -U ${this.dbUser} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${this.dbName}';"`;
        const exists = execSync(checkCmd, { env: { ...process.env, PGPASSWORD: this.dbPass } }).toString().trim();
        
        if (exists !== '1') {
          console.log(`Creating database '${this.dbName}' with UTF8 encoding.`);
          execSync(`"${createdbExe}" -h 127.0.0.1 -p ${this.dbPort} -U ${this.dbUser} -E UTF8 -T template0 ${this.dbName}`, {
            env: { ...process.env, PGPASSWORD: this.dbPass },
            stdio: 'inherit'
          });
        }
        fs.writeFileSync(flagFile, 'ok', 'utf8');
        resolve();
      } catch (err) {
        reject(new Error(`Failed to ensure database exists: ${err.message}`));
      }
    });
  }

  async setupAndStart() {
    this.ensureDirectories();
    
    if (!this.isInitialized()) {
      await this.initializeDatabase();
    }
    
    await this.startServer();
    await this.waitForReady();
    await this.ensureDatabaseExists();
  }

  stopServer() {
    console.log('Stopping PostgreSQL runtime.');
    const pgCtlExe = path.join(this.postgresBinDir, 'pg_ctl.exe');
    try {
      execSync(`"${pgCtlExe}" -D "${this.postgresDataDir}" stop -m fast`);
    } catch (err) {
      console.error('Failed to stop postgres properly:', err.message);
    }
  }

  getEnvironmentVariables() {
    return {
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: this.dbPort,
      DATABASE_USER: this.dbUser,
      DATABASE_PASSWORD: this.dbPass,
      DATABASE_NAME: this.dbName,
      DATABASE_URL: `postgresql://${this.dbUser}:${this.dbPass}@127.0.0.1:${this.dbPort}/${this.dbName}?schema=public`
    };
  }
}

module.exports = PostgresManager;
