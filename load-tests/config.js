/**
 * Z-Systems ERP Enterprise Load Testing Suite
 * k6 Shared Configuration & Environment Helpers
 */

export const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3001';
export const STOREFRONT_SLUG = __ENV.STOREFRONT_SLUG || 'almhnds';
export const AUTH_USERNAME = __ENV.AUTH_USERNAME || 'admin';
export const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || 'admin';
export const TENANT_ID = __ENV.TENANT_ID || 'dev-tenant';

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Standard SLA Thresholds
 */
export const STANDARD_THRESHOLDS = {
  // 95% of requests must complete below 500ms
  http_req_duration: ['p(90)<300', 'p(95)<500', 'p(99)<1500'],
  // HTTP failure rate must stay below 1%
  http_req_failed: ['rate<0.01'],
};

/**
 * High-Throughput SLA Thresholds (for fast endpoints like version checks)
 */
export const FAST_THRESHOLDS = {
  http_req_duration: ['p(95)<150', 'p(99)<400'],
  http_req_failed: ['rate<0.01'],
};

/**
 * Generates an Egyptian / International valid phone number for customer orders
 */
export function generateRandomPhone() {
  const prefixes = ['010', '011', '012', '015'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${suffix}`;
}

/**
 * Sleep with jitter to simulate realistic user think time
 */
export function sleepWithJitter(minSec = 0.5, maxSec = 1.5) {
  const duration = minSec + Math.random() * (maxSec - minSec);
  return duration;
}
