/**
 * Caller ID Hardware & Event Service for Z-Systems POS
 * 
 * Supports:
 * 1. Web Serial API direct hardware connection (USB Caller ID devices: AD101, AD102, Artech, etc.)
 * 2. Window Event Bridge for Electron / Local PBX / VoIP Webhooks
 * 3. Testing & Simulation mode for cashiers and QA
 * 
 * Invariants: Zero emojis, RTL compliant, strict clean enterprise logic.
 */

export interface CallerIdCallEvent {
  id: string;
  phone: string;
  callerName?: string;
  line?: string;
  timestamp: Date;
  raw?: string;
}

export type CallerIdListener = (event: CallerIdCallEvent) => void;

class CallerIdService {
  private listeners = new Set<CallerIdListener>();
  private activePort: any = null;
  private reader: any = null;
  private isReading = false;
  private buffer = '';
  private recentCalls: CallerIdCallEvent[] = [];

  constructor() {
    this.loadRecentCalls();
    if (typeof window !== 'undefined') {
      window.addEventListener('zs:caller-id-incoming', (event: any) => {
        if (event.detail && event.detail.phone) {
          this.notifyListeners({
            id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            phone: String(event.detail.phone).trim(),
            callerName: event.detail.name || event.detail.callerName,
            line: event.detail.line || 'Line 1',
            timestamp: new Date(),
            raw: event.detail.raw,
          });
        }
      });
    }
  }

  private loadRecentCalls() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem('zs_pos_recent_calls');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.recentCalls = parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }));
        }
      }
    } catch {}
  }

  private saveRecentCalls() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('zs_pos_recent_calls', JSON.stringify(this.recentCalls.slice(0, 30)));
      }
    } catch {}
  }

  getRecentCalls(): CallerIdCallEvent[] {
    return [...this.recentCalls];
  }

  clearRecentCalls() {
    this.recentCalls = [];
    this.saveRecentCalls();
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  isConnected(): boolean {
    return Boolean(this.activePort);
  }

  subscribe(listener: CallerIdListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyListeners(event: CallerIdCallEvent) {
    // Add to call history
    this.recentCalls.unshift(event);
    if (this.recentCalls.length > 30) {
      this.recentCalls.pop();
    }
    this.saveRecentCalls();

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Caller ID listener error:', err);
      }
    }
  }

  /**
   * Connects to a USB/Serial Caller ID device via browser Web Serial API
   */
  async requestDeviceConnection(baudRate = 9600): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'المتصفح الحالي لا يدعم الاتصال المباشر بمنافذ Serial. يرجى استخدام متصفح Chrome أو Edge.' };
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      this.activePort = port;
      this.startReading(port);
      return { success: true };
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        return { success: false, error: 'لم يتم تحديد جهاز.' };
      }
      return { success: false, error: err?.message || 'تعذر الاتصال بجهاز كاشف الرقم.' };
    }
  }

  /**
   * Attempts auto-connect if user previously granted permission
   */
  async tryAutoConnect(): Promise<boolean> {
    if (!this.isSupported() || this.activePort) return false;
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        const port = ports[0];
        await port.open({ baudRate: 9600 });
        this.activePort = port;
        this.startReading(port);
        return true;
      }
    } catch {
      // Ignored during auto-connect
    }
    return false;
  }

  async disconnect() {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      this.reader = null;
    }
    if (this.activePort) {
      try {
        await this.activePort.close();
      } catch {}
      this.activePort = null;
    }
  }

  private async startReading(port: any) {
    if (this.isReading) return;
    this.isReading = true;

    try {
      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.handleIncomingChunk(value);
        }
      }
    } catch (err) {
      console.warn('Caller ID stream ended or error occurred:', err);
    } finally {
      this.isReading = false;
    }
  }

  private handleIncomingChunk(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      this.parseLine(trimmed);
    }
  }

  /**
   * Standard FSK / DTMF / USB CID parser
   * Supported formats:
   * - NMBR = 01001234567
   * - CALLER: 01001234567
   * - CID:01001234567
   * - 01001234567 (pure digits >= 7 chars)
   */
  private parseLine(line: string) {
    let extractedPhone = '';
    let extractedName = '';

    const nmbrMatch = line.match(/(?:NMBR|NUMBER|CALLER|PHONE|CID|TEL)\s*[:=]\s*([+\d\s\-()]+)/i);
    if (nmbrMatch && nmbrMatch[1]) {
      extractedPhone = nmbrMatch[1].replace(/\D/g, '');
    } else {
      const cleanDigits = line.replace(/\D/g, '');
      if (cleanDigits.length >= 7 && cleanDigits.length <= 15) {
        extractedPhone = cleanDigits;
      }
    }

    const nameMatch = line.match(/(?:NAME|NME)\s*[:=]\s*([^,\r\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }

    if (extractedPhone && extractedPhone.length >= 4) {
      this.notifyListeners({
        id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        phone: extractedPhone,
        callerName: extractedName || undefined,
        line: 'Line 1',
        timestamp: new Date(),
        raw: line,
      });
    }
  }

  /**
   * Simulates an incoming call event (useful for test & demo)
   */
  simulateCall(phone: string, callerName?: string) {
    this.notifyListeners({
      id: `sim-${Date.now()}`,
      phone: phone.trim(),
      callerName: callerName?.trim(),
      line: 'Line 1 (محاكاة)',
      timestamp: new Date(),
      raw: `SIMULATED CALL FROM ${phone}`,
    });
  }
}

export const callerIdService = new CallerIdService();
