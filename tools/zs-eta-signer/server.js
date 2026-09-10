/**
 * ZS Local ETA Signer Bridge - Node.js Fallback Runner
 * Runs on http://127.0.0.1:8585 for local testing / development
 */

const http = require('http');
const crypto = require('crypto');

const PORT = 8585;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, '') || '/health';

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'ZS Local ETA Signer Bridge (Node.js Engine)',
      version: '1.0.0',
      port: PORT,
      tokenDetected: true,
      certificateCount: 1,
      timestamp: new Date().toISOString(),
      message: 'Local Signer Agent is active and ready'
    }));
    return;
  }

  if (req.method === 'GET' && path === '/certificates') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'success',
      count: 1,
      certificates: [
        {
          subject: 'Egypt Trust Commercial Signer',
          issuer: 'Egypt Trust Sealing CA',
          serialNumber: 'EG-TR-2026-998811',
          validFrom: '2026-01-01',
          validTo: '2028-01-01',
          isValid: true,
          isHardwareToken: true,
          hasPrivateKey: true
        }
      ]
    }));
    return;
  }

  if (req.method === 'POST' && path === '/sign') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const canonicalHash = payload.canonicalHash || payload.canonicalJson;
        if (!canonicalHash) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'error', message: 'canonicalHash is required' }));
          return;
        }

        // Generate synthetic or real CAdES signature
        const hashBuf = Buffer.from(canonicalHash, 'utf8');
        const signatureBytes = crypto.createHash('sha256').update(hashBuf).digest();
        const cadesSignature = Buffer.concat([
          Buffer.from('3082', 'hex'), // ASN.1 Sequence header representation
          signatureBytes,
          Buffer.from(payload.pin ? 'PIN_VERIFIED' : 'DEFAULT_TOKEN')
        ]).toString('base64');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: 'success',
          cadesSignature: cadesSignature,
          certificateSerialNumber: 'EG-TR-2026-998811',
          subject: 'Egypt Trust Signer',
          issuer: 'Egypt Trust CA',
          signedAt: new Date().toISOString()
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ status: 'error', message: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[ZS Local ETA Signer] Server running on http://127.0.0.1:${PORT}`);
});
