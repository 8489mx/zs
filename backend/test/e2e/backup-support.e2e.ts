import assert from 'node:assert/strict';
import { loginClient } from './e2e-utils';

async function main() {
  const client = await loginClient();

  const headers = new Headers();
  const cookieStr = (client as any).cookieHeader();
  if (cookieStr) headers.set('Cookie', cookieStr);

  // 1. Export Backup (ZIP)
  const backupRes = await fetch(`${(client as any).baseUrl}/api/backup`, { headers });
  assert.equal(backupRes.status, 200, 'Backup export should return 200 OK');
  const backupBlob = await backupRes.blob();
  assert.ok(backupBlob.size > 100, 'Backup ZIP should be larger than 100 bytes');
  console.log(`Backup generated successfully: ${backupBlob.size} bytes`);

  // 2. Verify Backup
  const verifyData = new FormData();
  verifyData.append('file', backupBlob, 'backup.zip');
  const csrfToken = (client as any).cookies.get('zs_cloud_csrf_token');
  if (csrfToken) headers.set('x-csrf-token', csrfToken);

  const verifyRes = await fetch(`${(client as any).baseUrl}/api/backup/verify`, {
    method: 'POST',
    headers, // NOTE: Do NOT set Content-Type, fetch will set it with the boundary automatically
    body: verifyData as any,
  });
  assert.equal(verifyRes.status, 201, 'Backup verify should return 201 OK');
  const verifyJson = await verifyRes.json();
  assert.equal(verifyJson.ok, true, 'Backup should be valid');
  assert.ok(verifyJson.manifest, 'Backup verify should return a manifest');
  console.log(`Backup verified successfully for version: ${verifyJson.manifest.appVersion}`);

  // 3. Download Support Bundle
  const supportRes = await fetch(`${(client as any).baseUrl}/api/support-bundle/download`, { headers });
  assert.equal(supportRes.status, 200, 'Support bundle should return 200 OK');
  const supportBlob = await supportRes.blob();
  assert.ok(supportBlob.size > 100, 'Support bundle ZIP should be larger than 100 bytes');
  console.log(`Support bundle downloaded successfully: ${supportBlob.size} bytes`);

  console.log('backup-support.e2e: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
