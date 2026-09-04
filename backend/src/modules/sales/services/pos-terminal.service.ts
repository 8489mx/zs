import { Injectable, Logger, BadRequestException } from '@nestjs/common';

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

@Injectable()
export class PosTerminalService {
  private readonly logger = new Logger(PosTerminalService.name);
  private activeSessions = new Map<string, TerminalPaymentSession>();

  constructor() {}

  /**
   * Get configured POS Terminals for the tenant
   */
  async getTerminals(_tenantId: string): Promise<PosTerminalInfo[]> {
    return [
      {
        id: 'term-main-01',
        name: 'جهاز شبكة الكاشير الرئيسي (EDC - Mada/Visa)',
        type: 'edc_standalone',
        status: 'online',
        provider: 'Geidea / Network International',
        ipAddress: '192.168.1.150'
      },
      {
        id: 'term-mobile-02',
        name: 'جهاز دفع محمول / SoftPOS',
        type: 'softpos',
        status: 'online',
        provider: 'SoftPOS NFC',
        ipAddress: '192.168.1.151'
      }
    ];
  }

  /**
   * Initiate payment request to the EDC card terminal
   */
  async initiatePayment(tenantId: string, request: TerminalPaymentRequest): Promise<TerminalPaymentSession> {
    if (!request.amount || request.amount <= 0) {
      throw new BadRequestException('المبلغ المطلوب للجهاز يجب أن يكون أكبر من صفر');
    }

    const terminals = await this.getTerminals(tenantId);
    const selectedTerminal = terminals.find(t => t.id === request.terminalId) || terminals[0];

    const transactionId = `EDC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const session: TerminalPaymentSession = {
      transactionId,
      terminalId: selectedTerminal.id,
      terminalName: selectedTerminal.name,
      amount: request.amount,
      currency: request.currency || 'SAR',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      message: 'في انتظار تمرير أو إدخال البطاقة على جهاز الدفع...'
    };

    this.activeSessions.set(transactionId, session);
    this.logger.log(`Initiated terminal payment: ${transactionId} for amount: ${request.amount}`);

    return session;
  }

  /**
   * Check status of terminal payment (cashier polling or device webhook)
   */
  async getPaymentStatus(transactionId: string): Promise<TerminalPaymentSession> {
    const session = this.activeSessions.get(transactionId);
    if (!session) {
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
  async cancelPayment(transactionId: string): Promise<TerminalPaymentSession> {
    const session = this.activeSessions.get(transactionId);
    if (!session) {
      throw new BadRequestException('معاملة الدفع غير موجودة');
    }

    session.status = 'cancelled';
    session.message = 'تم إلغاء عملية الدفع بواسطة الكاشير';
    session.updatedAt = Date.now();

    return session;
  }
}
