import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { CreateMaritimeInquiryDto } from './dto/create-inquiry.dto';
import { CreateMaritimeRfqDto } from './dto/create-rfq.dto';
import { SubmitMaritimeBidDto } from './dto/submit-bid.dto';
import { CreateMaritimeQuotationDto } from './dto/create-quotation.dto';
import { CreateMaritimeJobDto } from './dto/create-job.dto';
import { UpdateMaritimeContainerDto } from './dto/update-container.dto';
import { DCSA_STANDARD_MILESTONES, DcsaMilestoneKey } from './maritime-freight.types';
import * as crypto from 'crypto';

@Injectable()
export class MaritimeFreightService {
  private readonly logger = new Logger(MaritimeFreightService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
  ) {}

  // --------------------------------------------------------------------------
  // 1. Ports Master Data
  // --------------------------------------------------------------------------
  async getPorts(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('shipping_ports')
      .selectAll()
      .where((eb) => eb.or([
        eb('tenant_id', '=', tenantId),
        eb('tenant_id', '=', 'default')
      ]))
      .where('is_active', '=', true)
      .orderBy('name_ar', 'asc')
      .execute();
  }

  async createPort(auth: AuthContext, data: { code: string; nameAr: string; nameEn: string; countryCode: string; countryName: string }) {
    const { tenantId } = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('shipping_ports')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', '=', data.code.toUpperCase())
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestException(`Port with UN/LOCODE ${data.code} already exists`);
    }

