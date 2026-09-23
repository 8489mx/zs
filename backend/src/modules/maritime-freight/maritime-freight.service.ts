import { Inject, Injectable, Logger, NotFoundException, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
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
import { CreateRateCardDto, UpdateRateCardStatusDto } from './dto/rate-card.dto';
import { CreateCustomsDeclarationDto, CreateCustomsDeclarationItemDto, UpdateCustomsDeclarationStatusDto } from './dto/customs-declaration.dto';
import { CreateCargoInsuranceDto, UpdateCargoInsuranceDto, ClaimCargoInsuranceDto } from './dto/cargo-insurance.dto';
import { CreateWarehouseReceiptDto, ReleaseWarehouseReceiptDto } from './dto/warehouse-receipt.dto';
import { DCSA_STANDARD_MILESTONES, DcsaMilestoneKey, MaritimePipelineConfig, DEFAULT_PIPELINE_CONFIG } from './maritime-freight.types';
import { IATA_CARGO_IQ_MILESTONES } from './engines/air-freight.engine';
import * as crypto from 'crypto';
import {
  DEFAULT_SHIPPING_LINES,
  DEFAULT_OVERSEAS_AGENTS,
  DEFAULT_SHIPPING_PORTS,
  DEFAULT_AIRLINES,
  DEFAULT_CARGO_AIRPORTS,
  DEFAULT_CONTAINER_TYPES,
  DEFAULT_INCOTERMS,
  DEFAULT_PORT_TERMINALS,
} from './maritime-defaults.data';
import { MaritimeMailService } from './maritime-mail.service';
import { WhatsAppGatewayService } from '../settings/services/whatsapp-gateway.service';
import { formatDailyDocumentNumber } from '../../common/utils/document-number.util';
import { calculateFreightAudit, validateMakerCheckerOverride } from './engines/freight-audit.engine';
import { checkInsuranceClaim } from './engines/cargo-insurance.engine';

@Injectable()
export class MaritimeFreightService {
  private readonly logger = new Logger(MaritimeFreightService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly maritimeMailService: MaritimeMailService,
    private readonly whatsAppGatewayService: WhatsAppGatewayService,
  ) {}

  /**
   * Ensures hardcoded master catalog (14 shipping lines, 27 overseas agents, 18 ports)
   * is seeded for the specified tenant. If records are missing, it safely seeds them
   * without overwriting existing client modifications.
   */
  async ensureDefaultMasterData(tenantId: string): Promise<{ portsAdded: number; linesAdded: number; agentsAdded: number; airlinesAdded: number; airportsAdded: number }> {
    if (!tenantId) return { portsAdded: 0, linesAdded: 0, agentsAdded: 0, airlinesAdded: 0, airportsAdded: 0 };

    let portsAdded = 0;
    let linesAdded = 0;
    let agentsAdded = 0;
    let airlinesAdded = 0;
    let airportsAdded = 0;

    try {
      // 1. Check & Seed Ports for this tenant
      const existingPorts = await this.db
        .selectFrom('shipping_ports')
        .select('code')
        .where('tenant_id', '=', tenantId)
        .execute();

      const existingPortCodes = new Set(existingPorts.map((p) => p.code));
      const missingPorts = DEFAULT_SHIPPING_PORTS.filter((p) => !existingPortCodes.has(p.code));

      for (const port of missingPorts) {
        await sql`
          INSERT INTO shipping_ports (tenant_id, code, name_ar, name_en, country_code, country_name, port_type, is_active)
          VALUES (${tenantId}, ${port.code}, ${port.name_ar}, ${port.name_en}, ${port.country_code}, ${port.country_name}, 'sea', true)
          ON CONFLICT (tenant_id, code) DO NOTHING
        `.execute(this.db);
        portsAdded++;
      }

      // 2. Check & Seed Shipping Lines for this tenant
      const existingLines = await this.db
        .selectFrom('shipping_lines')
        .select('code')
        .where('tenant_id', '=', tenantId)
        .where('carrier_type', '=', 'shipping_line')
        .execute();

      const existingLineCodes = new Set(existingLines.map((l) => l.code));
      const missingLines = DEFAULT_SHIPPING_LINES.filter((l) => !existingLineCodes.has(l.code));

      for (const line of missingLines) {
        await sql`
          INSERT INTO shipping_lines (
            tenant_id, code, name_ar, name_en, carrier_type, country_name, country_code,
            city_name, contact_person, email, rfq_email, booking_email, phone, whatsapp,
            wechat, trade_lanes, services_offered, supported_ports, notes, is_active
          )
          VALUES (
            ${tenantId}, ${line.code}, ${line.name_ar}, ${line.name_en}, 'shipping_line',
            ${line.country_name || null}, ${line.country_code || null}, ${line.city_name || null},
            ${line.contact_person || null}, ${line.email || null}, ${line.rfq_email || null},
            ${line.booking_email || null}, ${line.phone || null}, ${line.whatsapp || null},
            ${line.wechat || null}, ${line.trade_lanes || null}, ${line.services_offered || null},
            ${line.supported_ports || null}, ${line.notes || null}, true
          )
          ON CONFLICT (tenant_id, code) DO NOTHING
        `.execute(this.db);
        linesAdded++;
      }

      // 3. Check & Seed Overseas Agents for this tenant
      const existingAgents = await this.db
        .selectFrom('shipping_lines')
        .select('code')
        .where('tenant_id', '=', tenantId)
        .where('carrier_type', '=', 'overseas_agent')
        .execute();

      const existingAgentCodes = new Set(existingAgents.map((a) => a.code));
      const missingAgents = DEFAULT_OVERSEAS_AGENTS.filter((a) => !existingAgentCodes.has(a.code));

      for (const agent of missingAgents) {
        await sql`
          INSERT INTO shipping_lines (
            tenant_id, code, name_ar, name_en, carrier_type, country_name, country_code,
            city_name, contact_person, email, rfq_email, booking_email, phone, whatsapp,
            wechat, trade_lanes, services_offered, supported_ports, notes, is_active
          )
          VALUES (
            ${tenantId}, ${agent.code}, ${agent.name_ar}, ${agent.name_en}, 'overseas_agent',
            ${agent.country_name || null}, ${agent.country_code || null}, ${agent.city_name || null},
            ${agent.contact_person || null}, ${agent.email || null}, ${agent.rfq_email || null},
            ${agent.booking_email || null}, ${agent.phone || null}, ${agent.whatsapp || null},
            ${agent.wechat || null}, ${agent.trade_lanes || null}, ${agent.services_offered || null},
            ${agent.supported_ports || null}, ${agent.notes || null}, true
          )
          ON CONFLICT (tenant_id, code) DO NOTHING
        `.execute(this.db);
        agentsAdded++;
      }

      // 4. Check & Seed Airlines for this tenant
      const existingAirlines = await this.db
        .selectFrom('shipping_lines')
        .select('code')
        .where('tenant_id', '=', tenantId)
        .where('carrier_type', '=', 'airline')
        .execute();

      const existingAirlineCodes = new Set(existingAirlines.map((l) => l.code));
      const missingAirlines = DEFAULT_AIRLINES.filter((l) => !existingAirlineCodes.has(l.code));

      for (const airline of missingAirlines) {
        await sql`
          INSERT INTO shipping_lines (
            tenant_id, code, name_ar, name_en, carrier_type, airline_prefix, country_name, country_code,
            city_name, contact_person, email, rfq_email, booking_email, phone,
            trade_lanes, services_offered, notes, is_active
          )
          VALUES (
            ${tenantId}, ${airline.code}, ${airline.name_ar}, ${airline.name_en}, 'airline',
            ${airline.airline_prefix || null}, ${airline.country_name || null}, ${airline.country_code || null},
            ${airline.city_name || null}, ${airline.contact_person || null}, ${airline.email || null},
            ${airline.rfq_email || null}, ${airline.booking_email || null}, ${airline.phone || null},
            ${airline.trade_lanes || null}, ${airline.services_offered || null},
            ${airline.notes || null}, true
          )
          ON CONFLICT (tenant_id, code) DO NOTHING
        `.execute(this.db);
        airlinesAdded++;
      }

      // 5. Check & Seed Cargo Airports for this tenant
      const existingAirports = await this.db
        .selectFrom('shipping_ports')
        .select('code')
        .where('tenant_id', '=', tenantId)
        .where((eb) => eb.or([
          eb('port_type', '=', 'air'),
          eb('iata_code', 'is not', null)
        ]))
        .execute();

      const existingAirportCodes = new Set(existingAirports.map((p) => p.code));
      const missingAirports = DEFAULT_CARGO_AIRPORTS.filter((p) => !existingAirportCodes.has(p.code));

      for (const airport of missingAirports) {
        await sql`
          INSERT INTO shipping_ports (
            tenant_id, code, name_ar, name_en, country_code, country_name, port_type, iata_code, is_active
          )
          VALUES (
            ${tenantId}, ${airport.code}, ${airport.name_ar}, ${airport.name_en}, ${airport.country_code},
            ${airport.country_name}, 'air', ${airport.iata_code || airport.code}, true
          )
          ON CONFLICT (tenant_id, code) DO NOTHING
        `.execute(this.db);
        airportsAdded++;
      }

      if (portsAdded > 0 || linesAdded > 0 || agentsAdded > 0 || airlinesAdded > 0 || airportsAdded > 0) {
        this.logger.log(`Seeded maritime defaults for tenant ${tenantId}: ports=${portsAdded}, lines=${linesAdded}, agents=${agentsAdded}, airlines=${airlinesAdded}, airports=${airportsAdded}`);
      }
    } catch (err) {
      this.logger.error(`Error ensuring maritime defaults for tenant ${tenantId}:`, err);
    }

    return { portsAdded, linesAdded, agentsAdded, airlinesAdded, airportsAdded };
  }

  async seedDefaultMasterData(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    return await this.ensureDefaultMasterData(tenantId);
  }

  // --------------------------------------------------------------------------
  // 1. Ports Master Data
  // --------------------------------------------------------------------------
  async getPorts(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    await this.ensureDefaultMasterData(tenantId);
    const tenantPorts = await this.db
      .selectFrom('shipping_ports')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('name_ar', 'asc')
      .execute();

    if (tenantPorts.length > 0) {
      return tenantPorts;
    }

    return await this.db
      .selectFrom('shipping_ports')
      .selectAll()
      .where('tenant_id', '=', 'default')
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
    await this.ensureDefaultMasterData(tenantId);

    const buildQuery = (scopedTenantId: string) => {
      let q = this.db
        .selectFrom('shipping_lines')
        .selectAll()
        .where('tenant_id', '=', scopedTenantId)
        .where('is_active', '=', true);

      if (filters?.carrierType && filters.carrierType !== 'all') {
        q = q.where('carrier_type', '=', filters.carrierType as any);
      }

      if (filters?.tradeLane && filters.tradeLane !== 'all') {
        q = q.where('trade_lanes', 'like', `%${filters.tradeLane}%`);
      }

      if (filters?.countryCode && filters.countryCode !== 'all') {
        q = q.where('country_code', '=', filters.countryCode.toUpperCase());
      }

      if (filters?.search) {
        const term = `%${filters.search}%`;
        q = q.where((eb) => eb.or([
          eb('code', 'ilike', term),
          eb('name_ar', 'ilike', term),
          eb('name_en', 'ilike', term),
          eb('contact_person', 'ilike', term),
          eb('country_name', 'ilike', term),
          eb('city_name', 'ilike', term),
          eb('rfq_email', 'ilike', term)
        ]));
      }

      return q.orderBy('carrier_type', 'asc').orderBy('name_ar', 'asc');
    };

    const tenantLines = await buildQuery(tenantId).execute();
    if (tenantLines.length > 0) {
      return tenantLines;
    }

    // Fallback to default tenant catalog if tenant has not yet seeded
    return await buildQuery('default').execute();
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

  getReferenceData() {
    return {
      containerTypes: DEFAULT_CONTAINER_TYPES,
      incoterms: DEFAULT_INCOTERMS,
      portTerminals: DEFAULT_PORT_TERMINALS,
    };
  }

  async importCarriersBulk(auth: AuthContext, items: any[]) {
    const { tenantId } = requireTenantScope(auth);
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('قائمة البيانات المستوردة فارغة');
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      const code = String(item.code || '').trim().toUpperCase();
      const nameAr = String(item.nameAr || item.name_ar || '').trim();
      if (!code || !nameAr) continue;

      const carrierType = item.carrierType === 'overseas_agent' || item.carrier_type === 'overseas_agent'
        ? 'overseas_agent'
        : 'shipping_line';

      const existing = await this.db
        .selectFrom('shipping_lines')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('code', '=', code)
        .executeTakeFirst();

      if (existing) {
        await this.db
          .updateTable('shipping_lines')
          .set({
            name_ar: nameAr,
            name_en: item.nameEn || item.name_en || nameAr,
            carrier_type: carrierType,
            country_name: item.countryName || item.country_name || null,
            country_code: item.countryCode || item.country_code ? String(item.countryCode || item.country_code).toUpperCase() : null,
            city_name: item.cityName || item.city_name || null,
            contact_person: item.contactPerson || item.contact_person || null,
            email: item.email || null,
            rfq_email: item.rfqEmail || item.rfq_email || item.email || null,
            booking_email: item.bookingEmail || item.booking_email || null,
            phone: item.phone || null,
            whatsapp: item.whatsapp || null,
            wechat: item.wechat || null,
            trade_lanes: item.tradeLanes || item.trade_lanes || null,
            services_offered: item.servicesOffered || item.services_offered || null,
            supported_ports: item.supportedPorts || item.supported_ports || null,
            notes: item.notes || null,
            is_active: true,
            updated_at: sql`NOW()`,
          })
          .where('id', '=', existing.id)
          .where('tenant_id', '=', tenantId)
          .execute();
        updatedCount++;
      } else {
        await this.db
          .insertInto('shipping_lines')
          .values({
            tenant_id: tenantId,
            code,
            name_ar: nameAr,
            name_en: item.nameEn || item.name_en || nameAr,
            carrier_type: carrierType,
            country_name: item.countryName || item.country_name || null,
            country_code: item.countryCode || item.country_code ? String(item.countryCode || item.country_code).toUpperCase() : null,
            city_name: item.cityName || item.city_name || null,
            contact_person: item.contactPerson || item.contact_person || null,
            email: item.email || null,
            rfq_email: item.rfqEmail || item.rfq_email || item.email || null,
            booking_email: item.bookingEmail || item.booking_email || null,
            phone: item.phone || null,
            whatsapp: item.whatsapp || null,
            wechat: item.wechat || null,
            trade_lanes: item.tradeLanes || item.trade_lanes || null,
            services_offered: item.servicesOffered || item.services_offered || null,
            supported_ports: item.supportedPorts || item.supported_ports || null,
            notes: item.notes || null,
            is_active: true,
          })
          .execute();
        insertedCount++;
      }
    }

    return { insertedCount, updatedCount, totalProcessed: insertedCount + updatedCount };
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
  async createInquiry(auth: AuthContext, dto: CreateMaritimeInquiryDto) {
    const { tenantId } = requireTenantScope(auth);

    return await this.db.transaction().execute(async (trx) => {
      const tempNumber = `INQ-TMP-${crypto.randomUUID()}`;
      const [inquiry] = await trx
        .insertInto('maritime_inquiries')
        .values({
          tenant_id: tenantId,
          inquiry_number: tempNumber,
          customer_id: dto.customerId ? Number(dto.customerId) : null,
          customer_name: dto.customerName,
          customer_phone: dto.customerPhone || null,
          customer_email: dto.customerEmail || null,
          direction: dto.direction || 'import',
          transport_mode: dto.transportMode || 'sea',
          air_cargo_type: dto.airCargoType || null,
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
          volumetric_weight_kg: Number(dto.volumetricWeightKg || 0),
          chargeable_weight_kg: Number(dto.chargeableWeightKg || 0),
          total_cbm: Number(dto.totalCbm || dto.cbm || 0),
          package_count: dto.packageCount ? Number(dto.packageCount) : 0,
          flight_number: dto.flightNumber || null,
          flight_date: dto.flightDate || null,
          mawb_number: dto.mawbNumber || null,
          hawb_number: dto.hawbNumber || null,
          cbm: Number(dto.cbm || dto.totalCbm || 0),
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

      const finalNumber = formatDailyDocumentNumber('INQ', Number(inquiry.id));
      const [updated] = await trx
        .updateTable('maritime_inquiries')
        .set({ inquiry_number: finalNumber })
        .where('id', '=', inquiry.id)
        .where('tenant_id', '=', tenantId)
        .returningAll()
        .execute();

      return updated;
    });
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
      targetLineIds: targetLineIds || [],
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
  async createRfq(auth: AuthContext, dto: CreateMaritimeRfqDto) {
    const { tenantId } = requireTenantScope(auth);
    const pipelineConfig = await this.getTenantPipelineConfig(tenantId);

    const urgency = dto.urgencyLevel || 'standard';
    let cutOffDate: Date | null = null;
    if (dto.cutOffDeadline) {
      cutOffDate = new Date(dto.cutOffDeadline);
    } else {
      const hours = dto.cutOffHours && dto.cutOffHours > 0
        ? dto.cutOffHours
        : urgency === 'urgent'
          ? (pipelineConfig.rfqCutOffHoursUrgent || 6)
          : (pipelineConfig.rfqCutOffHoursStandard || 24);
      cutOffDate = new Date(Date.now() + hours * 3600 * 1000);
    }

    return await this.db.transaction().execute(async (trx) => {
      const tempNumber = `RFQ-TMP-${crypto.randomUUID()}`;
      const publicQuoteToken = crypto.randomBytes(16).toString('hex');
      const [rfq] = await trx
        .insertInto('maritime_rfqs')
        .values({
          tenant_id: tenantId,
          public_quote_token: publicQuoteToken,
          rfq_number: tempNumber,
          inquiry_id: dto.inquiryId ? String(dto.inquiryId) : null,
          customer_id: dto.customerId ? Number(dto.customerId) : null,
          customer_name: dto.customerName || null,
          customer_phone: dto.customerPhone || null,
          customer_email: dto.customerEmail || null,
          direction: dto.direction || 'import',
          transport_mode: dto.transportMode || 'sea',
          air_cargo_type: dto.airCargoType || null,
          gross_weight_kg: Number(dto.grossWeightKg || 0),
          volumetric_weight_kg: Number(dto.volumetricWeightKg || 0),
          chargeable_weight_kg: Number(dto.chargeableWeightKg || 0),
          total_cbm: Number(dto.totalCbm || 0),
          package_count: dto.packageCount ? Number(dto.packageCount) : 0,
          flight_number: dto.flightNumber || null,
          flight_date: dto.flightDate || null,
          mawb_number: dto.mawbNumber || null,
          hawb_number: dto.hawbNumber || null,
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
          urgency_level: urgency,
          cut_off_deadline: cutOffDate ? cutOffDate.toISOString() : null,
          auto_awarded: false,
          target_rate_max: dto.targetRateMax ? Number(dto.targetRateMax) : null,
          created_by: auth.userId ? Number(auth.userId) : null,
        })
        .returningAll()
        .execute();

      const finalNumber = formatDailyDocumentNumber('RFQ', Number(rfq.id));
      const [updatedRfq] = await trx
        .updateTable('maritime_rfqs')
        .set({ rfq_number: finalNumber })
        .where('id', '=', rfq.id)
        .where('tenant_id', '=', tenantId)
        .returningAll()
        .execute();

      if (dto.inquiryId) {
        await trx
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

      return updatedRfq;
    });
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

  async dispatchRfqEmails(auth: AuthContext, rfqId: string, customLineIds?: number[]) {
    const { tenantId } = requireTenantScope(auth);
    const rfq = await this.db
      .selectFrom('maritime_rfqs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', rfqId as any)
      .executeTakeFirst();

    if (!rfq) throw new NotFoundException('RFQ not found');

    const lineIds: number[] = Array.isArray(customLineIds) && customLineIds.length > 0
      ? customLineIds
      : (Array.isArray(rfq.target_line_ids) ? rfq.target_line_ids : []);

    if (lineIds.length === 0) {
      return { sentCount: 0, message: 'No target shipping lines selected' };
    }

    if (Array.isArray(customLineIds) && customLineIds.length > 0) {
      await this.db
        .updateTable('maritime_rfqs')
        .set({ target_line_ids: JSON.stringify(customLineIds) })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', rfqId as any)
        .execute();
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

    // Query tenant and core settings for dynamic tenant branding fallbacks
    const tenantRow = await this.db
      .selectFrom('tenants')
      .select(['business_name', 'owner_email', 'owner_phone'])
      .where('id', '=', tenantId)
      .executeTakeFirst();

    const companySettingsRows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenantId)
      .where('key', 'in', ['companyName', 'storeName', 'email', 'phone'])
      .execute();

    const companySettings = companySettingsRows.reduce<Record<string, string>>((acc, r) => {
      try { acc[r.key] = JSON.parse(r.value); } catch { acc[r.key] = r.value; }
      return acc;
    }, {});

    const defaultCompanyName = companySettings.companyName || companySettings.storeName || tenantRow?.business_name || 'إدارة العمليات واللوجستيات';
    const defaultCompanyEmail = companySettings.email || tenantRow?.owner_email || '';
    const defaultCompanyPhone = companySettings.phone || tenantRow?.owner_phone || '';

    const host = String(customMailConfig?.smtpHost || process.env.SMTP_HOST || '').trim();
    const port = Number(customMailConfig?.smtpPort || process.env.SMTP_PORT || 587);
    const user = String(customMailConfig?.smtpUser || process.env.SMTP_USER || '').trim();
    const pass = String(customMailConfig?.smtpPassword || process.env.SMTP_PASSWORD || '').trim();
    const rawFromEmail = String(customMailConfig?.fromEmail || '').trim();
    const fromEmail = (rawFromEmail && rawFromEmail.includes('@'))
      ? rawFromEmail
      : (user && user.includes('@') ? user : (defaultCompanyEmail || String(process.env.SMTP_FROM || '').trim()));
    const fromName = String(customMailConfig?.fromName?.trim() || defaultCompanyName).trim();

    let transporter: any = null;
    if (host && user && pass) {
      try {
        const nodemailer = require('nodemailer');
        transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        });
      } catch (err: any) {
        this.logger.warn(`Mailer config exists but failed to initialize: ${err?.message}`);
      }
    }

    const replacePlaceholders = (templateStr: string, carrierName: string) => {
      return templateStr
        .replace(/{{rfq_number}}/g, rfq.rfq_number || '')
        .replace(/{{carrier_name}}/g, carrierName || '')
        .replace(/{{pol_code}}/g, rfq.pol_code || '')
        .replace(/{{pod_code}}/g, rfq.pod_code || '')
        .replace(/{{pol_name}}/g, rfq.pol_name || '')
        .replace(/{{pod_name}}/g, rfq.pod_name || '')
        .replace(/{{container_count}}/g, String(rfq.container_count || 1))
        .replace(/{{container_type}}/g, rfq.container_type || '40HC')
        .replace(/{{cargo_mode}}/g, rfq.cargo_mode || 'FCL')
        .replace(/{{commodity}}/g, rfq.commodity_description || 'General Cargo')
        .replace(/{{target_free_days}}/g, String(rfq.target_free_days || 14))
        .replace(/{{incoterm}}/g, rfq.incoterm || 'FOB')
        .replace(/{{company_name}}/g, fromName)
        .replace(/{{company_email}}/g, fromEmail)
        .replace(/{{company_phone}}/g, defaultCompanyPhone);
    };

    const sendPromises = carriers.map(async (carrier) => {
      const targetEmail = carrier.rfq_email || carrier.email;
      if (!targetEmail) return;

      let subject = `[${rfq.rfq_number}] Freight Rate Inquiry: ${rfq.pol_code} to ${rfq.pod_code} (${rfq.container_count}x ${rfq.container_type})`;
      if (customMailConfig?.emailSubjectTemplate?.trim()) {
        subject = replacePlaceholders(customMailConfig.emailSubjectTemplate, carrier.name_en || carrier.name_ar || 'Carrier');
        if (!subject.includes(rfq.rfq_number)) {
          subject = `[${rfq.rfq_number}] ` + subject;
        }
      }

      const magicLinkUrl = `${process.env.APP_PUBLIC_URL || 'https://app.z-systems.io'}/portal/carrier-quote/${rfq.id}?carrier=${encodeURIComponent(carrier.code)}&token=${encodeURIComponent(rfq.public_quote_token || '')}`;

      const introHtml = customMailConfig?.emailIntroTemplate?.trim()
        ? `<p>${replacePlaceholders(customMailConfig.emailIntroTemplate, carrier.name_en || carrier.name_ar || 'Carrier').replace(/\n/g, '<br>')}</p>`
        : `<p>Dear <strong>${carrier.name_en || carrier.name_ar || 'Carrier'}</strong> Pricing Desk,</p>
           <p>Please provide your most competitive ocean freight spot rate for the following inquiry:</p>`;

      const signatureHtml = customMailConfig?.emailSignatureTemplate?.trim()
        ? `<div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 13px;">${replacePlaceholders(customMailConfig.emailSignatureTemplate, '').replace(/\n/g, '<br>')}</div>`
        : `<div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Best regards,<br><strong>${fromName}</strong> Operations Desk<br>${fromEmail}</div>`;

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #170e5e; margin-top: 0;">Ocean Freight Rate Inquiry</h2>
          ${introHtml}
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #e2e8f0; font-size: 13px;">
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Reference</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.rfq_number}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Port of Loading (POL)</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.pol_name} (${rfq.pol_code})</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Port of Discharge (POD)</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.pod_name} (${rfq.pod_code})</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Equipment</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.container_count} x ${rfq.container_type} (${rfq.cargo_mode})</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Commodity</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.commodity_description || 'General Cargo'}</td></tr>
            <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Target Free Days</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.target_free_days} Days at Destination</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Incoterm / Payment</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${rfq.incoterm} (${rfq.payment_term})</td></tr>
          </table>
          <p style="margin-top: 16px;">
            <a href="${magicLinkUrl}" style="background-color: #170e5e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Submit Your Quote Online Here
            </a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin-top: 12px;">Or simply reply directly to this email keeping [${rfq.rfq_number}] in the subject line.</p>
          ${signatureHtml}
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

          // Automatically archive sent RFQ email into IMAP Sent folder
          this.maritimeMailService
            .appendSentEmailToImap(tenantId, {
              fromName,
              fromEmail,
              to: targetEmail,
              subject,
              html,
            })
            .catch((err) => {
              this.logger.warn(`Failed to archive sent RFQ to IMAP Sent: ${err?.message}`);
            });
        } catch (err: any) {
          this.logger.error(`Failed to send RFQ email to ${targetEmail}: ${err?.message}`);
        }
      } else {
        this.logger.log(`[SIMULATION] RFQ Email dispatched to ${carrier.name_en} <${targetEmail}>: ${subject}`);
        sentCount++;
      }
    });

    await Promise.allSettled(sendPromises);

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
    let thcOrigin = 0;
    let thcDestination = 0;

    // Currency match with word boundaries
    if (/\b(?:EUR|€)\b/i.test(text)) currency = 'EUR';
    else if (/\b(?:SAR|ريال)\b/i.test(text)) currency = 'SAR';
    else if (/\b(?:EGP|جنيه|جنية)\b/i.test(text)) currency = 'EGP';

    // Ocean Freight Match
    const ofMatch = text.match(/(?:ocean\s*freight|base\s*rate|spot\s*rate|freight|rate|of|bas)(?:[^\d\n\r$]*?)[:=]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                    text.match(/(?:usd|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                    text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:usd|\$)/i);
    if (ofMatch && ofMatch[1]) {
      oceanFreight = parseFloat(ofMatch[1].replace(/,/g, ''));
    }

    // Free Days Match
    const fdMatch = text.match(/(?:free\s*(?:days|time)|detention|demurrage)(?:[^\d\n\r]*?)[:=]?\s*([0-9]{1,2})/i) ||
                    text.match(/([0-9]{1,2})\s*(?:days?\s*free|free\s*days?|f\/?d)/i);
    if (fdMatch && fdMatch[1]) {
      freeDays = parseInt(fdMatch[1], 10);
    }

    // Transit Time Match
    const ttMatch = text.match(/(?:transit\s*time|tt|transit)(?:[^\d\n\r]*?)[:=]?\s*([0-9]{1,2})/i);
    if (ttMatch && ttMatch[1]) {
      transitTimeDays = parseInt(ttMatch[1], 10);
    }

    // Origin THC
    const oThcMatch = text.match(/(?:origin\s*thc|thc\s*origin|o\.?thc)(?:[^\d\n\r$]*?)[:=]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (oThcMatch && oThcMatch[1]) {
      thcOrigin = parseFloat(oThcMatch[1].replace(/,/g, ''));
    }

    // Destination THC
    const dThcMatch = text.match(/(?:dest(?:ination)?\s*thc|thc\s*dest(?:ination)?|d\.?thc)(?:[^\d\n\r$]*?)[:=]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (dThcMatch && dThcMatch[1]) {
      thcDestination = parseFloat(dThcMatch[1].replace(/,/g, ''));
    }

    // Generic THC fallback
    if (!thcOrigin && !thcDestination) {
      const thcMatch = text.match(/thc\s*[:=]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      if (thcMatch && thcMatch[1]) {
        thcOrigin = parseFloat(thcMatch[1].replace(/,/g, ''));
      }
    }

    const totalEstimated = oceanFreight + thcOrigin + thcDestination;

    return {
      oceanFreight,
      currency,
      freeDays,
      transitTimeDays,
      thcOrigin,
      thcDestination,
      totalEstimated,
    };
  }

  // AI & Regex text parser for Carrier Booking Confirmations
  parseCarrierBookingText(rawText: string) {
    const text = String(rawText || '');
    let bookingNumber: string | null = null;
    let shippingLineName: string | null = null;
    let vesselName: string | null = null;
    let voyageNumber: string | null = null;
    let polName: string | null = null;
    let podName: string | null = null;
    let etd: string | null = null;
    let eta: string | null = null;
    let portCutOff: string | null = null;
    let mblNumber: string | null = null;
    const containers: Array<{ containerNumber: string; containerType: string }> = [];

    // 1. Detect Shipping Line
    const lines = [
      { name: 'Maersk Line', match: /\b(?:maersk|safmarine|sealand)\b/i },
      { name: 'MSC Mediterranean Shipping', match: /\bmsc\b/i },
      { name: 'CMA CGM', match: /\b(?:cma\s*cgm|cma)\b/i },
      { name: 'Hapag-Lloyd', match: /\bhapag(?:-lloyd)?\b/i },
      { name: 'Cosco Shipping Lines', match: /\bcosco\b/i },
      { name: 'Evergreen Line', match: /\bevergreen\b/i },
      { name: 'Ocean Network Express (ONE)', match: /\b(?:one|ocean\s*network\s*express)\b/i },
      { name: 'Yang Ming', match: /\byang\s*ming\b/i },
      { name: 'ZIM Integrated', match: /\bzim\b/i },
      { name: 'Wan Hai Lines', match: /\bwan\s*hai\b/i },
    ];
    for (const l of lines) {
      if (l.match.test(text)) {
        shippingLineName = l.name;
        break;
      }
    }

    // 2. Booking Number
    const bkgMatch = text.match(/(?:booking\s*(?:reference|ref|number|no|confirmation|#)|bkg\s*(?:no|#)?)\s*[:=]?\s*([A-Z0-9-]{5,30})/i) ||
                     text.match(/booking\s*[:=]\s*([A-Z0-9-]{5,30})/i) ||
                     text.match(/\b([0-9]{9})\b/);
    if (bkgMatch && bkgMatch[1]) {
      bookingNumber = bkgMatch[1].trim();
    }

    // 3. Vessel Name & Voyage
    const vesselMatch = text.match(/(?:vessel\s*(?:name)?|mother\s*vessel|ship\s*name)\s*[:=]?\s*([A-Za-z0-9\s.-]+?)(?=\s*(?:voyage|voy|etd|pol|pod|\n|$))/i);
    if (vesselMatch && vesselMatch[1]) {
      vesselName = vesselMatch[1].replace(/[\r\n]+/g, ' ').trim();
    }

    const voyMatch = text.match(/(?:voyage\s*(?:no|number|#)?|voy\s*(?:no|#)?)\s*[:=]?\s*([A-Z0-9-]{2,14})/i);
    if (voyMatch && voyMatch[1]) {
      voyageNumber = voyMatch[1].trim();
    }

    // Helper for date extraction
    const extractDate = (labelRegex: RegExp): string | null => {
      const match = text.match(labelRegex);
      if (!match || !match[1]) return null;
      const rawDate = match[1].trim();
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return rawDate;
    };

    // 4. ETD / ETA / Cut-off
    etd = extractDate(/(?:etd|departure\s*date|sailing\s*date|est\.?\s*dep\.?)\s*[:=]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);
    eta = extractDate(/(?:eta|arrival\s*date|est\.?\s*arr\.?)\s*[:=]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);
    portCutOff = extractDate(/(?:port\s*cut[- ]?off|cy\s*cut[- ]?off|closing\s*date|cargo\s*cut[- ]?off|cut[- ]?off)\s*[:=]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);

    // 5. POL / POD
    const polMatch = text.match(/(?:pol|port\s*of\s*loading|origin\s*port|from)\s*[:=]?\s*([A-Za-z0-9\s,.-]+?)(?=\s*(?:pod|port\s*of\s*discharge|to|etd|\n|$))/i);
    if (polMatch && polMatch[1]) {
      polName = polMatch[1].replace(/[\r\n]+/g, ' ').trim();
    }

    const podMatch = text.match(/(?:pod|port\s*of\s*discharge|destination\s*port|to)\s*[:=]?\s*([A-Za-z0-9\s,.-]+?)(?=\s*(?:eta|vessel|\n|$))/i);
    if (podMatch && podMatch[1]) {
      podName = podMatch[1].replace(/[\r\n]+/g, ' ').trim();
    }

    // 6. Master B/L Number
    const mblMatch = text.match(/(?:master\s*b\/?l|mbl|ocean\s*b\/?l|b\/?l\s*no)\s*[:=]?\s*([A-Z0-9-]{6,25})/i);
    if (mblMatch && mblMatch[1]) {
      mblNumber = mblMatch[1].trim();
    } else if (bookingNumber) {
      mblNumber = bookingNumber;
    }

    // 7. Containers Match (e.g. MSKU9482710)
    const containerRegex = /\b([A-Z]{4}\s?[0-9]{7})\b/g;
    let matchC: RegExpExecArray | null;
    const foundContainers = new Set<string>();
    while ((matchC = containerRegex.exec(text)) !== null) {
      const cleanNum = matchC[1].replace(/\s+/g, '').toUpperCase();
      if (!foundContainers.has(cleanNum)) {
        foundContainers.add(cleanNum);
        containers.push({
          containerNumber: cleanNum,
          containerType: /20/i.test(text) ? '20GP' : '40HC',
        });
      }
    }

    return {
      bookingNumber,
      shippingLineName,
      vesselName,
      voyageNumber,
      polName,
      podName,
      etd,
      eta,
      portCutOff,
      mblNumber,
      containers,
    };
  }

  // --------------------------------------------------------------------------
  // 5. Client Quotations Engine
  // --------------------------------------------------------------------------
  async createQuotation(auth: AuthContext, dto: CreateMaritimeQuotationDto) {
    const { tenantId } = requireTenantScope(auth);

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

    return await this.db.transaction().execute(async (trx) => {
      const tempNumber = `QUO-TMP-${crypto.randomUUID()}`;
      const [quote] = await trx
        .insertInto('maritime_quotations')
        .values({
          tenant_id: tenantId,
          quotation_number: tempNumber,
          inquiry_id: dto.inquiryId ? String(dto.inquiryId) : null,
          rfq_id: dto.rfqId || null,
          bid_id: dto.bidId || null,
          customer_id: dto.customerId || null,
          customer_name: dto.customerName,
          customer_phone: dto.customerPhone || null,
          customer_email: dto.customerEmail || null,
          transport_mode: dto.transportMode || 'sea',
          air_cargo_type: dto.airCargoType || null,
          gross_weight_kg: Number(dto.grossWeightKg || 0),
          volumetric_weight_kg: Number(dto.volumetricWeightKg || 0),
          chargeable_weight_kg: Number(dto.chargeableWeightKg || 0),
          total_cbm: Number(dto.totalCbm || 0),
          package_count: dto.packageCount ? Number(dto.packageCount) : 0,
          flight_number: dto.flightNumber || null,
          flight_date: dto.flightDate || null,
          mawb_number: dto.mawbNumber || null,
          hawb_number: dto.hawbNumber || null,
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

      const finalNumber = formatDailyDocumentNumber('QUO', Number(quote.id));
      const [updatedQuote] = await trx
        .updateTable('maritime_quotations')
        .set({ quotation_number: finalNumber })
        .where('id', '=', quote.id)
        .where('tenant_id', '=', tenantId)
        .returningAll()
        .execute();

      if (dto.inquiryId) {
        await trx
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

      return updatedQuote;
    });
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
  async createJob(auth: AuthContext, dto: CreateMaritimeJobDto) {
    const { tenantId } = requireTenantScope(auth);
    const trackingToken = crypto.randomBytes(16).toString('hex');

    return await this.db.transaction().execute(async (trx) => {
      const tempNumber = `JOB-TMP-${crypto.randomUUID()}`;

      // 1. Insert Job record first with tempNumber
      const [job] = await trx
        .insertInto('maritime_jobs')
        .values({
          tenant_id: tenantId,
          job_number: tempNumber,
          inquiry_id: dto.inquiryId ? String(dto.inquiryId) : null,
          quotation_id: dto.quotationId ? String(dto.quotationId) : null,
          rfq_id: dto.rfqId ? String(dto.rfqId) : null,
          customer_id: dto.customerId ? Number(dto.customerId) : null,
          customer_name: dto.customerName,
          direction: dto.direction || 'import',
          transport_mode: dto.transportMode || 'sea',
          air_cargo_type: dto.airCargoType || null,
          gross_weight_kg: Number(dto.grossWeightKg || 0),
          volumetric_weight_kg: Number(dto.volumetricWeightKg || 0),
          chargeable_weight_kg: Number(dto.chargeableWeightKg || 0),
          total_cbm: Number(dto.totalCbm || 0),
          package_count: dto.packageCount ? Number(dto.packageCount) : 0,
          flight_number: dto.flightNumber || null,
          flight_date: dto.flightDate || null,
          mawb_number: dto.mawbNumber || null,
          hawb_number: dto.hawbNumber || null,
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
          milestone_status: dto.transportMode === 'air' ? 'BKD' : 'BOOK',
          cost_center_id: null,
          tracking_token: trackingToken,
          delivery_address: dto.deliveryAddress || null,
          status: 'active',
          notes: dto.notes || null,
          created_by: auth.userId ? Number(auth.userId) : null,
        })
        .returningAll()
        .execute();

      const finalJobNumber = formatDailyDocumentNumber('JOB', Number(job.id));

      // 2. Automatically create an Accounting Cost Center under dimension = 'project'
      let costCenterId: string | null = null;
      try {
        const modeLabel = dto.transportMode === 'air' ? 'شحنة جوية' : dto.transportMode === 'road' ? 'شحنة برية' : 'شحنة بحرية';
        const [costCenter] = await trx
          .insertInto('cost_centers')
          .values({
            tenant_id: tenantId,
            code: finalJobNumber,
            name: `${modeLabel}: ${finalJobNumber} - ${dto.customerName}`,
            dimension: 'project',
            is_active: true,
            description: `مركز تكلفة تلقائي للعملية ${finalJobNumber} (${dto.polName} إلى ${dto.podName})`,
          })
          .returning('id')
          .execute();
        if (costCenter) {
          costCenterId = String(costCenter.id);
        }
      } catch (err: any) {
        this.logger.warn(`Could not auto-create cost center for ${finalJobNumber}: ${err?.message}`);
      }

      // 3. Update job with final job number and cost center
      const [updatedJob] = await trx
        .updateTable('maritime_jobs')
        .set({
          job_number: finalJobNumber,
          cost_center_id: costCenterId,
        })
        .where('id', '=', job.id)
        .where('tenant_id', '=', tenantId)
        .returningAll()
        .execute();

      // 4. Add initial milestone (DCSA BOOK for sea, Cargo iQ BKD for air)
      const isAir = dto.transportMode === 'air';
      await trx
        .insertInto('maritime_job_milestones')
        .values({
          tenant_id: tenantId,
          job_id: String(job.id),
          milestone_key: isAir ? 'BKD' : 'BOOK',
          milestone_title: isAir ? 'تأكيد حجز الشحنة الجوية (Air Cargo Booked)' : 'تأكيد الحجز الملاحي (Booking Confirmed)',
          location: dto.polName,
          notes: `تم فتح أمر التشغيل وتأكيد الحجز بنجاح برقم ${dto.bookingNumber || dto.mawbNumber || finalJobNumber}`,
          recorded_by: auth.userId ? Number(auth.userId) : null,
        })
        .execute();

      // 5. If containers provided, insert them
      if (dto.containers && dto.containers.length > 0) {
        for (const c of dto.containers) {
          await trx
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

      // 6. If linked to quotation, update quotation
      if (dto.quotationId) {
        await trx
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

      // 7. If linked to inquiry, update inquiry
      if (dto.inquiryId) {
        await trx
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

      return updatedJob;
    });
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
      transportMode: quote.transport_mode || rfq?.transport_mode || 'sea',
      airCargoType: quote.air_cargo_type || rfq?.air_cargo_type || null,
      grossWeightKg: Number(quote.gross_weight_kg || rfq?.gross_weight_kg || 0),
      volumetricWeightKg: Number(quote.volumetric_weight_kg || rfq?.volumetric_weight_kg || 0),
      chargeableWeightKg: Number(quote.chargeable_weight_kg || rfq?.chargeable_weight_kg || 0),
      totalCbm: Number(quote.total_cbm || rfq?.total_cbm || 0),
      packageCount: quote.package_count || rfq?.package_count || 0,
      flightNumber: quote.flight_number || rfq?.flight_number || null,
      flightDate: quote.flight_date || rfq?.flight_date || null,
      mawbNumber: quote.mawb_number || rfq?.mawb_number || null,
      hawbNumber: quote.hawb_number || rfq?.hawb_number || null,
      paymentTerm: quote.payment_term,
      shippingLineId: bid?.shipping_line_id || null,
      shippingLineName: bid?.shipping_line_name || (quote.transport_mode === 'air' ? 'شركة طيران معتمدة' : 'خط ملاحي معتمد'),
      polCode: rfq?.pol_code || 'CNSHA',
      polName: rfq?.pol_name || (quote.transport_mode === 'air' ? 'مطار الشحن' : 'ميناء الشحن'),
      podCode: rfq?.pod_code || 'CAI',
      podName: rfq?.pod_name || (quote.transport_mode === 'air' ? 'مطار الوصول' : 'ميناء الوصول'),
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

    const insurances = await this.db
      .selectFrom('maritime_cargo_insurances')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('job_id', '=', id as any)
      .orderBy('id', 'desc')
      .execute();

    const warehouseReceipts = await this.db
      .selectFrom('maritime_warehouse_receipts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('job_id', '=', id as any)
      .orderBy('id', 'desc')
      .execute();

    let customerBalance = 0;
    let customerAvailableCredit = 0;
    if (job.customer_id) {
      const cust = await this.db
        .selectFrom('customers')
        .select(['balance'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', job.customer_id as any)
        .executeTakeFirst();
      if (cust) {
        customerBalance = Number(cust.balance || 0);
        customerAvailableCredit = Math.max(0, -customerBalance);
      }
    }

    return {
      ...job,
      customerBalance,
      customerAvailableCredit,
      containers,
      milestones,
      insurances: insurances || [],
      warehouseReceipts: warehouseReceipts || [],
      dcsaDefinitions: DCSA_STANDARD_MILESTONES,
      cargoIqDefinitions: IATA_CARGO_IQ_MILESTONES,
    };
  }

  async updateJob(auth: AuthContext, id: string, dto: any) {
    const { tenantId } = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('maritime_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!existing) throw new NotFoundException('Shipment Job not found');

    const updatePayload: any = {
      updated_at: sql`NOW()`,
    };

    if (dto.transportMode !== undefined) updatePayload.transport_mode = dto.transportMode;
    if (dto.airCargoType !== undefined) updatePayload.air_cargo_type = dto.airCargoType || null;
    if (dto.flightNumber !== undefined) updatePayload.flight_number = dto.flightNumber || null;
    if (dto.flightDate !== undefined) updatePayload.flight_date = dto.flightDate || null;
    if (dto.mawbNumber !== undefined) updatePayload.mawb_number = dto.mawbNumber || null;
    if (dto.hawbNumber !== undefined) updatePayload.hawb_number = dto.hawbNumber || null;
    if (dto.grossWeightKg !== undefined) updatePayload.gross_weight_kg = Number(dto.grossWeightKg || 0);
    if (dto.volumetricWeightKg !== undefined) updatePayload.volumetric_weight_kg = Number(dto.volumetricWeightKg || 0);
    if (dto.chargeableWeightKg !== undefined) updatePayload.chargeable_weight_kg = Number(dto.chargeableWeightKg || 0);
    if (dto.totalCbm !== undefined) updatePayload.total_cbm = Number(dto.totalCbm || 0);
    if (dto.packageCount !== undefined) updatePayload.package_count = Number(dto.packageCount || 0);
    if (dto.vesselName !== undefined) updatePayload.vessel_name = dto.vesselName || null;
    if (dto.voyageNumber !== undefined) updatePayload.voyage_number = dto.voyageNumber || null;
    if (dto.bookingNumber !== undefined) updatePayload.booking_number = dto.bookingNumber || null;
    if (dto.polCode !== undefined) updatePayload.pol_code = dto.polCode;
    if (dto.polName !== undefined) updatePayload.pol_name = dto.polName;
    if (dto.podCode !== undefined) updatePayload.pod_code = dto.podCode;
    if (dto.podName !== undefined) updatePayload.pod_name = dto.podName;
    if (dto.etd !== undefined) updatePayload.etd = dto.etd || null;
    if (dto.eta !== undefined) updatePayload.eta = dto.eta || null;
    if (dto.portCutOff !== undefined) updatePayload.port_cut_off = dto.portCutOff || null;
    if (dto.blType !== undefined) updatePayload.bl_type = dto.blType;
    if (dto.mblNumber !== undefined) updatePayload.mbl_number = dto.mblNumber || null;
    if (dto.hblNumber !== undefined) updatePayload.hbl_number = dto.hblNumber || null;
    if (dto.shipperDetails !== undefined) updatePayload.shipper_details = dto.shipperDetails || null;
    if (dto.consigneeDetails !== undefined) updatePayload.consignee_details = dto.consigneeDetails || null;
    if (dto.notifyParty !== undefined) updatePayload.notify_party = dto.notifyParty || null;
    if (dto.shippingLineId !== undefined) updatePayload.shipping_line_id = dto.shippingLineId || null;
    if (dto.shippingLineName !== undefined) updatePayload.shipping_line_name = dto.shippingLineName;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes || null;

    const [updatedJob] = await this.db
      .updateTable('maritime_jobs')
      .set(updatePayload)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    return updatedJob;
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
            .where('tenant_id', '=', tenantId)
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

    // Automated Proactive WhatsApp Notification on Milestone Change
    try {
      let customerPhone: string | null = null;
      if (updatedJob.customer_id) {
        const cust = await this.db
          .selectFrom('customers')
          .select(['phone'])
          .where('id', '=', updatedJob.customer_id as any)
          .executeTakeFirst();
        customerPhone = cust?.phone || null;
      }
      if (!customerPhone && (updatedJob as any).customer_phone) {
        customerPhone = (updatedJob as any).customer_phone;
      }

      if (customerPhone) {
        const msgData = await this.getMilestoneWhatsAppMessage(auth, jobId, milestoneKey);
        await this.whatsAppGatewayService.sendRawMessage(tenantId, customerPhone, msgData.message);
        this.logger.log(`Auto-sent WhatsApp milestone update to ${customerPhone} for job ${updatedJob.job_number}`);
      }
    } catch (err: any) {
      this.logger.debug(`Could not auto-send milestone WhatsApp for job ${jobId}: ${err?.message}`);
    }

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

  async sendMilestoneWhatsApp(auth: AuthContext, jobId: string, milestoneKey: DcsaMilestoneKey, targetPhone?: string) {
    const { tenantId } = requireTenantScope(auth);
    const msgData = await this.getMilestoneWhatsAppMessage(auth, jobId, milestoneKey);
    let phone = targetPhone || msgData.customerPhone;

    if (!phone) {
      const job = await this.getJobById(auth, jobId);
      if (job.customer_id) {
        const cust = await this.db
          .selectFrom('customers')
          .select(['phone'])
          .where('id', '=', job.customer_id as any)
          .executeTakeFirst();
        phone = cust?.phone || null;
      }
    }

    if (!phone) {
      return { success: false, message: 'لا يوجد رقم هاتف مسجل للعميل' };
    }

    const res = await this.whatsAppGatewayService.sendRawMessage(tenantId, phone, msgData.message);
    return res;
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

  async createContainer(auth: AuthContext, dto: any) {
    const { tenantId } = requireTenantScope(auth);

    let depositStatus: 'not_required' | 'held_by_line' = 'not_required';
    if (dto.depositAmount && Number(dto.depositAmount) > 0) {
      depositStatus = 'held_by_line';
    }

    const [inserted] = await this.db
      .insertInto('maritime_containers')
      .values({
        tenant_id: tenantId,
        job_id: dto.jobId,
        container_number: (dto.containerNumber || '').toUpperCase(),
        container_type: dto.containerType || "40' HC",
        seal_number: dto.sealNumber || null,
        gross_weight_kg: Number(dto.grossWeightKg) || 0,
        cbm: Number(dto.cbm) || 0,
        free_days: Number(dto.freeDays) || 14,
        return_deadline: dto.returnDeadline || null,
        demurrage_rate_per_day: Number(dto.demurrageRatePerDay) || 0,
        deposit_amount: Number(dto.depositAmount) || 0,
        deposit_currency: dto.depositCurrency || 'USD',
        deposit_status: depositStatus,
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    return inserted;
  }

  // --------------------------------------------------------------------------
  // 8. Public Live Tracking for Clients (Flexport Standard)
  // --------------------------------------------------------------------------
  async getPublicTrackingByToken(token: string) {
    if (!token || token.trim().length === 0) {
      throw new BadRequestException('رمز التتبع غير صحيح');
    }

    const cleanToken = token.trim();

    const job = await this.db
      .selectFrom('maritime_jobs')
      .selectAll()
      .where((eb) => eb.or([
        eb('tracking_token', '=', cleanToken),
        eb('job_number', '=', cleanToken),
        eb('mbl_number', '=', cleanToken),
        eb('hbl_number', '=', cleanToken),
        eb('booking_number', '=', cleanToken),
      ]))
      .executeTakeFirst();

    if (!job) {
      throw new NotFoundException('الشحنة المطلوبة غير موجودة أو انتهت صلاحية الرابط');
    }

    const tenantId = job.tenant_id;

    const milestones = await this.db
      .selectFrom('maritime_job_milestones')
      .selectAll()
      .where('job_id', '=', String(job.id))
      .orderBy('occurred_at', 'asc')
      .execute();

    const containers = await this.db
      .selectFrom('maritime_containers')
      .selectAll()
      .where('job_id', '=', String(job.id))
      .execute();

    // Fetch company branding settings
    const companySettingsRows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenantId)
      .where('key', 'in', ['companyName', 'storeName', 'email', 'phone', 'logo'])
      .execute();

    const companySettings = companySettingsRows.reduce<Record<string, string>>((acc, r) => {
      try { acc[r.key] = JSON.parse(r.value); } catch { acc[r.key] = r.value; }
      return acc;
    }, {});

    return {
      shipment: job,
      job: {
        id: job.id,
        jobNumber: job.job_number,
        bookingNumber: job.booking_number,
        mblNumber: job.mbl_number,
        hblNumber: job.hbl_number,
        vesselName: job.vessel_name,
        voyageNumber: job.voyage_number,
        direction: job.direction,
        paymentTerm: job.payment_term,
        shippingLineName: job.shipping_line_name,
        polCode: job.pol_code,
        polName: job.pol_name,
        podCode: job.pod_code,
        podName: job.pod_name,
        etd: job.etd,
        eta: job.eta,
        portCutOff: job.port_cut_off,
        milestoneStatus: job.milestone_status,
        deliveryOrderReleased: job.delivery_order_released,
        deliveryOrderReleasedAt: job.delivery_order_released_at,
        customerName: job.customer_name,
        status: job.status,
      },
      milestones: milestones.map((m) => ({
        id: m.id,
        key: m.milestone_key,
        title: m.milestone_title,
        occurredAt: m.occurred_at,
        location: m.location,
        notes: m.notes,
      })),
      containers: containers.map((c) => ({
        id: c.id,
        containerNumber: c.container_number,
        containerType: c.container_type,
        sealNumber: c.seal_number,
        grossWeightKg: c.gross_weight_kg,
        cbm: c.cbm,
        freeDays: c.free_days,
        returnDeadline: c.return_deadline,
        isOverdue: c.is_overdue,
        overdueDays: c.overdue_days,
        dischargedAt: c.discharged_at,
        gatedOutAt: c.gated_out_at,
        emptyReturnedAt: c.empty_returned_at,
      })),
      dcsaMilestones: DCSA_STANDARD_MILESTONES,
      dcsaDefinitions: DCSA_STANDARD_MILESTONES,
      company: {
        name: companySettings.companyName || companySettings.storeName || 'منظومة Z-Systems للشحن الملاحي',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        logo: companySettings.logo || null,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 9. Public Carrier Quote Portal (Magic Links)
  // --------------------------------------------------------------------------
  // `id` is a sequential, tenant-shared BIGINT — never trust it alone on a public
  // route. Every public quote/bid link must also carry the per-RFQ secret token.
  private assertValidPublicQuoteToken<T extends { public_quote_token: string | null }>(
    rfq: T | undefined,
    token?: string,
  ): asserts rfq is T {
    const cleanToken = String(token || '').trim();
    if (!rfq || !rfq.public_quote_token || !cleanToken || rfq.public_quote_token !== cleanToken) {
      throw new NotFoundException('RFQ not found or invalid link');
    }
  }

  async getPublicRfqForQuote(rfqId: string, token: string, carrierCode?: string) {
    const rfq = await this.db
      .selectFrom('maritime_rfqs')
      .selectAll()
      .where('id', '=', rfqId as any)
      .executeTakeFirst();

    this.assertValidPublicQuoteToken(rfq, token);

    let carrier: any = null;
    if (carrierCode) {
      carrier = await this.db
        .selectFrom('shipping_lines')
        .selectAll()
        .where('code', '=', carrierCode)
        .executeTakeFirst();
    }

    // Get company/tenant branding
    const companySettingsRows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', rfq.tenant_id)
      .where('key', 'in', ['companyName', 'storeName', 'email', 'phone'])
      .execute();

    const companySettings = companySettingsRows.reduce<Record<string, string>>((acc, r) => {
      try { acc[r.key] = JSON.parse(r.value); } catch { acc[r.key] = r.value; }
      return acc;
    }, {});

    return {
      rfq: {
        id: rfq.id,
        rfq_number: rfq.rfq_number,
        direction: rfq.direction,
        pol_code: rfq.pol_code,
        pol_name: rfq.pol_name,
        pod_code: rfq.pod_code,
        pod_name: rfq.pod_name,
        cargo_mode: rfq.cargo_mode,
        container_type: rfq.container_type,
        container_count: rfq.container_count,
        commodity_description: rfq.commodity_description,
        cargo_nature: rfq.cargo_nature,
        cargo_ready_date: rfq.cargo_ready_date,
        target_free_days: rfq.target_free_days,
        incoterm: rfq.incoterm,
        payment_term: rfq.payment_term,
        status: rfq.status,
      },
      carrier: carrier ? {
        id: carrier.id,
        code: carrier.code,
        name_ar: carrier.name_ar,
        name_en: carrier.name_en,
        carrier_type: carrier.carrier_type,
      } : null,
      company: {
        name: companySettings.companyName || companySettings.storeName || 'منصة Z-Systems اللوجستية',
        email: companySettings.email || '',
        phone: companySettings.phone || '',
      }
    };
  }

  async submitPublicCarrierBid(rfqId: string, dto: any) {
    const rfq = await this.db
      .selectFrom('maritime_rfqs')
      .selectAll()
      .where('id', '=', rfqId as any)
      .executeTakeFirst();

    this.assertValidPublicQuoteToken(rfq, dto?.token);

    const oceanFreight = Number(dto.oceanFreight || 0);
    const thcOrigin = Number(dto.thcOrigin || 0);
    const thcDestination = Number(dto.thcDestination || 0);
    const bafCharges = Number(dto.bafCharges || 0);
    const otherCharges = Number(dto.otherCharges || 0);
    const totalFreightCost = oceanFreight + thcOrigin + thcDestination + bafCharges + otherCharges;

    const [bid] = await this.db
      .insertInto('maritime_rfq_bids')
      .values({
        tenant_id: rfq.tenant_id,
        rfq_id: String(rfq.id),
        shipping_line_id: dto.shippingLineId ? String(dto.shippingLineId) : null,
        shipping_line_name: dto.shippingLineName || dto.lineName || 'Online Carrier Bid',
        ocean_freight: oceanFreight,
        currency: dto.currency || 'USD',
        thc_origin: thcOrigin,
        thc_destination: thcDestination,
        baf_charges: bafCharges,
        other_charges: otherCharges,
        total_freight_cost: totalFreightCost,
        transit_time_days: dto.transitTimeDays || 0,
        free_days: dto.freeDays || rfq.target_free_days || 14,
        validity_date: dto.validityDate || null,
        submission_channel: 'carrier_portal',
        raw_bid_data: JSON.stringify(dto),
        notes: dto.notes || null,
      })
      .returningAll()
      .execute();

    // Update RFQ status to bids_received
    await this.db
      .updateTable('maritime_rfqs')
      .set({ status: 'bids_received', updated_at: sql`NOW()` })
      .where('id', '=', rfqId as any)
      .where('tenant_id', '=', rfq.tenant_id)
      .execute();

    return bid;
  }

  // --------------------------------------------------------------------------
  // 10. Financial Accounting & Cost Center Posting
  // --------------------------------------------------------------------------
  private async resolveAccountId(tenantId: string, code: string, fallbackCode?: string): Promise<number | null> {
    const acc = await this.db
      .selectFrom('accounting_accounts')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('code', '=', code)
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (acc) return Number(acc.id);
    if (fallbackCode) {
      const fallback = await this.db
        .selectFrom('accounting_accounts')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('code', '=', fallbackCode)
        .where('is_active', '=', true)
        .executeTakeFirst();
      if (fallback) return Number(fallback.id);
    }
    return null;
  }

  /**
   * Fiscal period lock check shared by every ad-hoc journal posted in this file outside the
   * canonical accounting-posting service. Same string-date comparison as insertPostedJournal.
   */
  private async assertMaritimeJournalPeriodOpen(trx: any, tenantId: string, entryDate: Date): Promise<void> {
    const entryDateStr = entryDate.toISOString().slice(0, 10);
    const settings = await trx
      .selectFrom('accounting_settings')
      .select(['lock_date_all'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', 1)
      .executeTakeFirst();
    const lockAllStr = settings?.lock_date_all ? String(settings.lock_date_all).slice(0, 10) : '';
    if (lockAllStr && entryDateStr <= lockAllStr) {
      throw new BadRequestException(
        `الفترة المحاسبية مقفلة نهائياً حتى تاريخ ${lockAllStr}. لا يمكن الترحيل في فترة مغلقة.`,
      );
    }
  }

  async issueJobSalesInvoice(auth: AuthContext, jobId: string, dto?: { amount?: number; notes?: string }) {
    const { tenantId } = requireTenantScope(auth);
    const job = await this.getJobById(auth, jobId);

    // 1. Ensure cost center exists
    let costCenterId = job.cost_center_id ? Number(job.cost_center_id) : null;
    if (!costCenterId) {
      try {
        const [newCc] = await this.db
          .insertInto('cost_centers')
          .values({
            tenant_id: tenantId,
            code: job.job_number,
            name: `شحنة بحرية: ${job.job_number} - ${job.customer_name}`,
            dimension: 'project',
            is_active: true,
            description: `مركز تكلفة تلقائي للعملية الملاحية ${job.job_number}`,
          })
          .returning('id')
          .execute();
        if (newCc) {
          costCenterId = Number(newCc.id);
          await this.db
            .updateTable('maritime_jobs')
            .set({ cost_center_id: String(costCenterId) })
            .where('id', '=', job.id as any)
            .where('tenant_id', '=', tenantId)
            .execute();
        }
      } catch {
        // ignore
      }
    }

    const invoiceAmount = Number(dto?.amount ?? (Number(job.client_invoiced_total) || 0));
    if (invoiceAmount <= 0) {
      throw new BadRequestException('يجب تحديد مبلغ صالح للفاتورة أكبر من صفر');
    }

    // Resolve accounts: Customer Receivable (1130), Service Revenue (4200 or 4100).
    // Previously "if (customerAccId && revenueAccId)" silently skipped the journal when either
    // account was missing, while client_invoiced_total was still updated unconditionally below --
    // recognising revenue on the job record with nothing behind it in the general ledger, and the
    // return message still claimed the invoice was issued AND posted. Now this throws, and the
    // whole operation is one transaction so a failure here touches nothing.
    const customerAccId = await this.resolveAccountId(tenantId, '1130');
    const revenueAccId = await this.resolveAccountId(tenantId, '4200', '4100');
    if (!customerAccId || !revenueAccId) {
      throw new BadRequestException(
        'تعذر إصدار فاتورة المبيعات: حساب ذمم العملاء (1130) أو حساب إيراد الخدمات (4200/4100) غير متاح في شجرة الحسابات.',
      );
    }

    const entryDate = new Date();
    const desc = dto?.notes || `فاتورة مبيعات خدمات ملاحية - العملية #${job.job_number} (${job.customer_name})`;

    const { updatedJob, entryId, entryNo } = await this.db.transaction().execute(async (trx: any) => {
      await this.assertMaritimeJournalPeriodOpen(trx, tenantId, entryDate);

      const [inserted] = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: `JRN-TMP-${job.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          tenant_id: tenantId,
          account_id: tenantId,
          entry_date: entryDate,
          description: desc,
          source_type: 'maritime_job',
          source_id: Number(job.id),
          status: 'posted',
          created_by: auth.userId ? Number(auth.userId) : null,
          posted_by: auth.userId ? Number(auth.userId) : null,
          posted_at: sql`NOW()`,
        })
        .returning('id')
        .execute();

      const newEntryId = Number(inserted.id);
      const newEntryNo = `JE-${String(newEntryId).padStart(8, '0')}`;
      await trx
        .updateTable('journal_entries')
        .set({ entry_no: newEntryNo, updated_at: sql`NOW()` })
        .where('id', '=', newEntryId)
        .where('tenant_id', '=', tenantId)
        .execute();

      // Line 1: Debit Customer Receivable (1130)
      // Line 2: Credit Service Revenue (4200)
      await trx
        .insertInto('journal_entry_lines')
        .values([
          {
            journal_entry_id: newEntryId,
            tenant_id: tenantId,
            account_id: customerAccId,
            cost_center_id: costCenterId,
            description: `مستحق فاتورة شحن بحري - ${job.job_number}`,
            debit: invoiceAmount,
            credit: 0,
            partner_type: 'customer',
            partner_id: job.customer_id ? Number(job.customer_id) : null,
          },
          {
            journal_entry_id: newEntryId,
            tenant_id: tenantId,
            account_id: revenueAccId,
            cost_center_id: costCenterId,
            description: `إيراد خدمات ونولون ملاحي - ${job.job_number}`,
            debit: 0,
            credit: invoiceAmount,
            partner_type: 'none',
            partner_id: null,
          },
        ])
        .execute();

      const carrierCost = Number(job.carrier_cost_total || 0);
      const otherCosts = Number(job.other_costs_total || 0);
      const netProfit = invoiceAmount - (carrierCost + otherCosts);

      const [updated] = await trx
        .updateTable('maritime_jobs')
        .set({
          client_invoiced_total: invoiceAmount,
          net_profit: netProfit,
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', job.id as any)
        .returningAll()
        .execute();

      return { updatedJob: updated, entryId: newEntryId, entryNo: newEntryNo };
    });

    return {
      success: true,
      job: updatedJob,
      journalEntryId: entryId,
      entryNo,
      amount: invoiceAmount,
      message: `تم إصدار وترحيل فاتورة المبيعات للعملية #${job.job_number} بقيمة ${invoiceAmount} بنجاح`,
    };
  }

  async recordJobExpenseVoucher(
    auth: AuthContext,
    jobId: string,
    dto: {
      amount: number;
      expenseType?: 'carrier' | 'port' | 'other';
      paymentMethod?: 'payable' | 'cash' | 'bank';
      supplierId?: number;
      supplierName?: string;
      description?: string;
    },
  ) {
    const { tenantId } = requireTenantScope(auth);
    const job = await this.getJobById(auth, jobId);

    const amount = Number(dto.amount || 0);
    if (amount <= 0) {
      throw new BadRequestException('يجب تحديد مبلغ صالح للمصروف أكبر من صفر');
    }

    // 1. Ensure cost center exists
    let costCenterId = job.cost_center_id ? Number(job.cost_center_id) : null;
    if (!costCenterId) {
      try {
        const [newCc] = await this.db
          .insertInto('cost_centers')
          .values({
            tenant_id: tenantId,
            code: job.job_number,
            name: `شحنة بحرية: ${job.job_number} - ${job.customer_name}`,
            dimension: 'project',
            is_active: true,
            description: `مركز تكلفة تلقائي للعملية الملاحية ${job.job_number}`,
          })
          .returning('id')
          .execute();
        if (newCc) {
          costCenterId = Number(newCc.id);
          await this.db
            .updateTable('maritime_jobs')
            .set({ cost_center_id: String(costCenterId) })
            .where('id', '=', job.id as any)
            .where('tenant_id', '=', tenantId)
            .execute();
        }
      } catch {
        // ignore
      }
    }

    // 2. Resolve accounts.
    // Same fix as issueJobSalesInvoice: previously "if (expenseAccId && creditAccId)" silently
    // skipped the journal while carrier_cost_total / other_costs_total were still bumped
    // unconditionally below -- a cost recognised on the job with no journal entry behind it.
    const expenseAccId = await this.resolveAccountId(tenantId, '6400', '5100');

    let creditAccCode = '2110';
    let partnerType: 'supplier' | 'none' = 'supplier';
    if (dto.paymentMethod === 'cash') {
      creditAccCode = '1110';
      partnerType = 'none';
    } else if (dto.paymentMethod === 'bank') {
      creditAccCode = '1120';
      partnerType = 'none';
    }
    const creditAccId = await this.resolveAccountId(tenantId, creditAccCode);

    if (!expenseAccId || !creditAccId) {
      throw new BadRequestException(
        `تعذر تسجيل سند المصروفات: حساب المصروف (6400/5100) أو حساب السداد (${creditAccCode}) غير متاح في شجرة الحسابات.`,
      );
    }

    const entryDate = new Date();
    const desc = dto.description || `سند مصروفات ملاحية (${dto.expenseType === 'carrier' ? 'نولون الخط الملاحي' : 'مصروفات موانئ وتخليص'}) - العملية #${job.job_number}`;

    const { updatedJob, entryId, entryNo } = await this.db.transaction().execute(async (trx: any) => {
      await this.assertMaritimeJournalPeriodOpen(trx, tenantId, entryDate);

      const [inserted] = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: `JRN-TMP-${job.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          tenant_id: tenantId,
          account_id: tenantId,
          entry_date: entryDate,
          description: desc,
          source_type: 'maritime_job_expense',
          source_id: Number(job.id),
          status: 'posted',
          created_by: auth.userId ? Number(auth.userId) : null,
          posted_by: auth.userId ? Number(auth.userId) : null,
          posted_at: sql`NOW()`,
        })
        .returning('id')
        .execute();

      const newEntryId = Number(inserted.id);
      const newEntryNo = `JE-${String(newEntryId).padStart(8, '0')}`;
      await trx
        .updateTable('journal_entries')
        .set({ entry_no: newEntryNo, updated_at: sql`NOW()` })
        .where('id', '=', newEntryId)
        .where('tenant_id', '=', tenantId)
        .execute();

      await trx
        .insertInto('journal_entry_lines')
        .values([
          {
            journal_entry_id: newEntryId,
            tenant_id: tenantId,
            account_id: expenseAccId,
            cost_center_id: costCenterId,
            description: desc,
            debit: amount,
            credit: 0,
            partner_type: 'none',
            partner_id: null,
          },
          {
            journal_entry_id: newEntryId,
            tenant_id: tenantId,
            account_id: creditAccId,
            cost_center_id: costCenterId,
            description: desc,
            debit: 0,
            credit: amount,
            partner_type: partnerType,
            partner_id: dto.supplierId ? Number(dto.supplierId) : null,
          },
        ])
        .execute();

      let carrierCost = Number(job.carrier_cost_total || 0);
      let otherCosts = Number(job.other_costs_total || 0);

      if (dto.expenseType === 'carrier') {
        carrierCost += amount;
      } else {
        otherCosts += amount;
      }

      const revenue = Number(job.client_invoiced_total || 0);
      const netProfit = revenue - (carrierCost + otherCosts);

      const [updated] = await trx
        .updateTable('maritime_jobs')
        .set({
          carrier_cost_total: carrierCost,
          other_costs_total: otherCosts,
          net_profit: netProfit,
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', job.id as any)
        .returningAll()
        .execute();

      return { updatedJob: updated, entryId: newEntryId, entryNo: newEntryNo };
    });

    return {
      success: true,
      job: updatedJob,
      journalEntryId: entryId,
      entryNo,
      amount,
      message: `تم تسجيل سند المصروفات الملاحية للعملية #${job.job_number} بقيمة ${amount} بنجاح`,
    };
  }

  async getJobFinancialLedger(auth: AuthContext, jobId: string) {
    const { tenantId } = requireTenantScope(auth);
    const job = await this.getJobById(auth, jobId);

    const costCenterId = job.cost_center_id ? Number(job.cost_center_id) : null;

    let query = this.db
      .selectFrom('journal_entries as je')
      .innerJoin('journal_entry_lines as jel', 'jel.journal_entry_id', 'je.id')
      .innerJoin('accounting_accounts as acc', 'acc.id', 'jel.account_id')
      .select([
        'je.id as entry_id',
        'je.entry_no',
        'je.entry_date',
        'je.description as entry_description',
        'je.source_type',
        'jel.id as line_id',
        'jel.description as line_description',
        'jel.debit',
        'jel.credit',
        'jel.partner_type',
        'jel.cost_center_id',
        'acc.code as account_code',
        'acc.name_ar as account_name',
      ])
      .where('je.tenant_id', '=', tenantId);

    if (costCenterId) {
      query = query.where((eb) =>
        eb.or([
          eb('jel.cost_center_id', '=', costCenterId),
          eb.and([
            eb('je.source_type', 'in', ['maritime_job', 'maritime_job_expense']),
            eb('je.source_id', '=', Number(jobId)),
          ]),
        ]),
      );
    } else {
      query = query.where('je.source_type', 'in', ['maritime_job', 'maritime_job_expense'])
        .where('je.source_id', '=', Number(jobId));
    }

    const lines = await query.orderBy('je.id', 'desc').execute();

    return {
      jobId: job.id,
      jobNumber: job.job_number,
      costCenterId: job.cost_center_id,
      entries: lines,
    };
  }

  async settleJobFromCustomerBalance(auth: AuthContext, jobId: string, dto?: { amount?: number }) {
    const { tenantId } = requireTenantScope(auth);
    const jobHeader = await this.getJobById(auth, jobId);

    if (!jobHeader.customer_id) {
      throw new BadRequestException('هذه الشحنة غير مربوطة بسجل عميل معتمد في النظام');
    }

    // معاملة واحدة بقفل على صف العميل: هذه الدالة تقرأ الرصيد الدائن ثم تقرر ثم
    // تكتب رصيداً **مطلقاً** (لا `balance = balance + x`). بلا قفل، تسويتان
    // متزامنتان تقرآن نفس الرصيد وتكتبان نفس الناتج، فيُستهلك الرصيد الدائن مرتين
    // وتُسوّى ضعف قيمته من ديون الشحنات — F1/F2 على نقدية حقيقية. وبلا معاملة،
    // فشل جزئي يخصم من رصيد العميل ويترك الشحنة غير مسددة.
    return await this.db.transaction().execute(async (trx) => {
    const customer = await trx
      .selectFrom('customers')
      .select(['id', 'name', 'balance'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', jobHeader.customer_id as any)
      .forUpdate()
      .executeTakeFirst();

    if (!customer) {
      throw new NotFoundException('تعذر العثور على سجل العميل');
    }

    // إعادة قراءة أرقام الشحنة **داخل** المعاملة: القراءة خارجها قد تكون قديمة
    // إن سُدِّدت الشحنة بين القراءة والكتابة (F2).
    const job = await trx
      .selectFrom('maritime_jobs')
      .select(['id', 'job_number', 'client_invoiced_total', 'client_paid_total', 'paid_at'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', jobHeader.id as any)
      .forUpdate()
      .executeTakeFirst();

    if (!job) {
      throw new NotFoundException('عملية الشحن غير موجودة');
    }

    const currentBalance = Number(customer.balance || 0);
    // When balance is negative, customer has advance credit
    const availableCredit = Math.max(0, -currentBalance);

    if (availableCredit <= 0) {
      throw new BadRequestException(
        `لا يوجد رصيد دائن متاح للعميل ${customer.name}. رصيد حسابه الحالي هو ${currentBalance > 0 ? `مدين بمبلغ ${currentBalance.toLocaleString()} ج.م` : '0 ج.م'}`
      );
    }

    const invoicedTotal = Number(job.client_invoiced_total || 0);
    const paidTotal = Number((job as any).client_paid_total || 0);
    const unpaidAmount = Math.max(0, invoicedTotal - paidTotal);

    let targetSettlement = unpaidAmount;
    if (targetSettlement <= 0 && invoicedTotal === 0) {
      if (dto?.amount && dto.amount > 0) {
        targetSettlement = dto.amount;
      } else {
        throw new BadRequestException('لم يتم إصدار فاتورة للشحنة بعد أو لا توجد مبالغ مستحقة. يرجى إصدار فاتورة الشحن أولاً أو تحديد المبلغ');
      }
    }

    const amountToDeduct = dto?.amount && dto.amount > 0
      ? Math.min(dto.amount, targetSettlement, availableCredit)
      : Math.min(targetSettlement, availableCredit);

    if (amountToDeduct <= 0) {
      throw new BadRequestException('الشحنة مسددة بالكامل بالفعل أو المبلغ المطلوب تسويته غير صالح');
    }

    const newPaidTotal = paidTotal + amountToDeduct;
    const finalInvoiced = Math.max(invoicedTotal, newPaidTotal);
    const isFull = newPaidTotal >= finalInvoiced;
    const newStatus = isFull ? 'paid' : 'partially_paid';

    // 1. Update customer balance (+amountToDeduct consumes the credit)
    const newCustomerBalance = currentBalance + amountToDeduct;
    await trx
      .updateTable('customers')
      .set({ balance: newCustomerBalance, updated_at: sql`NOW()` })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', customer.id as any)
      .execute();

    // 2. Add customer ledger entry
    const ledgerDesc = `سداد وتسوية مستحقات الشحنة #${job.job_number} من الرصيد الدائن المتاح`;
    await trx
      .insertInto('customer_ledger')
      .values({
        tenant_id: tenantId,
        account_id: tenantId,
        customer_id: customer.id,
        entry_type: 'job_settlement',
        amount: amountToDeduct,
        balance_after: newCustomerBalance,
        note: ledgerDesc,
        reference_type: 'maritime_job',
        reference_id: Number(job.id),
        created_by: auth.userId ? Number(auth.userId) : null,
      } as any)
      .execute();

    // 3. Update maritime_jobs
    const [updatedJob] = await trx
      .updateTable('maritime_jobs')
      .set({
        client_invoiced_total: finalInvoiced,
        client_paid_total: newPaidTotal,
        payment_status: newStatus,
        paid_at: isFull ? sql`NOW()` : (job.paid_at || null),
        updated_at: sql`NOW()`,
      } as any)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', job.id as any)
      .returningAll()
      .execute();

    // 4. Record job milestone
    await trx
      .insertInto('maritime_job_milestones')
      .values({
        tenant_id: tenantId,
        job_id: String(job.id),
        milestone_key: 'PAYMENT',
        milestone_title: `تسوية سداد من الرصيد الدائن (${isFull ? 'مسددة بالكامل' : 'سداد جزئي'})`,
        location: 'الحسابات والخزينة',
        notes: `تم خصم وتسوية مبلغ ${amountToDeduct.toLocaleString()} ج.م من رصيد العميل المتاح (${customer.name}) لصالح الشحنة #${job.job_number}`,
        recorded_by: auth.userId ? Number(auth.userId) : null,
      } as any)
      .execute();

    return {
      success: true,
      job: updatedJob,
      settledAmount: amountToDeduct,
      remainingUnpaid: Math.max(0, finalInvoiced - newPaidTotal),
      customerBalanceAfter: newCustomerBalance,
      customerAvailableCreditAfter: Math.max(0, -newCustomerBalance),
      message: `تم سداد وتسوية ${amountToDeduct.toLocaleString()} ج.م من رصيد العميل المتاح بنجاح`,
    };
    });
  }

  async getCustomerActiveJobs(auth: AuthContext, customerId: string | number) {
    const { tenantId } = requireTenantScope(auth);
    const jobs = await this.db
      .selectFrom('maritime_jobs')
      .select([
        'id',
        'job_number',
        'pol_name',
        'pod_name',
        'vessel_name',
        'milestone_status',
        'client_invoiced_total',
        'client_paid_total',
        'payment_status',
        'status',
        'created_at',
      ])
      .where('tenant_id', '=', tenantId)
      .where('customer_id', '=', Number(customerId))
      .where('status', '=', 'active')
      .orderBy('id', 'desc')
      .execute();

    return jobs.map((j) => {
      const invoiced = Number(j.client_invoiced_total || 0);
      const paid = Number(j.client_paid_total || 0);
      const unpaid = Math.max(0, invoiced - paid);
      return {
        ...j,
        invoiced,
        paid,
        unpaid,
      };
    });
  }

  // --------------------------------------------------------------------------
  // 11. Maritime Automation Pipeline & Checkpoints Engine
  // --------------------------------------------------------------------------
  async getTenantPipelineConfig(tenantId: string): Promise<MaritimePipelineConfig> {
    const row = await this.db
      .selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'maritime_pipeline_config')
      .executeTakeFirst();

    if (!row?.value) {
      return { ...DEFAULT_PIPELINE_CONFIG };
    }

    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return { ...DEFAULT_PIPELINE_CONFIG, ...parsed };
    } catch {
      return { ...DEFAULT_PIPELINE_CONFIG };
    }
  }

  async getPipelineSettings(auth: AuthContext): Promise<MaritimePipelineConfig> {
    const { tenantId } = requireTenantScope(auth);
    return this.getTenantPipelineConfig(tenantId);
  }

  async savePipelineSettings(auth: AuthContext, dto: Partial<MaritimePipelineConfig>): Promise<MaritimePipelineConfig> {
    const { tenantId } = requireTenantScope(auth);
    const current = await this.getTenantPipelineConfig(tenantId);
    const updated: MaritimePipelineConfig = { ...current, ...dto };

    const existing = await this.db
      .selectFrom('settings')
      .select('key')
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'maritime_pipeline_config')
      .executeTakeFirst();

    if (existing) {
      await this.db
        .updateTable('settings')
        .set({ value: JSON.stringify(updated) })
        .where('tenant_id', '=', tenantId)
        .where('key', '=', 'maritime_pipeline_config')
        .execute();
    } else {
      await this.db
        .insertInto('settings')
        .values({
          tenant_id: tenantId,
          key: 'maritime_pipeline_config',
          value: JSON.stringify(updated),
        })
        .execute();
    }

    return updated;
  }

  async processAutomatedPipelineForTenant(auth: AuthContext): Promise<{
    processedRfqs: number;
    awardedCount: number;
    quotesGenerated: number;
    details: string[];
  }> {
    const { tenantId } = requireTenantScope(auth);
    const config = await this.getTenantPipelineConfig(tenantId);

    if (config.automationMode === 'manual') {
      return { processedRfqs: 0, awardedCount: 0, quotesGenerated: 0, details: ['الوضع التشغيلي مضبوط على يدوي بالكامل'] };
    }

    const openRfqs = await this.db
      .selectFrom('maritime_rfqs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('status', 'in', ['sent', 'bids_received'])
      .where('auto_awarded', '=', false)
      .execute();

    if (openRfqs.length === 0) {
      return { processedRfqs: 0, awardedCount: 0, quotesGenerated: 0, details: [] };
    }

    let awardedCount = 0;
    let quotesGenerated = 0;
    const details: string[] = [];
    const now = new Date();

    for (const rfq of openRfqs) {
      const bids = await this.db
        .selectFrom('maritime_rfq_bids')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('rfq_id', '=', String(rfq.id))
        .execute();

      if (bids.length === 0) continue;

      const isDeadlineReached = rfq.cut_off_deadline ? now >= new Date(rfq.cut_off_deadline) : false;
      const minFreeDays = config.earlyAwardingMinFreeDays || 14;
      const targetRate = rfq.target_rate_max ? Number(rfq.target_rate_max) : null;

      const earlyBid = config.earlyAwardingEnabled
        ? bids.find((b) => Number(b.free_days) >= minFreeDays && (targetRate ? Number(b.total_freight_cost) <= targetRate : false))
        : null;

      if (!isDeadlineReached && !earlyBid) {
        // Still within bidding window and no early trigger satisfied
        continue;
      }

      // If checkpoint 2 (requireManualAwardAndMargin) is enabled, do NOT auto-award; just notify/update status
      if (config.requireManualAwardAndMargin) {
        if (rfq.status !== 'bids_received') {
          await this.db
            .updateTable('maritime_rfqs')
            .set({ status: 'bids_received', updated_at: sql`NOW()` })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', rfq.id)
            .execute();
        }
        details.push(`طلب ${rfq.rfq_number}: العروض مكتملة، بانتظار الاعتماد والمراجعة البشرية للهامش (محطة توقف مفعلة)`);
        continue;
      }

      // Pick best bid: Early bid if triggered, or lowest total freight cost
      const sortedBids = [...bids].sort((a, b) => {
        const costDiff = Number(a.total_freight_cost || 0) - Number(b.total_freight_cost || 0);
        if (costDiff !== 0) return costDiff;
        return Number(b.free_days || 0) - Number(a.free_days || 0);
      });
      const bestBid = earlyBid || sortedBids[0];
      if (!bestBid) continue;

      try {
        // 1. Award bid
        await this.awardBid(auth, String(bestBid.id));
        await this.db
          .updateTable('maritime_rfqs')
          .set({ auto_awarded: true, updated_at: sql`NOW()` })
          .where('tenant_id', '=', tenantId)
          .where('id', '=', rfq.id)
          .execute();
        awardedCount++;

        // 2. Compute margin
        const baseCost = Number(bestBid.total_freight_cost || 0);
        let profit = 0;
        if (config.defaultMarginType === 'percentage') {
          profit = baseCost * (config.defaultMarginValue / 100);
        } else {
          profit = Number(config.defaultMarginValue || 200);
        }
        if (profit < Number(config.marginFloor || 150)) {
          profit = Number(config.marginFloor || 150);
        }

        // 3. Issue quotation
        const quote = await this.createQuotation(auth, {
          rfqId: String(rfq.id),
          bidId: String(bestBid.id),
          customerId: rfq.customer_id ? Number(rfq.customer_id) : undefined,
          customerName: rfq.customer_name || 'عميل الشحنة',
          customerPhone: rfq.customer_phone || undefined,
          customerEmail: rfq.customer_email || undefined,
          paymentTerm: rfq.payment_term || 'prepaid',
          baseCost,
          currency: bestBid.currency || 'USD',
          marginType: config.defaultMarginType,
          marginValue: config.defaultMarginValue,
          exchangeRate: Number(config.defaultExchangeRate || 48.5),
          notes: `عرض صادر آلياً وفقاً لمسار الأتمتة (${config.automationMode === 'full_autonomous' ? 'أتمتة كاملة' : 'هجين ذكي'}). العرض الفائز من ${bestBid.shipping_line_name}`,
        });
        quotesGenerated++;

        // 4. Quote dispatch checkpoint
        if (!config.requireManualQuoteDispatch) {
          await this.db
            .updateTable('maritime_quotations')
            .set({ status: 'sent' })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', quote.id as any)
            .execute();

          if (config.autoSendWhatsAppQuote && rfq.customer_phone) {
            try {
              const cleanPhone = rfq.customer_phone.replace(/[^0-9]/g, '');
              const totalClient = baseCost + profit;
              const msg = `مرحباً ${rfq.customer_name || 'عميلنا العزيز'}، يسعدنا تقديم عرض سعر الشحن البحري:\n` +
                `• مسار: من ${rfq.pol_name} إلى ${rfq.pod_name}\n` +
                `• الحاويات: ${rfq.container_count}x ${rfq.container_type}\n` +
                `• الخط الملاحي: ${bestBid.shipping_line_name}\n` +
                `• فترة السماح بالميناء: ${bestBid.free_days} يوم\n` +
                `• السعر الإجمالي: $${totalClient.toLocaleString()} USD\n` +
                `• رقم العرض المرجعي: ${quote.quotation_number}`;
              await this.whatsAppGatewayService.sendRawMessage(tenantId, cleanPhone, msg);
            } catch (err: any) {
              this.logger.warn(`Failed auto WhatsApp quote dispatch for RFQ [${rfq.rfq_number}]: ${err?.message}`);
            }
          }
        }

        details.push(`طلب ${rfq.rfq_number}: تمت الترسية آلياً على خط ${bestBid.shipping_line_name} بسعر ${baseCost}$ مع هامش ربح ${profit}$ وإصدار عرض ${quote.quotation_number}`);
      } catch (err: any) {
        this.logger.error(`Error in automated RFQ pipeline for RFQ [${rfq.rfq_number}]: ${err?.message}`);
      }
    }

    return {
      processedRfqs: openRfqs.length,
      awardedCount,
      quotesGenerated,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rate Management (Contract/Tariff Rate Cards — CargoWise Benchmark)
  // --------------------------------------------------------------------------
  // Closes the "Rate Management" gap: previously the only pricing mechanism was
  // a live RFQ (ask now, wait for carrier replies). Rate cards let ops instantly
  // quote a customer from a persisted, reusable negotiated rate instead of
  // waiting on a fresh round of carrier bids every time.

  private mapRateCardRow(r: any) {
    return {
      id: String(r.id),
      shippingLineId: r.shipping_line_id ? String(r.shipping_line_id) : null,
      carrierName: r.carrier_name,
      transportMode: r.transport_mode || 'sea',
      rateBasis: r.rate_basis || 'per_container',
      minCharge: Number(r.min_charge || 0),
      polCode: r.pol_code,
      polName: r.pol_name,
      podCode: r.pod_code,
      podName: r.pod_name,
      cargoMode: r.cargo_mode,
      containerType: r.container_type,
      oceanFreight: Number(r.ocean_freight),
      currency: r.currency,
      thcOrigin: Number(r.thc_origin),
      thcDestination: Number(r.thc_destination),
      bafCharges: Number(r.baf_charges),
      otherCharges: Number(r.other_charges),
      totalFreightCost: Number(r.total_freight_cost),
      transitTimeDays: Number(r.transit_time_days),
      freeDays: Number(r.free_days),
      validFrom: r.valid_from,
      validUntil: r.valid_until,
      source: r.source,
      sourceBidId: r.source_bid_id ? String(r.source_bid_id) : null,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async listRateCards(auth: AuthContext, filters?: { polCode?: string; podCode?: string; containerType?: string; status?: string; transportMode?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db.selectFrom('maritime_rate_cards').selectAll().where('tenant_id', '=', tenantId);

    if (filters?.polCode) query = query.where('pol_code', '=', filters.polCode.toUpperCase());
    if (filters?.podCode) query = query.where('pod_code', '=', filters.podCode.toUpperCase());
    if (filters?.containerType) query = query.where('container_type', '=', filters.containerType);
    if (filters?.transportMode) query = query.where('transport_mode', '=', filters.transportMode as any);
    if (filters?.status) query = query.where('status', '=', filters.status as any);

    const rows = await query.orderBy('total_freight_cost', 'asc').execute();

    // Surface expired-but-still-flagged-active cards as expired without requiring a cron job.
    const today = new Date().toISOString().slice(0, 10);
    return rows.map((r) => this.mapRateCardRow({ ...r, status: r.status === 'active' && r.valid_until < today ? 'expired' : r.status }));
  }

  /**
   * Instant quote lookup: the cheapest still-valid rate card matching the lane
   * and container. This is the "80% of forwarders don't need a live RFQ for
   * every shipment" path — a real contract rate beats waiting on carrier replies.
   */
  async findBestRate(auth: AuthContext, polCode: string, podCode: string, containerType?: string) {
    const { tenantId } = requireTenantScope(auth);
    const today = new Date().toISOString().slice(0, 10);

    let query = this.db
      .selectFrom('maritime_rate_cards')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('pol_code', '=', polCode.toUpperCase())
      .where('pod_code', '=', podCode.toUpperCase())
      .where('status', '=', 'active')
      .where('valid_from', '<=', today)
      .where('valid_until', '>=', today);

    if (containerType) query = query.where('container_type', '=', containerType);

    const rows = await query.orderBy('total_freight_cost', 'asc').execute();
    return rows.map((r) => this.mapRateCardRow(r));
  }

  async createRateCard(auth: AuthContext, dto: CreateRateCardDto) {
    const { tenantId } = requireTenantScope(auth);

    const oceanFreight = Number(dto.oceanFreight || 0);
    const thcOrigin = Number(dto.thcOrigin || 0);
    const thcDestination = Number(dto.thcDestination || 0);
    const bafCharges = Number(dto.bafCharges || 0);
    const otherCharges = Number(dto.otherCharges || 0);
    const totalFreightCost = oceanFreight + thcOrigin + thcDestination + bafCharges + otherCharges;

    let carrierName = dto.carrierName?.trim() || '';
    if (dto.shippingLineId && !carrierName) {
      const line = await this.db
        .selectFrom('shipping_lines')
        .select(['name_en', 'name_ar'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', String(dto.shippingLineId) as any)
        .executeTakeFirst();
      carrierName = line?.name_en || line?.name_ar || '';
    }

    const row = await this.db
      .insertInto('maritime_rate_cards')
      .values({
        tenant_id: tenantId,
        shipping_line_id: dto.shippingLineId ? (String(dto.shippingLineId) as any) : null,
        carrier_name: carrierName || 'Unnamed Carrier',
        transport_mode: dto.transportMode || 'sea',
        rate_basis: dto.rateBasis || 'per_container',
        min_charge: Number(dto.minCharge || 0),
        pol_code: dto.polCode.toUpperCase(),
        pol_name: dto.polName || dto.polCode.toUpperCase(),
        pod_code: dto.podCode.toUpperCase(),
        pod_name: dto.podName || dto.podCode.toUpperCase(),
        cargo_mode: dto.cargoMode || 'FCL',
        container_type: dto.containerType || '40HC',
        ocean_freight: oceanFreight,
        currency: dto.currency || 'USD',
        thc_origin: thcOrigin,
        thc_destination: thcDestination,
        baf_charges: bafCharges,
        other_charges: otherCharges,
        total_freight_cost: totalFreightCost,
        transit_time_days: dto.transitTimeDays || 0,
        free_days: dto.freeDays || 14,
        valid_from: dto.validFrom || new Date().toISOString().slice(0, 10),
        valid_until: dto.validUntil,
        source: 'manual',
        status: 'active',
        notes: dto.notes || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapRateCardRow(row);
  }

  /** Converts an awarded RFQ bid into a reusable rate card, so a one-off win builds the rate database over time. */
  async createRateCardFromBid(auth: AuthContext, bidId: string, validUntil: string) {
    const { tenantId } = requireTenantScope(auth);
    const bid = await this.db
      .selectFrom('maritime_rfq_bids as b')
      .innerJoin('maritime_rfqs as r', 'r.id', 'b.rfq_id')
      .select([
        'b.id', 'b.shipping_line_id', 'b.shipping_line_name', 'b.ocean_freight', 'b.currency',
        'b.thc_origin', 'b.thc_destination', 'b.baf_charges', 'b.other_charges', 'b.total_freight_cost',
        'b.transit_time_days', 'b.free_days',
        'r.pol_code', 'r.pol_name', 'r.pod_code', 'r.pod_name', 'r.cargo_mode', 'r.container_type',
      ])
      .where('b.tenant_id', '=', tenantId)
      .where('b.id', '=', bidId as any)
      .executeTakeFirst();

    if (!bid) throw new NotFoundException('عرض السعر غير موجود');

    const row = await this.db
      .insertInto('maritime_rate_cards')
      .values({
        tenant_id: tenantId,
        shipping_line_id: bid.shipping_line_id,
        carrier_name: bid.shipping_line_name,
        pol_code: bid.pol_code,
        pol_name: bid.pol_name,
        pod_code: bid.pod_code,
        pod_name: bid.pod_name,
        cargo_mode: bid.cargo_mode,
        container_type: bid.container_type,
        ocean_freight: bid.ocean_freight,
        currency: bid.currency,
        thc_origin: bid.thc_origin,
        thc_destination: bid.thc_destination,
        baf_charges: bid.baf_charges,
        other_charges: bid.other_charges,
        total_freight_cost: bid.total_freight_cost,
        transit_time_days: bid.transit_time_days,
        free_days: bid.free_days,
        valid_from: new Date().toISOString().slice(0, 10),
        valid_until: validUntil,
        source: 'carrier_bid',
        source_bid_id: bid.id,
        status: 'active',
        created_by: auth.userId ? Number(auth.userId) : null,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapRateCardRow(row);
  }

  async updateRateCardStatus(auth: AuthContext, id: string, dto: UpdateRateCardStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const [updated] = await this.db
      .updateTable('maritime_rate_cards')
      .set({ status: dto.status, updated_at: sql`NOW()` })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) throw new NotFoundException('التعرفة غير موجودة');
    return this.mapRateCardRow(updated);
  }

  async deleteRateCard(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    await this.db
      .deleteFrom('maritime_rate_cards')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Customs Declarations (HS Codes & Duty Tracking — internal record-keeping)
  // --------------------------------------------------------------------------
  // NOT live filing with a customs authority: this closes the "customs is only
  // descriptive text in the carrier directory" gap by giving HS codes, declared
  // value, and duty amounts a real place to live and be totalled, so a shipment's
  // landed cost is complete. Government EDI filing needs a broker/authority
  // integration and credentials this session does not have (O18).

  private mapCustomsDeclarationRow(r: any) {
    return {
      id: String(r.id),
      jobId: String(r.job_id),
      declarationNumber: r.declaration_number,
      declarationType: r.declaration_type,
      customsAuthority: r.customs_authority,
      brokerName: r.broker_name,
      submittedDate: r.submitted_date,
      clearedDate: r.cleared_date,
      status: r.status,
      totalCustomsValue: Number(r.total_customs_value),
      totalDutyAmount: Number(r.total_duty_amount),
      currency: r.currency,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapCustomsItemRow(r: any) {
    return {
      id: String(r.id),
      declarationId: String(r.declaration_id),
      hsCode: r.hs_code,
      commodityDescription: r.commodity_description,
      quantity: Number(r.quantity),
      unit: r.unit,
      customsValue: Number(r.customs_value),
      dutyRatePercent: Number(r.duty_rate_percent),
      dutyAmount: Number(r.duty_amount),
      notes: r.notes,
    };
  }

  async listCustomsDeclarations(auth: AuthContext, jobId: string) {
    const { tenantId } = requireTenantScope(auth);
    const rows = await this.db
      .selectFrom('maritime_customs_declarations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('job_id', '=', jobId as any)
      .orderBy('created_at', 'desc')
      .execute();
    return rows.map((r) => this.mapCustomsDeclarationRow(r));
  }

  async getCustomsDeclarationDetail(auth: AuthContext, id: string) {
    const { tenantId } = requireTenantScope(auth);
    const declaration = await this.db
      .selectFrom('maritime_customs_declarations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();
    if (!declaration) throw new NotFoundException('البيان الجمركي غير موجود');

    const items = await this.db
      .selectFrom('maritime_customs_declaration_items')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('declaration_id', '=', id as any)
      .execute();

    return {
      declaration: this.mapCustomsDeclarationRow(declaration),
      items: items.map((i) => this.mapCustomsItemRow(i)),
    };
  }

  async createCustomsDeclaration(auth: AuthContext, jobId: string, dto: CreateCustomsDeclarationDto) {
    const { tenantId } = requireTenantScope(auth);

    return this.db.transaction().execute(async (trx) => {
      const job = await trx
        .selectFrom('maritime_jobs')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', jobId as any)
        .executeTakeFirst();
      if (!job) throw new NotFoundException('عملية الشحن غير موجودة');

      const items = dto.items || [];
      let totalCustomsValue = 0;
      let totalDutyAmount = 0;
      const computedItems = items.map((item) => {
        const customsValue = Number(item.customsValue || 0);
        const dutyRatePercent = Number(item.dutyRatePercent || 0);
        const dutyAmount = Math.round(customsValue * (dutyRatePercent / 100) * 100) / 100;
        totalCustomsValue += customsValue;
        totalDutyAmount += dutyAmount;
        return { ...item, dutyAmount };
      });

      const declarationRow = await trx
        .insertInto('maritime_customs_declarations')
        .values({
          tenant_id: tenantId,
          job_id: jobId,
          declaration_number: dto.declarationNumber || null,
          declaration_type: dto.declarationType || 'import',
          customs_authority: dto.customsAuthority || null,
          broker_name: dto.brokerName || null,
          status: 'pending',
          total_customs_value: totalCustomsValue,
          total_duty_amount: totalDutyAmount,
          currency: dto.currency || 'USD',
          notes: dto.notes || null,
          created_by: auth.userId ? Number(auth.userId) : null,
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow();

      const insertedItems: any[] = [];
      for (const item of computedItems) {
        const itemRow = await trx
          .insertInto('maritime_customs_declaration_items')
          .values({
            tenant_id: tenantId,
            declaration_id: String(declarationRow.id),
            hs_code: item.hsCode,
            commodity_description: item.commodityDescription || '',
            quantity: item.quantity || 0,
            unit: item.unit || 'PCS',
            customs_value: item.customsValue,
            duty_rate_percent: item.dutyRatePercent,
            duty_amount: item.dutyAmount,
            notes: item.notes || null,
          } as any)
          .returningAll()
          .executeTakeFirstOrThrow();
        insertedItems.push(itemRow);
      }

      return {
        declaration: this.mapCustomsDeclarationRow(declarationRow),
        items: insertedItems.map((i) => this.mapCustomsItemRow(i)),
      };
    });
  }

  async addCustomsDeclarationItem(auth: AuthContext, declarationId: string, dto: CreateCustomsDeclarationItemDto) {
    const { tenantId } = requireTenantScope(auth);

    return this.db.transaction().execute(async (trx) => {
      const declaration = await trx
        .selectFrom('maritime_customs_declarations')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', declarationId as any)
        .forUpdate()
        .executeTakeFirst();
      if (!declaration) throw new NotFoundException('البيان الجمركي غير موجود');

      const customsValue = Number(dto.customsValue || 0);
      const dutyRatePercent = Number(dto.dutyRatePercent || 0);
      const dutyAmount = Math.round(customsValue * (dutyRatePercent / 100) * 100) / 100;

      const itemRow = await trx
        .insertInto('maritime_customs_declaration_items')
        .values({
          tenant_id: tenantId,
          declaration_id: declarationId,
          hs_code: dto.hsCode,
          commodity_description: dto.commodityDescription || '',
          quantity: dto.quantity || 0,
          unit: dto.unit || 'PCS',
          customs_value: customsValue,
          duty_rate_percent: dutyRatePercent,
          duty_amount: dutyAmount,
          notes: dto.notes || null,
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .updateTable('maritime_customs_declarations')
        .set({
          total_customs_value: Number(declaration.total_customs_value) + customsValue,
          total_duty_amount: Number(declaration.total_duty_amount) + dutyAmount,
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', declarationId as any)
        .execute();

      return this.mapCustomsItemRow(itemRow);
    });
  }

  async updateCustomsDeclarationStatus(auth: AuthContext, id: string, dto: UpdateCustomsDeclarationStatusDto) {
    const { tenantId } = requireTenantScope(auth);
    const updatePayload: any = { status: dto.status, updated_at: sql`NOW()` };
    if (dto.declarationNumber) updatePayload.declaration_number = dto.declarationNumber;
    if (dto.status === 'submitted') updatePayload.submitted_date = new Date().toISOString().slice(0, 10);
    if (dto.status === 'cleared') updatePayload.cleared_date = new Date().toISOString().slice(0, 10);

    const [updated] = await this.db
      .updateTable('maritime_customs_declarations')
      .set(updatePayload)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) throw new NotFoundException('البيان الجمركي غير موجود');
    return this.mapCustomsDeclarationRow(updated);
  }

  // --------------------------------------------------------------------------
  // Freight Audit & Rate Reconciliation (CargoWise Benchmark)
  // --------------------------------------------------------------------------

  /**
   * Posts the carrier-invoice journal entry and updates the job's carrier cost roll-up.
   *
   * Extracted into one place because createCarrierInvoice and overrideCarrierInvoice previously
   * duplicated this ~50-line block, which had drifted into a genuine defect:
   *  - Missing 6400/5100/2110 accounts caused a SILENT skip (`if (expenseAccId && creditAccId)`)
   *    with no error, yet the caller still reported success and (in the override path) claimed
   *    the journal was posted even though it never was. Forbidden pattern F7
   *    (see ARCHITECTURE_INVARIANTS.md §2.2) — a missing account must fail loudly.
   *  - No fiscal period lock check, unlike every posting routed through insertPostedJournal.
   *  - No transaction: the journal header, journal lines, job cost update and invoice
   *    insert/update were independent statements. A failure partway left an orphaned journal
   *    entry or a job cost bump with no invoice record behind it.
   * All three are fixed here: this method MUST be called with a transaction handle, throws
   * instead of skipping, and enforces the period lock the same way insertPostedJournal does.
   */
  private async postCarrierInvoiceJournal(
    trx: any,
    tenantId: string,
    params: {
      job: { id: number | string; cost_center_id?: number | string | null; job_number?: string; shipping_line_name?: string | null; carrier_cost_total?: number | string | null; client_invoiced_total?: number | string | null; other_costs_total?: number | string | null };
      invoiceNumber: string;
      carrierName?: string | null;
      shippingLineId?: string | number | null;
      totalAmount: number;
      entryDate: Date;
      descriptionSuffix?: string;
      userId?: number | string | null;
    },
  ): Promise<number> {
    const { job, totalAmount } = params;

    await this.assertMaritimeJournalPeriodOpen(trx, tenantId, params.entryDate);

    const expenseAccId = await this.resolveAccountId(tenantId, '6400', '5100');
    const creditAccId = await this.resolveAccountId(tenantId, '2110');
    if (!expenseAccId || !creditAccId) {
      throw new BadRequestException(
        'تعذر ترحيل فاتورة الناقل: حساب مصروف الشحن (6400/5100) أو حساب الذمم الدائنة (2110) غير متاح في شجرة الحسابات. يرجى تهيئتهما أولاً.',
      );
    }

    const costCenterId = job.cost_center_id ? Number(job.cost_center_id) : null;
    const desc = `فاتورة الخط الملاحي #${params.invoiceNumber} (${params.carrierName || job.shipping_line_name || 'Carrier'})${params.descriptionSuffix ? ' ' + params.descriptionSuffix : ''} - الشحنة #${job.job_number}`;
    const tempNo = `JRN-TMP-CARRIER-${job.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const [inserted] = await trx
      .insertInto('journal_entries')
      .values({
        entry_no: tempNo,
        tenant_id: tenantId,
        account_id: tenantId,
        entry_date: params.entryDate,
        description: desc,
        source_type: 'maritime_carrier_invoice',
        source_id: Number(job.id),
        status: 'posted',
        created_by: params.userId ? Number(params.userId) : null,
        posted_by: params.userId ? Number(params.userId) : null,
        posted_at: sql`NOW()`,
      })
      .returning('id')
      .execute();

    const entryId = Number(inserted.id);
    await trx
      .updateTable('journal_entries')
      .set({ entry_no: `JE-${String(entryId).padStart(8, '0')}`, updated_at: sql`NOW()` })
      .where('id', '=', entryId)
      .where('tenant_id', '=', tenantId)
      .execute();

    await trx
      .insertInto('journal_entry_lines')
      .values([
        {
          journal_entry_id: entryId,
          tenant_id: tenantId,
          account_id: expenseAccId,
          cost_center_id: costCenterId,
          description: desc,
          debit: totalAmount,
          credit: 0,
          partner_type: 'none',
          partner_id: null,
        },
        {
          journal_entry_id: entryId,
          tenant_id: tenantId,
          account_id: creditAccId,
          cost_center_id: costCenterId,
          description: desc,
          debit: 0,
          credit: totalAmount,
          partner_type: 'supplier',
          partner_id: params.shippingLineId ? Number(params.shippingLineId) : null,
        },
      ])
      .execute();

    const newCarrierCost = Number(job.carrier_cost_total || 0) + totalAmount;
    const revenue = Number(job.client_invoiced_total || 0);
    const otherCosts = Number(job.other_costs_total || 0);
    const newNetProfit = revenue - (newCarrierCost + otherCosts);

    await trx
      .updateTable('maritime_jobs')
      .set({
        carrier_cost_total: newCarrierCost,
        net_profit: newNetProfit,
        updated_at: sql`NOW()`,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', job.id)
      .execute();

    return entryId;
  }

  async previewCarrierInvoiceAudit(
    auth: AuthContext,
    jobId: string,
    dto: {
      invoicedTotal: number;
      oceanFreight?: number;
      thcCharges?: number;
      bafCharges?: number;
      otherCharges?: number;
      shippingLineId?: string | number;
      containerType?: string;
    },
  ) {
    const { tenantId } = requireTenantScope(auth);
    const job = await this.getJobById(auth, jobId);

    // 1. Find matching active rate card
    const shippingLineId = dto.shippingLineId || job.shipping_line_id;
    const polCode = (job.pol_code || '').toUpperCase();
    const podCode = (job.pod_code || '').toUpperCase();
    const today = new Date().toISOString().slice(0, 10);

    let query = this.db
      .selectFrom('maritime_rate_cards')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('pol_code', '=', polCode)
      .where('pod_code', '=', podCode)
      .where('status', '=', 'active')
      .where('valid_from', '<=', today)
      .where('valid_until', '>=', today);

    if (shippingLineId) {
      query = query.where('shipping_line_id', '=', String(shippingLineId) as any);
    }

    const containerType = dto.containerType || job.containers?.[0]?.container_type || '40HC';
    if (containerType) {
      query = query.where('container_type', '=', containerType);
    }

    const matchedCard = await query.orderBy('total_freight_cost', 'asc').executeTakeFirst();
    const containerCount = job.containers?.length || 1;

    const auditResult = calculateFreightAudit({
      invoicedTotal: Number(dto.invoicedTotal || 0),
      oceanFreight: Number(dto.oceanFreight || 0),
      thcCharges: Number(dto.thcCharges || 0),
      bafCharges: Number(dto.bafCharges || 0),
      otherCharges: Number(dto.otherCharges || 0),
      rateCard: matchedCard ? this.mapRateCardRow(matchedCard) : null,
      containerCount,
    });

    return {
      jobId: job.id,
      jobNumber: job.job_number,
      shippingLineName: job.shipping_line_name,
      polCode: job.pol_code,
      podCode: job.pod_code,
      containerCount,
      containerType,
      rateCard: matchedCard ? this.mapRateCardRow(matchedCard) : null,
      audit: auditResult,
    };
  }

  async createCarrierInvoice(
    auth: AuthContext,
    jobId: string,
    dto: {
      invoiceNumber: string;
      invoiceDate?: string;
      totalInvoicedAmount: number;
      currency?: string;
      oceanFreight?: number;
      thcCharges?: number;
      bafCharges?: number;
      detentionDemurrage?: number;
      otherCharges?: number;
      shippingLineId?: string | number;
      carrierName?: string;
      notes?: string;
      allowOverride?: boolean;
      overrideReason?: string;
    },
  ) {
    const { tenantId } = requireTenantScope(auth);
    const job = await this.getJobById(auth, jobId);

    const totalAmount = Number(dto.totalInvoicedAmount || 0);
    if (totalAmount <= 0) {
      throw new BadRequestException('يجب تحديد مبلغ إجمالي للفاتورة أكبر من صفر');
    }
    if (!dto.invoiceNumber?.trim()) {
      throw new BadRequestException('يجب إدخال رقم فاتورة الخط الملاحي');
    }

    // 1. Audit against rate card
    const auditPreview = await this.previewCarrierInvoiceAudit(auth, jobId, {
      invoicedTotal: totalAmount,
      oceanFreight: dto.oceanFreight,
      thcCharges: dto.thcCharges,
      bafCharges: dto.bafCharges,
      otherCharges: dto.otherCharges,
      shippingLineId: dto.shippingLineId,
    });

    const audit = auditPreview.audit;
    // Invariant L14 & Rule #14: Strict Maker-Checker Separation.
    // A user creating an invoice CANNOT self-approve financial variances at creation time.
    // An 'overcharge' invoice is saved WITHOUT posting a journal, and must be reviewed and
    // approved by a distinct authorized checker via /override, or sent to dispute.
    const auditStatus = audit.auditStatus;
    const overrideApprovedBy: number | null = null;
    const overrideApprovedAt: Date | null = null;
    const overrideReason: string | null = null;

    const entryDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
    const shouldPostJournal = ['matched', 'undercharge', 'no_contract'].includes(auditStatus);

    // Everything below is one atomic unit: the journal (header + lines), the job cost roll-up,
    // and the invoice record itself. Previously these were five independent statements on
    // `this.db` directly — a failure partway (e.g. a duplicate invoice_number constraint violation
    // on the final insert) left an orphaned journal entry and an inflated job cost with no invoice
    // record to explain either.
    const insertedInvoice = await this.db.transaction().execute(async (trx: any) => {
      let entryId: number | null = null;

      if (shouldPostJournal) {
        entryId = await this.postCarrierInvoiceJournal(trx, tenantId, {
          job,
          invoiceNumber: dto.invoiceNumber,
          carrierName: dto.carrierName,
          shippingLineId: dto.shippingLineId,
          totalAmount,
          entryDate,
          userId: auth.userId,
        });
      }

      // 3. Insert into maritime_carrier_invoices
      const [row] = await trx
        .insertInto('maritime_carrier_invoices')
        .values({
          tenant_id: tenantId,
          job_id: Number(job.id),
          shipping_line_id: dto.shippingLineId ? Number(dto.shippingLineId) : (job.shipping_line_id ? Number(job.shipping_line_id) : null),
          carrier_name: dto.carrierName || job.shipping_line_name || 'Carrier',
          invoice_number: dto.invoiceNumber.trim(),
          invoice_date: dto.invoiceDate ? (dto.invoiceDate as any) : (new Date().toISOString().slice(0, 10) as any),
          currency: dto.currency || 'USD',
          total_invoiced_amount: totalAmount,
          ocean_freight: Number(dto.oceanFreight || 0),
          thc_charges: Number(dto.thcCharges || 0),
          baf_charges: Number(dto.bafCharges || 0),
          detention_demurrage: Number(dto.detentionDemurrage || 0),
          other_charges: Number(dto.otherCharges || 0),
          rate_card_id: audit.rateCardId ? Number(audit.rateCardId) : null,
          contracted_amount: audit.contractedTotal,
          variance_amount: audit.varianceAmount,
          variance_pct: audit.variancePct,
          audit_status: auditStatus,
          override_approved_by: overrideApprovedBy,
          override_approved_at: overrideApprovedAt,
          override_reason: overrideReason,
          journal_entry_id: entryId,
          payment_status: 'unpaid',
          notes: dto.notes || null,
          created_by: auth.userId ? Number(auth.userId) : null,
        } as any)
        .returningAll()
        .execute();

      return row;
    });

    const statusMessage =
      auditStatus === 'matched'
        ? 'مطابقة للتعرفة المتعاقد عليها'
        : auditStatus === 'overcharge'
        ? `زيادة غير معتمدة بمقدار +${audit.varianceAmount} (+${audit.variancePct}%) تتطلب مراجعة واعتماد مسؤول مالي آخر أو فتح نزاع`
        : auditStatus === 'undercharge'
        ? `أقل من التعرفة بمقدار -${Math.abs(audit.varianceAmount)}`
        : 'سجلت بدون تعرفة مسبقة';

    return {
      success: true,
      invoice: insertedInvoice,
      audit,
      message: `تم تسجيل فاتورة الخط الملاحي #${dto.invoiceNumber} بنجاح (${statusMessage})`,
    };
  }


  async overrideCarrierInvoice(auth: AuthContext, invoiceId: string, dto: { reason: string }) {
    const { tenantId } = requireTenantScope(auth);

    const updatedInvoice = await this.db.transaction().execute(async (trx: any) => {
      // Row lock: without it, two concurrent /override calls by two different valid checkers
      // both read journal_entry_id = NULL, both pass the "not yet posted" check below, and both
      // post a journal entry for the same invoice — a duplicated expense in the general ledger.
      const invoice = await trx
        .selectFrom('maritime_carrier_invoices')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', Number(invoiceId) as any)
        .forUpdate()
        .executeTakeFirst();

      if (!invoice) throw new NotFoundException('فاتورة الناقل غير موجودة');

      // The endpoint previously had no check on the invoice's current audit_status at all: it
      // could be called on an already-matched, already-approved, or disputed invoice and would
      // unconditionally flip it to 'approved_override'. Only an invoice actually flagged
      // 'overcharge' is awaiting this decision.
      if (invoice.audit_status !== 'overcharge') {
        throw new BadRequestException(
          `لا يمكن تطبيق التجاوز المالي: حالة الفاتورة الحالية (${invoice.audit_status}) ليست في انتظار مراجعة زيادة سعرية.`,
        );
      }

      const validation = validateMakerCheckerOverride({
        userId: auth.userId || 0,
        role: auth.role || '',
        invoiceCreatedBy: invoice.created_by ? Number(invoice.created_by) : null,
        reason: dto.reason,
      });

      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }

      const job = await this.getJobById(auth, String(invoice.job_id));

      // Post journal if not already posted. Uses the same shared helper as createCarrierInvoice:
      // throws instead of silently skipping when the required accounts are missing, and enforces
      // the fiscal period lock — neither of which the previous inline copy of this logic did.
      let entryId = invoice.journal_entry_id ? Number(invoice.journal_entry_id) : null;
      if (!entryId) {
        entryId = await this.postCarrierInvoiceJournal(trx, tenantId, {
          job,
          invoiceNumber: invoice.invoice_number,
          shippingLineId: invoice.shipping_line_id,
          totalAmount: Number(invoice.total_invoiced_amount),
          entryDate: invoice.invoice_date ? new Date(invoice.invoice_date) : new Date(),
          descriptionSuffix: '(معتمدة بتجاوز مالي)',
          userId: auth.userId,
        });
      }

      const [row] = await trx
        .updateTable('maritime_carrier_invoices')
        .set({
          audit_status: 'approved_override',
          override_approved_by: auth.userId ? Number(auth.userId) : null,
          override_approved_at: sql`NOW()`,
          override_reason: dto.reason.trim(),
          journal_entry_id: entryId,
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', Number(invoiceId) as any)
        .returningAll()
        .execute();

      return row;
    });

    return {
      success: true,
      invoice: updatedInvoice,
      message: 'تم اعتماد التجاوز المالي لفاتورة الناقل وترحيل القيد المحاسبي بنجاح',
    };
  }


  async createCarrierDispute(
    auth: AuthContext,
    invoiceId: string,
    dto: { reason: string; disputedAmount?: number },
  ) {
    const { tenantId } = requireTenantScope(auth);

    const invoice = await this.db
      .selectFrom('maritime_carrier_invoices')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', Number(invoiceId) as any)
      .executeTakeFirst();

    if (!invoice) throw new NotFoundException('فاتورة الناقل غير موجودة');

    const job = await this.getJobById(auth, String(invoice.job_id));
    const disputedAmount = dto.disputedAmount ? Number(dto.disputedAmount) : Number(invoice.variance_amount);

    // معاملة واحدة: إنشاء النزاع **و**حجز الفاتورة عن الصرف لا ينفصلان. كانا
    // عبارتين مستقلتين، ففشل الثانية يترك نزاعاً قائماً وفاتورة قابلة للصرف —
    // خرق صامت للثابت DISP-1 ("تعليق الفاتورة لحين التسوية").
    const { dispute, disputeNumber } = await this.db.transaction().execute(async (trx) => {
      // ترقيم آمن: رقم مؤقت فريد ثم إعادة التسمية بالمعرّف (نفس نمط MWR في هذا
      // الملف و§2.2). كان `COUNT(*) + 1` بلا فلتر يومي وبلا قيد تفرد على
      // `dispute_number` — نزاعان متزامنان يأخذان نفس الرقم **بصمت** (F6).
      const tempNumber = `DISP-TMP-${crypto.randomUUID()}`;
      const [inserted] = await trx
        .insertInto('maritime_carrier_disputes')
        .values({
          tenant_id: tenantId,
          dispute_number: tempNumber,
          invoice_id: Number(invoice.id),
          job_id: Number(job.id),
          carrier_name: invoice.carrier_name,
          disputed_amount: disputedAmount > 0 ? disputedAmount : Number(invoice.total_invoiced_amount),
          currency: invoice.currency || 'USD',
          dispute_reason: dto.reason?.trim() || 'فروق تسعير عن التعرفة المتعاقد عليها',
          dispute_status: 'submitted',
          created_by: auth.userId ? Number(auth.userId) : null,
        } as any)
        .returningAll()
        .execute();

      const finalNumber = formatDailyDocumentNumber('DISP', Number(inserted.id), new Date());
      const [renamed] = await trx
        .updateTable('maritime_carrier_disputes')
        .set({ dispute_number: finalNumber })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', inserted.id as any)
        .returningAll()
        .execute();

      await trx
        .updateTable('maritime_carrier_invoices')
        .set({
          audit_status: 'disputed',
          payment_status: 'held_for_dispute',
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', Number(invoice.id) as any)
        .execute();

      return { dispute: renamed, disputeNumber: finalNumber };
    });

    return {
      success: true,
      dispute,
      message: `تم إنشاء مذكرة النزاع المالي #${disputeNumber} وحجز الفاتورة عن الصرف بنجاح`,
    };
  }

  async resolveCarrierDispute(
    auth: AuthContext,
    disputeId: string,
    dto: {
      status: 'accepted' | 'rejected' | 'partially_accepted';
      resolutionNotes?: string;
      creditNoteNumber?: string;
      creditNoteAmount?: number;
    },
  ) {
    const { tenantId } = requireTenantScope(auth);

    const dispute = await this.db
      .selectFrom('maritime_carrier_disputes')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', Number(disputeId) as any)
      .executeTakeFirst();

    if (!dispute) throw new NotFoundException('مذكرة النزاع غير موجودة');

    const creditAmount = Number(dto.creditNoteAmount || 0);

    const [updatedDispute] = await this.db
      .updateTable('maritime_carrier_disputes')
      .set({
        dispute_status: dto.status,
        resolution_notes: dto.resolutionNotes || null,
        credit_note_number: dto.creditNoteNumber || null,
        credit_note_amount: creditAmount,
        resolved_by: auth.userId ? Number(auth.userId) : null,
        resolved_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', Number(disputeId) as any)
      .returningAll()
      .execute();

    // If accepted and credit note received, adjust ledger
    if ((dto.status === 'accepted' || dto.status === 'partially_accepted') && creditAmount > 0) {
      const job = await this.getJobById(auth, String(dispute.job_id));
      let costCenterId = job.cost_center_id ? Number(job.cost_center_id) : null;
      const expenseAccId = await this.resolveAccountId(tenantId, '6400', '5100');
      const creditAccId = await this.resolveAccountId(tenantId, '2110');

      if (expenseAccId && creditAccId) {
        const desc = `إشعار دائن خط ملاحي #${dto.creditNoteNumber || 'CN'} (تسوية نزاع #${dispute.dispute_number}) - الشحنة #${job.job_number}`;
        const tempNo = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const [inserted] = await this.db
          .insertInto('journal_entries')
          .values({
            entry_no: tempNo,
            tenant_id: tenantId,
            account_id: tenantId,
            entry_date: new Date(),
            description: desc,
            source_type: 'maritime_carrier_credit_note',
            source_id: Number(job.id),
            status: 'posted',
            created_by: auth.userId ? Number(auth.userId) : null,
            posted_by: auth.userId ? Number(auth.userId) : null,
            posted_at: sql`NOW()`,
          } as any)
          .returning('id')
          .execute();

        const entryId = Number(inserted.id);
        const entryNo = `JE-${String(entryId).padStart(8, '0')}`;
        await this.db
          .updateTable('journal_entries')
          .set({ entry_no: entryNo, updated_at: sql`NOW()` } as any)
          .where('id', '=', entryId)
          .where('tenant_id', '=', tenantId)
          .execute();

        await this.db
          .insertInto('journal_entry_lines')
          .values([
            {
              journal_entry_id: entryId,
              tenant_id: tenantId,
              account_id: creditAccId,
              cost_center_id: costCenterId,
              description: desc,
              debit: creditAmount,
              credit: 0,
              partner_type: 'supplier',
              partner_id: null,
            } as any,
            {
              journal_entry_id: entryId,
              tenant_id: tenantId,
              account_id: expenseAccId,
              cost_center_id: costCenterId,
              description: desc,
              debit: 0,
              credit: creditAmount,
              partner_type: 'none',
              partner_id: null,
            } as any,
          ])
          .execute();

        const newCarrierCost = Math.max(0, Number(job.carrier_cost_total || 0) - creditAmount);
        const revenue = Number(job.client_invoiced_total || 0);
        const otherCosts = Number(job.other_costs_total || 0);
        const newNetProfit = revenue - (newCarrierCost + otherCosts);

        await this.db
          .updateTable('maritime_jobs')
          .set({
            carrier_cost_total: newCarrierCost,
            net_profit: newNetProfit,
            updated_at: sql`NOW()`,
          })
          .where('tenant_id', '=', tenantId)
          .where('id', '=', job.id as any)
          .execute();
      }
    }

    // Release hold on invoice
    await this.db
      .updateTable('maritime_carrier_invoices')
      .set({
        payment_status: 'unpaid',
        audit_status: dto.status === 'rejected' ? 'approved_override' : 'matched',
        updated_at: sql`NOW()`,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', Number(dispute.invoice_id) as any)
      .execute();

    return {
      success: true,
      dispute: updatedDispute,
      message: `تم تسوية النزاع المالي بنجاح (${dto.status})`,
    };
  }

  async listJobCarrierInvoices(auth: AuthContext, jobId: string) {
    const { tenantId } = requireTenantScope(auth);

    const invoices = await this.db
      .selectFrom('maritime_carrier_invoices as mci')
      .leftJoin('maritime_carrier_disputes as mcd', 'mcd.invoice_id', 'mci.id')
      .leftJoin('maritime_rate_cards as mrc', 'mrc.id', 'mci.rate_card_id')
      .select([
        'mci.id',
        'mci.tenant_id',
        'mci.job_id',
        'mci.shipping_line_id',
        'mci.carrier_name',
        'mci.invoice_number',
        'mci.invoice_date',
        'mci.currency',
        'mci.total_invoiced_amount',
        'mci.ocean_freight',
        'mci.thc_charges',
        'mci.baf_charges',
        'mci.detention_demurrage',
        'mci.other_charges',
        'mci.rate_card_id',
        'mci.contracted_amount',
        'mci.variance_amount',
        'mci.variance_pct',
        'mci.audit_status',
        'mci.override_approved_by',
        'mci.override_approved_at',
        'mci.override_reason',
        'mci.journal_entry_id',
        'mci.payment_status',
        'mci.notes',
        'mci.created_by',
        'mci.created_at',
        'mcd.id as dispute_id',
        'mcd.dispute_number',
        'mcd.dispute_status',
        'mcd.disputed_amount',
        'mcd.credit_note_number',
        'mcd.credit_note_amount',
        'mrc.carrier_name as rate_card_carrier',
        'mrc.total_freight_cost as rate_card_unit_cost',
      ])
      .where('mci.tenant_id', '=', tenantId)
      .where('mci.job_id', '=', Number(jobId) as any)
      .orderBy('mci.id', 'desc')
      .execute();

    return invoices.map((r: any) => ({
      id: String(r.id),
      jobId: String(r.job_id),
      shippingLineId: r.shipping_line_id ? String(r.shipping_line_id) : null,
      carrierName: r.carrier_name,
      invoiceNumber: r.invoice_number,
      invoiceDate: r.invoice_date,
      currency: r.currency,
      totalInvoicedAmount: Number(r.total_invoiced_amount),
      oceanFreight: Number(r.ocean_freight),
      thcCharges: Number(r.thc_charges),
      bafCharges: Number(r.baf_charges),
      detentionDemurrage: Number(r.detention_demurrage),
      otherCharges: Number(r.other_charges),
      rateCardId: r.rate_card_id ? String(r.rate_card_id) : null,
      contractedAmount: Number(r.contracted_amount),
      varianceAmount: Number(r.variance_amount),
      variancePct: Number(r.variance_pct),
      auditStatus: r.audit_status,
      overrideApprovedBy: r.override_approved_by ? String(r.override_approved_by) : null,
      overrideApprovedAt: r.override_approved_at,
      overrideReason: r.override_reason,
      journalEntryId: r.journal_entry_id ? String(r.journal_entry_id) : null,
      paymentStatus: r.payment_status,
      notes: r.notes,
      createdBy: r.created_by ? String(r.created_by) : null,
      createdAt: r.created_at,
      dispute: r.dispute_id
        ? {
            id: String(r.dispute_id),
            disputeNumber: r.dispute_number,
            disputeStatus: r.dispute_status,
            disputedAmount: Number(r.disputed_amount),
            creditNoteNumber: r.credit_note_number,
            creditNoteAmount: Number(r.credit_note_amount),
          }
        : null,
      rateCard: r.rate_card_id
        ? {
            carrierName: r.rate_card_carrier,
            unitCost: Number(r.rate_card_unit_cost),
          }
        : null,
    }));
  }

  // ==========================================
  // CARGO INSURANCE METHODS
  // ==========================================
  /**
   * يتحقق أن الشحنة المرجعية تخص نفس المستأجر قبل تعليق سجل ابن عليها.
   *
   * المفتاح الأجنبي في الهجرة 126 أحادي العمود (`job_id REFERENCES maritime_jobs(id)`)
   * لا مركّب `(tenant_id, id)` كما في هجرة 101 للمقاولات — فهو يضمن أن الشحنة
   * **موجودة** لا أنها **تخصّك**. بدون هذا الفحص يعلّق مستأجر وثيقة تأمين أو إيصال
   * مستودع على شحنة مستأجر آخر (السجل نفسه يبقى معزولاً بـ`tenant_id`، لكن المرجع
   * يصبح معلّقاً عبر المستأجرين). نفس الفحص موجود أصلاً في `createCustomsDeclaration`.
   */
  private async assertJobBelongsToTenant(trx: any, tenantId: string, jobId: string | number): Promise<void> {
    const job = await trx
      .selectFrom('maritime_jobs')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', jobId as any)
      .executeTakeFirst();
    if (!job) throw new NotFoundException('عملية الشحن غير موجودة');
  }

  async createCargoInsurance(auth: AuthContext, dto: CreateCargoInsuranceDto) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db.transaction().execute(async (trx) => {
      await this.assertJobBelongsToTenant(trx, tenantId, dto.jobId);

      const [record] = await trx
        .insertInto('maritime_cargo_insurances')
        .values({
          tenant_id: tenantId,
          job_id: dto.jobId as any,
          policy_number: dto.policyNumber,
          insurance_company: dto.insuranceCompany,
          insured_value: Number(dto.insuredValue || 0),
          premium_amount: Number(dto.premiumAmount || 0),
          currency: dto.currency || 'USD',
          coverage_type: dto.coverageType || 'all_risks',
          issue_date: dto.issueDate || new Date().toISOString().split('T')[0],
          expiry_date: dto.expiryDate || null,
          status: 'active',
          claim_amount: 0,
          claim_status: null,
          claim_notes: null,
          certificate_url: null,
          notes: dto.notes || null,
          created_by: auth.userId ? Number(auth.userId) : null,
        })
        .returningAll()
        .execute();

      return record;
    });
  }

  async updateCargoInsurance(auth: AuthContext, id: string | number, dto: UpdateCargoInsuranceDto) {
    const { tenantId } = requireTenantScope(auth);
    const updatePayload: any = {
      updated_at: sql`NOW()`,
    };
    if (dto.policyNumber !== undefined) updatePayload.policy_number = dto.policyNumber;
    if (dto.insuranceCompany !== undefined) updatePayload.insurance_company = dto.insuranceCompany;
    if (dto.insuredValue !== undefined) updatePayload.insured_value = Number(dto.insuredValue);
    if (dto.premiumAmount !== undefined) updatePayload.premium_amount = Number(dto.premiumAmount);
    if (dto.currency !== undefined) updatePayload.currency = dto.currency;
    if (dto.coverageType !== undefined) updatePayload.coverage_type = dto.coverageType;
    if (dto.expiryDate !== undefined) updatePayload.expiry_date = dto.expiryDate;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const [updated] = await this.db
      .updateTable('maritime_cargo_insurances')
      .set(updatePayload)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .execute();

    if (!updated) throw new NotFoundException('Cargo Insurance policy not found');
    return updated;
  }

  async claimCargoInsurance(auth: AuthContext, id: string | number, dto: ClaimCargoInsuranceDto) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('maritime_cargo_insurances')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id as any)
        .forUpdate()
        .executeTakeFirst();

      if (!existing) throw new NotFoundException('Cargo Insurance policy not found');

      const claimAmount = Number(dto.claimAmount);

      // البوابة في محرك نقي يستورده الاختبار من الإنتاج (AGENTS.md Rule 13):
      // تمنع تجاوز القيمة المؤمَّن عليها (كانت تُخزَّن ولا تُقرأ — F10) وتمنع
      // استبدال مطالبة مسجَّلة بصمت.
      const claimCheck = checkInsuranceClaim(
        { insuredValue: existing.insured_value, status: existing.status, claimAmount: existing.claim_amount },
        claimAmount,
      );
      if (!claimCheck.ok) {
        throw new BadRequestException(claimCheck.message);
      }

      const [updated] = await trx
        .updateTable('maritime_cargo_insurances')
        .set({
          status: 'claimed',
          claim_amount: claimAmount,
          claim_status: dto.claimStatus,
          claim_notes: dto.claimNotes || null,
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id as any)
        .returningAll()
        .execute();

      return updated;
    });
  }

  async getJobInsurances(auth: AuthContext, jobId: string | number) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('maritime_cargo_insurances')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('job_id', '=', jobId as any)
      .orderBy('id', 'desc')
      .execute();
  }

  // ==========================================
  // WAREHOUSE INTAKE / RECEIPTS METHODS
  // ==========================================
  async createWarehouseReceipt(auth: AuthContext, dto: CreateWarehouseReceiptDto) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db.transaction().execute(async (trx) => {
      await this.assertJobBelongsToTenant(trx, tenantId, dto.jobId);

      const tempNumber = `MWR-TMP-${crypto.randomUUID()}`;
      const [receipt] = await trx
        .insertInto('maritime_warehouse_receipts')
        .values({
          tenant_id: tenantId,
          receipt_number: tempNumber,
          job_id: dto.jobId as any,
          location_id: dto.locationId ? (dto.locationId as any) : null,
          received_date: dto.receivedDate ? new Date(dto.receivedDate) : sql`NOW()`,
          package_count: Number(dto.packageCount || 1),
          gross_weight_kg: Number(dto.grossWeightKg || 0),
          cbm: Number(dto.cbm || 0),
          bay_rack_bin: dto.bayRackBin || null,
          warehouse_status: 'in_storage',
          released_at: null,
          released_by: null,
          notes: dto.notes || null,
          created_by: auth.userId ? Number(auth.userId) : null,
        })
        .returningAll()
        .execute();

      const finalNumber = formatDailyDocumentNumber('MWR', Number(receipt.id));
      const [updated] = await trx
        .updateTable('maritime_warehouse_receipts')
        .set({ receipt_number: finalNumber })
        .where('id', '=', receipt.id)
        .where('tenant_id', '=', tenantId)
        .returningAll()
        .execute();

      return updated;
    });
  }

  async releaseWarehouseReceipt(auth: AuthContext, id: string | number, dto: ReleaseWarehouseReceiptDto) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('maritime_warehouse_receipts')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id as any)
        .forUpdate()
        .executeTakeFirst();

      if (!existing) throw new NotFoundException('Warehouse Receipt not found');

      // الإفراج حدث يقع مرة واحدة ويحمل أثراً رقابياً (مَن أفرج ومتى). بلا هذا
      // الحارس، استدعاء ثانٍ يستبدل `released_at`/`released_by` فيمحو أثر
      // الإفراج الأصلي بصمت.
      if (existing.warehouse_status === 'released') {
        throw new BadRequestException('سبق الإفراج عن إيصال المستودع هذا؛ لا يمكن الإفراج عنه مرتين');
      }

      const [updated] = await trx
        .updateTable('maritime_warehouse_receipts')
        .set({
          warehouse_status: 'released',
          released_at: sql`NOW()`,
          released_by: auth.userId ? Number(auth.userId) : null,
          notes: dto.notes ? `${existing.notes ? existing.notes + ' | ' : ''}${dto.notes}` : existing.notes,
          updated_at: sql`NOW()`,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id as any)
        .returningAll()
        .execute();

      return updated;
    });
  }

  async getJobWarehouseReceipts(auth: AuthContext, jobId: string | number) {
    const { tenantId } = requireTenantScope(auth);
    return await this.db
      .selectFrom('maritime_warehouse_receipts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('job_id', '=', jobId as any)
      .orderBy('id', 'desc')
      .execute();
  }

  async getWarehouseReceipts(auth: AuthContext, filters?: { status?: string; search?: string }) {
    const { tenantId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('maritime_warehouse_receipts')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('warehouse_status', '=', filters.status as any);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.where((eb) => eb.or([
        eb('receipt_number', 'ilike', term),
        eb('bay_rack_bin', 'ilike', term),
      ]));
    }

    return await query.orderBy('id', 'desc').execute();
  }
}
