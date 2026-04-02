# Backup / restore drill

- Generated at: 2026-04-02T15:43:51.722Z
- Passed: yes
- Temporary DB file: /tmp/zsystems-backup-drill-RMzn5V/drill.db
- Rollback DB copy: /tmp/zsystems-backup-drill-RMzn5V/rollback-before-restore.db

## Steps
- server_health: passed
- seed_operational_data: passed
- export_backup: passed
- verify_backup_payload: passed
- prepare_rollback_copy: passed
- mutate_after_backup: passed
- restore_dry_run: passed
- restore_backup: passed
- post_restore_validation: passed

## Rollback plan
- 1. Stop the app before restore.
- 2. Keep a filesystem copy of the database file before restore: /tmp/zsystems-backup-drill-RMzn5V/rollback-before-restore.db
- 3. Run verify first using /api/backup/verify or the dry-run restore endpoint.
- 4. If restore fails, replace the active DB file with the rollback copy and restart the app.
- 5. Re-run /api/health and spot-check inventory, sales summary, and customer balances.