    const [inserted] = await this.db
      .insertInto('shipping_ports')
      .values({
        tenant_id: tenantId,
        code: data.code.toUpperCase(),
        name_ar: data.nameAr,
        name_en: data.nameEn,
        country_code: data.countryCode.toUpperCase(),
        country_name: data.countryName,
        is_active: true,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  // --------------------------------------------------------------------------
  // 2. Shipping Lines Master Data
  // --------------------------------------------------------------------------
  async getShippingLines(auth: AuthContext, filters?: { carrierType?: string; tradeLane?: string; countryCode?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('shipping_lines')
      .selectAll()
      .where((eb) => eb.or([
        eb('tenant_id', '=', tenantId),
        eb('tenant_id', '=', 'default')
      ]))
      .where('is_active', '=', true);

    if (filters?.carrierType && filters.carrierType !== 'all') {
      query = query.where('carrier_type', '=', filters.carrierType as any);
    }

    if (filters?.tradeLane && filters.tradeLane !== 'all') {
      query = query.where('trade_lanes', 'like', `%${filters.tradeLane}%`);
    }

    if (filters?.countryCode && filters.countryCode !== 'all') {
      query = query.where('country_code', '=', filters.countryCode.toUpperCase());
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.where((eb) => eb.or([
        eb('code', 'ilike', term),
        eb('name_ar', 'ilike', term),
        eb('name_en', 'ilike', term),
        eb('contact_person', 'ilike', term),
        eb('country_name', 'ilike', term),
        eb('city_name', 'ilike', term),
        eb('rfq_email', 'ilike', term)
      ]));
    }

    return await query.orderBy('carrier_type', 'asc').orderBy('name_ar', 'asc').execute();
  }

  async createShippingLine(auth: AuthContext, data: {
    code: string;
    nameAr: string;
    nameEn?: string;
    carrierType?: 'shipping_line' | 'overseas_agent';
    tradeLanes?: string;
    countryName?: string;
    countryCode?: string;
    cityName?: string;
    contactPerson?: string;
    email?: string;
    rfqEmail?: string;
    bookingEmail?: string;
    phone?: string;
    whatsapp?: string;
    wechat?: string;
    servicesOffered?: string;
    supportedPorts?: string;
    notes?: string;
  }) {
    const { tenantId } = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('shipping_lines')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', '=', data.code.toUpperCase())
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestException(`Carrier/Agent with code ${data.code} already exists`);
    }

    const [inserted] = await this.db
      .insertInto('shipping_lines')
      .values({
        tenant_id: tenantId,
        code: data.code.toUpperCase(),
        name_ar: data.nameAr,
        name_en: data.nameEn || data.nameAr,
        carrier_type: data.carrierType || 'shipping_line',
        trade_lanes: data.tradeLanes || null,
        country_name: data.countryName || null,
        country_code: data.countryCode ? data.countryCode.toUpperCase() : null,
        city_name: data.cityName || null,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        rfq_email: data.rfqEmail || null,
        booking_email: data.bookingEmail || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        wechat: data.wechat || null,
        services_offered: data.servicesOffered || null,
        supported_ports: data.supportedPorts || null,
        notes: data.notes || null,
        is_active: true,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  async updateShippingLine(auth: AuthContext, id: string, data: any) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await this.db
      .updateTable('shipping_lines')
      .set({
        name_ar: data.nameAr,
        name_en: data.nameEn,
        carrier_type: data.carrierType,
        trade_lanes: data.tradeLanes,
        country_name: data.countryName,
        country_code: data.countryCode ? data.countryCode.toUpperCase() : undefined,
        city_name: data.cityName,
        contact_person: data.contactPerson,
        email: data.email,
        rfq_email: data.rfqEmail,
        booking_email: data.bookingEmail,
        phone: data.phone,
        whatsapp: data.whatsapp,
        wechat: data.wechat,
        services_offered: data.servicesOffered,
        supported_ports: data.supportedPorts,
        notes: data.notes,
        updated_at: sql`NOW()`,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updated;
  }

  async deleteShippingLine(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await this.db
      .updateTable('shipping_lines')
      .set({ is_active: false, updated_at: sql`NOW()` })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // 2.5 Maritime Client Inquiries Engine (Customer Freight Requests)
  // --------------------------------------------------------------------------
  private async generateNextInquiryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INQ-${year}-`;
    const countResult = await this.db
      .selectFrom('maritime_inquiries')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .where('inquiry_number', 'like', `${prefix}%`)
      .executeTakeFirst();

    const nextSeq = Number(countResult?.count || 0) + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async createInquiry(auth: AuthContext, dto: CreateMaritimeInquiryDto) {
    const { tenantId } = requireTenantScope(auth);
    const inquiryNumber = await this.generateNextInquiryNumber(tenantId);

    const [inquiry] = await this.db
      .insertInto('maritime_inquiries')
      .values({
        tenant_id: tenantId,
        inquiry_number: inquiryNumber,
        customer_id: dto.customerId ? Number(dto.customerId) : null,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone || null,
        customer_email: dto.customerEmail || null,
        direction: dto.direction || 'import',
        pol_code: dto.polCode.toUpperCase(),
        pol_name: dto.polName,
        pod_code: dto.podCode.toUpperCase(),
        pod_name: dto.podName,
        incoterm: dto.incoterm || 'FOB',
        cargo_mode: dto.cargoMode || 'FCL',
        container_type: dto.containerType || '40HC',
        container_count: dto.containerCount || 1,
        commodity_description: dto.commodityDescription || '',
        cargo_nature: dto.cargoNature || 'general',
        gross_weight_kg: Number(dto.grossWeightKg || 0),
        cbm: Number(dto.cbm || 0),
        cargo_ready_date: dto.cargoReadyDate || null,
        target_delivery_date: dto.targetDeliveryDate || null,
        target_free_days: dto.targetFreeDays || 14,
        payment_term: dto.paymentTerm || 'prepaid',
        status: 'received',
        notes: dto.notes || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      })
      .returningAll()
      .execute();

    return inquiry;
  }

  async getInquiries(auth: AuthContext, filters?: { status?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('maritime_inquiries')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status as any);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.where((eb) => eb.or([
        eb('inquiry_number', 'ilike', term),
        eb('customer_name', 'ilike', term),
        eb('customer_phone', 'ilike', term),
        eb('pol_name', 'ilike', term),
        eb('pod_name', 'ilike', term),
        eb('commodity_description', 'ilike', term)
      ]));
    }

    return await query.orderBy('id', 'desc').execute();
  }

  async getInquiryById(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const inquiry = await this.db
      .selectFrom('maritime_inquiries')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async convertInquiryToRfq(auth: AuthContext, inquiryId: string, targetLineIds?: number[]) {
    const { tenantId } = requireTenantScope(auth);
    const inquiry = await this.getInquiryById(auth, inquiryId);

    let lineIds = targetLineIds;
    if (!lineIds || lineIds.length === 0) {
      const activeLines = await this.getShippingLines(auth);
      lineIds = activeLines.map((l) => Number(l.id));
    }

    const rfq = await this.createRfq(auth, {
      polCode: inquiry.pol_code,
      polName: inquiry.pol_name,
      podCode: inquiry.pod_code,
      podName: inquiry.pod_name,
      direction: inquiry.direction as any,
      incoterm: inquiry.incoterm,
      cargoMode: inquiry.cargo_mode,
      containerType: inquiry.container_type,
      containerCount: inquiry.container_count,
      commodityDescription: inquiry.commodity_description,
      cargoNature: inquiry.cargo_nature,
      cargoReadyDate: inquiry.cargo_ready_date || undefined,
      targetFreeDays: inquiry.target_free_days,
      paymentTerm: inquiry.payment_term as any,
      targetLineIds: lineIds,
      inquiryId: String(inquiry.id),
      customerId: inquiry.customer_id ? Number(inquiry.customer_id) : undefined,
      customerName: inquiry.customer_name,
      customerPhone: inquiry.customer_phone || undefined,
      customerEmail: inquiry.customer_email || undefined,
      notes: `طلب تسعير مولد آلياً من استفسار العميل ${inquiry.inquiry_number}: ${inquiry.customer_name}`,
    });

    await this.db
      .updateTable('maritime_inquiries')
      .set({
        status: 'rfq_created',
        rfq_id: String(rfq.id),
        updated_at: sql`NOW()`,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', inquiryId as any)
      .execute();

    return rfq;
  }

  // --------------------------------------------------------------------------
  // 3. Maritime RFQs Engine
  // --------------------------------------------------------------------------
  private async generateNextRfqNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RFQ-${year}-`;
    const countResult = await this.db
      .selectFrom('maritime_rfqs')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .where('rfq_number', 'like', `${prefix}%`)
      .executeTakeFirst();

    const nextSeq = Number(countResult?.count || 0) + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async createRfq(auth: AuthContext, dto: CreateMaritimeRfqDto) {
    const { tenantId } = requireTenantScope(auth);
    const rfqNumber = await this.generateNextRfqNumber(tenantId);

    const [rfq] = await this.db
      .insertInto('maritime_rfqs')
      .values({
        tenant_id: tenantId,
        rfq_number: rfqNumber,
        inquiry_id: dto.inquiryId ? String(dto.inquiryId) : null,
        customer_id: dto.customerId ? Number(dto.customerId) : null,
        customer_name: dto.customerName || null,
        customer_phone: dto.customerPhone || null,
        customer_email: dto.customerEmail || null,
        direction: dto.direction || 'import',
        pol_code: dto.polCode.toUpperCase(),
        pol_name: dto.polName,
        pod_code: dto.podCode.toUpperCase(),
        pod_name: dto.podName,
        incoterm: dto.incoterm || 'FOB',
        cargo_mode: dto.cargoMode || 'FCL',
        container_type: dto.containerType || '40HC',
        container_count: dto.containerCount || 1,
        commodity_description: dto.commodityDescription || '',
        cargo_nature: dto.cargoNature || 'general',
        cargo_ready_date: dto.cargoReadyDate || null,
        target_free_days: dto.targetFreeDays || 14,
        payment_term: dto.paymentTerm || 'prepaid',
        target_line_ids: JSON.stringify(dto.targetLineIds || []),
        status: 'draft',
        notes: dto.notes || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      })
      .returningAll()
      .execute();

    if (dto.inquiryId) {
      await this.db
        .updateTable('maritime_inquiries')
        .set({
          status: 'rfq_created',
          rfq_id: String(rfq.id),
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', dto.inquiryId as any)
        .execute();
    }

    // If target lines were selected, dispatch emails
    if (dto.targetLineIds && dto.targetLineIds.length > 0) {
      await this.dispatchRfqEmails(auth, String(rfq.id));
    }

    return rfq;
  }

  async getRfqs(auth: AuthContext, filters?: { status?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('maritime_rfqs')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status as any);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.where((eb) => eb.or([
        eb('rfq_number', 'ilike', term),
        eb('pol_name', 'ilike', term),
        eb('pod_name', 'ilike', term),
        eb('commodity_description', 'ilike', term)
      ]));
    }

    const rfqs = await query.orderBy('id', 'desc').execute();

    // Attach bids count and best bid to each RFQ
    const rfqIds = rfqs.map((r) => String(r.id));
    if (rfqIds.length === 0) return [];

    const bids = await this.db
      .selectFrom('maritime_rfq_bids')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('rfq_id', 'in', rfqIds)
      .execute();

    return rfqs.map((rfq) => {
      const relatedBids = bids.filter((b) => b.rfq_id === String(rfq.id));
      const minBid = relatedBids.length > 0
        ? relatedBids.reduce((prev, curr) => Number(curr.total_freight_cost) < Number(prev.total_freight_cost) ? curr : prev)
        : null;

      return {
        ...rfq,
        bidsCount: relatedBids.length,
        bestBid: minBid,
      };
    });
  }

  async getRfqById(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const rfq = await this.db
      .selectFrom('maritime_rfqs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!rfq) {
      throw new NotFoundException('Maritime RFQ not found');
    }

    const bids = await this.db
      .selectFrom('maritime_rfq_bids')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('rfq_id', '=', id)
      .orderBy('total_freight_cost', 'asc')
      .execute();

    // Highlight "Best Value": balanced by lowest cost and highest free days
    let bestValueBidId: string | null = null;
    if (bids.length > 0) {
      // Score: lower cost is better, higher free days is better
      const scoredBids = bids.map((b) => {
        const cost = Number(b.total_freight_cost) || 1;
        const freeDays = Number(b.free_days) || 7;
        // Cost per free day ratio or normalized score
        const score = cost / Math.max(freeDays, 1);
        return { id: String(b.id), score };
      });
      scoredBids.sort((a, b) => a.score - b.score);
      bestValueBidId = scoredBids[0]?.id || null;
    }

    const bidsWithBestValue = bids.map((b) => ({
      ...b,
      isBestValue: String(b.id) === bestValueBidId,
    }));

    return {
      ...rfq,
      bids: bidsWithBestValue,
    };
  }

  async dispatchRfqEmails(auth: AuthContext, rfqId: string) {
    const { tenantId } = requireTenantScope(auth);
    const rfq = await this.db
      .selectFrom('maritime_rfqs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', rfqId as any)
      .executeTakeFirst();

    if (!rfq) throw new NotFoundException('RFQ not found');

    const lineIds: number[] = Array.isArray(rfq.target_line_ids) ? rfq.target_line_ids : [];
    if (lineIds.length === 0) {
      return { sentCount: 0, message: 'No target shipping lines selected' };
    }

    const carriers = await this.db
      .selectFrom('shipping_lines')
      .selectAll()
      .where('id', 'in', lineIds.map(String) as any)
      .execute();

    let sentCount = 0;
    // Fetch custom mail configuration configured by user in maritime settings
    const mailConfigRow = await this.db
      .selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'maritime_mail_config')
      .executeTakeFirst();

    let customMailConfig: any = null;
    if (mailConfigRow?.value) {
      try {
        customMailConfig = typeof mailConfigRow.value === 'string' ? JSON.parse(mailConfigRow.value) : mailConfigRow.value;
      } catch {}
    }

    const host = String(customMailConfig?.smtpHost || process.env.SMTP_HOST || '').trim();
    const port = Number(customMailConfig?.smtpPort || process.env.SMTP_PORT || 587);
    const user = String(customMailConfig?.smtpUser || process.env.SMTP_USER || '').trim();
    const pass = String(customMailConfig?.smtpPassword || process.env.SMTP_PASSWORD || '').trim();
    const fromEmail = String(customMailConfig?.fromEmail || process.env.SMTP_FROM || 'rfq@z-systems.io').trim();
    const fromName = String(customMailConfig?.fromName || 'Z-Systems Global Logistics').trim();

    let transporter: any = null;
    if (host && user && pass) {
      try {
        const nodemailer = require('nodemailer');
        transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      } catch (err: any) {
        this.logger.warn(`Mailer config exists but failed to initialize: ${err?.message}`);
      }
    }

    for (const carrier of carriers) {
      const targetEmail = carrier.rfq_email || carrier.email;
      if (!targetEmail) continue;

      const subject = `[${rfq.rfq_number}] Freight Rate Inquiry: ${rfq.pol_code} to ${rfq.pod_code} (${rfq.container_count}x ${rfq.container_type})`;
      const magicLinkUrl = `${process.env.APP_PUBLIC_URL || 'https://app.z-systems.io'}/portal/carrier-quote/${rfq.id}?carrier=${encodeURIComponent(carrier.code)}`;

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
          <h2 style="color: #170e5e;">Ocean Freight Rate Inquiry</h2>
          <p>Dear <strong>${carrier.name_en}</strong> Pricing Desk,</p>
          <p>Please provide your most competitive ocean freight spot rate for the following inquiry:</p>
          <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 16px 0; border: 1px solid #e2e8f0;">
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Reference</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.rfq_number}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Port of Loading (POL)</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.pol_name} (${rfq.pol_code})</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Port of Discharge (POD)</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.pod_name} (${rfq.pod_code})</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Equipment</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.container_count} x ${rfq.container_type} (${rfq.cargo_mode})</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Commodity</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.commodity_description || 'General Cargo'}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Target Free Days</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.target_free_days} Days at Destination</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Incoterm / Payment</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.incoterm} (${rfq.payment_term})</td></tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="${magicLinkUrl}" style="background-color: #170e5e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Submit Your Quote Online Here
            </a>
          </p>
          <p style="color: #64748b; font-size: 13px;">Or simply reply to this email keeping [${rfq.rfq_number}] in the subject line.</p>
        </div>
      `;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: targetEmail,
            subject,
            html,
          });
          sentCount++;
        } catch (err: any) {
          this.logger.error(`Failed to send RFQ email to ${targetEmail}: ${err?.message}`);
        }
      } else {
        this.logger.log(`[SIMULATION] RFQ Email dispatched to ${carrier.name_en} <${targetEmail}>: ${subject}`);
        sentCount++;
      }
    }

    await this.db
      .updateTable('maritime_rfqs')
      .set({ status: 'sent', updated_at: sql`NOW()` })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', rfqId as any)
      .execute();

    return { sentCount, message: `Dispatched RFQ inquiries to ${sentCount} carriers` };
  }

  // --------------------------------------------------------------------------
  // 4. Bids Management
  // --------------------------------------------------------------------------
  async submitBid(auth: AuthContext, dto: SubmitMaritimeBidDto) {
    const { tenantId } = requireTenantScope(auth);
    const rfq = await this.db
      .selectFrom('maritime_rfqs')
      .select(['id', 'status'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', dto.rfqId as any)
      .executeTakeFirst();

    if (!rfq) throw new NotFoundException('RFQ not found');

    const oceanFreight = Number(dto.oceanFreight || 0);
    const thcOrigin = Number(dto.thcOrigin || 0);
    const thcDestination = Number(dto.thcDestination || 0);
    const bafCharges = Number(dto.bafCharges || 0);
    const otherCharges = Number(dto.otherCharges || 0);
    const totalFreightCost = oceanFreight + thcOrigin + thcDestination + bafCharges + otherCharges;

    const [bid] = await this.db
      .insertInto('maritime_rfq_bids')
      .values({
        tenant_id: tenantId,
        rfq_id: dto.rfqId,
        shipping_line_id: dto.shippingLineId ? String(dto.shippingLineId) : null,
        shipping_line_name: dto.shippingLineName,
        ocean_freight: oceanFreight,
        currency: dto.currency || 'USD',
        thc_origin: thcOrigin,
        thc_destination: thcDestination,
        baf_charges: bafCharges,
        other_charges: otherCharges,
        total_freight_cost: totalFreightCost,
        transit_time_days: dto.transitTimeDays || 0,
        free_days: dto.freeDays || 14,
        validity_date: dto.validityDate || null,
        submission_channel: dto.submissionChannel || 'manual',
        raw_bid_data: dto.rawBidData ? JSON.stringify(dto.rawBidData) : null,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    // Update RFQ status to bids_received if it was sent or draft
    if (rfq.status === 'sent' || rfq.status === 'draft') {
      await this.db
        .updateTable('maritime_rfqs')
        .set({ status: 'bids_received', updated_at: sql`NOW()` })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', dto.rfqId as any)
        .execute();
    }

    return bid;
  }

  async awardBid(auth: AuthContext, bidId: string) {
    const { tenantId } = requireTenantScope(auth);
    const bid = await this.db
      .selectFrom('maritime_rfq_bids')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', bidId as any)
      .executeTakeFirst();

    if (!bid) throw new NotFoundException('Bid not found');

    // Un-award any previous bids on the same RFQ
    await this.db
      .updateTable('maritime_rfq_bids')
      .set({ is_awarded: false, awarded_at: null })
      .where('tenant_id', '=', tenantId)
      .where('rfq_id', '=', bid.rfq_id)
      .execute();

    // Award this bid
    const [awardedBid] = await this.db
      .updateTable('maritime_rfq_bids')
      .set({ is_awarded: true, awarded_at: sql`NOW()` })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', bidId as any)
      .returningAll()
      .execute();

    // Update RFQ status to awarded
    await this.db
      .updateTable('maritime_rfqs')
      .set({ status: 'awarded', updated_at: sql`NOW()` })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', bid.rfq_id as any)
      .execute();

    return awardedBid;
  }

  // AI & Regex text parser for carrier email bids
  parseCarrierEmailText(rawText: string) {
    const text = String(rawText || '');
    let oceanFreight = 0;
    let currency = 'USD';
    let freeDays = 14;
    let transitTimeDays = 0;
    let thc = 0;

    // Currency match
    if (/EUR|€/i.test(text)) currency = 'EUR';
    else if (/SAR|ريال/i.test(text)) currency = 'SAR';
    else if (/EGP|جنية|جنيه/i.test(text)) currency = 'EGP';

    // Ocean freight match (e.g., "$2100", "OF: 2100", "Rate: 2,100 USD", "2100$")
    const ofMatch = text.match(/(?:ocean\s*freight|rate|of|nfreight|usd|\$)\s*[:=]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                    text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:usd|\$)/i);
    if (ofMatch && ofMatch[1]) {
      oceanFreight = parseFloat(ofMatch[1].replace(/,/g, ''));
    }

    // Free days match (e.g., "14 days free", "14 free days", "detention: 14 days", "14 F/D")
    const fdMatch = text.match(/([0-9]{1,2})\s*(?:days?\s*free|free\s*days?|f\/?d)/i);
    if (fdMatch && fdMatch[1]) {
      freeDays = parseInt(fdMatch[1], 10);
    }

    // Transit time match (e.g., "TT: 18 days", "transit time: 22")
    const ttMatch = text.match(/(?:transit\s*time|tt)\s*[:=]?\s*([0-9]{1,2})/i);
    if (ttMatch && ttMatch[1]) {
      transitTimeDays = parseInt(ttMatch[1], 10);
    }

    // THC match (e.g., "THC: 150", "THC 250 USD")
    const thcMatch = text.match(/thc\s*[:=]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (thcMatch && thcMatch[1]) {
      thc = parseFloat(thcMatch[1].replace(/,/g, ''));
    }

    return {
      oceanFreight,
      currency,
      freeDays,
      transitTimeDays,
      thcOrigin: thc,
      thcDestination: 0,
      totalEstimated: oceanFreight + thc,
    };
  }

  // --------------------------------------------------------------------------
  // 5. Client Quotations Engine
  // --------------------------------------------------------------------------
  private async generateNextQuotationNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QUO-${year}-`;
    const countResult = await this.db
      .selectFrom('maritime_quotations')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .where('quotation_number', 'like', `${prefix}%`)
      .executeTakeFirst();

    const nextSeq = Number(countResult?.count || 0) + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async createQuotation(auth: AuthContext, dto: CreateMaritimeQuotationDto) {
    const { tenantId } = requireTenantScope(auth);
    const quotationNumber = await this.generateNextQuotationNumber(tenantId);

    const baseCost = Number(dto.baseCost || 0);
    const marginType = dto.marginType || 'fixed';
    const marginValue = Number(dto.marginValue || 0);
    const exchangeRate = Number(dto.exchangeRate || 1);

    let finalTotal = baseCost;
    if (marginType === 'percentage') {
      finalTotal = baseCost * (1 + marginValue / 100);
    } else {
      finalTotal = baseCost + marginValue;
    }
    const finalTotalLocal = finalTotal * exchangeRate;

    const [quote] = await this.db
      .insertInto('maritime_quotations')
      .values({
        tenant_id: tenantId,
        quotation_number: quotationNumber,
        inquiry_id: dto.inquiryId ? String(dto.inquiryId) : null,
        rfq_id: dto.rfqId || null,
        bid_id: dto.bidId || null,
        customer_id: dto.customerId || null,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone || null,
        customer_email: dto.customerEmail || null,
        payment_term: dto.paymentTerm || 'prepaid',
        base_cost: baseCost,
        currency: dto.currency || 'USD',
        margin_type: marginType,
        margin_value: marginValue,
        final_total: finalTotal,
        exchange_rate: exchangeRate,
        final_total_local: finalTotalLocal,
        valid_until: dto.validUntil || null,
        status: 'draft',
        notes: dto.notes || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      })
      .returningAll()
      .execute();

    if (dto.inquiryId) {
      await this.db
        .updateTable('maritime_inquiries')
        .set({
          status: 'quoted',
          quotation_id: String(quote.id),
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', dto.inquiryId as any)
        .execute();
    }

    return quote;
  }

  async getQuotations(auth: AuthContext, filters?: { status?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('maritime_quotations')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status as any);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.where((eb) => eb.or([
        eb('quotation_number', 'ilike', term),
        eb('customer_name', 'ilike', term),
        eb('customer_phone', 'ilike', term)
      ]));
    }

    return await query.orderBy('id', 'desc').execute();
  }

  async updateQuotationStatus(auth: AuthContext, id: string, status: 'approved' | 'rejected' | 'sent') {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await this.db
      .updateTable('maritime_quotations')
      .set({ status, updated_at: sql`NOW()` })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updated;
  }

  // --------------------------------------------------------------------------
  // 6. Shipment Jobs Engine (Operations & Cost Centers)
  // --------------------------------------------------------------------------
  private async generateNextJobNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JOB-${year}-`;
    const countResult = await this.db
      .selectFrom('maritime_jobs')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenantId)
      .where('job_number', 'like', `${prefix}%`)
      .executeTakeFirst();

    const nextSeq = Number(countResult?.count || 0) + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async createJob(auth: AuthContext, dto: CreateMaritimeJobDto) {
    const { tenantId } = requireTenantScope(auth);
    const jobNumber = await this.generateNextJobNumber(tenantId);
    const trackingToken = crypto.randomBytes(16).toString('hex');

    // 1. Automatically create an Accounting Cost Center under dimension = 'project'
    let costCenterId: string | null = null;
    try {
      const [costCenter] = await this.db
        .insertInto('cost_centers')
        .values({
          tenant_id: tenantId,
          code: jobNumber,
          name: `شحنة بحرية: ${jobNumber} - ${dto.customerName}`,
          dimension: 'project',
          is_active: true,
          description: `مركز تكلفة تلقائي للعملية الملاحية ${jobNumber} (${dto.polName} إلى ${dto.podName})`,
        })
        .returning('id')
        .execute();
      if (costCenter) {
        costCenterId = String(costCenter.id);
      }
    } catch (err: any) {
      this.logger.warn(`Could not auto-create cost center for ${jobNumber}: ${err?.message}`);
    }

    // 2. Insert Job record
    const [job] = await this.db
      .insertInto('maritime_jobs')
      .values({
        tenant_id: tenantId,
        job_number: jobNumber,
        inquiry_id: dto.inquiryId ? String(dto.inquiryId) : null,
        quotation_id: dto.quotationId ? String(dto.quotationId) : null,
        rfq_id: dto.rfqId ? String(dto.rfqId) : null,
        customer_id: dto.customerId ? Number(dto.customerId) : null,
        customer_name: dto.customerName,
        direction: dto.direction || 'import',
        payment_term: dto.paymentTerm || 'prepaid',
        shipping_line_id: dto.shippingLineId ? String(dto.shippingLineId) : null,
        shipping_line_name: dto.shippingLineName,
        booking_number: dto.bookingNumber || null,
        vessel_name: dto.vesselName || null,
        voyage_number: dto.voyageNumber || null,
        pol_code: dto.polCode.toUpperCase(),
        pol_name: dto.polName,
        pod_code: dto.podCode.toUpperCase(),
        pod_name: dto.podName,
        etd: dto.etd || null,
        eta: dto.eta || null,
        port_cut_off: dto.portCutOff ? new Date(dto.portCutOff) : null,
        bl_type: dto.blType || 'original',
        mbl_number: dto.mblNumber || null,
        hbl_number: dto.hblNumber || null,
        shipper_details: dto.shipperDetails || null,
        consignee_details: dto.consigneeDetails || null,
        notify_party: dto.notifyParty || null,
        milestone_status: 'BOOK',
        cost_center_id: costCenterId,
        tracking_token: trackingToken,
        delivery_address: dto.deliveryAddress || null,
        status: 'active',
        notes: dto.notes || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      })
      .returningAll()
      .execute();

    // 3. Add initial DCSA milestone
    await this.db
      .insertInto('maritime_job_milestones')
      .values({
        tenant_id: tenantId,
        job_id: String(job.id),
        milestone_key: 'BOOK',
        milestone_title: 'تأكيد الحجز الملاحي (Booking Confirmed)',
        location: dto.polName,
        notes: `تم فتح أمر التشغيل وتأكيد الحجز بنجاح برقم ${dto.bookingNumber || jobNumber}`,
        recorded_by: auth.userId ? Number(auth.userId) : null,
      })
      .execute();

    // 4. If containers provided, insert them
    if (dto.containers && dto.containers.length > 0) {
      for (const c of dto.containers) {
        await this.db
          .insertInto('maritime_containers')
          .values({
            tenant_id: tenantId,
            job_id: String(job.id),
            container_number: c.containerNumber.toUpperCase(),
            container_type: c.containerType || '40HC',
            seal_number: c.sealNumber || null,
            gross_weight_kg: Number(c.grossWeightKg || 0),
            cbm: Number(c.cbm || 0),
            free_days: Number(c.freeDays || 14),
            deposit_amount: Number(c.depositAmount || 0),
            deposit_currency: c.depositCurrency || 'EGP',
            deposit_status: Number(c.depositAmount || 0) > 0 ? 'held_by_line' : 'not_required',
          })
          .execute();
      }
    }

    // 5. If linked to quotation, update quotation
    if (dto.quotationId) {
      await this.db
        .updateTable('maritime_quotations')
        .set({
          status: 'converted_to_job',
          converted_job_id: String(job.id),
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', dto.quotationId as any)
        .execute();
    }

    // 6. If linked to inquiry, update inquiry
    if (dto.inquiryId) {
      await this.db
        .updateTable('maritime_inquiries')
        .set({
          status: 'converted_to_job',
          job_id: String(job.id),
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', dto.inquiryId as any)
        .execute();
    }

    return job;
  }

  async autoConvertQuotationToJob(auth: AuthContext, quotationId: string) {
    const { tenantId } = requireTenantScope(auth);
    const quote = await this.db
      .selectFrom('maritime_quotations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', quotationId as any)
      .executeTakeFirst();

    if (!quote) throw new NotFoundException('Quotation not found');

    let rfq: any = null;
    let bid: any = null;
    if (quote.rfq_id) {
      rfq = await this.db
        .selectFrom('maritime_rfqs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', quote.rfq_id as any)
        .executeTakeFirst();
    }
    if (quote.bid_id) {
      bid = await this.db
        .selectFrom('maritime_rfq_bids')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', quote.bid_id as any)
        .executeTakeFirst();
    }

    const containerCount = rfq?.container_count || 1;
    const containerType = rfq?.container_type || '40HC';
    const freeDays = bid?.free_days || rfq?.target_free_days || 14;

    const containersPayload: any[] = [];
    for (let i = 1; i <= containerCount; i++) {
      containersPayload.push({
        containerNumber: `MSKU${Math.floor(1000000 + Math.random() * 9000000)}`,
        containerType,
        freeDays,
        depositAmount: 5000,
        depositCurrency: 'EGP',
      });
    }

    return await this.createJob(auth, {
      quotationId: String(quote.id),
      rfqId: quote.rfq_id ? String(quote.rfq_id) : undefined,
      inquiryId: quote.inquiry_id ? String(quote.inquiry_id) : undefined,
      customerId: quote.customer_id,
      customerName: quote.customer_name,
      direction: (rfq?.direction as any) || 'import',
      paymentTerm: quote.payment_term,
      shippingLineId: bid?.shipping_line_id || null,
      shippingLineName: bid?.shipping_line_name || 'خط ملاحي معتمد',
      polCode: rfq?.pol_code || 'CNSHA',
      polName: rfq?.pol_name || 'ميناء الشحن',
      podCode: rfq?.pod_code || 'EGALY',
      podName: rfq?.pod_name || 'ميناء الوصول',
      bookingNumber: `BKG-${Math.floor(100000 + Math.random() * 900000)}`,
      containers: containersPayload,
      notes: `أمر تشغيل تم تحويله وتفعيله آلياً من عرض السعر ${quote.quotation_number}`,
    });
  }

  async getJobs(auth: AuthContext, filters?: { status?: string; search?: string; milestone?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('maritime_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status as any);
    }

    if (filters?.milestone && filters.milestone !== 'all') {
      query = query.where('milestone_status', '=', filters.milestone);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.where((eb) => eb.or([
        eb('job_number', 'ilike', term),
        eb('customer_name', 'ilike', term),
        eb('booking_number', 'ilike', term),
        eb('mbl_number', 'ilike', term),
        eb('hbl_number', 'ilike', term),
        eb('vessel_name', 'ilike', term)
      ]));
    }

    const jobs = await query.orderBy('id', 'desc').execute();

    // Attach containers count
    const jobIds = jobs.map((j) => String(j.id));
    if (jobIds.length === 0) return [];

    const containers = await this.db
      .selectFrom('maritime_containers')
      .select(['job_id', 'container_number', 'is_overdue'])
      .where('tenant_id', '=', tenantId)
      .where('job_id', 'in', jobIds)
      .execute();

    return jobs.map((job) => {
      const related = containers.filter((c) => c.job_id === String(job.id));
      const hasOverdue = related.some((c) => c.is_overdue);
      return {
        ...job,
        containersCount: related.length,
        hasOverdueContainers: hasOverdue,
      };
    });
  }

  async getJobById(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const job = await this.db
      .selectFrom('maritime_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!job) throw new NotFoundException('Shipment Job not found');

    const containers = await this.db
      .selectFrom('maritime_containers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('job_id', '=', id)
      .execute();

    const milestones = await this.db
      .selectFrom('maritime_job_milestones')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('job_id', '=', id)
      .orderBy('occurred_at', 'asc')
      .execute();

    return {
      ...job,
      containers,
      milestones,
      dcsaDefinitions: DCSA_STANDARD_MILESTONES,
    };
  }

  async addJobMilestone(auth: AuthContext, jobId: string, milestoneKey: DcsaMilestoneKey, notes?: string, location?: string) {
    const { tenantId } = requireTenantScope(auth);
    const milestoneDef = DCSA_STANDARD_MILESTONES.find((m) => m.key === milestoneKey);
    const milestoneTitle = milestoneDef ? `${milestoneDef.title_ar} (${milestoneDef.title_en})` : milestoneKey;

    await this.db
      .insertInto('maritime_job_milestones')
      .values({
        tenant_id: tenantId,
        job_id: jobId,
        milestone_key: milestoneKey,
        milestone_title: milestoneTitle,
        location: location || null,
        notes: notes || null,
        recorded_by: auth.userId ? Number(auth.userId) : null,
      })
      .execute();

    // Update job milestone status and automated triggers
    const updatePayload: any = {
      milestone_status: milestoneKey,
      updated_at: sql`NOW()`,
    };

    if (milestoneKey === 'DISC') {
      // 1. Container Discharged at destination port: Start free days clock & calculate deadline
      const containers = await this.db
        .selectFrom('maritime_containers')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('job_id', '=', jobId as any)
        .execute();

      const now = new Date();
      for (const c of containers) {
        if (!c.discharged_at) {
          const freeDays = Number(c.free_days) || 14;
          const deadline = new Date(now);
          deadline.setDate(deadline.getDate() + freeDays);
          await this.db
            .updateTable('maritime_containers')
            .set({
              discharged_at: now,
              return_deadline: deadline.toISOString().split('T')[0],
              updated_at: sql`NOW()`,
            })
            .where('id', '=', c.id as any)
            .execute();
        }
      }
    } else if (milestoneKey === 'GTO') {
      // 2. Gate-out: Release D/O and record container gate-out
      updatePayload.delivery_order_released = true;
      updatePayload.delivery_order_released_at = sql`NOW()`;
      await this.db
        .updateTable('maritime_containers')
        .set({ gated_out_at: sql`NOW()`, updated_at: sql`NOW()` })
        .where('tenant_id', '=', tenantId)
        .where('job_id', '=', jobId as any)
        .where('gated_out_at', 'is', null)
        .execute();
    } else if (milestoneKey === 'DLVR') {
      // 3. Delivered to client premises
      updatePayload.delivered_to_client_at = sql`NOW()`;
    } else if (milestoneKey === 'RETN') {
      // 4. Empty Container Returned: close container & job
      updatePayload.status = 'completed';
      await this.db
        .updateTable('maritime_containers')
        .set({
          empty_returned_at: sql`NOW()`,
          deposit_status: 'pending_return_proof',
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('job_id', '=', jobId as any)
        .where('empty_returned_at', 'is', null)
        .execute();
    }

    const [updatedJob] = await this.db
      .updateTable('maritime_jobs')
      .set(updatePayload)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', jobId as any)
      .returningAll()
      .execute();

    return updatedJob;
  }

  async releaseDeliveryOrder(auth: AuthContext, jobId: string) {
    const { tenantId } = requireTenantScope(auth);
    return await this.addJobMilestone(
      auth,
      jobId,
      'GTO',
      'تم اعتماد وإصدار إذن التسليم الملاحي الرسمي (Delivery Order D/O) للعميل'
    );
  }

  async getMilestoneWhatsAppMessage(auth: AuthContext, jobId: string, milestoneKey: DcsaMilestoneKey) {
    const job = await this.getJobById(auth, jobId);
    const trackingUrl = job.tracking_token
      ? `${process.env.APP_PUBLIC_URL || 'https://app.z-systems.io'}/public/track/${job.tracking_token}`
      : '';

    const milestoneDef = DCSA_STANDARD_MILESTONES.find((m) => m.key === milestoneKey);
    const title = milestoneDef ? milestoneDef.title_ar : milestoneKey;

    let actionContext = '';
    switch (milestoneKey) {
      case 'BOOK':
        actionContext = `تم تأكيد حجز الشحنة بنجاح برقم الحجز: ${job.booking_number || job.job_number}`;
        break;
      case 'GTI':
        actionContext = `وصلت الحاوية ودخلت ساحة ميناء الشحن (${job.pol_name}) بانتظار التحميل على السفينة.`;
        break;
      case 'LOAD':
        actionContext = `تم تحميل وشحن الحاوية على متن السفينة (${job.vessel_name || 'السفينة المحددة'}) وجاري التجهيز للإبحار.`;
        break;
      case 'DEPT':
        actionContext = `أبحرت السفينة رسمياً من ${job.pol_name} متجهة إلى ${job.pod_name}. موعد الوصول المتوقع (ETA): ${job.eta || 'قيد المتابعة'}.`;
        break;
      case 'ARRI':
        actionContext = `وصلت السفينة بحمد الله إلى ميناء المقصد (${job.pod_name}) وجاري ربط السفينة وبدء عمليات التفريغ.`;
        break;
      case 'DISC':
        actionContext = `تم تفريغ الحاوية على رصيف ميناء ${job.pod_name} وبدأ سريان فترة السماح (Free Days). جاري بدء إجراءات التخليص الجمركي.`;
        break;
      case 'CUST':
        actionContext = `تم إنهاء كافة إجراءات الإفراج والمطابقة الجمركية للشحنة بنجاح.`;
        break;
      case 'GTO':
        actionContext = `تم إصدار إذن التسليم الملاحي (Delivery Order) وخروج الحاوية من بوابة الميناء في طريقها للعنوان المحدد.`;
        break;
      case 'DLVR':
        actionContext = `تم تسليم البضاعة كاملة لمقر/مستودع العميل بنجاح. نشكركم على ثقتكم في خدماتنا اللوجستية!`;
        break;
      case 'RETN':
        actionContext = `تم إرجاع الحاوية الفارغة لساحة التوكيل الملاحي بنجاح وجاري استرداد مبالغ التأمين للخزينة.`;
        break;
    }

    const message = `عزيزنا العميل ${job.customer_name}،\n` +
      `تحديث جديد بخصوص شحنتكم الملاحية [${job.job_number}]:\n` +
      `المرحلة الحالية: ${title}\n` +
      `${actionContext}\n\n` +
      `يمكنكم متابعة خط سير الشحنة لحظة بلحظة عبر رابط التتبع المباشر:\n` +
      `${trackingUrl}\n\n` +
      `فريق العمليات واللوجستيات — Z-Systems`;

    return {
      jobId: job.id,
      jobNumber: job.job_number,
      customerName: job.customer_name,
      customerPhone: (job as any).customer_phone || null,
      milestoneKey,
      milestoneTitle: title,
      message,
    };
  }

  // --------------------------------------------------------------------------
  // 7. Containers & Demurrage Radar
  // --------------------------------------------------------------------------
  async getContainers(auth: AuthContext, filters?: { overdueOnly?: boolean; depositHeldOnly?: boolean; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('maritime_containers as c')
      .innerJoin('maritime_jobs as j', 'j.id', 'c.job_id')
      .select([
        'c.id',
        'c.job_id',
        'c.container_number',
        'c.container_type',
        'c.seal_number',
        'c.free_days',
        'c.return_deadline',
        'c.is_overdue',
        'c.overdue_days',
        'c.demurrage_amount',
        'c.deposit_amount',
        'c.deposit_currency',
        'c.deposit_status',
        'c.empty_returned_at',
        'c.discharged_at',
        'c.gated_out_at',
        'j.job_number',
        'j.customer_name',
        'j.shipping_line_name',
        'j.vessel_name',
        'j.delivery_order_released'
      ])
      .where('c.tenant_id', '=', tenantId);

    if (filters?.overdueOnly) {
      query = query.where('c.is_overdue', '=', true);
    }

    if (filters?.depositHeldOnly) {
      query = query.where('c.deposit_status', '=', 'held_by_line');
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.where((eb) => eb.or([
        eb('c.container_number', 'ilike', term),
        eb('j.job_number', 'ilike', term),
        eb('j.customer_name', 'ilike', term)
      ]));
    }

    const rows = await query.orderBy('c.id', 'desc').execute();

    // Recalculate dynamic days remaining / countdown
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows.map((row) => {
      let daysRemaining: number | null = null;
      let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'green';

      if (row.empty_returned_at) {
        statusColor = 'gray'; // Completed
      } else if (row.return_deadline) {
        const deadline = new Date(row.return_deadline);
        deadline.setHours(0, 0, 0, 0);
        const diffTime = deadline.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          statusColor = 'red'; // Overdue
        } else if (daysRemaining <= 3) {
          statusColor = 'yellow'; // Critical warning
        } else {
          statusColor = 'green'; // Safe
        }
      }

      return {
        ...row,
        daysRemaining,
        statusColor,
      };
    });
  }

  async updateContainer(auth: AuthContext, containerId: string, dto: UpdateMaritimeContainerDto) {
    const { tenantId } = requireTenantScope(auth);
    const container = await this.db
      .selectFrom('maritime_containers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', containerId as any)
      .executeTakeFirst();

    if (!container) throw new NotFoundException('Container not found');

    const updatePayload: any = {
      updated_at: sql`NOW()`,
    };

    if (dto.sealNumber !== undefined) updatePayload.seal_number = dto.sealNumber;
    if (dto.gatedInAt !== undefined) updatePayload.gated_in_at = dto.gatedInAt ? new Date(dto.gatedInAt) : null;
    if (dto.vesselLoadedAt !== undefined) updatePayload.vessel_loaded_at = dto.vesselLoadedAt ? new Date(dto.vesselLoadedAt) : null;
    if (dto.dischargedAt !== undefined) updatePayload.discharged_at = dto.dischargedAt ? new Date(dto.dischargedAt) : null;
    if (dto.gatedOutAt !== undefined) updatePayload.gated_out_at = dto.gatedOutAt ? new Date(dto.gatedOutAt) : null;
    if (dto.emptyReturnedAt !== undefined) updatePayload.empty_returned_at = dto.emptyReturnedAt ? new Date(dto.emptyReturnedAt) : null;
    if (dto.freeDays !== undefined) updatePayload.free_days = dto.freeDays;
    if (dto.demurrageRatePerDay !== undefined) updatePayload.demurrage_rate_per_day = dto.demurrageRatePerDay;
    if (dto.depositAmount !== undefined) updatePayload.deposit_amount = dto.depositAmount;
    if (dto.depositCurrency !== undefined) updatePayload.deposit_currency = dto.depositCurrency;
    if (dto.depositStatus !== undefined) updatePayload.deposit_status = dto.depositStatus;
    if (dto.emptyReturnProofUrl !== undefined) updatePayload.empty_return_proof_url = dto.emptyReturnProofUrl;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    // Compute return deadline if discharged or gated out
    if (dto.dischargedAt || container.discharged_at) {
      const baseDate = new Date(dto.dischargedAt || container.discharged_at!);
      const freeDays = dto.freeDays || container.free_days || 14;
      const deadline = new Date(baseDate);
      deadline.setDate(deadline.getDate() + freeDays);
      updatePayload.return_deadline = deadline.toISOString().split('T')[0];

      const now = new Date();
      if (now > deadline && !dto.emptyReturnedAt && !container.empty_returned_at) {
        updatePayload.is_overdue = true;
        const diffDays = Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        updatePayload.overdue_days = diffDays;
        const rate = Number(dto.demurrageRatePerDay || container.demurrage_rate_per_day || 50);
        updatePayload.demurrage_amount = diffDays * rate;
      } else {
        updatePayload.is_overdue = false;
        updatePayload.overdue_days = 0;
      }
    }

    const [updated] = await this.db
      .updateTable('maritime_containers')
      .set(updatePayload)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', containerId as any)
      .returningAll()
      .execute();

    return updated;
  }

  // --------------------------------------------------------------------------
  // 8. Public Live Tracking for Clients (Flexport Standard)
  // --------------------------------------------------------------------------
  async getPublicTrackingByToken(token: string) {
    if (!token || token.length < 16) {
      throw new BadRequestException('Invalid tracking token');
    }

    const job = await this.db
      .selectFrom('maritime_jobs')
      .select([
        'id',
        'job_number',
        'customer_name',
        'direction',
        'shipping_line_name',
        'vessel_name',
        'voyage_number',
        'pol_code',
        'pol_name',
        'pod_code',
        'pod_name',
        'etd',
        'eta',
        'bl_type',
        'milestone_status',
        'status',
        'created_at'
      ])
      .where('tracking_token', '=', token)
      .executeTakeFirst();

    if (!job) {
      throw new NotFoundException('Tracking shipment not found or expired link');
    }

    const milestones = await this.db
      .selectFrom('maritime_job_milestones')
      .selectAll()
      .where('job_id', '=', String(job.id))
      .orderBy('occurred_at', 'asc')
      .execute();

    const containers = await this.db
      .selectFrom('maritime_containers')
      .select([
        'container_number',
        'container_type',
        'seal_number',
        'free_days',
        'return_deadline',
        'is_overdue',
        'empty_returned_at'
      ])
      .where('job_id', '=', String(job.id))
      .execute();

    return {
      shipment: job,
      milestones,
      containers,
      dcsaMilestones: DCSA_STANDARD_MILESTONES,
    };
  }
}
