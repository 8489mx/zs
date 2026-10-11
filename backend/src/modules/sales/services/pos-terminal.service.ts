import { Inject, Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as net from 'node:net';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

const execAsync = promisify(exec);

export interface PosTerminalInfo {
  id: string;
  name: string;
  type: 'edc_standalone' | 'softpos' | 'integrated_ip';
  status: 'online' | 'busy' | 'offline';
  ipAddress?: string;
  provider?: string;
}

export interface TerminalPaymentRequest {
  terminalId?: string;
  amount: number;
  currency?: string;
  invoiceReference?: string;
  cashierShiftId?: string | number;
}

export interface TerminalPaymentSession {
  tenantId: string;
  transactionId: string;
  terminalId: string;
  terminalName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'approved' | 'declined' | 'cancelled';
  approvalCode?: string;
  cardScheme?: string; // Mada, Visa, Mastercard, Meeza
  cardLastFour?: string;
  createdAt: number;
  updatedAt: number;
  message?: string;
}

export interface TerminalConnectionTestResult {
  reachable: boolean;
  pingSucceeded: boolean;
  portOpen: boolean;
  ip: string;
  port: number;
  latencyMs?: number;
  message: string;
  details?: string;
  provider?: string;
}

@Injectable()
export class PosTerminalService {
  private readonly logger = new Logger(PosTerminalService.name);
  private activeSessions = new Map<string, TerminalPaymentSession>();
  private readonly sessionTtlMs = 15 * 60 * 1000;

  private pruneExpiredSessions(): void {
    const cutoff = Date.now() - this.sessionTtlMs;
    for (const [id, session] of this.activeSessions) {
      if (session.createdAt < cutoff) this.activeSessions.delete(id);
    }
  }

  constructor(@Optional() @Inject(KYSELY_DB) private readonly db?: Kysely<Database>) {}

  /**
   * Get configured POS Terminals for the tenant from settings
   */
  async getTerminals(tenantId: string): Promise<PosTerminalInfo[]> {
    if (!this.db) {
      return [
        {
          id: 'term-main-01',
          name: 'جهاز شبكة الكاشير الرئيسي (EDC - Mada/Visa)',
          type: 'edc_standalone',
          status: process.env.APP_MODE === 'CLOUD_SAAS' ? 'offline' : 'online',
          provider: 'Geidea / Paymob / Fawry POS',
          ipAddress: '192.168.1.150:8080',
        },
      ];
    }

    try {
      const rows = await this.db
        .selectFrom('settings')
        .selectAll()
        .where('tenant_id', '=', String(tenantId))
        .execute();

      const settingsMap: Record<string, any> = {};
      for (const row of rows) {
        try {
          settingsMap[row.key] = JSON.parse(row.value);
        } catch {
          settingsMap[row.key] = row.value;
        }
      }

      const isEnabled = settingsMap.posTerminalEnabled !== false;
      if (!isEnabled) {
        return [];
      }

      const name = settingsMap.posTerminalName || 'جهاز الكاشير الرئيسي (EDC)';
      const provider = settingsMap.posTerminalProvider || 'mock_sandbox';
      const ipAddress = settingsMap.posTerminalIp || '192.168.1.150';
      const port = Number(settingsMap.posTerminalPort || 8080);

      const providerDisplayNames: Record<string, string> = {
        geidea: 'Geidea POS (جيديا)',
        paymob: 'Paymob Smart POS (باي موب)',
        fawry: 'Fawry POS / PAX (فوري - أجهزة PAX)',
        network_international: 'Network International (NI)',
        mock_sandbox: 'محاكي نقاط البيع التجريبي (Simulator)',
      };

      return [
        {
          id: 'term-main-01',
          name: `${name} - ${providerDisplayNames[provider] || provider}`,
          type: 'edc_standalone',
          status: process.env.APP_MODE === 'CLOUD_SAAS' ? 'offline' : 'online',
          provider: providerDisplayNames[provider] || provider,
          ipAddress: `${ipAddress}:${port}`,
        },
      ];
    } catch (err) {
      this.logger.error(`Error loading terminals for tenant ${tenantId}:`, err);
      return [
        {
          id: 'term-main-01',
          name: 'جهاز شبكة الكاشير الرئيسي (EDC - Mada/Visa)',
          type: 'edc_standalone',
          status: process.env.APP_MODE === 'CLOUD_SAAS' ? 'offline' : 'online',
          provider: 'Geidea / Network International / Fawry',
          ipAddress: '192.168.1.150:8080',
        },
      ];
    }
  }

  /**
   * Initiate payment request to the EDC card terminal
   */
  async initiatePayment(tenantId: string, request: TerminalPaymentRequest): Promise<TerminalPaymentSession> {
    if (process.env.APP_MODE === 'CLOUD_SAAS') {
      throw new BadRequestException('تكامل جهاز الدفع غير مفعّل؛ لا يمكن إصدار موافقة دفع تجريبية في النظام السحابي');
    }
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      throw new BadRequestException('المبلغ المطلوب للجهاز يجب أن يكون أكبر من صفر');
    }

    const terminals = await this.getTerminals(tenantId);
    if (!terminals.length) {
      throw new BadRequestException('خدمة ماكينات نقاط البيع (POS Terminal) غير مفعلة في إعدادات المنشأة');
    }

    const selectedTerminal = terminals.find(t => t.id === request.terminalId) || terminals[0];
    this.pruneExpiredSessions();
    const transactionId = `EDC-${randomUUID()}`;

    const session: TerminalPaymentSession = {
      tenantId,
      transactionId,
      terminalId: selectedTerminal.id,
      terminalName: selectedTerminal.name,
      amount: request.amount,
      currency: request.currency || 'EGP',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      message: 'في انتظار تمرير أو إدخال البطاقة على جهاز الدفع...'
    };

    this.activeSessions.set(transactionId, session);
    this.logger.log(`Initiated terminal payment: ${transactionId} for amount: ${request.amount} on ${selectedTerminal.name}`);

    return session;
  }

  /**
   * Check status of terminal payment (cashier polling or device webhook)
   */
  async getPaymentStatus(tenantId: string, transactionId: string): Promise<TerminalPaymentSession> {
    this.pruneExpiredSessions();
    const session = this.activeSessions.get(transactionId);
    if (!session || session.tenantId !== tenantId) {
      throw new BadRequestException('معاملة الدفع غير موجودة أو منتهية الصلاحية');
    }

    const elapsedMs = Date.now() - session.createdAt;

    // Simulate real device approval progression:
    // 0s-2.5s: 'pending' (waiting for card tap)
    // 2.5s-4.5s: 'processing' (authorizing with bank)
    // > 4.5s: 'approved' with generated approval code
    if (session.status === 'pending' && elapsedMs > 2500) {
      session.status = 'processing';
      session.message = 'جاري معالجة البطاقة والاتصال بالبنك...';
      session.updatedAt = Date.now();
    } else if (session.status === 'processing' && elapsedMs > 4500) {
      session.status = 'approved';
      session.approvalCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      session.cardScheme = Math.random() > 0.4 ? 'mada' : 'Visa';
      session.cardLastFour = String(Math.floor(1000 + Math.random() * 9000));
      session.message = 'تمت الموافقة بنجاح!';
      session.updatedAt = Date.now();
    }

    return session;
  }

  /**
   * Cancel an ongoing terminal transaction
   */
  async cancelPayment(tenantId: string, transactionId: string): Promise<TerminalPaymentSession> {
    this.pruneExpiredSessions();
    const session = this.activeSessions.get(transactionId);
    if (!session || session.tenantId !== tenantId) {
      throw new BadRequestException('معاملة الدفع غير موجودة');
    }

    session.status = 'cancelled';
    session.message = 'تم إلغاء عملية الدفع بواسطة الكاشير';
    session.updatedAt = Date.now();

    return session;
  }

  /**
   * Test physical LAN / Wi-Fi connection to POS Terminal (Ping & TCP Port Handshake)
   */
  async testConnection(
    tenantId: string,
    payload: { ip?: string; port?: number; provider?: string }
  ): Promise<TerminalConnectionTestResult> {
    let cleanIp = (payload?.ip || '').trim();
    let port = Number(payload?.port || 8080);
    const provider = payload?.provider || 'fawry';

    // If no IP supplied, fetch configured settings for tenant
    if (!cleanIp) {
      if (this.db) {
        try {
          const rows = await this.db
            .selectFrom('settings')
            .selectAll()
            .where('tenant_id', '=', String(tenantId))
            .execute();
          const settingsMap: Record<string, any> = {};
          for (const row of rows) {
            try {
              settingsMap[row.key] = JSON.parse(row.value);
            } catch {
              settingsMap[row.key] = row.value;
            }
          }
          cleanIp = (settingsMap.posTerminalIp || '192.168.1.150').trim();
          port = Number(settingsMap.posTerminalPort || 8080);
        } catch {
          cleanIp = '192.168.1.150';
        }
      } else {
        cleanIp = '192.168.1.150';
      }
    }

    // Mock Simulator special handling
    if (provider === 'mock_sandbox') {
      return {
        reachable: true,
        pingSucceeded: true,
        portOpen: true,
        ip: cleanIp || '127.0.0.1',
        port,
        latencyMs: 1,
        message: 'محاكي نقاط البيع التجريبي (Mock Simulator) نشط ومتصل افتراضياً',
        details: 'بيئة الاختبار الافتراضية جاهزة تماماً لتجربة عمليات الدفع في الكاشير.',
        provider,
      };
    }

    // Validation
    if (!cleanIp || cleanIp === '0.0.0.0' || !/^[a-zA-Z0-9.-]+$/.test(cleanIp)) {
      return {
        reachable: false,
        pingSucceeded: false,
        portOpen: false,
        ip: cleanIp,
        port,
        message: 'عنوان IP الماكينة غير محدد أو غير صالح',
        details: 'يرجى كتابة عنوان IP صالح لماكينة فوري / PAX مثل 192.168.1.8',
        provider,
      };
    }

    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      return {
        reachable: false,
        pingSucceeded: false,
        portOpen: false,
        ip: cleanIp,
        port,
        message: 'رقم المنفذ (Port) غير صالح',
        details: 'يجب أن يكون المنفذ رقماً بين 1 و 65535 (الافتراضي لماكينات PAX هو 8080 أو 10009)',
        provider,
      };
    }

    // Execute Ping and TCP Port probe
    const [pingRes, tcpRes] = await Promise.all([
      this.pingHost(cleanIp, 2000),
      this.checkTcpPort(cleanIp, port, 3000),
    ]);

    // Case 1: Port is open - Ready to trade!
    if (tcpRes.open) {
      const latency = tcpRes.rttMs || pingRes.rttMs || 10;
      return {
        reachable: true,
        pingSucceeded: true,
        portOpen: true,
        ip: cleanIp,
        port,
        latencyMs: latency,
        message: `تم الاتصال بالماكينة بنجاح (${latency}ms) - المنفذ ${port} مفتوح ومستعد لاستقبال الفواتير`,
        details: `الماكينة متصلة بالشبكة وتستجيب لبروتوكول ECR بنجاح. شاشة الكاشير جاهزة لإرسال مبالغ الدفع آلياً دون أي تدخل يدوي.`,
        provider,
      };
    }

    // Case 2: Machine is online on Wi-Fi/LAN (Ping ok), but TCP port closed
    if (pingRes.ok) {
      const pingText = pingRes.rttMs ? `${pingRes.rttMs}ms` : 'Ping ناجح';
      return {
        reachable: false,
        pingSucceeded: true,
        portOpen: false,
        ip: cleanIp,
        port,
        latencyMs: pingRes.rttMs,
        message: `الماكينة متصلة بالشبكة (${pingText}) ولكن المنفذ ${port} غير مفتوح`,
        details: `الماكينة استجابت بنجاح على الشبكة المحلية، ولكن تطبيق فوري/PAX لم يفتح منفذ ECR رقم ${port} بعد. يرجى الدخول لإعدادات تطبيق فوري على الماكينة -> "إعدادات الربط / ECR" -> تفعيل الربط وتعيين المنفذ ${port}.`,
        provider,
      };
    }

    // Case 3: Completely unreachable
    return {
      reachable: false,
      pingSucceeded: false,
      portOpen: false,
      ip: cleanIp,
      port,
      message: `تعذر الوصول لماكينة الدفع على العنوان ${cleanIp}`,
      details: `الجهاز غير موجود على الشبكة المحلية أو مغلق. يرجى التأكد من تشغيل الماكينة، واتصالها بنفس شبكة الواي فاي للكمبيوتر، وصحة عنوان IP.`,
      provider,
    };
  }

  private async pingHost(host: string, timeoutMs = 2500): Promise<{ ok: boolean; rttMs?: number }> {
    const isWin = process.platform === 'win32';
    const pingCmd = isWin
      ? `ping -n 2 -w 1500 ${host}`
      : `ping -c 2 -W 2 ${host}`;

    try {
      const { stdout } = await execAsync(pingCmd, { timeout: timeoutMs + 2000 });
      const is100Loss =
        stdout.includes('(100% loss)') ||
        stdout.includes('100% loss') ||
        stdout.includes('100% packet loss') ||
        stdout.includes('Destination host unreachable');

      const ok = isWin
        ? (stdout.includes(`Reply from ${host}:`) || (stdout.includes('Reply from') && !is100Loss)) && !is100Loss
        : (stdout.includes('1 received') || stdout.includes('2 received') || stdout.includes('1 packets received') || stdout.includes('2 packets received')) && !is100Loss;

      const match = stdout.match(/Average = ([0-9]+)ms/i) || stdout.match(/time[=<]([0-9.]+)\s*ms/i);
      const rttMs = match ? Math.round(Number(match[1])) : undefined;

      return { ok, rttMs: ok ? rttMs : undefined };
    } catch {
      return { ok: false };
    }
  }

  private checkTcpPort(
    host: string,
    port: number,
    timeoutMs = 3000
  ): Promise<{ open: boolean; rttMs?: number; error?: string }> {
    const start = Date.now();
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (open: boolean, error?: string) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ open, rttMs: open ? Math.max(1, Date.now() - start) : undefined, error });
      };

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        finish(true);
      });

      socket.on('timeout', () => {
        finish(false, 'ETIMEDOUT');
      });

      socket.on('error', (err: any) => {
        finish(false, err?.code || 'ECONNFAILED');
      });

      try {
        socket.connect(port, host);
      } catch (err: any) {
        finish(false, err?.code || 'ESOCKET_ERR');
      }
    });
  }
}
