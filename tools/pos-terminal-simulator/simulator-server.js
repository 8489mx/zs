/**
 * Z-Systems POS ECR Terminal Simulator
 * Emulates PAX (Raw TCP 10009 & HTTP 8080) and Geidea (REST HTTP 8080)
 * Provides real-time interactive Touchscreen UI for Sunmi V2 Pro & mobile screens on Port 3344
 */

const http = require('http');
const net = require('net');
const url = require('url');

// Port configuration
const WEB_PORT = 3344;
const HTTP_ECR_PORT = 8080;
const TCP_PAX_PORT = 10009;
const SUNMI_PRINTER_IP = '192.168.1.3';
const SUNMI_PRINTER_PORT = 9100;

// State
let currentTx = null;
let sseClients = [];
let autoApprove = false;
let autoDelaySec = 2;
let printOnApproval = true;
let eventLogs = [];

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

function logEvent(type, message, details = null) {
  const entry = {
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString('ar-EG', { hour12: false }),
    type,
    message,
    details,
  };
  eventLogs.unshift(entry);
  if (eventLogs.length > 50) eventLogs.pop();
  broadcastSSE({ type: 'log', entry });
  console.log(`[${entry.time}] [${type.toUpperCase()}] ${message}`);
}

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(payload);
    } catch {
      // ignore dropped connections
    }
  });
}

function printReceiptOnSunmi(tx) {
  if (!printOnApproval) return;
  try {
    const isThreeDec = ['KWD', 'BHD', 'OMR'].includes(String(tx.currency || '').toUpperCase());
    const formattedAmt = Number(tx.amount).toFixed(isThreeDec ? 3 : 2);
    const client = new net.Socket();
    client.setTimeout(4000);
    client.connect(SUNMI_PRINTER_PORT, SUNMI_PRINTER_IP, () => {
      // ESC/POS raw bytes: Init + Centered text + Line feeds
      const dateStr = new Date().toLocaleString('en-US');
      const text =
        '\x1B\x40' + // ESC @ (Init)
        '\x1B\x61\x01' + // Center align
        '================================\n' +
        '       Z-SYSTEMS CLOUD ERP      \n' +
        '     POS TERMINAL SIMULATOR     \n' +
        '================================\n' +
        '\x1B\x61\x00' + // Left align
        `DATE/TIME : ${dateStr}\n` +
        `TX REF    : ${tx.referenceId || tx.ecrReference || 'REF-001'}\n` +
        `TERMINAL  : SUNMI-V2PRO-SIM\n` +
        `MERCHANT  : 009823419082\n` +
        '--------------------------------\n' +
        `CARD      : ${tx.cardScheme || 'VISA'} (${tx.cardLastFour || '****'})\n` +
        `AUTH CODE : ${tx.authCode || '000000'}\n` +
        `RRN       : ${tx.rrn || '000000000000'}\n` +
        `AMOUNT    : ${formattedAmt} ${tx.currency || 'EGP'}\n` +
        '--------------------------------\n' +
        '\x1B\x61\x01' + // Center align
        '        TRANSACTION APPROVED    \n' +
        '      CUSTOMER VERIFIED (PIN)   \n' +
        '================================\n\n\n\n';

      client.write(Buffer.from(text, 'ascii'));
      client.end();
      logEvent('print', 'تم إرسال إيصال الدفع إلى طابعة Sunmi الحرارية');
    });

    client.on('error', (err) => {
      logEvent('print_err', `تعذر إرسال الإيصال للطابعة: ${err.message}`);
    });
  } catch (err) {
    logEvent('print_err', `خطأ طباعة: ${err.message}`);
  }
}

