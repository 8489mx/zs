# Batch 25 changelog

- Hardened GitHub Actions E2E startup to chmod `scripts/wait-for-http.sh` before invoking it through `bash`.
- Keeps the prior Batch 24 shell-invocation fix and adds an explicit permission repair step for CI runners.
