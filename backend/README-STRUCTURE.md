# Backend structure

## Top-level folders
- `src/core`: auth, audit, health, and logging runtime foundations.
- `src/modules`: business features grouped by domain.
- `src/common`: shared framework helpers, pipes, filters, mappers, and errors.
- `src/config`: environment and runtime configuration.
- `src/database`: database module, migrations, helpers, and legacy migration scripts.

## Business modules
- cash-drawer
- catalog
- inventory
- partners
- purchases
- reports
- returns
- sales
- services
- settings
- sessions
- treasury
- users
