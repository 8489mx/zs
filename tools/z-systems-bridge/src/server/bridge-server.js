/**
 * Z-Systems Hardware Bridge Server
 * Listens on 127.0.0.1:18181 with W3C Private Network Access headers.
 * Connects Web POS to local ECR terminals, ESC/POS printers, and cash drawers.
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const { chargePax, cancelPax, testPaxConnection } = require('../drivers/ecr/pax-driver');
const { chargeGeidea, cancelGeidea, testGeideaConnection } = require('../drivers/ecr/geidea-driver');
const { printRawReceipt, kickCashDrawer, printTestReceipt } = require('../drivers/printer/escpos-driver');

const PORT = 18181;
const HOST = '127.0.0.1';
const startTime = Date.now();

let activeEcrSession = null;
const sseClients = new Set();

function broadcastEvent(type, data = {}) {
  const payload = JSON.stringify({ type, ...data, timestamp: Date.now() });
  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-pairing-key, X-Requested-With');
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({ raw: body });
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. Health & Ping
  if (pathname === '/health' || pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      name: 'Z-Systems Hardware Bridge',
      version: '1.0.0',
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      activeSession: activeEcrSession ? activeEcrSession.referenceId : null,
    }));
    return;
  }

  // 2. SSE Event Stream
  if (pathname === '/events' || pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', version: '1.0.0' })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 3. ECR Terminal Endpoints
  if (pathname === '/api/ecr/charge' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { ip, port, provider = 'fawry', amount, currency = 'EGP', referenceId = `ECR-${Date.now()}`, pairingKey, terminalTid } = body;

    if (!ip || !amount) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'يجب تحديد عنوان IP للماكينة والمبلغ المطلوب' }));
      return;
    }

    const cleanPort = Number(port || 8080);
    const provLower = String(provider).toLowerCase();

    activeEcrSession = { referenceId, amount, currency, ip, port: cleanPort, provider };
    broadcastEvent('ecr_waiting', activeEcrSession);

    try {
      let result = null;
      if (provLower.includes('geidea')) {
        result = await chargeGeidea({ ip, port: cleanPort, amount, currency, referenceId, pairingKey, terminalTid });
      } else {
        // PAX / Fawry / K-NET / Paymob
        result = await chargePax({ ip, port: cleanPort, amount, currency, referenceId, terminalTid });
      }

      activeEcrSession = null;
      broadcastEvent(result.success ? 'ecr_approved' : 'ecr_declined', result);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      activeEcrSession = null;
      broadcastEvent('ecr_error', { error: err.message, referenceId });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, status: 'error', message: err.message }));
    }
    return;
  }

  if (pathname === '/api/ecr/cancel' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { ip, port, provider = 'fawry', referenceId } = body;

    const cleanPort = Number(port || 8080);
    const provLower = String(provider).toLowerCase();

    try {
      let result = null;
      if (provLower.includes('geidea')) {
        result = await cancelGeidea({ ip, port: cleanPort, referenceId });
      } else {
        result = await cancelPax({ ip, port: cleanPort, referenceId });
      }

      activeEcrSession = null;
      broadcastEvent('ecr_cancelled', { referenceId });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/ecr/test' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const { ip, port, provider = 'fawry' } = body;
    const cleanPort = Number(port || 8080);
    const provLower = String(provider).toLowerCase();

    let testResult = null;
    if (provLower.includes('geidea')) {
      testResult = await testGeideaConnection(ip, cleanPort);
    } else {
      testResult = await testPaxConnection(ip, cleanPort);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: testResult }));
    return;
  }

  // 4. ESC/POS Thermal Printer Endpoints
  if (pathname === '/api/printer/print' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const result = await printRawReceipt(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/printer/kick-drawer' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const result = await kickCashDrawer(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/printer/test' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const result = await printTestReceipt(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 5. Diagnostics Dashboard Web Page
  if (pathname === '/' || pathname === '/diagnostics' || pathname === '/index.html') {
    const uiPath = path.join(__dirname, '..', 'ui', 'diagnostics.html');
    fs.readFile(uiPath, (err, content) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Z-Systems Hardware Bridge is Running at http://127.0.0.1:18181');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  Z-Systems Hardware Bridge v1.0.0                  `);
  console.log(`  Listening on http://${HOST}:${PORT}              `);
  console.log(`  Diagnostics UI: http://${HOST}:${PORT}/diagnostics`);
  console.log(`====================================================`);
});

module.exports = { server };
