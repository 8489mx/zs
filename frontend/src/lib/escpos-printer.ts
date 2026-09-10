/**
 * ESC/POS Direct Hardware Printer - WebUSB/WebSerial Bridge
 * Enables silent raw printing to thermal receipt printers without browser print dialog
 */

const ESC = 0x1b;
const GS = 0x1d;

export const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),
  LF: new Uint8Array([0x0a]),
  FEED_CUT: new Uint8Array([GS, 0x56, 0x41, 0x10]),
  OPEN_DRAWER: new Uint8Array([ESC, 0x70, 0x00, 0x3c, 0x78]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_SIZE_ON: new Uint8Array([GS, 0x21, 0x11]),
  DOUBLE_SIZE_OFF: new Uint8Array([GS, 0x21, 0x00]),
};

export type EscPosPrinterConnectionType = 'webusb' | 'webserial' | 'none';

export interface EscPosPrinterConfig {
  connectionType: EscPosPrinterConnectionType;
  usbVendorId?: number;
  usbProductId?: number;
  serialBaudRate?: number;
}

export interface PrintJobResult {
  success: boolean;
  method: EscPosPrinterConnectionType;
  message: string;
}

async function printViaWebUsb(chunks: Uint8Array[], vendorId?: number, productId?: number): Promise<void> {
  if (!('usb' in navigator)) throw new Error('WebUSB not supported');
  const filters = vendorId ? [{ vendorId, productId }] : [];
  const device: any = await (navigator as any).usb.requestDevice({ filters });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration!.interfaces[0];
  await device.claimInterface(iface.interfaceNumber);
  const endpoint = iface.alternate.endpoints.find((ep: any) => ep.direction === 'out' && ep.type === 'bulk');
  if (!endpoint) { await device.close(); throw new Error('No Bulk OUT endpoint found'); }
  for (const chunk of chunks) await device.transferOut((endpoint as any).endpointNumber, chunk);
  await device.close();
}

async function printViaWebSerial(chunks: Uint8Array[], baudRate = 9600): Promise<void> {
  if (!('serial' in navigator)) throw new Error('Web Serial API not supported');
  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate });
  const writer = port.writable.getWriter();
  for (const chunk of chunks) await writer.write(chunk);
  await writer.close();
  await port.close();
}

function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function buildReceiptBytes(lines: Array<{
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  doubleSize?: boolean;
}>): Uint8Array {
  const parts: Uint8Array[] = [CMD.INIT];
  for (const line of lines) {
    parts.push(line.align === 'center' ? CMD.ALIGN_CENTER : line.align === 'left' ? CMD.ALIGN_LEFT : CMD.ALIGN_RIGHT);
    if (line.bold) parts.push(CMD.BOLD_ON);
    if (line.doubleSize) parts.push(CMD.DOUBLE_SIZE_ON);
    parts.push(encodeText(line.text));
    parts.push(CMD.LF);
    if (line.doubleSize) parts.push(CMD.DOUBLE_SIZE_OFF);
    if (line.bold) parts.push(CMD.BOLD_OFF);
  }
  parts.push(new Uint8Array([0x0a, 0x0a, 0x0a]));
  parts.push(CMD.FEED_CUT);
  const total = parts.reduce((a, p) => a + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}

export async function printRaw(data: Uint8Array, config: EscPosPrinterConfig): Promise<PrintJobResult> {
  if (config.connectionType === 'webusb') {
    await printViaWebUsb([data], config.usbVendorId, config.usbProductId);
    return { success: true, method: 'webusb', message: 'تمت الطباعة عبر WebUSB' };
  }
  if (config.connectionType === 'webserial') {
    await printViaWebSerial([data], config.serialBaudRate);
    return { success: true, method: 'webserial', message: 'تمت الطباعة عبر Web Serial' };
  }
  throw new Error('نوع الاتصال غير محدد');
}

export async function openCashDrawer(config: EscPosPrinterConfig): Promise<PrintJobResult> {
  const parts = [CMD.INIT, CMD.OPEN_DRAWER];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const data = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { data.set(p, offset); offset += p.length; }
  return printRaw(data, config);
}

export function getHardwarePrintSupport(): { webusb: boolean; webserial: boolean; recommended: EscPosPrinterConnectionType } {
  const webusb = 'usb' in navigator;
  const webserial = 'serial' in navigator;
  return { webusb, webserial, recommended: webusb ? 'webusb' : webserial ? 'webserial' : 'none' };
}
