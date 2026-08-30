# Monitoring Readiness

## Minimum signals to monitor
- Backend process is up
- `/health` returns success
- Login failures spike
- Unhandled exceptions
- Database connection failures
- Slow API responses on sales, purchases, inventory, reports

## Minimum operational checks
- Confirm health endpoint after each deployment
- Review application logs daily during pilot period
- Track failed login count and lockout events
- Track 5xx responses

## Recommended next step
Integrate a real log aggregation and alerting system before broad rollout.
