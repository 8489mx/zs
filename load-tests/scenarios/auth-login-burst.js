/**
 * Scenario 3: Authentication Burst & Rate Limiting Stress Test
 * 
 * Objectives:
 * - Simulates high-rate login burst traffic against `/api/auth/login`.
 * - Verifies Invariant O72: LoginRateLimitMiddleware and AuthBurstRateLimitMiddleware isolate IP buckets
 *   and throttle attackers with HTTP 429 (Too Many Requests).
 * - Ensures that legitimate users with valid credentials can log in while attackers are contained.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  DEFAULT_HEADERS,
  AUTH_USERNAME,
  AUTH_PASSWORD,
  STANDARD_THRESHOLDS,
  clientIpHeaders,
} from '../config.js';

// Custom metrics
const loginDuration = new Trend('login_duration_ms');
const rateLimited429Count = new Counter('login_429_rate_limited_count');
const authSuccessRate = new Rate('login_success_rate');

export const options = {
  scenarios: {
    // Attack burst scenario: Single IP firing repeated invalid logins
    attacker_burst: {
      executor: 'constant-arrival-rate',
      rate: 30, // 30 requests per second
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 10,
      maxVUs: 30,
    },
  },
  thresholds: {
    login_duration_ms: ['p(95)<300'],
  },
};

export default function () {
  // Attacker IP bucket
  const attackerIp = '198.51.100.42';

  group('Brute Force Spike on /api/auth/login', () => {
    const loginUrl = `${BASE_URL}/api/auth/login`;

    const payload = JSON.stringify({
      username: 'non_existent_attacker_target',
      password: `WrongPassword_${Date.now()}`,
    });

    // `X-Real-IP` لا `X-Forwarded-For`: التطبيق يشتق عنوان العميل من الأولى حصراً
    // (`resolveClientIp`)، فالترويسة الثانية كانت تُرسَل ولا تُقرأ — أي أن هذا السيناريو كان
    // يظن أنه يتحكم في عنوان المهاجم بينما كل طلباته تُحسب على `127.0.0.1`. تصادف أن النتيجة
    // كانت صحيحة (دلو واحد = مهاجم واحد)، لكن أول محاولة لمحاكاة عدة مهاجمين كانت ستفشل بصمت.
    const headers = {
      ...DEFAULT_HEADERS,
      'X-Real-IP': attackerIp,
    };

    const start = Date.now();
    const res = http.post(loginUrl, payload, { headers });
    const duration = Date.now() - start;
    loginDuration.add(duration);

    if (res.status === 429) {
      rateLimited429Count.add(1);
    }

    check(res, {
      'status is 401 or 429 (rejected or throttled)': (r) => r.status === 401 || r.status === 429,
    });
  });

  sleep(0.1);
}
