import { Inject, Injectable, Logger, BadRequestException, Optional, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import * as net from 'node:net';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

const execAsync = promisify(exec);

/**
 * One different bridge credential per tenant. Provision the derived credential to the
 * trusted Windows bridge; NEVER disclose the master secret to clients.
 */
export function derivePosBridgeKey(masterSecret: string, tenantId: string): string {
  if (masterSecret.length < 32 || !tenantId.trim()) throw new Error('POS bridge master secret/tenant not provisioned');
  return createHmac('sha256', masterSecret).update('zs-pos-bridge:v1:' + tenantId.trim()).digest('hex');
}

export interface PosTerminalInfo {
  id: string;
  name: string;
  type: 'edc_standalone' | 'softpos' | 'integrated_ip';
  status: 'online' | 'busy' | 'offline';
  ipAddress?: string;
  provider?: string;
  isDefault?: boolean;
  pairingKey?: string;
  terminalTid?: string;
}

export function isPrivateSubnetIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  if (clean === '127.0.0.1' || clean === 'localhost') return true;
  if (clean.startsWith('192.168.') || clean.startsWith('10.')) return true;
  const match172 = clean.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    return octet >= 16 && octet <= 31;
  }
  return false;
}

export function parseTerminalHostAndPort(rawHost: string, fallbackPort = 8080): { host: string; port: number; protocol: 'http' | 'https' } {
  if (!rawHost) return { host: '192.168.1.150', port: fallbackPort, protocol: 'http' };

  let clean = rawHost.trim();
  let protocol: 'http' | 'https' = 'http';

  if (clean.toLowerCase().startsWith('https://')) {
    protocol = 'https';
    clean = clean.slice(8);
  } else if (clean.toLowerCase().startsWith('http://')) {
    protocol = 'http';
    clean = clean.slice(7);
  }

  clean = clean.split('/')[0].trim();

  const colonIdx = clean.lastIndexOf(':');
  if (colonIdx !== -1) {
    const portPart = clean.slice(colonIdx + 1);
    const parsedPort = parseInt(portPart, 10);
    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
      const hostPart = clean.slice(0, colonIdx).trim();
      if (parsedPort === 443 || parsedPort === 8443) protocol = 'https';
      return { host: hostPart || '192.168.1.150', port: parsedPort, protocol };
    }
  }

  const finalPort = Number.isFinite(fallbackPort) && fallbackPort > 0 ? fallbackPort : 8080;
  if (finalPort === 443 || finalPort === 8443) protocol = 'https';
  return { host: clean || '192.168.1.150', port: finalPort, protocol };
}

