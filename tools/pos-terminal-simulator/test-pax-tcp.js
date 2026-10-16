// Test PAX Raw TCP Socket Protocol with STX/ETX/LRC and ACK
const net = require('net');

const client = new net.Socket();
let buffer = Buffer.alloc(0);

client.connect(10009, '192.168.1.3', () => {
  console.log('[PAX TEST] Connected to TCP Port 10009 on Sunmi IP (192.168.1.3)');

  const payload = {
    transType: '01',
    amount: '18000', // 180.00 EGP in minor units
    ecrRef: 'INV-261016-PAX-99',
  };

  const jsonStr = JSON.stringify(payload);
  const dataBuf = Buffer.from(jsonStr, 'utf8');

  // Compute LRC
  let lrc = 0x03;
  for (let i = 0; i < dataBuf.length; i++) {
    lrc ^= dataBuf[i];
  }

  const packet = Buffer.concat([
    Buffer.from([0x02]), // STX
    dataBuf,
    Buffer.from([0x03, lrc]), // ETX + LRC
  ]);

  client.write(packet);
  console.log('[PAX TEST] Sent STX/ETX packet for 180.00 EGP. Waiting for response...');
});

client.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  const etxIdx = buffer.indexOf(0x03);

  if (etxIdx !== -1 && buffer.length > etxIdx) {
    let stxIdx = buffer.indexOf(0x02);
    if (stxIdx === -1) stxIdx = 0;
    else stxIdx += 1;

    const msgBuf = buffer.subarray(stxIdx, etxIdx);
    const rawMsg = msgBuf.toString('utf8');

    console.log('[PAX TEST] Received Response Frame from Terminal:');
    console.log(rawMsg);

    // Send ACK (0x06) back
    client.write(Buffer.from([0x06]));
    console.log('[PAX TEST] Sent ACK (0x06) to terminal. Clean exit.');
    client.end();
  }
});

client.on('error', (err) => {
  console.error('[PAX TEST] Socket Error:', err.message);
});
