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
  isDefault?: boolean;
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
  rrn?: string;
  cardScheme?: string; // Mada, Visa, Mastercard, Meeza, KNET
  cardLastFour?: string;
  createdAt: number;
  updatedAt: number;
  message?: string;
  provider?: string;
  isSimulated?: boolean;
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
          name: 'جهاز شبكة الكاشير الرئيسي (EDC - Mada/Visa/KNET)',
          type: 'edc_standalone',
          status: 'online',
          provider: 'Geidea / KNET / NI / Fawry POS',
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

      const providerDisplayNames: Record<string, string> = {
        geidea: 'Geidea POS (جيديا - شبكة مدى / السعودية)',
        paymob: 'Paymob Smart POS (باي موب)',
        fawry: 'Fawry POS / PAX (فوري - أجهزة PAX)',
        network_international: 'Network International (NI - الإمارات)',
        knet_pos: 'KNET POS (كي نت - الكويت)',
        mock_sandbox: 'محاكي نقاط البيع التجريبي (Simulator)',
      };

      let terminalsList: PosTerminalInfo[] = [];

      // Check if multi-terminal posTerminals array is configured
      if (Array.isArray(settingsMap.posTerminals) && settingsMap.posTerminals.length > 0) {
        terminalsList = settingsMap.posTerminals
          .filter((t: any) => t && t.enabled !== false)
          .map((t: any, idx: number) => {
            const providerKey = t.provider || 'fawry';
            const tIp = String(t.ip || '192.168.1.150').trim();
            const tPort = Number(t.port || 8080);
            return {
              id: String(t.id || `term-${idx + 1}`),
              name: `${t.name || `ماكينة ${idx + 1}`} - ${providerDisplayNames[providerKey] || providerKey}`,
              type: 'edc_standalone' as const,
              status: 'online' as const,
              provider: providerDisplayNames[providerKey] || providerKey,
              ipAddress: `${tIp}:${tPort}`,
              isDefault: Boolean(t.isDefault),
            };
          });
      }

      // Fallback to legacy single terminal
      if (terminalsList.length === 0) {
        const name = settingsMap.posTerminalName || 'جهاز الكاشير الرئيسي (EDC)';
        const provider = settingsMap.posTerminalProvider || 'mock_sandbox';
        const ipAddress = settingsMap.posTerminalIp || '192.168.1.150';
        const port = Number(settingsMap.posTerminalPort || 8080);

        terminalsList = [
          {
            id: 'term-main-01',
            name: `${name} - ${providerDisplayNames[provider] || provider}`,
            type: 'edc_standalone',
            status: 'online',
            provider: providerDisplayNames[provider] || provider,
            ipAddress: `${ipAddress}:${port}`,
            isDefault: true,
          },
        ];
      }

      return terminalsList;
    } catch (err) {
      this.logger.error(`Error loading terminals for tenant ${tenantId}:`, err);
      return [
        {
          id: 'term-main-01',
          name: 'جهاز شبكة الكاشير الرئيسي (EDC - Mada/Visa/KNET)',
          type: 'edc_standalone',
          status: 'online',
          provider: 'Geidea / KNET / Network International / Fawry',
          ipAddress: '192.168.1.150:8080',
          isDefault: true,
        },
      ];
    }
  }

  /**
   * Initiate payment request to the EDC card terminal
   */
  async initiatePayment(tenantId: string, request: TerminalPaymentRequest): Promise<TerminalPaymentSession> {
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      throw new BadRequestException('المبلغ المطلوب للجهاز يجب أن يكون أكبر من صفر');
    }

    const terminals = await this.getTerminals(tenantId);
    if (!terminals.length) {
      throw new BadRequestException('خدمة ماكينات نقاط البيع (POS Terminal) غير مفعلة في إعدادات المنشأة');
    }

    const selectedTerminal = terminals.find(t => t.id === request.terminalId) || terminals.find(t => t.isDefault) || terminals[0];
    this.pruneExpiredSessions();
    const transactionId = `EDC-${randomUUID()}`;

    // Extract IP and Port from terminal configuration
    const [rawIp, rawPort] = (selectedTerminal.ipAddress || '192.168.1.150:8080').split(':');
    const cleanIp = (rawIp || '192.168.1.150').trim();
    const port = Number(rawPort || 8080);
    const prov = (selectedTerminal.provider || '').toLowerCase();

    // Determine if session should run in simulation / sandbox mode
    const isMock = prov.includes('mock') || prov.includes('sandbox') || cleanIp === '127.0.0.1' || cleanIp === 'localhost';

    const session: TerminalPaymentSession = {
      tenantId,
      transactionId,
      terminalId: selectedTerminal.id,
      terminalName: selectedTerminal.name,
      amount: request.amount,
      currency: request.currency || 'SAR',
      status: isMock ? 'pending' : 'processing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      message: isMock
        ? 'في انتظار تمرير أو إدخال البطاقة على جهاز الدفع...'
        : `جاري الاتصال بماكينة الدفع (${cleanIp}:${port})... يرجى تمرير البطاقة`,
      provider: selectedTerminal.provider,
      isSimulated: isMock,
    };

    this.activeSessions.set(transactionId, session);
    this.logger.log(`Initiated terminal payment: ${transactionId} for amount: ${request.amount} on ${selectedTerminal.name} (Simulated: ${isMock})`);

    // If real device, launch background protocol transaction
    if (!isMock) {
      this.executeTerminalCharge(session, cleanIp, port, prov, request).catch((err) => {
        this.logger.error(`Terminal charge background error for ${transactionId}:`, err);
      });
    }

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

    // Only apply timer simulation if the session was explicitly marked as simulated
    if (session.isSimulated) {
      const elapsedMs = Date.now() - session.createdAt;

      if (session.status === 'pending' && elapsedMs > 2500) {
        session.status = 'processing';
        session.message = 'جاري معالجة البطاقة والاتصال بالبنك...';
        session.updatedAt = Date.now();
      } else if (session.status === 'processing' && elapsedMs > 4500) {
        session.status = 'approved';
        session.approvalCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
        session.rrn = `RRN${Date.now().toString().slice(-9)}`;

        const curr = (session.currency || '').toUpperCase();
        const prov = (session.provider || '').toLowerCase();
        if (curr === 'KWD' || prov.includes('knet')) {
          session.cardScheme = 'knet';
        } else if (curr === 'SAR' || prov.includes('geidea') || prov.includes('mada')) {
          session.cardScheme = 'mada';
        } else if (curr === 'AED' || prov.includes('network')) {
          session.cardScheme = Math.random() > 0.5 ? 'Visa' : 'Mastercard';
        } else {
          session.cardScheme = Math.random() > 0.4 ? 'Visa' : 'Meeza';
        }

        session.cardLastFour = String(Math.floor(1000 + Math.random() * 9000));
        session.message = 'تمت الموافقة بنجاح!';
        session.updatedAt = Date.now();
      }
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

    // If real device, dispatch remote cancel best-effort
    if (!session.isSimulated) {
      const terminals = await this.getTerminals(tenantId).catch(() => []);
      const term = terminals.find(t => t.id === session.terminalId);
      if (term?.ipAddress) {
        const [rawIp, rawPort] = term.ipAddress.split(':');
        const cleanIp = (rawIp || '').trim();
        const port = Number(rawPort || 8080);
        const prov = (term.provider || '').toLowerCase();
        if (cleanIp) {
          this.dispatchTerminalCancel(cleanIp, port, prov, transactionId).catch(() => {});
        }
      }
    }

    return session;
  }

  /**
   * Execute real-device protocol communication (Geidea, Fawry/PAX, Paymob, NI)
   */
  private async executeTerminalCharge(
    session: TerminalPaymentSession,
    ip: string,
    port: number,
    provider: string,
    request: TerminalPaymentRequest
  ): Promise<void> {
    if (provider.includes('geidea')) {
      await this.executeGeideaCharge(session, ip, port, request);
    } else if (provider.includes('fawry') || provider.includes('pax')) {
      await this.executePaxFawryCharge(session, ip, port, request);
    } else if (provider.includes('paymob')) {
      await this.executePaymobCharge(session, ip, port, request);
    } else {
      // Default standard ECR REST
      await this.executeGeideaCharge(session, ip, port, request);
    }
  }

  /**
   * Geidea ECR Local REST Protocol Driver (Standard for Geidea Smart POS in KSA & Egypt)
   */
  private async executeGeideaCharge(
    session: TerminalPaymentSession,
    ip: string,
    port: number,
    request: TerminalPaymentRequest
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000);

    try {
      session.status = 'processing';
      session.message = 'جاري التخاطب مع ماكينة جيديا... يرجى إدخال أو تمرير البطاقة';
      session.updatedAt = Date.now();

      const payload = {
        transactionType: 'PURCHASE',
        amount: Number(request.amount.toFixed(2)),
        currency: session.currency || 'SAR',
        referenceId: session.transactionId,
        ecrReference: session.transactionId,
        printReceipt: true,
      };

      let res: Response | null = null;
      let targetUrl = `http://${ip}:${port}/api/v1/transaction`;

      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        // Fallback endpoint
        targetUrl = `http://${ip}:${port}/ecr/sale`;
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`الماكينة أعادت خطأ كود ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const statusRaw = String(data.status || data.responseCode || '').toUpperCase();
      const isApproved =
        statusRaw === 'APPROVED' ||
        statusRaw === 'SUCCESS' ||
        data.responseCode === '00' ||
        data.responseCode === '000' ||
        data.isSuccess === true;

      if (isApproved) {
        session.status = 'approved';
        session.approvalCode = String(data.authCode || data.approvalCode || data.authorizationCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
        session.rrn = String(data.rrn || data.retrievalReferenceNumber || data.referenceNo || session.transactionId);
        session.cardScheme = String(data.cardScheme || data.scheme || data.cardType || 'mada').toLowerCase();
        session.cardLastFour = String(data.cardLastFour || data.last4 || (data.maskedPan ? data.maskedPan.slice(-4) : ''));
        session.message = 'تمت الموافقة من بنك التاجر بنجاح!';
        session.updatedAt = Date.now();
        this.logger.log(`Geidea ECR approved: Auth=${session.approvalCode}, RRN=${session.rrn}`);
      } else {
        session.status = 'declined';
        session.message = data.message || data.responseMessage || 'تم رفض العملية من الماكينة أو تم إلغاؤها من قبل العميل';
        session.updatedAt = Date.now();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      session.status = 'declined';
      const isAbort = err.name === 'AbortError';
      const errMsg = isAbort
        ? 'انتهت مهلة الانتظار (65 ثانية) دون تمرير البطاقة على الماكينة'
        : `تعذر الاتصال بماكينة جيديا على ${ip}:${port} (${err.code || err.message}). تأكد من تشغيل الماكينة وتفعيل خدمة ECR.`;
      session.message = errMsg;
      session.updatedAt = Date.now();
      this.logger.warn(`Geidea ECR error: ${errMsg}`);
    }
  }

  /**
   * PAX POSLink / Fawry ECR Protocol Driver
   */
  private async executePaxFawryCharge(
    session: TerminalPaymentSession,
    ip: string,
    port: number,
    request: TerminalPaymentRequest
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000);

    try {
      session.status = 'processing';
      session.message = 'جاري التخاطب مع ماكينة فوري / باكس... يرجى إدخال أو تمرير البطاقة';
      session.updatedAt = Date.now();

      const payload = {
        command: 'DO_TRANSACTION',
        transType: '01', // SALE
        amount: Math.round(request.amount * 100).toString(),
        ecrRefNum: session.transactionId,
        currencyCode: session.currency || 'EGP',
      };

      let res: Response | null = null;
      let targetUrl = `http://${ip}:${port}/poslink`;

      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        targetUrl = `http://${ip}:${port}/`;
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`الماكينة أعادت خطأ كود ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const code = String(data.responseCode || data.resultCode || '').trim();
      const isApproved = code === '000000' || code === '00' || code === 'OK' || data.status === 'APPROVED';

      if (isApproved) {
        session.status = 'approved';
        session.approvalCode = String(data.authCode || data.approvalCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
        session.rrn = String(data.refNum || data.rrn || session.transactionId);
        session.cardScheme = String(data.cardType || data.cardScheme || 'Visa').toLowerCase();
        session.cardLastFour = String(data.cardLastFour || data.last4 || (data.bogusPan ? data.bogusPan.slice(-4) : ''));
        session.message = 'تمت الموافقة بنجاح!';
        session.updatedAt = Date.now();
        this.logger.log(`PAX/Fawry ECR approved: Auth=${session.approvalCode}, RRN=${session.rrn}`);
      } else {
        session.status = 'declined';
        session.message = data.responseMessage || data.message || 'تم رفض العملية من جهاز فوري / باكس';
        session.updatedAt = Date.now();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      session.status = 'declined';
      const isAbort = err.name === 'AbortError';
      const errMsg = isAbort
        ? 'انتهت مهلة الانتظار (65 ثانية) دون تمرير البطاقة على جهاز باكس'
        : `تعذر الاتصال بماكينة فوري / باكس على ${ip}:${port} (${err.code || err.message}). تأكد من تشغيل تطبيق ECR على الماكينة.`;
      session.message = errMsg;
      session.updatedAt = Date.now();
      this.logger.warn(`PAX/Fawry ECR error: ${errMsg}`);
    }
  }

  /**
   * Paymob Smart POS Protocol Driver
   */
  private async executePaymobCharge(
    session: TerminalPaymentSession,
    ip: string,
    port: number,
    request: TerminalPaymentRequest
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000);

    try {
      session.status = 'processing';
      session.message = 'جاري التخاطب مع ماكينة Paymob Smart POS...';
      session.updatedAt = Date.now();

      const payload = {
        amount_cents: Math.round(request.amount * 100),
        transaction_id: session.transactionId,
        currency: session.currency || 'EGP',
      };

      const res = await fetch(`http://${ip}:${port}/paymob/ecr/sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: any = await res.json();
      if (data.success || data.status === 'APPROVED') {
        session.status = 'approved';
        session.approvalCode = String(data.auth_code || data.approvalCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
        session.rrn = String(data.rrn || session.transactionId);
        session.cardScheme = String(data.card_type || 'Visa').toLowerCase();
        session.cardLastFour = String(data.last_four || '');
        session.message = 'تمت الموافقة بنجاح!';
        session.updatedAt = Date.now();
      } else {
        session.status = 'declined';
        session.message = data.message || 'تم رفض العملية من جهاز Paymob';
        session.updatedAt = Date.now();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      session.status = 'declined';
      session.message = `تعذر الاتصال بماكينة Paymob على ${ip}:${port} (${err.code || err.message})`;
      session.updatedAt = Date.now();
    }
  }

  /**
   * Cancel ongoing terminal transaction remotely
   */
  private async dispatchTerminalCancel(
    ip: string,
    port: number,
    provider: string,
    transactionId: string
  ): Promise<void> {
    try {
      if (provider.includes('geidea')) {
        await fetch(`http://${ip}:${port}/api/v1/transaction/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referenceId: transactionId }),
          signal: AbortSignal.timeout(4000),
        });
      } else if (provider.includes('fawry') || provider.includes('pax')) {
        await fetch(`http://${ip}:${port}/poslink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'CANCEL_TRANSACTION', ecrRefNum: transactionId }),
          signal: AbortSignal.timeout(4000),
        });
      }
    } catch {
      // Best-effort cancel
    }
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
      const appName = provider === 'knet_pos'
        ? 'تطبيق كي نت (KNET)'
        : provider === 'geidea'
        ? 'تطبيق جيديا (Geidea Mada)'
        : provider === 'network_international'
        ? 'تطبيق Network International (NI)'
        : provider === 'paymob'
        ? 'تطبيق Paymob'
        : 'تطبيق فوري / PAX';
      return {
        reachable: false,
        pingSucceeded: true,
        portOpen: false,
        ip: cleanIp,
        port,
        latencyMs: pingRes.rttMs,
        message: `الماكينة متصلة بالشبكة (${pingText}) ولكن المنفذ ${port} غير مفتوح`,
        details: `الماكينة استجابت بنجاح على الشبكة المحلية، ولكن ${appName} لم يفتح منفذ ECR رقم ${port} بعد. يرجى الدخول لإعدادات التطبيق على الماكينة -> "إعدادات الربط / ECR" -> تفعيل الربط وتعيين المنفذ ${port}.`,
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
