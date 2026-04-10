# Go-Live Gate

Do not put this build in front of a paying customer until all items below are green.

## Technical gate
- `npm run build`
- `npm run test:infra`
- `npm run check:readiness`
- `npm run check:permissions`
- `npm run check:go-live`

## Environment gate
- Production database credentials verified
- Backup target configured
- Restore steps tested on a non-production copy
- CORS origin list locked to real domains
- Cookie security flags enabled for production
- Default admin bootstrap disabled in production

## Commercial gate
- Pilot scope agreed with customer
- Support/response expectations documented
- Known gaps disclosed before payment
- Rollback owner identified
