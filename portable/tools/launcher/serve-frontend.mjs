#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return fallback;
  return args[index + 1];
};

const root = path.resolve(readArg('--root', process.cwd()));
const port = Number(readArg('--port', '8080'));
const backendPort = Number(readArg('--backend-port', '3001'));

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

const safePath = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const resolved = path.resolve(root, normalized);
  if (!resolved.startsWith(root)) return null;
  return resolved;
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
};

const proxyApiRequest = (req, res, target) => {
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: backendPort,
      method: req.method,
      path: `${target.pathname}${target.search}`,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'Backend proxy error', detail: error.message }));
  });

  req.pipe(proxyReq);
};

const server = http.createServer((req, res) => {
  const target = new URL(req.url || '/', `http://${req.headers.host}`);

  if (target.pathname.startsWith('/api/')) {
    proxyApiRequest(req, res, target);
    return;
  }

  if (target.pathname === '/health/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'frontend-static', backendPort }));
    return;
  }

  let requested = target.pathname === '/' ? '/index.html' : target.pathname;
  let filePath = safePath(requested);

  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const fallback = path.resolve(root, 'index.html');
    if (fs.existsSync(fallback)) {
      filePath = fallback;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
  }

  sendFile(res, filePath);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`frontend server listening on http://127.0.0.1:${port}`);
});
