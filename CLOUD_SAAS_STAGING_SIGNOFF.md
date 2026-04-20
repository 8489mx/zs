# CLOUD_SAAS Staging Signoff

Date: __________
Environment: __________
Owner: __________

## Automated validation evidence

- [ ] `npm run audit:hosted-db-validation`
- [ ] Attach latest launch readiness report (`npm run audit:launch-report`)

## Functional checks

- [ ] Auth/login flow
- [ ] Core sales/purchases/inventory write flows
- [ ] Reports endpoints and timezone correctness
- [ ] Health endpoints through gateway

## Deployment checks

- [ ] `docker-compose.saas.yml` rendered with staging env
- [ ] Migrations applied successfully in staging DB
- [ ] Rollback procedure tested (previous release tag)

## Security/config checks

- [ ] TLS DB connection enforced
- [ ] `SESSION_CSRF_SECRET` is non-default and rotated
- [ ] No local postgres dependency in SaaS deployment

## Final decision

- [ ] APPROVED for production rollout
- [ ] BLOCKED (with action items)

Notes:

- 
- 