function resolveCurrentTransaction(action) {
  if (!currentTx) return false;

  const tx = currentTx;
  currentTx = null;

  if (action === 'approve-visa' || action === 'approve-meeza' || action === 'approve-mastercard' || action === 'approve-knet') {
    let scheme = 'VISA';
    let last4 = '4128';
    if (action === 'approve-meeza') {
      scheme = 'MEEZA';
      last4 = '9012';
    } else if (action === 'approve-mastercard') {
      scheme = 'MASTERCARD';
      last4 = '5543';
    } else if (action === 'approve-knet') {
      scheme = 'KNET';
      last4 = '8921';
    }

    const authCode = String(Math.floor(100000 + Math.random() * 900000));
    const rrn = String(Date.now()).slice(-12);

    tx.cardScheme = scheme;
    tx.cardLastFour = last4;
    tx.authCode = authCode;
    tx.rrn = rrn;

    logEvent('approved', `تمت الموافقة على الدفع: ${tx.amount} ${tx.currency} (${scheme})`);

    // Response for Geidea REST
    const geideaResponse = {
      status: 'APPROVED',
      isSuccess: true,
      responseCode: '00',
      responseMessage: 'APPROVED',
      authCode,
      rrn,
      referenceNo: tx.referenceId,
      amount: tx.amount,
      currency: tx.currency,
      cardScheme: scheme,
      cardLastFour: last4,
      maskedPan: `****-****-****-${last4}`,
      terminalId: tx.terminalTid || 'SIM-TID-01',
    };

    // Response for PAX JSON
    const paxResponse = {
      status: 'APPROVED',
      responseCode: '000000',
      authCode,
      refNum: rrn,
      extData: {
        cardType: scheme,
        pan: `************${last4}`,
        amount: String(Math.round(tx.amount * 100)),
      },
    };

    if (tx.protocol === 'pax-tcp') {
      sendPaxTcpResponse(tx.socket, paxResponse);
    } else if (tx.protocol === 'pax-http') {
      tx.httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      tx.httpRes.end(JSON.stringify(paxResponse));
    } else {
      // Geidea HTTP REST
      tx.httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      tx.httpRes.end(JSON.stringify(geideaResponse));
    }

    printReceiptOnSunmi(tx);
    broadcastSSE({ type: 'tx_resolved', status: 'approved', tx });
    return true;
  }

  if (action.startsWith('decline-')) {
    const reason = action.replace('decline-', '');
    let code = '05';
    let msg = 'Do Not Honor';
    if (reason === 'insufficient') {
      code = '51';
      msg = 'Insufficient Funds';
    } else if (reason === 'pin') {
      code = '55';
      msg = 'Incorrect PIN';
    } else if (reason === 'expired') {
      code = '54';
      msg = 'Expired Card';
    }

    logEvent('declined', `تم رفض العملية: كود ${code} (${msg})`);

    const geideaDeclined = {
      status: 'DECLINED',
      isSuccess: false,
      responseCode: code,
      responseMessage: msg,
      referenceNo: tx.referenceId,
    };

    const paxDeclined = {
      status: 'DECLINED',
      responseCode: code,
      responseMessage: msg,
    };

    if (tx.protocol === 'pax-tcp') {
      sendPaxTcpResponse(tx.socket, paxDeclined);
    } else if (tx.protocol === 'pax-http') {
      tx.httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      tx.httpRes.end(JSON.stringify(paxDeclined));
    } else {
      tx.httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      tx.httpRes.end(JSON.stringify(geideaDeclined));
    }

    broadcastSSE({ type: 'tx_resolved', status: 'declined', code, msg });
    return true;
  }

  if (action === 'cancel') {
    logEvent('cancelled', 'تم إلغاء العملية بواسطة العميل أو الكاشير');
    const geideaCancelled = {
      status: 'CANCELLED',
      isSuccess: false,
      responseCode: '99',
      responseMessage: 'User Cancelled',
    };

    const paxCancelled = {
      status: 'CANCELLED',
      responseCode: '000099',
      responseMessage: 'Transaction Cancelled',
    };

    if (tx.protocol === 'pax-tcp') {
      sendPaxTcpResponse(tx.socket, paxCancelled);
    } else if (tx.protocol === 'pax-http') {
      tx.httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      tx.httpRes.end(JSON.stringify(paxCancelled));
    } else {
      tx.httpRes.writeHead(200, { 'Content-Type': 'application/json' });
      tx.httpRes.end(JSON.stringify(geideaCancelled));
    }

    broadcastSSE({ type: 'tx_resolved', status: 'cancelled', code: '99', msg: 'تم إلغاء العملية بواسطة الكاشير / العميل' });
    return true;
  }

  return false;
}

