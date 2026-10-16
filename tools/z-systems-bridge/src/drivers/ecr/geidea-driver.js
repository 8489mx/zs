/**
 * Z-Systems Hardware Bridge - Geidea Smart POS ECR Driver
 * Supports Geidea terminals across Saudi Arabia (mada) and Egypt.
 * Communicates via Local HTTP REST (Port 8080).
 */

async function chargeGeidea(options) {
  const { ip, port = 8080, amount, currency = 'SAR', referenceId, pairingKey, terminalTid } = options;

  const isThreeDec = ['KWD', 'BHD', 'OMR'].includes(String(currency).toUpperCase());
  const multiplier = isThreeDec ? 1000 : 100;
  const amountMinor = Math.round(amount * multiplier);
  const amountDec = Number(amount.toFixed(isThreeDec ? 3 : 2));

  const payload = {
    transactionType: 'PURCHASE',
    amount: amountDec,
    amountInCents: amountMinor,
    amountInHalalas: amountMinor,
    currency: String(currency).toUpperCase(),
    referenceId,
    ecrReference: referenceId,
    printReceipt: true,
  };

  if (terminalTid) {
    payload.terminalId = terminalTid;
    payload.terminalTid = terminalTid;
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (pairingKey) {
    headers['x-pairing-key'] = pairingKey;
    headers['Authorization'] = `Bearer ${pairingKey}`;
  }

  let res = null;
  let targetUrl = `http://${ip}:${port}/api/v1/transaction`;

  try {
    res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(95000),
    });
  } catch (err) {
    targetUrl = `http://${ip}:${port}/ecr/sale`;
    res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(95000),
    });
  }

  if (!res.ok) {
    throw new Error(`ماكينة جيديا أعادت رمز استجابة ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const statusRaw = String(data.status || data.responseCode || '').toUpperCase();
  const isApproved =
    statusRaw === 'APPROVED' ||
    statusRaw === 'SUCCESS' ||
    data.responseCode === '00' ||
    data.responseCode === '000' ||
    data.isSuccess === true;

  if (isApproved) {
    const rawScheme = String(data.cardScheme || data.scheme || data.cardType || 'mada').toLowerCase();
    let scheme = 'mada';
    if (rawScheme.includes('knet')) scheme = 'knet';
    else if (rawScheme.includes('meeza')) scheme = 'meeza';
    else if (rawScheme.includes('master')) scheme = 'mastercard';
    else if (rawScheme.includes('visa')) scheme = 'visa';

    const last4 = String(data.cardLastFour || data.last4 || (data.maskedPan ? data.maskedPan.slice(-4) : ''));

    return {
      success: true,
      status: 'approved',
      authCode: String(data.authCode || data.approvalCode || data.authorizationCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`),
      rrn: String(data.rrn || data.retrievalReferenceNumber || data.referenceNo || referenceId),
      cardScheme: scheme,
      cardLastFour: last4,
      amount,
      currency,
      raw: data,
    };
  }

  const isCancelled = statusRaw === 'CANCELLED' || statusRaw === 'CANCELED' || data.responseCode === '99';
  return {
    success: false,
    status: isCancelled ? 'cancelled' : 'declined',
    code: String(data.responseCode || statusRaw || ''),
    message: data.message || data.responseMessage || data.responseDescription || (isCancelled ? 'تم إلغاء العملية بواسطة العميل' : 'تم رفض العملية من البنك'),
    raw: data,
  };
}

async function cancelGeidea(options) {
  const { ip, port = 8080, referenceId } = options;
  const payload = { referenceId, ecrReference: referenceId };

  try {
    await fetch(`http://${ip}:${port}/api/v1/transaction/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    }).catch(async () => {
      await fetch(`http://${ip}:${port}/ecr/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
    });
    return { success: true, status: 'cancelled' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testGeideaConnection(ip, port = 8080) {
  const start = Date.now();
  try {
    const res = await fetch(`http://${ip}:${port}/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(3500),
    }).catch(async () => {
      return await fetch(`http://${ip}:${port}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3500),
      });
    });

    return {
      reachable: res.ok || res.status < 500,
      latencyMs: Date.now() - start,
      message: res.ok ? 'ماكينة جيديا متصلة وجاهزة للعمل' : `الماكينة استجابت بكود ${res.status}`,
      ip,
      port,
      provider: 'Geidea Smart POS',
    };
  } catch (err) {
    return {
      reachable: false,
      latencyMs: Date.now() - start,
      message: `تعذر الاتصال بماكينة جيديا: ${err.message}`,
      ip,
      port,
      provider: 'Geidea Smart POS',
    };
  }
}

module.exports = {
  chargeGeidea,
  cancelGeidea,
  testGeideaConnection,
};
