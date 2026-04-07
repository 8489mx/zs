# Frontend Architecture

## Layers
- `src/app`: app bootstrapping, providers, route registry
- `src/features`: feature modules (pages, hooks, api, components)
- `src/shared/ui`: base UI primitives
- `src/shared/components`: reusable workflow components
- `src/shared/layout`: application shell
- `src/shared/system`: startup / system level UI
- `src/shared/hooks`: cross-feature hooks
- `src/shared/api`: cross-feature API clients
- `src/lib`: low-level helpers and transport utilities
- `src/types`: domain and API types
- `src/styles`: global and feature style partials

## Rules
- Keep business workflows inside `features/*`
- Keep reusable presentational pieces in `shared/*`
- Keep route wiring inside `app/*`
- Avoid importing from one feature into another feature directly
