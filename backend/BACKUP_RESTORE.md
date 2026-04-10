# Backup and Restore

## Minimum backup scope
- Database dump before every production deployment
- Daily scheduled backup for production database
- Retain at least 7 daily backups and 4 weekly backups
- Store one copy outside the application server

## Before deployment
1. Run a fresh database dump
2. Confirm the dump file can be opened
3. Record the current app version and migration state

## Restore drill
1. Restore the latest dump into a staging database
2. Start the backend against the restored database
3. Verify login, dashboard, sales list, purchases list, inventory list
4. Confirm row counts look sane for key tables

## Notes
- Do not rely on application files as the primary backup target
- Database backup is the critical restore asset
