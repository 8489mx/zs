// Test script to send payment request to the ECR simulator
const http = require('http');

const payload = JSON.stringify({
  transactionType: 'PURCHASE',
  amount: 250.00,
  currency: 'EGP',
  referenceId: 'INV-261016-0042',
  ecrReference: 'INV-261016-0042',
  printReceipt: true
});

const req = http.request(
  {
    hostname: '192.168.1.3',
    port: 8080,
    path: '/api/v1/transaction',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 60000
  },
  (res) => {
    let body = '';
    res.on('data', (d) => (body += d));
    res.on('end', () => {
      console.log('RESPONSE FROM SIMULATOR:');
      console.log(body);
    });
  }
);

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(payload);
req.end();
console.log('Payment request of 250.00 EGP dispatched. Awaiting terminal response...');