export function translateBankResponseCode(rawCode?: string, fallbackMessage?: string): string {
  if (!rawCode) return fallbackMessage || 'تم رفض العملية من البنك أو تم إلغاؤها';
  const clean = String(rawCode).trim().toUpperCase();

  const codeMap: Record<string, string> = {
    '00': 'تمت الموافقة بنجاح',
    '000': 'تمت الموافقة بنجاح',
    '000000': 'تمت الموافقة بنجاح',
    '01': 'يرجى مراجعة البنك المصدر للبطاقة',
    '04': 'يرجى حجز البطاقة (بطاقة مسروقة أو ملغاة)',
    '05': 'رفض من البنك المصدر (Do Not Honor)',
    '12': 'عملية غير صالحة',
    '13': 'مبلغ غير صالح',
    '14': 'رقم بطاقة غير صالح',
    '30': 'خطأ في تنسيق الرسالة البنكية',
    '41': 'بطاقة مفقودة - يرجى مصادرتها',
    '43': 'بطاقة مسروقة - يرجى مصادرتها',
    '51': 'تم الرفض: الرصيد غير كافٍ في بطاقة العميل',
    '54': 'تم الرفض: البطاقة منتهية الصلاحية',
    '55': 'تم الرفض: الرقم السري (PIN) غير صحيح',
    '57': 'العملية غير مسموح بها لحامل هذه البطاقة',
    '58': 'العملية غير مسموح بها في هذا النوع من المتاجر',
    '61': 'تم الرفض: تجاوز الحد الأقصى المسموح للسحب اليومي',
    '62': 'بطاقة مقيدة أو محظورة',
    '65': 'تجاوز عدد مرات السحب المسموح بها',
    '75': 'تم الرفض: تم تجاوز عدد محاولات إدخال الرقم السري المسموحة',
    '91': 'تم الرفض: تعذر الاتصال بمركز معالجة بنك العميل',
    '94': 'معاملة مكررة',
    '96': 'تم الرفض: عطل مؤقت في نظام البنك المعالج، يرجى المحاولة لاحقاً',
    '99': 'تم إلغاء العملية بواسطة حامل البطاقة',
    'CANCELLED': 'تم إلغاء العملية بواسطة العميل',
    'CANCELED': 'تم إلغاء العملية بواسطة العميل',
    'TIMEOUT': 'انتهت مهلة إدخال البطاقة أو الرقم السري',
  };

  return codeMap[clean] || fallbackMessage || `تم رفض العملية من البنك (رمز الاستجابة: ${clean})`;
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

export interface BridgeJob {
  jobId: string;
  tenantId: string;
  ip: string;
  port: number;
  provider: string;
  amount: number;
  currency: string;
  referenceId: string;
  terminalTid?: string;
  pairingKey?: string;
}

export interface BridgePoller {
  resolve: (data: { hasJob: boolean; job?: BridgeJob }) => void;
  timeout: NodeJS.Timeout;
}

@Injectable()
export class PosTerminalService {
  private readonly logger = new Logger(PosTerminalService.name);
  private activeSessions = new Map<string, TerminalPaymentSession>();
  private readonly sessionTtlMs = 15 * 60 * 1000;

  private bridgePollers = new Map<string, BridgePoller[]>();
  private pendingBridgeJobs = new Map<string, BridgeJob[]>();
  private bridgeLastSeen = new Map<string, number>();

  private pruneExpiredSessions(): void {
    const cutoff = Date.now() - this.sessionTtlMs;
    for (const [id, session] of this.activeSessions) {
      if (session.createdAt < cutoff) this.activeSessions.delete(id);
    }
  }

  constructor(@Optional() @Inject(KYSELY_DB) private readonly db?: Kysely<Database>) {}

  /** The external bridge API intentionally has no user session; authenticate the device instead. */
  assertBridgeAuthenticated(tenantId: string, suppliedKey?: string): void {
    const master = process.env.POS_BRIDGE_MASTER_SECRET || '';
    if (master.length < 32 || !tenantId?.trim() || typeof suppliedKey !== 'string' || !/^[0-9a-f]{64}$/i.test(suppliedKey)) {
      throw new UnauthorizedException('POS bridge credentials are missing or invalid');
    }
    const expected = Buffer.from(derivePosBridgeKey(master, tenantId), 'hex');
    const provided = Buffer.from(suppliedKey, 'hex');
    if (!timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException('POS bridge credentials are missing or invalid');
    }
  }

  /**
   * Hardware Bridge long-poll endpoint.
   * Holds request up to 25s waiting for a payment job for the given tenant.
   */
  async pollBridge(tenantId: string): Promise<{ hasJob: boolean; job?: BridgeJob }> {
    const cleanTenant = String(tenantId).trim();
    this.bridgeLastSeen.set(cleanTenant, Date.now());

    // 1. Return pending job if any
    const pendingList = this.pendingBridgeJobs.get(cleanTenant);
    if (pendingList && pendingList.length > 0) {
      const job = pendingList.shift()!;
      this.logger.log(`Dispatching pending bridge job ${job.jobId} to poller for tenant ${cleanTenant}`);
      return { hasJob: true, job };
    }

    // 2. Long-poll wait up to 25 seconds
    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      const resolveWrapper = (data: { hasJob: boolean; job?: BridgeJob }) => {
        clearTimeout(timeoutId);
        resolve(data);
      };

      timeoutId = setTimeout(() => {
        const list = this.bridgePollers.get(cleanTenant) || [];
        this.bridgePollers.set(cleanTenant, list.filter((p: any) => p.resolve !== resolveWrapper));
        resolve({ hasJob: false });
      }, 25000);

      if (!this.bridgePollers.has(cleanTenant)) {
        this.bridgePollers.set(cleanTenant, []);
      }
      this.bridgePollers.get(cleanTenant)!.push({ resolve: resolveWrapper, timeout: timeoutId });
    });
  }

  /**
   * Handle result callback from hardware bridge
   */
  async handleBridgeCallback(tenantId: string, payload: {
    jobId: string;
    status: string;
    authCode?: string;
    rrn?: string;
    cardScheme?: string;
    cardLastFour?: string;
    message?: string;
  }): Promise<boolean> {
    const cleanTenant = String(tenantId).trim();
    this.bridgeLastSeen.set(cleanTenant, Date.now());
    this.pruneExpiredSessions();

    const session = this.activeSessions.get(payload.jobId);
    if (!session || session.tenantId !== cleanTenant || !['pending', 'processing'].includes(session.status)) {
      this.logger.warn('Bridge callback rejected: session not pending or tenant mismatch');
      return false;
    }

    const isApproved = payload.status === 'approved' || payload.status === 'APPROVED';
    if (isApproved && (!payload.authCode?.trim() || !payload.rrn?.trim())) {
      this.logger.warn('Bridge approval rejected: missing bank authorization or RRN');
      return false;
    }
    session.status = isApproved ? 'approved' : (payload.status === 'cancelled' ? 'cancelled' : 'declined');
    session.approvalCode = isApproved ? payload.authCode : undefined;
    session.rrn = payload.rrn || session.transactionId;
    session.cardScheme = payload.cardScheme || 'Visa';
    session.cardLastFour = payload.cardLastFour || '';
    session.message = payload.message || (isApproved ? 'تمت الموافقة بنجاح من ماكينة الدفع' : 'تم رفض العملية من البنك أو الماكينة');
    session.updatedAt = Date.now();

    this.logger.log(`Bridge callback resolved session ${payload.jobId} => ${session.status} (Auth: ${session.approvalCode})`);
    return true;
  }

  /**
   * Dispatch a terminal charge job to an active bridge poller or queue
   */
  private dispatchToBridgeRelay(tenantId: string, job: BridgeJob): boolean {
    const cleanTenant = String(tenantId).trim();
    const pollers = this.bridgePollers.get(cleanTenant);
    if (pollers && pollers.length > 0) {
      const poller = pollers.shift()!;
      clearTimeout(poller.timeout);
      poller.resolve({ hasJob: true, job });
      this.logger.log(`Dispatched terminal charge job ${job.jobId} to active bridge poller for tenant ${cleanTenant}`);
      return true;
    }

    // Queue for next poll
    if (!this.pendingBridgeJobs.has(cleanTenant)) {
      this.pendingBridgeJobs.set(cleanTenant, []);
    }
    this.pendingBridgeJobs.get(cleanTenant)!.push(job);
    return false;
  }

  /**
   * Get configured POS Terminals for the tenant from settings
   */
  async getTerminals(tenantId: string): Promise<PosTerminalInfo[]> {
    if (!this.db) {
      return [
        {
          id: 'term-main-01',
          name: 'جهاز شبكة الكاشير الرئيسي (EDC)',
          type: 'edc_standalone',
          status: 'online',
          provider: 'POS Network EDC',
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

      const rawCountry = String(settingsMap.country || '').trim().toUpperCase();
      const rawCurrency = String(settingsMap.currency || '').trim().toUpperCase();
      let country = rawCountry;
      if (!country) {
        if (rawCurrency === 'KWD') country = 'KW';
        else if (rawCurrency === 'SAR') country = 'SA';
        else if (rawCurrency === 'AED') country = 'AE';
        else country = 'EG';
      }

      // Check if multi-terminal posTerminals array is configured
      if (Array.isArray(settingsMap.posTerminals) && settingsMap.posTerminals.length > 0) {
        terminalsList = settingsMap.posTerminals
          .filter((t: any) => {
            if (!t || t.enabled === false) return false;
            const provKey = String(t.provider || '').toLowerCase();
            // Strict country isolation
            if (country === 'EG' && (provKey === 'knet_pos' || provKey === 'knet')) return false;
            if (country === 'KW' && (provKey === 'fawry' || provKey === 'paymob')) return false;
            if (country === 'SA' && (provKey === 'knet_pos' || provKey === 'knet' || provKey === 'fawry' || provKey === 'paymob')) return false;
            return true;
          })
          .map((t: any, idx: number) => {
            const providerKey = t.provider || (country === 'KW' ? 'knet_pos' : country === 'SA' ? 'geidea' : 'fawry');
            const parsed = parseTerminalHostAndPort(String(t.ip || '192.168.1.150'), Number(t.port || 8080));
            return {
              id: String(t.id || `term-${idx + 1}`),
              name: `${t.name || `ماكينة ${idx + 1}`} - ${providerDisplayNames[providerKey] || providerKey}`,
              type: 'edc_standalone' as const,
              status: 'online' as const,
              provider: providerDisplayNames[providerKey] || providerKey,
              ipAddress: `${parsed.host}:${parsed.port}`,
              isDefault: Boolean(t.isDefault),
              pairingKey: t.pairingKey ? String(t.pairingKey).trim() : undefined,
              terminalTid: t.terminalTid ? String(t.terminalTid).trim() : undefined,
            };
          });
      }

      // Fallback to legacy single terminal
      if (terminalsList.length === 0) {
        const name = settingsMap.posTerminalName || 'جهاز الكاشير الرئيسي (EDC)';
        const provider = settingsMap.posTerminalProvider || (country === 'KW' ? 'knet_pos' : country === 'SA' ? 'geidea' : 'fawry');
        const parsed = parseTerminalHostAndPort(settingsMap.posTerminalIp || '192.168.1.3', Number(settingsMap.posTerminalPort || 8080));

        terminalsList = [
          {
            id: 'term-main-01',
            name: `${name} - ${providerDisplayNames[provider] || provider}`,
            type: 'edc_standalone',
            status: 'online',
            provider: providerDisplayNames[provider] || provider,
            ipAddress: `${parsed.host}:${parsed.port}`,
            isDefault: true,
            pairingKey: settingsMap.posTerminalPairingKey,
            terminalTid: settingsMap.posTerminalTid,
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

  private async getTenantBaseCurrency(tenantId: string): Promise<string> {
    if (!this.db) return 'EGP';
    try {
      const rows = await this.db
        .selectFrom('settings')
        .select(['key', 'value'])
        .where('tenant_id', '=', String(tenantId))
        .where('key', 'in', ['currency', 'baseCurrency', 'globalCurrency'])
        .execute();

      for (const row of rows) {
        if (row.value) {
          try {
            const parsed = JSON.parse(row.value);
            if (typeof parsed === 'string' && parsed.trim()) return parsed.trim().toUpperCase();
          } catch {
            const raw = String(row.value).replace(/['"]+/g, '').trim().toUpperCase();
            if (raw) return raw;
          }
        }
      }
    } catch {}
    return 'EGP';
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

    // Prevent concurrent charges on the exact same terminal
    const isTerminalBusy = Array.from(this.activeSessions.values()).some(
      s => s.tenantId === tenantId && s.terminalId === selectedTerminal.id && (s.status === 'processing' || s.status === 'pending')
    );
    if (isTerminalBusy) {
      throw new BadRequestException(`ماكينة الدفع (${selectedTerminal.name}) مشغولة حالياً بعملية دفع أخرى قيد التنفيذ؛ يرجى إنهاء المعاملة الجارية أو إلغاؤها أولاً.`);
    }

    const transactionId = `EDC-${randomUUID()}`;

    // Extract IP and Port from terminal configuration safely
    const { host: cleanIp, port } = parseTerminalHostAndPort(selectedTerminal.ipAddress || '192.168.1.150:8080', 8080);
    const prov = (selectedTerminal.provider || '').toLowerCase();

    // Determine if session should run in simulation / sandbox mode
    const isMock = prov.includes('mock') || prov.includes('sandbox');

    const tenantCurrency = request.currency
      ? String(request.currency).trim().toUpperCase()
      : await this.getTenantBaseCurrency(tenantId);

    const isLocalLan = cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.') || cleanIp === '127.0.0.1' || cleanIp === 'localhost';

    const session: TerminalPaymentSession = {
      tenantId,
      transactionId,
      terminalId: selectedTerminal.id,
      terminalName: selectedTerminal.name,
      amount: request.amount,
      currency: tenantCurrency,
      status: isMock ? 'pending' : 'processing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      message: isMock
        ? 'في انتظار تمرير أو إدخال البطاقة على جهاز الدفع...'
        : `في انتظار تمرير أو إدخال البطاقة على ماكينة الدفع (${selectedTerminal.name})...`,
      provider: selectedTerminal.provider,
      isSimulated: isMock,
    };

    this.activeSessions.set(transactionId, session);
    this.logger.log(`Initiated terminal payment: ${transactionId} for amount: ${request.amount} on ${selectedTerminal.name} (Simulated: ${isMock}, LocalLan: ${isLocalLan})`);

    // If real device, dispatch via Bridge Relay (for local LAN) or direct cloud call
    if (!isMock) {
      if (isLocalLan) {
        const job: BridgeJob = {
          jobId: transactionId,
          tenantId,
          ip: cleanIp,
          port,
          provider: prov,
          amount: request.amount,
          currency: tenantCurrency,
          referenceId: transactionId,
          terminalTid: selectedTerminal.terminalTid,
          pairingKey: selectedTerminal.pairingKey,
        };

        const dispatched = this.dispatchToBridgeRelay(tenantId, job);
        if (dispatched) {
          session.message = `في انتظار تمرير أو إدخال البطاقة على ماكينة الدفع (${selectedTerminal.name})...`;
        } else {
          // Allow up to 4.5 seconds for a polling bridge to pick it up before declining
          setTimeout(() => {
            const current = this.activeSessions.get(transactionId);
            if (current && current.status === 'processing' && !current.approvalCode) {
              const pending = this.pendingBridgeJobs.get(tenantId) || [];
              const stillQueued = pending.some(j => j.jobId === transactionId);
              if (stillQueued) {
                this.pendingBridgeJobs.set(tenantId, pending.filter(j => j.jobId !== transactionId));
                current.status = 'declined';
                current.message = `ماكينة الدفع (${selectedTerminal.name} - ${cleanIp}) على شبكة محلية، ولم يتم اكتشاف اتصال مع جسر Z-Systems Bridge على جهاز الكاشير. يرجى تشغيل الجسر.`;
                current.updatedAt = Date.now();
                this.logger.warn(`Terminal session ${transactionId} declined: No active bridge poller for tenant ${tenantId}`);
              }
            }
          }, 4500);
        }
      } else {
        this.executeTerminalCharge(session, cleanIp, port, prov, selectedTerminal, request).catch((err) => {
          this.logger.error(`Terminal charge background error for ${transactionId}:`, err);
        });
      }
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
        const { host: cleanIp, port } = parseTerminalHostAndPort(term.ipAddress, 8080);
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
    terminal: PosTerminalInfo,
    request: TerminalPaymentRequest
  ): Promise<void> {
    if (provider.includes('geidea')) {
      await this.executeGeideaCharge(session, ip, port, terminal, request);
    } else if (provider.includes('fawry') || provider.includes('pax')) {
      await this.executePaxFawryCharge(session, ip, port, terminal, request);
    } else if (provider.includes('paymob')) {
      await this.executePaymobCharge(session, ip, port, terminal, request);
    } else {
      // Default standard ECR REST
      await this.executeGeideaCharge(session, ip, port, terminal, request);
    }
  }

  /**
   * Geidea ECR Local REST Protocol Driver (Standard for Geidea Smart POS in KSA & Egypt)
   */
  private async executeGeideaCharge(
    session: TerminalPaymentSession,
    ip: string,
    port: number,
    terminal: PosTerminalInfo,
    request: TerminalPaymentRequest
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 95000);

    try {
      session.status = 'processing';
      session.message = 'جاري التخاطب مع ماكينة جيديا... يرجى إدخال أو تمرير البطاقة';
      session.updatedAt = Date.now();

      const curr = String(session.currency || 'EGP').toUpperCase();
      const isThreeDecimals = ['KWD', 'BHD', 'OMR'].includes(curr);
      const minorMultiplier = isThreeDecimals ? 1000 : 100;
      const amountDec = Number(request.amount.toFixed(isThreeDecimals ? 3 : 2));
      const amountMinor = Math.round(request.amount * minorMultiplier);

      const payload: Record<string, any> = {
        transactionType: 'PURCHASE',
        amount: amountDec,
        amountInCents: amountMinor,
        amountInHalalas: amountMinor,
        currency: curr,
        referenceId: session.transactionId,
        ecrReference: session.transactionId,
        printReceipt: true,
      };

      if (terminal?.terminalTid) {
        payload.terminalId = terminal.terminalTid;
        payload.terminalTid = terminal.terminalTid;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (terminal?.pairingKey) {
        headers['x-pairing-key'] = terminal.pairingKey;
        headers['Authorization'] = `Bearer ${terminal.pairingKey}`;
      }

      let res: Response | null = null;
      let targetUrl = `http://${ip}:${port}/api/v1/transaction`;

      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        targetUrl = `http://${ip}:${port}/ecr/sale`;
        res = await fetch(targetUrl, {
          method: 'POST',
          headers,
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
        
        const rawScheme = String(data.cardScheme || data.scheme || data.cardType || 'mada').toLowerCase();
        let mappedScheme = 'mada';
        if (rawScheme.includes('knet')) mappedScheme = 'knet';
        else if (rawScheme.includes('meeza')) mappedScheme = 'meeza';
        else if (rawScheme.includes('master')) mappedScheme = 'mastercard';
        else if (rawScheme.includes('visa')) mappedScheme = 'visa';
        else if (rawScheme.includes('mada')) mappedScheme = 'mada';
        else mappedScheme = rawScheme;
        session.cardScheme = mappedScheme;

        session.cardLastFour = String(data.cardLastFour || data.last4 || (data.maskedPan ? data.maskedPan.slice(-4) : ''));
        session.message = 'تمت الموافقة من بنك التاجر بنجاح!';
        session.updatedAt = Date.now();
        this.logger.log(`Geidea ECR approved: Auth=${session.approvalCode}, RRN=${session.rrn}`);
      } else {
        const isUserCancel = statusRaw === 'CANCELLED' || statusRaw === 'CANCELED' || data.responseCode === '99';
        session.status = isUserCancel ? 'cancelled' : 'declined';
        const rawCode = String(data.responseCode || data.resultCode || statusRaw || '');
        session.message = translateBankResponseCode(rawCode, data.message || data.responseMessage || data.responseDescription);
        session.updatedAt = Date.now();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      session.status = 'declined';
      const isAbort = err.name === 'AbortError';
      const isPrivateSub = isPrivateSubnetIp(ip);
      const isCloudEnv = process.env.APP_MODE === 'CLOUD_SAAS' || process.env.NODE_ENV === 'production';
      let errMsg = isAbort
        ? 'انتهت مهلة الانتظار (95 ثانية) دون تمرير البطاقة على الماكينة'
        : `تعذر الاتصال بماكينة جيديا على ${ip}:${port} (${err.code || err.message}).`;

      if (isCloudEnv && isPrivateSub && !isAbort) {
        errMsg += ' (ملاحظة السحابة: السيرفر السحابي لا يستطيع الدخول لشبكة الراوتر المحلي؛ استخدم تطبيق ديسكتوب Z-Systems أو فعّل Geidea Cloud ECR).';
      } else if (!isAbort) {
        errMsg += ' تأكد من تشغيل الماكينة وتفعيل خدمة ECR.';
      }

      session.message = errMsg;
      session.updatedAt = Date.now();
      this.logger.warn(`Geidea ECR error: ${errMsg}`);
    }
  }

  /**
   * PAX POSLink Raw TCP Socket Driver
   * Standard framing for PAX A920 / A960 / S900 / D210 on ports 10009 / 20008:
   * [STX (0x02)] + [Data] + [ETX (0x03)] + [LRC (XOR Checksum)]
   */
  private checkOrSendPaxRawTcpSocket(
    ip: string,
    port: number,
    payloadObj: any,
    timeoutMs = 60000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let buffer = Buffer.alloc(0);
      let settled = false;

      const finish = (err?: Error, result?: any) => {
        if (settled) return;
        settled = true;
        client.destroy();
        if (err) reject(err);
        else resolve(result);
      };

      client.setTimeout(timeoutMs);

      client.on('connect', () => {
        const jsonStr = JSON.stringify(payloadObj);
        const dataBuf = Buffer.from(jsonStr, 'utf8');

        // Calculate LRC: XOR of all bytes from after STX up to and including ETX
        let lrc = 0x03; // ETX is 0x03
        for (let i = 0; i < dataBuf.length; i++) {
          lrc ^= dataBuf[i];
        }

        const packet = Buffer.concat([
          Buffer.from([0x02]), // STX
          dataBuf,
          Buffer.from([0x03, lrc]), // ETX + LRC
        ]);

        client.write(packet);
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

          // Send ACK (0x06) to terminal to acknowledge clean frame receipt
          try {
            client.write(Buffer.from([0x06]));
          } catch {
            // Ignore write error if socket closing
          }

          try {
            const parsed = JSON.parse(rawMsg);
            finish(undefined, parsed);
          } catch {
            const parts = rawMsg.split('^');
            finish(undefined, {
              responseCode: parts[0] || '000000',
              authCode: parts[1] || '',
              refNum: parts[2] || '',
              raw: rawMsg,
            });
          }
        }
      });

      client.on('timeout', () => {
        finish(new Error('انتهت مهلة انتظار الماكينة (Socket Timeout)'));
      });

      client.on('error', (err) => {
        finish(err);
      });

      client.connect(port, ip);
    });
  }

  /**
   * PAX POSLink / Fawry ECR Protocol Driver
   * Supports both Raw TCP Socket (ports 10009 / 20008) and HTTP POSLink (port 8080)
   */
  private async executePaxFawryCharge(
    session: TerminalPaymentSession,
    ip: string,
    port: number,
    terminal: PosTerminalInfo,
    request: TerminalPaymentRequest
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 95000);

    try {
      session.status = 'processing';
      session.message = 'جاري التخاطب مع ماكينة فوري / باكس... يرجى إدخال أو تمرير البطاقة';
      session.updatedAt = Date.now();

      const curr = String(session.currency || 'EGP').toUpperCase();
      const isThreeDecimals = ['KWD', 'BHD', 'OMR'].includes(curr);
      const minorMultiplier = isThreeDecimals ? 1000 : 100;
      const amountDec = Number(request.amount.toFixed(isThreeDecimals ? 3 : 2));
      const amountMinorStr = Math.round(request.amount * minorMultiplier).toString();
      const amountMinorNum = Math.round(request.amount * minorMultiplier);
      const payload: Record<string, any> = {
        command: 'DO_TRANSACTION',
        transType: '01', // SALE
        amount: amountMinorStr,
        transAmount: amountMinorStr,
        amountInCents: amountMinorNum,
        amountDecimal: amountDec,
        ecrRefNum: session.transactionId,
        referenceNum: session.transactionId,
        currencyCode: curr,
        currency: curr,
        printReceipt: '1',
        printCustomerReceipt: '1',
      };

      if (terminal?.terminalTid) {
        payload.tid = terminal.terminalTid;
      }

      const isRawTcpPort = port === 10009 || port === 20008;
      let data: any = null;

      if (isRawTcpPort) {
        try {
          data = await this.checkOrSendPaxRawTcpSocket(ip, port, payload, 90000);
        } catch (rawErr: any) {
          this.logger.warn(`PAX Raw TCP failed on ${ip}:${port}, trying HTTP fallback: ${rawErr.message}`);
        }
      }

      if (!data) {
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

        if (res && res.ok) {
          data = await res.json();
        } else if (!isRawTcpPort) {
          try {
            data = await this.checkOrSendPaxRawTcpSocket(ip, port, payload, 90000);
          } catch {
            // Keep error
          }
        }
      }

      clearTimeout(timeoutId);

      if (!data) {
        throw new Error(`تعذر التخاطب مع ماكينة باكس عبر HTTP أو Raw TCP Socket على ${ip}:${port}`);
      }

      const code = String(data.responseCode || data.resultCode || data.status || '').trim();
      const isApproved =
        code === '000000' ||
        code === '00' ||
        code === '0' ||
        code === 'OK' ||
        code === 'APPROVED' ||
        data.status === 'APPROVED' ||
        data.transResult === 'APPROVED';

      if (isApproved) {
        session.status = 'approved';
        session.approvalCode = String(data.authCode || data.approvalCode || data.authNum || data.extData?.AuthCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
        session.rrn = String(data.refNum || data.rrn || data.extData?.RRN || session.transactionId);
        
        const rawScheme = String(data.cardType || data.cardScheme || data.extData?.CardType || 'Visa').toLowerCase();
        let mappedScheme = 'visa';
        if (rawScheme.includes('mada')) mappedScheme = 'mada';
        else if (rawScheme.includes('knet')) mappedScheme = 'knet';
        else if (rawScheme.includes('meeza') || rawScheme === '07') mappedScheme = 'meeza';
        else if (rawScheme.includes('master') || rawScheme === '02') mappedScheme = 'mastercard';
        else if (rawScheme.includes('visa') || rawScheme === '01') mappedScheme = 'visa';
        else mappedScheme = rawScheme;
        session.cardScheme = mappedScheme;

        session.cardLastFour = String(data.cardLastFour || data.last4 || (data.bogusPan ? data.bogusPan.slice(-4) : (data.extData?.Pan ? data.extData.Pan.slice(-4) : '')));
        session.message = 'تمت الموافقة بنجاح!';
        session.updatedAt = Date.now();
        this.logger.log(`PAX/Fawry ECR approved: Auth=${session.approvalCode}, RRN=${session.rrn}`);
      } else {
        const isUserCancel = code === 'CANCELLED' || code === 'CANCELED' || code === '99' || data.responseCode === '99';
        session.status = isUserCancel ? 'cancelled' : 'declined';
        const rawCode = String(data.responseCode || data.resultCode || code || '');
        session.message = translateBankResponseCode(rawCode, data.responseMessage || data.message);
        session.updatedAt = Date.now();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      session.status = 'declined';
      const isAbort = err.name === 'AbortError';
      const isPrivateSub = isPrivateSubnetIp(ip);
      const isCloudEnv = process.env.APP_MODE === 'CLOUD_SAAS' || process.env.NODE_ENV === 'production';
      let errMsg = isAbort
        ? 'انتهت مهلة الانتظار (95 ثانية) دون تمرير البطاقة على جهاز باكس'
        : `تعذر الاتصال بماكينة فوري / باكس على ${ip}:${port} (${err.code || err.message}).`;

      if (isCloudEnv && isPrivateSub && !isAbort) {
        errMsg += ' (ملاحظة السحابة: السيرفر السحابي لا يستطيع الدخول لشبكة الراوتر المحلي؛ استخدم تطبيق ديسكتوب Z-Systems للربط المباشر).';
      } else if (!isAbort) {
        errMsg += ' تأكد من تشغيل تطبيق ECR على الماكينة.';
      }

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
    terminal: PosTerminalInfo,
    request: TerminalPaymentRequest
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 95000);

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
      const isAbort = err.name === 'AbortError';
      const isPrivateSub = isPrivateSubnetIp(ip);
      const isCloudEnv = process.env.APP_MODE === 'CLOUD_SAAS' || process.env.NODE_ENV === 'production';
      let errMsg = isAbort
        ? 'انتهت مهلة الانتظار (95 ثانية) دون تمرير البطاقة على ماكينة Paymob'
        : `تعذر الاتصال بماكينة Paymob على ${ip}:${port} (${err.code || err.message}).`;

      if (isCloudEnv && isPrivateSub && !isAbort) {
        errMsg += ' (ملاحظة السحابة: السيرفر السحابي لا يستطيع الدخول لشبكة الراوتر المحلي؛ استخدم تطبيق ديسكتوب Z-Systems للربط المباشر).';
      } else if (!isAbort) {
        errMsg += ' تأكد من تشغيل تطبيق ECR على الماكينة.';
      }

      session.message = errMsg;
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
          body: JSON.stringify({ referenceId: transactionId, ecrReference: transactionId }),
          signal: AbortSignal.timeout(4000),
        }).catch(async () => {
          await fetch(`http://${ip}:${port}/ecr/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referenceId: transactionId, ecrReference: transactionId }),
            signal: AbortSignal.timeout(4000),
          }).catch(() => {});
        });
      } else if (provider.includes('fawry') || provider.includes('pax')) {
        const isRawTcpPort = port === 10009 || port === 20008;
        if (isRawTcpPort) {
          await this.checkOrSendPaxRawTcpSocket(
            ip,
            port,
            { command: 'CANCEL_TRANSACTION', ecrRefNum: transactionId },
            4000
          ).catch(() => {});
        } else {
          await fetch(`http://${ip}:${port}/poslink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'CANCEL_TRANSACTION', ecrRefNum: transactionId }),
            signal: AbortSignal.timeout(4000),
          }).catch(() => {});
        }
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
    const parsed = parseTerminalHostAndPort(payload?.ip || '', Number(payload?.port || 8080));
    let cleanIp = parsed.host;
    let port = parsed.port;
    const provider = payload?.provider || 'fawry';

    // If no IP supplied, fetch configured settings for tenant
    if (!payload?.ip) {
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
          const fromDb = parseTerminalHostAndPort(settingsMap.posTerminalIp || '192.168.1.150', Number(settingsMap.posTerminalPort || 8080));
          cleanIp = fromDb.host;
          port = fromDb.port;
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
    const isPrivateSub = isPrivateSubnetIp(cleanIp);
    const isCloudEnv = process.env.APP_MODE === 'CLOUD_SAAS' || process.env.NODE_ENV === 'production';
    if (isCloudEnv && isPrivateSub) {
      return {
        reachable: false,
        pingSucceeded: false,
        portOpen: false,
        ip: cleanIp,
        port,
        message: `تعذر الوصول لماكينة الدفع (${cleanIp}) من بيئة السيرفر السحابي (Cloud SaaS)`,
        details: `العنوان ${cleanIp} يقع ضمن الشبكة المحلية (LAN) الخاصة بفرعك. السيرفر السحابي المعزول لا يستطيع الوصول للراوتر المحلي عبر الإنترنت العام. للربط المباشر مع ماكينات الشبكة المحلية، يرجى تشغيل تطبيق Z-Systems Desktop للكاشير على نفس الشبكة، أو استخدام وضع الربط السحابي مع المزود (مثل Geidea Cloud ECR بتعيين Terminal TID).`,
        provider,
      };
    }

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
