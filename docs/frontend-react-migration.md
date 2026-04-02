# React frontend migration

## goal
Move the current UI from vanilla JS to a clean React + TypeScript frontend without rewriting the backend or database layer yet.

## stack
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod

## what is active now
- New frontend source lives in `frontend/`
- Production server serves `frontend/dist` first when it exists
- Legacy vanilla UI has been retired and removed from the repository

## migration rules
1. Do not copy old DOM-manipulation patterns into React.
2. Keep visual parity first, redesign later.
3. Treat backend API as the source of truth.
4. Move page by page, feature by feature.
5. Remove legacy page logic only after the React equivalent is verified.

## phase 1 completed
- App shell
- Login
- Dashboard overview
- Products page
- Sales overview page
- Purchases overview page
- Inventory overview page
- Reports summary page
- Settings overview page

## next recommended phases
- Sales invoice composer
- POS workflow
- Purchases composer
- Inventory adjustments and stock count
- Settings forms and admin tools
