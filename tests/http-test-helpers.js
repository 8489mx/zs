const http = require('http');
const assert = require('assert');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson({ method = 'GET', port, pathName, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: pathName,
      method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForHealth(port, timeoutMs = 15000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await requestJson({ port, pathName: '/api/health' });
      if (res.status === 200 && res.body && res.body.ok === true) return res.body;
    } catch (err) {
      lastError = err;
    }
    await wait(250);
  }
  throw lastError || new Error('Server did not become healthy in time');
}

function extractCookie(setCookieHeader) {
  assert.ok(Array.isArray(setCookieHeader) && setCookieHeader.length > 0, 'Expected session cookie');
  return setCookieHeader[0].split(';')[0];
}

module.exports = {
  wait,
  requestJson,
  waitForHealth,
  extractCookie,
};
