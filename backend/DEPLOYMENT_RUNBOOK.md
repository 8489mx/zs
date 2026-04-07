# Deployment Runbook

## Pre-deploy
1. Confirm `.env` values are correct
2. Run `npm run build`
3. Run `npm run test:infra`
4. Run `npm run test:critical`
5. Run a database backup

## Deploy
1. Install dependencies
2. Run migrations if needed
3. Start backend
4. Confirm `/health`
5. Start frontend
6. Smoke test login and one core workflow

## Rollback trigger examples
- Login broken
- 5xx spike
- Migration failure
- Data write failures in sales or purchases
