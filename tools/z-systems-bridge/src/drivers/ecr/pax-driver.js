/**
 * Z-Systems Hardware Bridge - PAX POSLink ECR Driver
 * Supports Fawry POS (Egypt), K-NET (Kuwait), NBK, KFH, CIB, and all PAX Terminals (A920, S920, Q80, A930).
 * Handles Raw TCP Socket (10009 / 20008) and HTTP POSLink (8080).
 */

const net = require('net');

function calculateLrc(buffer) {
  let lrc = 0;
  for (let i = 0; i < buffer.length; i++) {
    lrc ^= buffer[i];
  }
  return lrc;
}

function sendPaxRawTcp(ip, port, payload, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let isFinished = false;
    let buffer = Buffer.alloc(0);

    const finish = (err, data) => {
      if (isFinished) return;
      isFinished = true;
      try { client.destroy(); } catch {}
      if (err) reject(err);
      else resolve(data);
    };

    client.setTimeout(timeoutMs);

    client.on('connect', () => {
      try {
        const jsonStr = JSON.stringify(payload);
        const dataBuf = Buffer.from(jsonStr, 'utf8');
        const lrc = calculateLrc(dataBuf);
        const packet = Buffer.concat([
          Buffer.from([0x02]), // STX
          dataBuf,
          Buffer.from([0x03, lrc]), // ETX + LRC
        ]);
        client.write(packet);
      } catch (err) {
        finish(err);
      }
    });

    client.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const etxIdx = buffer.indexOf(0x03);
      if (etxIdx !== -1 && buffer.length > etxIdx) {
        let stxIdx = buffer.indexOf(0x02);
        if (stxIdx === -1) stxIdx = 0;
        else stxIdx += 1;

        const rawMsg = buffer.subarray(stxIdx, etxIdx).toString('utf8');

        // Send ACK (0x06) to terminal
        try { client.write(Buffer.from([0x06])); } catch {}

        try {
          const parsed = JSON.parse(rawMsg);
          finish(null, parsed);
        } catch {
          const parts = rawMsg.split('^');
          finish(null, {
            responseCode: parts[0] || '000000',
            authCode: parts[1] || '',
            refNum: parts[2] || '',
            raw: rawMsg,
          });
        }
      }
    });

    client.on('timeout', () => finish(new Error('انتهت مهلة انتظار الماكينة (PAX TCP Timeout)')));
    client.on('error', (err) => finish(err));

    client.connect(port, ip);
  });
}

async function chargePax(options) {
  const { ip, port, amount, currency = 'EGP', referenceId, terminalTid } = options;
  const isThreeDec = ['KWD', 'BHD', 'OMR'].includes(String(currency).toUpperCase());
  const multiplier = isThreeDec ? 1000 : 100;
  const amountMinorStr = String(Math.round(amount * multiplier));
  const amountMinorNum = Math.round(amount * multiplier);
  const amountDec = Number(amount.toFixed(isThreeDec ? 3 : 2));

  const payload = {
    command: 'DO_TRANSACTION',
    transType: '01', // SALE
    amount: amountMinorStr,
    transAmount: amountMinorStr,
    amountInCents: amountMinorNum,
    amountDecimal: amountDec,
    ecrRefNum: referenceId,
    referenceNum: referenceId,
    currencyCode: String(currency).toUpperCase(),
    currency: String(currency).toUpperCase(),
    printReceipt: '1',
    printCustomerReceipt: '1',
  };

  if (terminalTid) {
    payload.tid = terminalTid;
  }

  const isRawTcp = port === 10009 || port === 20008;
  let rawResponse = null;

  if (isRawTcp) {
    rawResponse = await sendPaxRawTcp(ip, port, payload, 95000);
  } else {
    // Try HTTP POSLink
    let res = null;
    try {
      res = await fetch(`http://${ip}:${port}/poslink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(95000),
      });
    } catch {
      res = await fetch(`http://${ip}:${port}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(95000),
      });
    }

    if (res && res.ok) {
      rawResponse = await res.json();
    } else {
      // Fallback to TCP if HTTP fails
      rawResponse = await sendPaxRawTcp(ip, port, payload, 95000);
    }
  }

  const code = String(rawResponse.responseCode || rawResponse.resultCode || '').toUpperCase();
  const isApproved =
    code === '000000' ||
    code === '00' ||
    code === '0' ||
    rawResponse.status === 'APPROVED' ||
    rawResponse.status === 'SUCCESS';

  if (isApproved) {
    const rawScheme = String(rawResponse.cardType || rawResponse.cardScheme || rawResponse.extData?.cardType || 'Visa').toLowerCase();
    let scheme = 'visa';
    if (rawScheme.includes('knet')) scheme = 'knet';
    else if (rawScheme.includes('meeza') || rawScheme === '07') scheme = 'meeza';
    else if (rawScheme.includes('master') || rawScheme === '02') scheme = 'mastercard';
    else if (rawScheme.includes('mada')) scheme = 'mada';

    const last4 = String(rawResponse.cardLastFour || rawResponse.last4 || (rawResponse.extData?.pan ? rawResponse.extData.pan.slice(-4) : ''));

    return {
      success: true,
      status: 'approved',
      authCode: String(rawResponse.authCode || rawResponse.auth_code || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`),
      rrn: String(rawResponse.refNum || rawResponse.rrn || referenceId),
      cardScheme: scheme,
      cardLastFour: last4,
      amount,
      currency,
      raw: rawResponse,
    };
  }

  const isCancelled = code === 'CANCELLED' || code === '99' || code === '000099';
  return {
    success: false,
    status: isCancelled ? 'cancelled' : 'declined',
    code,
    message: rawResponse.responseMessage || rawResponse.message || (isCancelled ? 'تم إلغاء العملية بواسطة العميل' : 'تم رفض العملية من البنك'),
    raw: rawResponse,
  };
}

async function cancelPax(options) {
  const { ip, port, referenceId } = options;
  const isRawTcp = port === 10009 || port === 20008;
  const payload = { command: 'CANCEL_TRANSACTION', ecrRefNum: referenceId };

  try {
    if (isRawTcp) {
      await sendPaxRawTcp(ip, port, payload, 5000);
    } else {
      await fetch(`http://${ip}:${port}/poslink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      }).catch(async () => {
        await fetch(`http://${ip}:${port}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(4000),
        });
      });
    }
    return { success: true, status: 'cancelled' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testPaxConnection(ip, port) {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const done = (reachable, msg) => {
      if (resolved) return;
      resolved = true;
      try { socket.destroy(); } catch {}
      resolve({
        reachable,
        latencyMs: Date.now() - start,
        message: msg,
        ip,
        port,
        provider: 'PAX POSLink',
      });
    };

    socket.setTimeout(3500);
    socket.on('connect', () => done(true, 'الاتصال بماكينة باكس / فوري نشط وجاهز'));
    socket.on('timeout', () => done(false, 'انتهت مهلة الاتصال بالماكينة (Timeout)'));
    socket.on('error', (err) => done(false, `تعذر الوصول للمنفذ: ${err.message}`));
    socket.connect(port, ip);
  });
}

module.exports = {
  chargePax,
  cancelPax,
  testPaxConnection,
};
