# AI Agents Standard Guidelines for Z-Systems

> 🔴 **CONSTITUTIONAL DIRECTIVE FOR ALL AI AGENTS:**
> This repository is governed by `SAAS_ELECTRON_ISOLATION_CONSTITUTION.md`. Any agent modifying files must read and comply with the architectural boundaries and safety invariants outlined below.

---

## 1. Architectural Boundaries (Cloud SaaS vs Offline Desktop)
- **Production Server:** Oracle Cloud VPS (PostgreSQL DB, Node.js NestJS Backend, React Vite Frontend).
- **Cloud SaaS Mode (`APP_MODE=CLOUD_SAAS`):**
  - Pure multi-tenant SaaS.
  - Platform tenant `zs` represents central super-admin administration.
  - Strict tenant scoping (`tenant_id`) across all DB queries.
  - **Zero Desktop Overlap:** Do NOT add desktop fallback logic or ignore `zs` in cloud services.
- **Desktop Mode (`APP_MODE=SELF_CONTAINED`):**
  - Isolated offline environment.

## 2. Inviolable Core Invariants
- Financial transactions & journal entries are immutable double-entry ledgers.
- Passwords MUST always be hashed with `bcrypt` (never plaintext).
- Never modify or remove `tenant_id` isolation logic.

## 3. Strict Execution Policy
- NEVER run `npm run build` or `git push` automatically without explicit user command.
- Consultation Mode: If the user asks a question with `?` or `؟`, advise first without running modifying code.

## 4. UI & Arabic Design System
- Arabic RTL layout by default (`dir="rtl"`).
- All chat responses wrapped in `<div dir="rtl">...</div>`.
- 0 Emojis policy across all UI screens (use `@/shared/components/icons/AppIcons`).
- Standard modal framework (`StandardDialog` / `DialogShell`).
- Centralized combobox system (`CustomSelect`).

## 5. Workspace Keep-Alive & Anti-Flicker Architecture
- Multi-tab workspaces must use single unified routes (`path: 'workspace'` and `path: 'workspace/*'`) to prevent layout and provider unmounting.
- Keep-Alive tabs pattern via CSS (`display: isTabActive(...) ? 'block' : 'none'`) with 0ms transition.
- Never reset tab counts/badges to 0 on navigation or re-render; always hydrate from memory (`memoryCachedCounts`) and `sessionStorage`.

## 6. Universal 1280px Layout & Zero Width-Jumping Standard
- Fixed maximum container width: `max-width: 1280px; width: min(100%, 1280px); margin: 0 auto;`.
- Root grid columns must enforce `grid-template-columns: minmax(0, 1fr);` and child containers must use `min-width: 0;` to strictly prevent wide child tables from expanding the workspace container.
- Zero-clipping card standard: compact table headers and use `<colgroup>` to guarantee full visibility within the 1280px boundary.

## 7. Strict Stable-Sizing & Anti-Ballooning Modal Standard
- Modals that fetch data or render lists/KPIs must specify a pre-balanced `minHeight` on `StandardDialog` (e.g. `min(560px, 85vh)`).
- Never initialize loading state to `false` when fetching on mount; always start with `useState(true)` to prevent the dialog from rendering empty then ballooning.
- Render centered spinners (`minHeight: 280px+`) during fetch, and guard KPI cards with `—` instead of flashing `0` or `undefined`.
- Prevent jarring shrink/expansion: dialog must open at its definitive dimensions immediately.

## 8. Strict Zero-Native-Alert & Zero-Native-Confirm Standard
- NEVER use raw `window.alert(...)`, `alert(...)`, or `window.confirm(...)`, `confirm(...)` anywhere in UI screens.
- Exclusively use the Universal Toast framework (`toast.success`, `toast.error`, `toast.warning`, `toast.info` from `@/shared/components/system-alert`) for non-blocking feedback.
- For mandatory confirmations, exclusively use `await systemConfirm(...)`, `systemAlert`, or `StandardDialog` / `ActionConfirmDialog`.
- Global interceptor shield in `SystemAlertProvider` automatically captures and upgrades any legacy alerts into modern toasts.


