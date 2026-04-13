import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';

function safeExec(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function readWindowsMachineGuid(): string {
  const output = safeExec('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']);
  const line = output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => /^MachineGuid\s+/i.test(entry));
  return line ? line.split(/\s+/).pop() || '' : '';
}

function readWindowsCsProductUuid(): string {
  const ps = safeExec('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_ComputerSystemProduct).UUID']);
  if (ps) return ps.split(/\r?\n/).map((x) => x.trim()).find(Boolean) || '';
  const wmic = safeExec('wmic', ['csproduct', 'get', 'uuid']);
  return wmic.split(/\r?\n/).map((x) => x.trim()).find((x) => x && x.toLowerCase() !== 'uuid') || '';
}

function readWindowsBiosSerial(): string {
  const ps = safeExec('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_BIOS).SerialNumber']);
  if (ps) return ps.split(/\r?\n/).map((x) => x.trim()).find(Boolean) || '';
  const wmic = safeExec('wmic', ['bios', 'get', 'serialnumber']);
  return wmic.split(/\r?\n/).map((x) => x.trim()).find((x) => x && x.toLowerCase() !== 'serialnumber') || '';
}

function readLinuxFile(path: string): string {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8').trim() : '';
  } catch {
    return '';
  }
}

function collectParts(): string[] {
  const platform = os.platform();
  const parts: string[] = [platform, os.arch()];

  if (platform === 'win32') {
    parts.push(readWindowsMachineGuid(), readWindowsCsProductUuid(), readWindowsBiosSerial());
  } else if (platform === 'linux') {
    parts.push(
      readLinuxFile('/etc/machine-id'),
      readLinuxFile('/sys/class/dmi/id/product_uuid'),
      readLinuxFile('/sys/class/dmi/id/board_serial'),
    );
  } else {
    parts.push(os.hostname());
  }

  return parts.filter(Boolean);
}

export function getMachineFingerprint() {
  const rawParts = collectParts();
  const raw = rawParts.join('|');
  const digest = createHash('sha256').update(raw).digest('hex').toUpperCase();
  const short = digest.slice(0, 24).match(/.{1,4}/g)?.join('-') || digest.slice(0, 24);
  return { machineId: short, fingerprintHash: digest, rawParts };
}
