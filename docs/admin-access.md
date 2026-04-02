# Admin access and password reset

## Important behavior
`DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD` are **bootstrap-only** settings.

For a fresh local/demo install, the bundled bootstrap default is `ZS / infoadmin` when `DEFAULT_ADMIN_PASSWORD` is not explicitly provided.
They seed the first `super_admin` when the database does not already contain one.
They do **not** rotate the password of an existing admin account.

## Reset an existing admin password
Use this when:
- the database already exists
- login fails for the current admin account
- you want to rotate credentials without deleting operational data

```bash
node scripts/reset-admin-password.js ZS infoadmin
```

What the script does:
- updates `password_hash`
- updates `password_salt`
- clears `failed_login_count`
- clears `locked_until`
- resets `must_change_password` to `0`
- keeps the rest of the database untouched

## After reset
Log in with the username you passed to the script and the new password.
If login still fails after a successful reset, confirm that the running server is using the same project directory and the same `data/zstore.db` file.
