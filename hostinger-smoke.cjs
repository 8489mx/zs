#!/usr/bin/env node

const http = require('node:http');

const host = process.env.APP_HOST || '0.0.0.0';
const port = Number(process.env.PORT || process.env.APP_PORT || 3001);

console.log(`[hostinger-smoke] starting on ${host}:${port}`);

const server = http.createServer((req, res) => {
  const body = JSON.stringify({
    ok: true,
    service: 'zsystems-hostinger-smoke',
    url: req.url,
    port,
    time: new Date().toISOString(),
  });

  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
});

server.listen(port, host, () => {
  console.log(`[hostinger-smoke] listening on ${host}:${port}`);
});

process.on('uncaughtException', (error) => {
  console.error('[hostinger-smoke] uncaughtException', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[hostinger-smoke] unhandledRejection', error);
  process.exit(1);
});