// -------------------------------------------------------------
// 1. PAX Raw TCP Protocol Handler (Port 10009)
// -------------------------------------------------------------
function sendPaxTcpResponse(socket, dataObj) {
  try {
    const jsonStr = JSON.stringify(dataObj);
    const dataBuf = Buffer.from(jsonStr, 'utf8');

    // LRC: XOR of all bytes from after STX up to and including ETX (0x03)
    let lrc = 0x03;
    for (let i = 0; i < dataBuf.length; i++) {
      lrc ^= dataBuf[i];
    }

    const packet = Buffer.concat([
      Buffer.from([0x02]), // STX
      dataBuf,
      Buffer.from([0x03, lrc]), // ETX + LRC
    ]);

    socket.write(packet);
    logEvent('pax_tcp', 'تم إرسال حزمة STX/ETX/LRC إلى الكاشير عبر TCP Socket');
  } catch (err) {
    console.error('Error sending PAX TCP response:', err);
  }
}

const paxTcpServer = net.createServer((socket) => {
  logEvent('connection', `اتصال TCP وارد من ${socket.remoteAddress}:${socket.remotePort}`);
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    // Check if client sent ACK (0x06)
    if (chunk.length === 1 && chunk[0] === 0x06) {
      logEvent('pax_tcp', 'استلام إشارة ACK (0x06) من نظام Z-Systems بنجاح');
      socket.end();
      return;
    }

    buffer = Buffer.concat([buffer, chunk]);
    const etxIdx = buffer.indexOf(0x03);

    if (etxIdx !== -1 && buffer.length > etxIdx) {
      let stxIdx = buffer.indexOf(0x02);
      if (stxIdx === -1) stxIdx = 0;
      else stxIdx += 1;

      const rawMsg = buffer.subarray(stxIdx, etxIdx).toString('utf8');
      buffer = buffer.subarray(etxIdx + 2); // skip ETX + LRC

      try {
        const payload = JSON.parse(rawMsg);
        logEvent('pax_req', `طلب PAX TCP جديد: ${rawMsg}`);

        if (payload.command === 'CANCEL_TRANSACTION' || payload.command === 'CANCEL') {
          logEvent('cancel_req', 'استلام أمر إلغاء PAX TCP من الكاشير');
          if (currentTx) {
            resolveCurrentTransaction('cancel');
            sendPaxTcpResponse(socket, { status: 'CANCELLED', responseCode: '000099', responseMessage: 'Cancelled by POS' });
          } else {
            sendPaxTcpResponse(socket, { status: 'NO_ACTIVE_TX', responseCode: '000000' });
          }
          return;
        }

        const amount = payload.amountDecimal ? Number(payload.amountDecimal) : (payload.amount ? Number(payload.amount) / 100 : 0);
        const tx = {
          protocol: 'pax-tcp',
          socket,
          amount: amount || 100,
          currency: 'EGP',
          referenceId: payload.ecrRef || `ECR-${Date.now()}`,
          rawPayload: payload,
          createdAt: Date.now(),
        };

        currentTx = tx;
        broadcastSSE({ type: 'new_tx', tx: sanitizeTx(tx) });

        if (autoApprove) {
          setTimeout(() => resolveCurrentTransaction('approve-visa'), autoDelaySec * 1000);
        }
      } catch (err) {
        logEvent('pax_err', `خطأ فك تشفير حزمة PAX: ${err.message}`);
      }
    }
  });

  socket.on('error', (err) => {
    logEvent('socket_err', `انقطاع اتصال TCP: ${err.message}`);
  });
});

paxTcpServer.listen(TCP_PAX_PORT, '0.0.0.0', () => {
  console.log(`[PAX TCP] Listening on 0.0.0.0:${TCP_PAX_PORT}`);
});

