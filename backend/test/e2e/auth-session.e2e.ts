import assert from 'node:assert/strict';
import { E2EClient, ensureRunning } from './e2e-utils';

async function main() {
  await ensureRunning();
  const client = new E2EClient();
  const login = await client.login();
  assert.equal(login.ok, true);
  assert.ok(login.user?.id, 'login response must include user id');

  const me = await client.get('/api/auth/me');
  assert.ok(me.user?.id, 'me response must include user');
  assert.ok(Array.isArray(me.user?.permissions), 'me response must include permissions');

  const sessions = await client.get('/api/auth/sessions');
  assert.ok(Array.isArray(sessions.sessions), 'sessions response must include sessions array');
  assert.ok(sessions.sessions.length >= 1, 'must have at least one active session');

  const logout = await client.post('/api/auth/logout', {}, 201);
  assert.equal(logout.ok, true);

  const afterLogout = await fetch(`${client.baseUrl}/api/auth/me`, {
    headers: {
      Accept: 'application/json',
      Cookie: 'session_id=invalid; csrf_token=invalid',
    },
  });
  assert.equal(afterLogout.status, 401);

  console.log('auth-session.e2e: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
