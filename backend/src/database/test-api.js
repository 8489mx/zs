const http = require('http');

const data = JSON.stringify({
  payload: {
    firstName: "Test",
    hireDate: "2026-07-02",
    compensationType: "monthly",
    graceMinutes: 0,
    status: "active",
    overtimePolicy: "review_only"
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/hr/employees',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', console.error);
req.write(data);
req.end();