// -------------------------------------------------------------
// 2. HTTP ECR Server (Geidea REST & PAX POSLink HTTP - Port 8080)
// -------------------------------------------------------------
const httpEcrServer = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    let payload = {};
    try {
      if (body) payload = JSON.parse(body);
    } catch {
      payload = { raw: body };
    }

    logEvent('http_req', `${req.method} ${pathname}`, payload);

    // Cancel endpoints (Geidea /cancel, PAX /poslink CANCEL_TRANSACTION)
    const isCancelCmd =
      pathname.includes('/cancel') ||
      pathname.includes('/abort') ||
      payload.command === 'CANCEL_TRANSACTION' ||
      payload.command === 'CANCEL' ||
      payload.transactionType === 'CANCEL';

    if (isCancelCmd) {
      if (currentTx) {
        resolveCurrentTransaction('cancel');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'CANCELLED', responseCode: '000099', success: true }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'NO_ACTIVE_TX', responseCode: '000000', success: true }));
      }
      return;
    }

    // Health / Ping endpoint
    if (pathname === '/ping' || pathname === '/health' || pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ONLINE', terminal: 'SUNMI-V2PRO-SIM', ready: !currentTx }));
      return;
    }

    // Geidea REST / PAX POSLink sale endpoint
    const isPaxHttp = pathname.includes('poslink') || payload.command === 'DO_TRANSACTION';
    
    const targetCurrency = String(payload.currency || payload.currencyCode || 'EGP').toUpperCase();
    const isThreeDec = ['KWD', 'BHD', 'OMR'].includes(targetCurrency);
    const minorDivisor = isThreeDec ? 1000 : 100;
    
    let parsedAmount = 0;
    if (payload.amountDecimal !== undefined && Number(payload.amountDecimal) > 0) {
      parsedAmount = Number(payload.amountDecimal);
    } else if (isPaxHttp) {
      parsedAmount = Number(payload.amount || payload.transAmount || 0) / minorDivisor;
    } else if (payload.amount !== undefined) {
      parsedAmount = Number(payload.amount);
    } else if (payload.amountInCents) {
      parsedAmount = Number(payload.amountInCents) / minorDivisor;
    }

    const tx = {
      protocol: isPaxHttp ? 'pax-http' : 'geidea-rest',
      httpRes: res,
      amount: parsedAmount || 50,
      currency: targetCurrency,
      referenceId: payload.referenceId || payload.ecrReference || payload.ecrRefNum || `ECR-${Date.now()}`,
      terminalTid: payload.terminalId || payload.terminalTid || payload.tid,
      rawPayload: payload,
      createdAt: Date.now(),
    };

    currentTx = tx;
    broadcastSSE({ type: 'new_tx', tx: sanitizeTx(tx) });

    if (autoApprove) {
      setTimeout(() => resolveCurrentTransaction('approve-visa'), autoDelaySec * 1000);
    }
  });
});

httpEcrServer.listen(HTTP_ECR_PORT, '0.0.0.0', () => {
  console.log(`[HTTP ECR] Listening on 0.0.0.0:${HTTP_ECR_PORT} (Geidea & PAX HTTP)`);
});

// -------------------------------------------------------------
// 3. Web UI & Touchscreen Server for Sunmi Screen (Port 3344)
// -------------------------------------------------------------
const webServer = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // SSE stream
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: 'init', currentTx: sanitizeTx(currentTx), autoApprove, autoDelaySec, printOnApproval, logs: eventLogs })}\n\n`);
    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
    return;
  }

  // Interactive Action triggered by Sunmi Touchscreen
  if (pathname === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let data = {};
      try {
        data = JSON.parse(body || '{}');
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const action = data.action;

      if (action === 'toggle-auto') {
        autoApprove = !autoApprove;
        broadcastSSE({ type: 'config', autoApprove, autoDelaySec, printOnApproval });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, autoApprove }));
        return;
      }

      if (action === 'toggle-print') {
        printOnApproval = !printOnApproval;
        broadcastSSE({ type: 'config', autoApprove, autoDelaySec, printOnApproval });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, printOnApproval }));
        return;
      }

      const handled = resolveCurrentTransaction(action);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: handled }));
    });
    return;
  }

  // Serve static UI
  if (pathname === '/' || pathname === '/index.html') {
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(htmlPath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Missing public/index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

webServer.listen(WEB_PORT, '0.0.0.0', () => {
  console.log(`[Touch UI] Sunmi Terminal Screen running at http://0.0.0.0:${WEB_PORT}`);
});

function sanitizeTx(tx) {
  if (!tx) return null;
  return {
    protocol: tx.protocol,
    amount: tx.amount,
    currency: tx.currency,
    referenceId: tx.referenceId,
    terminalTid: tx.terminalTid,
    createdAt: tx.createdAt,
  };
}
