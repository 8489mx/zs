# Future Plan: SaaS Entitlements & Packages Architecture

## 1. Overview
The goal of this architectural plan is to establish a scalable, centralized "Entitlements" and "Plan Management" system. As the platform grows and new modules/pages are added, managing package constraints (Basic vs Pro vs Enterprise) hardcoded inside pages or APIs becomes unmanageable. This future plan proposes a centralized Feature Registry and robust frontend/backend gates to handle permissions based on tenant subscriptions.

## 2. Core Concepts

### 2.1 Feature Registry
A centralized TypeScript file (or database table) defining all features in the system.
**Structure Example:**
```typescript
interface FeatureDefinition {
  code: string; // e.g., 'manufacturing.work_orders'
  nameAr: string;
  nameEn: string;
  module: string;
  description: string;
  defaultEnabled: boolean;
  requiredPlanLevel?: number;
  isAddOn: boolean;
  parentFeature?: string;
}
```

### 2.2 Plans & Entitlements Database Schema
To avoid hardcoding plans into the code, we will introduce a dynamic plan schema:
- `saas_plans` Table: Stores basic plan tiers (Basic, Pro, Advanced).
- `saas_plan_features` Table: Maps a plan to its enabled features.
- `tenant_addons` Table: Stores specific additional features purchased by a tenant outside their base plan.

### 2.3 Backend Guards & Decorators
Introduce a `FeatureGuard` that reads a `@RequireFeature('feature.code')` decorator.
- Any commercial or restricted route must have this decorator.
- The Guard checks if the current tenant's plan (or add-ons) has access to this feature.
- If not, returns `403 FEATURE_NOT_AVAILABLE`.

### 2.4 Frontend FeatureGate
- A React hook `useFeature(featureCode)` that reads the enabled features for the current tenant from the `session` context.
- A `<FeatureGate feature="code">...</FeatureGate>` wrapper component that conditionally renders UI elements (like sidebar items or action buttons).
- A `<LockedFeaturePage>` component to gracefully handle direct navigation to a restricted route, prompting the user to upgrade their plan.

## 3. SaaS Admin Control
In the SaaS admin panel, an interface will be created to manage plans:
- Reads the entire list of features dynamically from the Feature Registry.
- Allows the admin to toggle features on or off for each specific plan.
- New features added in code automatically appear here, requiring zero manual updates to the SaaS Admin codebase.

## 4. Implementation Phases

**Phase 1: Foundation (Backend Registry & Guard)**
- Create the `FeatureRegistry` in the shared code layer.
- Build the `@RequireFeature` decorator and the `FeatureGuard`.
- Implement a temporary logic in the Guard that reads a hardcoded map of plans until the DB is ready.

**Phase 2: Database & SaaS Admin UI**
- Run migrations for `saas_plans` and `saas_plan_features`.
- Build the Plan Management screens in the SaaS Admin module.
- Refactor the `FeatureGuard` to read entitlements from the database caching layer rather than hardcoded logic.

**Phase 3: Frontend Integration**
- Send `enabledFeatures` in the `/api/session` payload so the frontend has immediate, synchronous access to feature toggles.
- Implement `useFeature`, `FeatureGate`, and `LockedFeaturePage`.
- Update Sidebar configurations to include `featureCode` metadata.

**Phase 4: Enforcement & Developer Safety Checks**
- Add tests/CI checks ensuring that every new route or sidebar item includes a `featureCode` or an explicit `@PublicFeature` flag.
- Remove all legacy, scattered plan checks from individual pages.

## 5. Open Questions & Future Considerations

1. **Offline Mode Compatibility:** 
   For offline instances activated via a license key, the license payload currently contains a `plan` string (e.g. "advanced"). Since offline systems might not have access to the central SaaS database's `saas_plan_features` table, should we sync the plan-to-feature mapping into the offline database during activation, or should offline instances just use a hardcoded fallback mapping in code for offline plans?
2. **Performance Constraints:** 
   The `FeatureGuard` must be highly performant. Caching plan entitlements in Redis or memory is strictly required since it evaluates on every request.
3. **Module Interdependencies:**
   If a parent feature is locked, do we automatically lock all sub-features (e.g., locking `manufacturing` locks `manufacturing.boms` and `manufacturing.work_orders`), or do we require explicit mapping for each?
