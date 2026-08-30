/**
 * Unified System Defaults Constants
 * Central source of truth for initial/default settings across Z-ERP
 */

export const SYSTEM_DEFAULTS = {
  /** Default days before expiry to alert store managers */
  EXPIRY_ALERT_DAYS: 60,
  /** Default days without sales before classifying a product as stagnant */
  STAGNANT_PRODUCT_DAYS: 60,
  /** Default minimum stock threshold */
  LOW_STOCK_THRESHOLD: 5,
  /** Default receipt paper size */
  PAPER_SIZE: 'receipt' as const,
  /** Default POS mode */
  POS_MODE: 'scanner' as const,
  /** Default currency */
  CURRENCY: 'EGP',
  /** Default timezone */
  TIMEZONE: 'Africa/Cairo',
  /** Default UI language */
  UI_LANGUAGE: 'ar' as const,
  /** Default date format */
  DATE_FORMAT: 'dd/MM/yyyy',
  /** Default time format */
  TIME_FORMAT: '12h' as const,
  /** Default accent brand color */
  ACCENT_COLOR: '#170c5c',
  /** Default brand name */
  BRAND_NAME: 'Z Systems',
  /** Default weighted barcode prefix */
  WEIGHTED_BARCODE_PREFIX: '21',
  /** Default technician commission rate (%) */
  TECHNICIAN_COMMISSION_RATE: 30,
} as const;
