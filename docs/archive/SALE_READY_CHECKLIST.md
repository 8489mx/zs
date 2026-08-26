# Sale Ready Checklist

This repository is closest to a sale-ready deployment when the following pass in order:

1. `npm run install:all`
2. `npm run qa`
3. `npm run qa:sale-ready`
4. Review generated archive: `zs-main-sale-ready.zip`

## What the certification script verifies
- Backend build and validation gates
- Frontend lint, architecture checks, functional checks, and production build
- Dockerized PostgreSQL, backend, and frontend startup
- Backend health and readiness endpoints
- Frontend availability on port `5173`
- Backend end-to-end flows against a live service
- Clean release archive generation

## Recommended manual checks before client delivery
- Log in with a fresh browser session
- Create a sale and a purchase
- Post one stock count session
- Record one damaged stock entry
- Export a backup and verify the backup file exists
- Review health endpoint payload and application logs
