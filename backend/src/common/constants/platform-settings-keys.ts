/**
 * Settings rows that belong to the platform, not to the tenant.
 *
 * They live in the `settings` table because that is where the plan sync already writes,
 * but they are not tenant preferences: `getSettings` returns every row, so anything here
 * must be stripped from a tenant's save payload or a full round-trip of the settings
 * object would let a tenant write it back — or craft it.
 */

/**
 * Records exactly which `*ModuleEnabled` switches the last plan sync turned on for this
 * tenant. The next sync revokes only what is in this list and no longer granted, which is
 * what keeps it from switching off anything the tenant set by hand.
 */
export const PLAN_MANAGED_MODULES_SETTING_KEY = '__planManagedModules';
