import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Migration, MigrationProvider } from 'kysely';

export class MigrationProvider implements MigrationProvider {
  constructor(private readonly migrationsPath: string) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const files = readdirSync(this.migrationsPath)
      .filter((name) => name.endsWith('.ts') || name.endsWith('.js'))
      .sort();

    const migrations: Record<string, Migration> = {};

    for (const fileName of files) {
      const fullPath = join(this.migrationsPath, fileName);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migrationModule = require(fullPath) as { migration: Migration };
      const key = fileName.replace(/\.(ts|js)$/, '');
      migrations[key] = migrationModule.migration;
    }

    return migrations;
  }
}
