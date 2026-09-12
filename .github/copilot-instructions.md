# GitHub Copilot & Codex Instructions for Z-Systems

> 🔴 **MANDATORY INSTRUCTIONS:**
> All AI assistants (GitHub Copilot, Codex, etc.) MUST adhere to `SAAS_ELECTRON_ISOLATION_CONSTITUTION.md` and `GEMINI.md`.

## Key Invariants & Boundaries
1. **SaaS vs Electron Isolation:**
   - Production Cloud SaaS runs on Oracle Cloud VPS (`APP_MODE=CLOUD_SAAS`).
   - Desktop runs standalone (`APP_MODE=SELF_CONTAINED`).
   - Platform central tenant `zs` (Super Admin) must ALWAYS be accessible in SaaS mode.
   - Do NOT mix desktop branching logic into cloud authentication (`session.service.ts`).
2. **Data & Accounting Safety:**
   - Multi-tenant queries must always scope `tenant_id`.
   - Accounting ledgers and financial transactions are immutable (double-entry).
   - Passwords must be hashed using `bcrypt` with salt.
3. **Execution Safety:**
   - NEVER trigger `npm run build` or `git push` automatically without explicit user command.
4. **UI Standards:**
   - Arabic RTL interface (`dir="rtl"`).
   - Zero emojis in UI components.
   - Use centralized design system (`StandardDialog`, `CustomSelect`).
