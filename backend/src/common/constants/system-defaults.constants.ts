/**
 * Unified System Defaults Constants
 * Central source of truth for initial/default settings across backend modules
 */

export const SYSTEM_DEFAULTS = {
  /** Default days before expiry to alert store managers */
  EXPIRY_ALERT_DAYS: 60,
  /** Default days without sales before classifying a product as stagnant */
  STAGNANT_PRODUCT_DAYS: 60,
  /** Default minimum stock threshold */
  LOW_STOCK_THRESHOLD: 5,
  /** Default currency */
  CURRENCY: 'EGP',
  /** Default timezone */
  TIMEZONE: 'Africa/Cairo',
} as const;
