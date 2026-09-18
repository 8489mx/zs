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
- Strict Ban on AI Sparkles / Magic Stars Icons: NEVER use the 4-pointed sparkle / magic star icon (`SparklesIcon` / `WandMagicIcon` or `m12 3-1.912...` SVG) anywhere in the ERP system. Always use real operational business icons (`DownloadIcon`, `RefreshCwIcon`, `SlidersIcon`, `PlusCircleIcon`, `CheckShieldIcon`, etc.).
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

## 7. Strict Stable-Sizing & Anti-Ballooning Modal Standard (دستور ثبات أبعاد النوافذ المنبثقة ومنع التمدد أو الانكماش الفجائي)
- Modals that fetch data or render lists/KPIs must specify a pre-balanced `minHeight` on `StandardDialog` (e.g. `min(560px, 85vh)`).
- Never initialize loading state to `false` when fetching on mount; always start with `useState(true)` to prevent the dialog from rendering empty then ballooning.
- Render centered spinners (`minHeight: 280px+`) during fetch, and guard KPI cards with `—` instead of flashing `0` or `undefined`.
- **Strict Fixed Container Height on Tabbed Modals:** Modals with tabs/filters must enforce a fixed height on their inner list/table container (e.g. `height: 335px; minHeight: 335px; maxHeight: 335px; boxSizing: border-box;`).
- **Zero Empty-State Collapse:** When a tab has 0 items, empty states must fill 100% of the internal container height (`display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 335px;`) to prevent the modal from collapsing or ballooning vertically when switching between full and empty tabs.
- Prevent jarring shrink/expansion: dialog must open and remain at its definitive dimensions across all tabs.

## 8. Strict Zero-Native-Alert & Zero-Native-Confirm Standard
- NEVER use raw `window.alert(...)`, `alert(...)`, or `window.confirm(...)`, `confirm(...)` anywhere in UI screens.
- Exclusively use the Universal Toast framework (`toast.success`, `toast.error`, `toast.warning`, `toast.info` from `@/shared/components/system-alert`) for non-blocking feedback.
- For mandatory confirmations, exclusively use `await systemConfirm(...)`, `systemAlert`, or `StandardDialog` / `ActionConfirmDialog`.
- Global interceptor shield in `SystemAlertProvider` automatically captures and upgrades any legacy alerts into modern toasts.

## 9. Strict Migration Sequence & Dynamic Auto-Detection Standard
- **Mandatory Folder Scan:** AI agents MUST NEVER guess migration numbers from memory or prior session state.
- Before creating any migration in `backend/src/database/migrations`, you MUST inspect the disk to discover the actual highest numerical prefix among all existing `.ts` migration files.
- The new migration file MUST be numbered strictly as `(Highest + 1)`.
- Kysely sorts migrations alphabetically; never duplicate a prefix or insert a migration alphabetically before an already executed one.

## 10. Strict Universal Document Numbering Standard (دستور الترقيم الموحد للوثائق والأذونات)
- **Universal Formula:** All generated document numbers, vouchers, requisitions, invoices, orders, and tickets across all modules MUST follow the unified format:
  `PREFIX-YYMMDD-XXXX` (e.g. `JOB-260914-0001`, `RFQ-260914-0001`, `MR-260914-0001`, `STMT-260914-0001`, `ZM-260914-0001`).
- **Strict 6-Digit Date (`YYMMDD`):** NEVER use 4-digit years like `2026` or static numbers. Always embed the 2-digit year, 2-digit month, and 2-digit day (`YYMMDD` such as `260914`).
- **Standard Sequence Padding:** Sequence counter must be at least 4 digits (`0001`, `0002`, ...), padded with leading zeros.
- **Unified Engine:** Use `getDailyDocumentPrefix(prefix)` and `formatDailyDocumentNumber(...)` from `backend/src/common/utils/document-number.util.ts`. All frontend placeholders, examples, and mock formats must mirror this exact format.

## 11. Strict Universal 14"-to-32" Multi-Screen Zero-Scroll Standard (دستور ملاءمة الشاشات من 14 إلى 32 بوصة وحظر السكرول الخارجي)
- **Universal Zero-Scroll Boundary:** All modals, popups, dialogs, POS workstations, and full-screen ERP workflows MUST fit seamlessly on small 14-inch laptop screens (`1366x768` or 1080p with 125%-150% Windows scaling, vertical viewport ~560px - 640px) up to 32-inch desktop monitors with **ZERO outer vertical scrolling (`بدون سكرول`)**.
- **Compact Dialog Architecture:**
  - Use `compact` mode on `StandardDialog` / `DialogShell` (`padding: 14px 18px !important;`, compact header/footer margins).
  - Expand modal width horizontally (e.g., `width="1180px"` or `min(1180px, 96vw)`) into balanced 2-column or 3-column layouts rather than tall stacked sections.
  - Interactive inputs, tags, and search bars must maintain compact heights (`32px - 36px`, `padding: 6px 10px`, `fontSize: 12.5px - 13px`).
- **Internal Slim Scrollbars Only:**
  - Outer dialog shells must NEVER show scrollbars (`overflow: hidden` on root wrapper).
  - Long lists, candidate matches, or order histories must be confined to internal containers with strict `maxHeight` (e.g. `240px - 290px`) and slim scrollbars (`.thin-scrollbar`).
  - Action and confirmation buttons must always remain 100% visible and unclipped without any scrolling.

## 12. Strict Zero Tab-Flicker & Zero Font-Shift Standard (دستور منع رعشة التابات والتنقل اللحظي)
- **Zero Font-Weight Shifting:** NEVER toggle `fontWeight` between active and inactive tab buttons (e.g. `700` active vs `500` inactive). In Arabic typography, changing font weight alters text width and forces all neighboring tabs to horizontally jerk/flicker ("رعشة أفقية"). Always use a uniform `fontWeight: 600` for both active and inactive tabs, differentiating the active state exclusively through high-contrast colors (e.g. deep royal navy `#170e5e` vs light background `#f8fafc`).
- **Instant 0ms Switching:** NEVER apply CSS transitions (`transition: all 0.15s ease`) to tab buttons. Tab switching must be immediate (0ms) without any layout delay or color shimmer.
- **Symmetrical Borders & Box-Sizing:** Enforce `box-sizing: border-box` and consistent 1px borders across all tabs to prevent subpixel layout jumping.


