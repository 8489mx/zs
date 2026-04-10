# Security Step 1 - Dependency Vulnerability Reduction

This patch updates Nest packages and adds npm `overrides` so the install resolves patched transitive versions for:

- `path-to-regexp` -> `8.4.2`
- `picomatch` -> `4.0.4`
- `lodash` -> `4.18.1`

## Apply

1. Replace `backend/package.json` with this one.
2. Delete these locally inside `backend`:
   - `node_modules`
   - `package-lock.json`
3. Run:

```bash
npm install
npm run build
npm audit
npm run test:critical
```

## Why delete package-lock.json?

Because the old lock file can keep vulnerable transitive versions pinned even after `package.json` changes.
