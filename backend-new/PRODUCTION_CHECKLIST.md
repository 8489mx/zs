# Production Checklist

## Before launch
- Copy `.env.example` to `.env`
- Set strong `DEFAULT_ADMIN_PASSWORD`
- Restrict `CORS_ORIGINS` to real frontend domains only
- Set `NODE_ENV=production`
- Review database backup policy
- Run migrations on the target database
- Verify health endpoint responds successfully
- Verify request and error logs are collected
- Verify browser security headers exist in API responses

## Recommended deployment rules
- Do not deploy `node_modules` from another machine
- Do not commit `.env`
- Keep only `.env.example` in git
- Put the API behind HTTPS and a reverse proxy
- Rotate admin credentials after first login
