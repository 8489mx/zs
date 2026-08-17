# Batch 24 changelog

- Fixed CI and shell entrypoints to invoke `wait-for-http.sh` through `bash` instead of relying on executable-bit preservation.
- Updated GitHub Actions backend E2E startup step.
- Updated shell scripts that call `wait-for-http.sh`.
- Updated root npm scripts that launch shell entrypoints to use `bash`.
