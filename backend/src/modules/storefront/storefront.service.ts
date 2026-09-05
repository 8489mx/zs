import { Inject, Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { UpdateStorefrontSettingsDto } from './dto/update-storefront-settings.dto';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto } from './dto/delivery-zone.dto';
import { SalesService } from '../sales/sales.service';
import { WhatsAppGatewayService } from '../settings/services/whatsapp-gateway.service';

@Injectable()
export class StorefrontService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly salesService: SalesService,
    @Optional() private readonly whatsappService?: WhatsAppGatewayService,
  ) {}

  private async getTenantBySlug(slug: string) {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    if (!cleanSlug || cleanSlug === 'admin') throw new NotFoundException('المتجر غير موجود');

    let tenant = await this.db
      .selectFrom('tenants')
      .selectAll()
      .where('slug', '=', cleanSlug)
      .executeTakeFirst();

    if (!tenant && cleanSlug.includes('.')) {
      tenant = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('custom_domain', '=', cleanSlug)
        .executeTakeFirst();
    }

    if (!tenant) {
      const slugSetting = await this.db
        .selectFrom('settings')
        .select('tenant_id')
        .where('key', '=', 'storefront_slug')
        .where(sql<boolean>`LOWER(TRIM(BOTH '"' FROM value)) = ${cleanSlug}`)
        .executeTakeFirst();

      if (slugSetting) {
        tenant = await this.db
          .selectFrom('tenants')
          .selectAll()
          .where('id', '=', slugSetting.tenant_id)
          .executeTakeFirst();
      }
    }

    if (!tenant && (cleanSlug === 'default' || cleanSlug === 'almhnds' || cleanSlug === 'almohandes')) {
      tenant = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('id', '=', 'default')
        .executeTakeFirst();

      if (!tenant) {
        tenant = await this.db
          .selectFrom('tenants')
          .selectAll()
          .orderBy('created_at', 'asc')
          .executeTakeFirst();
      }
    }

    if (!tenant) throw new NotFoundException('المتجر غير موجود');
    return tenant;
  }

  private async getTenantSettingsMap(tenantId: string): Promise<Map<string, string>> {
    const rows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();

    const map = new Map<string, string>();
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value);
        // Keep strings as-is; re-serialize arrays/objects so downstream JSON.parse works
        map.set(row.key, typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
      } catch {
        map.set(row.key, row.value);
      }
    }
    return map;
  }

  private readonly catalogCache = new Map<string, { data: any; expiresAt: number }>();

  public invalidateCatalogCache(slug?: string) {
    if (slug) {
      this.catalogCache.delete(slug.toLowerCase().trim());
    } else {
      this.catalogCache.clear();
    }
  }

  // --- Public Storefront Methods ---

  async getStorefrontInfo(slug: string) {
    const tenant = await this.getTenantBySlug(slug);
    const settings = await this.getTenantSettingsMap(tenant.id);

    const isEnabled = settings.get('storefront_enabled') !== 'false';
    const title = settings.get('storefront_title') || settings.get('storeName') || tenant.business_name;
    const address = settings.get('storefront_address') || settings.get('address') || '';
    const bio = settings.get('storefront_bio') || '';
    const announcement = settings.get('storefront_announcement') || '';
    const bannerUrl = settings.get('storefront_banner_url') || '';
    const rawBannerUrls = settings.get('storefront_banner_urls');
    let bannerUrls: string[] = [];
    if (rawBannerUrls) {
      try {
        const parsed = JSON.parse(rawBannerUrls);
        if (Array.isArray(parsed)) bannerUrls = parsed.filter(Boolean);
      } catch {}
    }
    if (bannerUrls.length === 0 && bannerUrl) {
      bannerUrls = [bannerUrl];
    }

    const deliveryFee = Number(settings.get('storefront_delivery_fee') || 0);
    const minOrder = Number(settings.get('storefront_min_order') || 0);
    const whatsappPhone = settings.get('storefront_whatsapp') || settings.get('phone') || tenant.owner_phone || '';
    const currency = settings.get('currency') || 'EGP';

    const bannerFit = settings.get('storefront_banner_fit') || 'contain';
    const bannerPosition = settings.get('storefront_banner_position') || 'center';
    const bannerIntervalSeconds = Math.max(1, Number(settings.get('storefront_banner_interval') || 4));
    const smartDealsEnabled = settings.get('storefront_smart_deals') === 'true';
    const freeShippingEnabled = settings.get('storefront_free_shipping_enabled') === 'true';
    const freeShippingMinOrder = Number(settings.get('storefront_free_shipping_min_order') || 0);
    let bannerPositions: string[] = [];
    try {
      const rawPos = settings.get('storefront_banner_positions');
      if (rawPos) {
        const parsed = JSON.parse(rawPos);
        if (Array.isArray(parsed)) bannerPositions = parsed.filter(Boolean);
      }
    } catch {}

    const deliveryZoneRows = await this.db
      .selectFrom('storefront_delivery_zones')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('is_active', '=', true)
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')
      .execute();

    const deliveryZones = deliveryZoneRows.map((z) => ({
      id: z.id,
      name: z.name,
      deliveryFee: Number(z.delivery_fee || 0),
      estimatedTime: z.estimated_time || '',
    }));

    const onlinePaymentEnabled = settings.get('storefront_online_payment_enabled') === 'true';
    const onlinePaymentTestMode = settings.get('storefront_paymob_test_mode') !== 'false';
    const onlinePaymentProvider = settings.get('storefront_online_payment_provider') || 'paymob';

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      businessName: tenant.business_name,
      enabled: isEnabled,
      title,
      address,
      bio,
      announcement,
      bannerUrl: bannerUrls[0] || bannerUrl,
      bannerUrls,
      bannerFit,
      bannerPosition,
      bannerPositions,
      bannerIntervalSeconds,
      smartDealsEnabled,
      deliveryFee,
      deliveryZones,
      minOrder,
      freeShippingEnabled,
      freeShippingMinOrder,
      whatsappPhone,
      currency,
      onlinePaymentEnabled,
      onlinePaymentTestMode,
      onlinePaymentProvider,
    };
  }

  async getStorefrontCatalog(slug: string) {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    const cached = this.catalogCache.get(cleanSlug);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const tenant = await this.getTenantBySlug(cleanSlug);

    // 1. Fetch Categories
    const categories = await this.db
      .selectFrom('product_categories')
      .select(['id', 'name'])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .orderBy('name', 'asc')
      .execute();

    // Fetch Category Images from settings
    const catImagesRow = await this.db
      .selectFrom('settings')
      .select(['value'])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('key', '=', 'storefront_category_images')
      .executeTakeFirst();

    let catImageMap: Record<string, string> = {};
    if (catImagesRow?.value) {
      try {
        const parsed = JSON.parse(catImagesRow.value);
        catImageMap = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      } catch {}
    }

    const formattedCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: catImageMap[String(c.id)] || '',
    }));

    const catMap = new Map<number, string>();
    for (const c of categories) {
      catMap.set(c.id, c.name);
    }

    // 2. Fetch Products
    const products = await this.db
      .selectFrom('products')
      .select([
        'id',
        'name',
        'barcode',
        'retail_price',
        'stock_qty',
        'category_id',
        'notes',
        'metadata',
        'item_type',
      ])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where((eb) => eb.or([
        eb('item_type', '=', 'product'),
        eb('item_type', 'is', null)
      ]))
      .orderBy('name', 'asc')
      .execute();

    // 3. Fetch Real Product Reviews / Ratings Summary
    const reviewsSummary = await this.db
      .selectFrom('product_reviews')
      .select([
        'product_id',
        sql<number>`ROUND(AVG(rating)::numeric, 1)`.as('avg_rating'),
        sql<number>`COUNT(*)::int`.as('review_count'),
      ])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('is_approved', '=', true)
      .groupBy('product_id')
      .execute();

    const ratingMap = new Map<number, { avgRating: number; reviewCount: number }>();
    for (const r of reviewsSummary) {
      ratingMap.set(Number(r.product_id), {
        avgRating: Number(r.avg_rating) || 0,
        reviewCount: Number(r.review_count) || 0,
      });
    }

    const formattedProducts = products.map((p) => {
      let meta: Record<string, any> = {};
      if (p.metadata) {
        try {
          meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
        } catch {}
      }

      const stockQty = Number(p.stock_qty ?? 0);
      const retailPrice = Number(p.retail_price ?? 0);
      const reviewStats = ratingMap.get(Number(p.id)) || { avgRating: 0, reviewCount: 0 };

      return {
        id: Number(p.id) || p.id,
        name: p.name,
        barcode: p.barcode || '',
        price: retailPrice,
        categoryId: p.category_id ? Number(p.category_id) : null,
        categoryName: (p.category_id && catMap.get(p.category_id)) || 'عام',
        stockQty,
        inStock: stockQty > 0,
        icon: meta.icon || '',
        imageUrl: meta.imageUrl || meta.image || '',
        description: p.notes || meta.description || '',
        rating: reviewStats.avgRating,
        reviewCount: reviewStats.reviewCount,
      };
    });

    const result = {
      categories: formattedCategories,
      products: formattedProducts,
    };

    // Cache in-memory for 45 seconds
    this.catalogCache.set(cleanSlug, {
      data: result,
      expiresAt: Date.now() + 45_000,
    });

    return result;
  }

  async createOnlineOrder(slug: string, dto: CreateOnlineOrderDto) {
    const tenant = await this.getTenantBySlug(slug);
    const settings = await this.getTenantSettingsMap(tenant.id);

    if (settings.get('storefront_enabled') === 'false') {
      throw new BadRequestException('المتجر الإلكتروني متوقف حالياً عن استقبال الطلبات');
    }

    const cleanCustomerPhone = (dto.customerPhone || '').replace(/\D/g, '');
    if (!/^01[0125]\d{8}$/.test(cleanCustomerPhone)) {
      throw new BadRequestException('يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً ويبدأ بـ (010، 011، 012، 015)');
    }

    const cleanCustomerName = (dto.customerName || '').trim();
    const nameLetters = (cleanCustomerName.match(/[\p{L}\p{M}]/gu) || []).length;
    if (cleanCustomerName.length < 3 || nameLetters < 3) {
      throw new BadRequestException('يرجى إدخال اسم مستلم صحيح لا يقل عن 3 أحرف (مثال: علي، مازن، محمد)');
    }

    const cleanCustomerAddress = (dto.customerAddress || '').trim();
    if (cleanCustomerAddress) {
      const addressLetters = (cleanCustomerAddress.match(/[\p{L}\p{M}]/gu) || []).length;
      if (cleanCustomerAddress.length < 5 || addressLetters < 3) {
        throw new BadRequestException('يرجى إدخال عنوان توصيل واضح ومفصل لا يقل عن 5 أحرف');
      }
    }

    const minOrder = Number(settings.get('storefront_min_order') || 0);
    let deliveryFee = Number(settings.get('storefront_delivery_fee') || 0);
    let deliveryZoneId: number | null = null;
    let deliveryZoneName: string | null = null;

    if (dto.deliveryZoneId) {
      const zone = await this.db
        .selectFrom('storefront_delivery_zones')
        .selectAll()
        .where(sql<boolean>`tenant_id = ${tenant.id}`)
        .where('id', '=', dto.deliveryZoneId)
        .where('is_active', '=', true)
        .executeTakeFirst();

      if (zone) {
        deliveryZoneId = zone.id;
        deliveryZoneName = zone.name;
        deliveryFee = Number(zone.delivery_fee || 0);
      }
    } else if (dto.deliveryZoneName && dto.deliveryZoneName.trim()) {
      deliveryZoneName = dto.deliveryZoneName.trim();
    }

    // Fetch products in order to verify price and names
    const numericIds = dto.items.map((i) => Number(i.productId)).filter((id) => !isNaN(id) && id > 0);
    const stringIds = dto.items.map((i) => String(i.productId).trim()).filter(Boolean);

    const dbProducts = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'retail_price', 'barcode', 'stock_qty'])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where((eb) => {
        const conditions = [];
        if (numericIds.length > 0) {
          conditions.push(eb('id', 'in', numericIds));
        }
        if (stringIds.length > 0) {
          conditions.push(eb(sql<string>`CAST(id AS TEXT)`, 'in', stringIds));
        }
        return conditions.length > 0 ? eb.or(conditions) : eb.val(false);
      })
      .execute();

    // Dual-indexed map (both Number and String keys) to eliminate any serialization type-mismatch
    const productMap = new Map<string | number, any>();
    for (const p of dbProducts) {
      productMap.set(p.id, p);
      productMap.set(String(p.id), p);
      const numId = Number(p.id);
      if (!isNaN(numId)) {
        productMap.set(numId, p);
      }
    }

    let subtotal = 0;
    const validatedItems = dto.items.map((item) => {
      const prod = productMap.get(item.productId) ?? productMap.get(Number(item.productId)) ?? productMap.get(String(item.productId));
      if (!prod) {
        throw new BadRequestException(`عفواً، أحد الأصناف المطلوبة غير متاح في المتجر حالياً، يرجى تحديث السلة.`);
      }
      if (Number(prod.stock_qty ?? 0) <= 0) {
        throw new BadRequestException(`عفواً، نفد مخزون الصنف "${prod.name}"، يرجى حذفه من السلة لإتمام الطلب.`);
      }
      const unitPrice = Number(prod.retail_price || 0);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      return {
        productId: prod.id,
        name: prod.name,
        barcode: prod.barcode || '',
        quantity,
        unitPrice,
        total: lineTotal,
        notes: item.notes || '',
      };
    });

    if (minOrder > 0 && subtotal < minOrder) {
      throw new BadRequestException(`الحد الأدنى للطلب هو ${minOrder} ج`);
    }

    // Automatic Free Shipping Rule Check
    const freeShippingEnabled = settings.get('storefront_free_shipping_enabled') === 'true';
    const freeShippingMinOrder = Number(settings.get('storefront_free_shipping_min_order') || 0);
    if (freeShippingEnabled && freeShippingMinOrder > 0 && subtotal >= freeShippingMinOrder) {
      deliveryFee = 0;
    }

    // Coupon Validation & Application
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (dto.couponCode && dto.couponCode.trim()) {
      const codeUpper = dto.couponCode.trim().toUpperCase();
      const coupon = await this.db
        .selectFrom('storefront_coupons')
        .selectAll()
        .where(sql<boolean>`tenant_id = ${tenant.id}`)
        .where('code', '=', codeUpper)
        .where('is_active', '=', true)
        .executeTakeFirst();

      if (coupon) {
        const nowDate = new Date();
        const isStarted = !coupon.start_date || new Date(coupon.start_date) <= nowDate;
        const isNotExpired = !coupon.end_date || new Date(coupon.end_date) >= nowDate;
        const hasRemainingUsage = coupon.usage_limit === null || Number(coupon.times_used || 0) < coupon.usage_limit;
        const meetsMinOrder = subtotal >= Number(coupon.min_order_amount || 0);

        if (isStarted && isNotExpired && hasRemainingUsage && meetsMinOrder) {
          appliedCouponCode = coupon.code;
          if (coupon.discount_type === 'free_shipping') {
            deliveryFee = 0;
          } else if (coupon.discount_type === 'percentage') {
            const rawDiscount = (subtotal * Number(coupon.discount_value)) / 100;
            discountAmount = coupon.max_discount_amount
              ? Math.min(rawDiscount, Number(coupon.max_discount_amount))
              : rawDiscount;
          } else if (coupon.discount_type === 'fixed') {
            discountAmount = Math.min(subtotal, Number(coupon.discount_value));
          }

          // Increment coupon usage
          await this.db
            .updateTable('storefront_coupons')
            .set({
              times_used: Number(coupon.times_used || 0) + 1,
              updated_at: new Date(),
            })
            .where('id', '=', coupon.id)
            .execute();
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount) + deliveryFee;

    // Get default primary branch
    const primaryBranch = await this.db
      .selectFrom('branches')
      .select(['id'])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('is_active', '=', true)
      .orderBy('id', 'asc')
      .executeTakeFirst();

    const branchId = primaryBranch ? Number(primaryBranch.id) : null;
    const accountId = `${tenant.id}:main`;

    // Date-based daily sequential numbering: ON-YYMMDD-0001
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    let nextSeq = 1;
    try {
      const lastDoc = await this.db
        .selectFrom('online_orders')
        .select(
          sql<number>`COALESCE(MAX(CASE WHEN order_number ~ '^[A-Za-z]+-[0-9]+-[0-9]+$' THEN CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER) ELSE 0 END), 0)`.as('last_seq')
        )
        .where(sql<boolean>`tenant_id = ${tenant.id}`)
        .where('created_at', '>=', startOfDay)
        .executeTakeFirst();

      nextSeq = Number(lastDoc?.last_seq || 0) + 1;
    } catch {
      const countRow = await this.db
        .selectFrom('online_orders')
        .select(sql<number>`COUNT(*)::int`.as('cnt'))
        .where(sql<boolean>`tenant_id = ${tenant.id}`)
        .where('created_at', '>=', startOfDay)
        .executeTakeFirst();
      nextSeq = Number(countRow?.cnt || 0) + 1;
    }

    const seq = String(nextSeq).padStart(4, '0');
    const orderNumber = `ON-${datePrefix}-${seq}`;

    const insertedOrder = await this.db
      .insertInto('online_orders')
      .values({
        tenant_id: tenant.id,
        account_id: accountId,
        order_number: orderNumber,
        customer_name: dto.customerName.trim(),
        customer_phone: dto.customerPhone.trim(),
        customer_address: (dto.customerAddress || '').trim(),
        customer_notes: (dto.customerNotes || '').trim(),
        items_json: JSON.stringify(validatedItems),
        subtotal,
        delivery_fee: deliveryFee,
        delivery_zone_id: deliveryZoneId,
        delivery_zone_name: deliveryZoneName,
        discount_amount: discountAmount,
        coupon_code: appliedCouponCode,
        total_amount: totalAmount,
        status: 'pending',
        payment_method: dto.paymentMethod || 'cod',
        payment_status: 'pending',
        branch_id: branchId,
        sale_id: null,
      })
      .returning(['id', 'order_number', 'total_amount', 'created_at'])
      .executeTakeFirstOrThrow();

    // Non-blocking auto WhatsApp notification via gateway if enabled
    if (this.whatsappService) {
      void this.whatsappService.sendOnlineOrderNotification(insertedOrder.id, tenant.id).catch(() => undefined);
    }

    // Prepare WhatsApp Message Text
    const whatsappPhone = settings.get('storefront_whatsapp') || settings.get('phone') || tenant.owner_phone || '';
    const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

    const itemsSummary = validatedItems
      .map((i) => `- ${i.name} (×${i.quantity}) = ${i.total} ج`)
      .join('\n');

    const paymentLabel = (dto.paymentMethod === 'credit_card')
      ? 'بطاقة بنكية أونلاين (فيزا / ماستركارد)'
      : (dto.paymentMethod === 'instapay_wallet')
      ? 'تحويل مسبق (إنستاباي / محفظة)'
      : 'دفع عند الاستلام (كاش)';
    const notesPart = dto.customerNotes ? `\nملاحظات: ${dto.customerNotes}` : '';
    const zonePart = deliveryZoneName ? `\nالمنطقة: ${deliveryZoneName}` : '';
    const discountPart = discountAmount > 0 ? `\nالخصم (${appliedCouponCode}): -${discountAmount.toFixed(0)} ج` : '';
    const shippingText = deliveryFee === 0 ? 'شحن مجاني 🎉' : `شامل التوصيل ${deliveryFee} ج`;

    const whatsappMessage = encodeURIComponent(
      `مرحباً، أود متابعة طلبي من متجركم:\n` +
      `رقم الطلب: #${orderNumber}\n` +
      `العميل: ${dto.customerName}\n` +
      `الهاتف: ${dto.customerPhone}\n` +
      `العنوان: ${dto.customerAddress || 'غير محدد'}` +
      `${zonePart}` +
      `${notesPart}\n` +
      `طريقة الدفع: ${paymentLabel}\n\n` +
      `الأصناف المطلوبة:\n${itemsSummary}\n\n` +
      `المجموع: ${subtotal} ج${discountPart}\n` +
      `الإجمالي: ${totalAmount} ج (${shippingText})`
    );

    const whatsappUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${whatsappMessage}` : null;

    return {
      ok: true,
      orderId: insertedOrder.id,
      orderNumber: insertedOrder.order_number,
      totalAmount: Number(insertedOrder.total_amount),
      subtotal,
      deliveryFee,
      deliveryZoneId,
      deliveryZoneName,
      discountAmount,
      couponCode: appliedCouponCode,
      items: validatedItems,
      whatsappUrl,
    };
  }

  async listCustomerOrders(slug: string, phone?: string, orderNumbers?: string[]) {
    const tenant = await this.getTenantBySlug(slug);
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
    const validOrderNumbers = (orderNumbers || []).filter(Boolean);

    if (!cleanPhone && validOrderNumbers.length === 0) {
      return { ok: true, orders: [] };
    }

    let qb = this.db
      .selectFrom('online_orders as o')
      .leftJoin('sales as s', 's.id', 'o.sale_id')
      .leftJoin('delivery_representatives as dr', 'dr.id', 's.delivery_rep_id')
      .select([
        'o.id',
        'o.order_number',
        'o.customer_name',
        'o.customer_phone',
        'o.customer_address',
        'o.customer_notes',
        'o.items_json',
        'o.subtotal',
        'o.delivery_fee',
        'o.delivery_zone_id',
        'o.delivery_zone_name',
        'o.total_amount',
        'o.status',
        'o.payment_method',
        'o.coupon_code',
        'o.discount_amount',
        'o.sale_id',
        'o.created_at',
        'o.updated_at',
        'dr.name as delivery_rep_name',
        'dr.phone as delivery_rep_phone',
        's.delivery_status as sale_delivery_status',
      ])
      .where(sql<boolean>`o.tenant_id = ${tenant.id}`);

    qb = qb.where((eb) => {
      const conditions: any[] = [];
      if (cleanPhone) {
        conditions.push(eb('o.customer_phone', 'like', `%${cleanPhone.slice(-9)}%`));
      }
      if (validOrderNumbers.length > 0) {
        conditions.push(eb('o.order_number', 'in', validOrderNumbers));
      }
      return eb.or(conditions);
    });

    const rows = await qb.orderBy('o.created_at', 'desc').limit(20).execute();

    return {
      ok: true,
      orders: rows.map((r) => {
        let items: any[] = [];
        try {
          items = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json;
        } catch {}

        let effectiveStatus: string = r.status;
        if (r.status !== 'cancelled') {
          if (r.status === 'delivered' || r.sale_delivery_status === 'delivered' || r.sale_delivery_status === 'settled') {
            effectiveStatus = 'delivered';
          } else if (r.status === 'shipped' || r.sale_delivery_status === 'out_for_delivery') {
            effectiveStatus = 'shipped';
          }
        }

        return {
          id: r.id,
          orderNumber: r.order_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          customerAddress: r.customer_address,
          customerNotes: r.customer_notes,
          deliveryZoneId: r.delivery_zone_id ? Number(r.delivery_zone_id) : null,
          deliveryZoneName: r.delivery_zone_name || null,
          subtotal: Number(r.subtotal),
          deliveryFee: Number(r.delivery_fee),
          discountAmount: Number(r.discount_amount || 0),
          couponCode: r.coupon_code || null,
          totalAmount: Number(r.total_amount),
          status: effectiveStatus,
          paymentMethod: r.payment_method,
          saleId: r.sale_id,
          deliveryRepName: r.delivery_rep_name || null,
          deliveryRepPhone: r.delivery_rep_phone || null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          items,
        };
      }),
    };
  }

  async cancelCustomerOrder(slug: string, orderNumber: string) {
    const tenant = await this.getTenantBySlug(slug);
    const cleanOrderNumber = String(orderNumber || '').trim();

    const order = await this.db
      .selectFrom('online_orders')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('order_number', '=', cleanOrderNumber)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('لا يمكن إلغاء الطلب لأنه قيد التجهيز أو تم اعتماده بالفعل من المتجر');
    }

    if (order.sale_id) {
      throw new BadRequestException('لا يمكن إلغاء الطلب لأنه تم إصدار فاتورة له');
    }

    await this.db
      .updateTable('online_orders')
      .set({
        status: 'cancelled',
        updated_at: new Date(),
      })
      .where('id', '=', order.id)
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .execute();

    return { ok: true, message: 'تم إلغاء الطلب بنجاح' };
  }

  async updateCustomerOrder(slug: string, orderNumber: string, dto: CreateOnlineOrderDto) {
    const tenant = await this.getTenantBySlug(slug);
    const cleanOrderNumber = String(orderNumber || '').trim();

    const order = await this.db
      .selectFrom('online_orders')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('order_number', '=', cleanOrderNumber)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('لا يمكن تعديل الطلب لأنه قيد التجهيز أو تم اعتماده من المتجر');
    }

    if (order.sale_id) {
      throw new BadRequestException('لا يمكن تعديل الطلب لأنه تم إصدار فاتورة له');
    }

    const settings = await this.getTenantSettingsMap(tenant.id);
    const isEnabled = settings.get('storefront_enabled') !== 'false';
    if (!isEnabled) throw new BadRequestException('المتجر الإلكتروني متوقف حالياً');

    const deliveryFee = Number(settings.get('storefront_delivery_fee') || 0);
    const minOrder = Number(settings.get('storefront_min_order') || 0);

    if (dto.customerPhone) {
      const cleanCustomerPhone = dto.customerPhone.replace(/\D/g, '');
      if (!/^01[0125]\d{8}$/.test(cleanCustomerPhone)) {
        throw new BadRequestException('يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً ويبدأ بـ (010، 011، 012، 015)');
      }
    }

    if (dto.customerName) {
      const cleanCustomerName = dto.customerName.trim();
      const nameLetters = (cleanCustomerName.match(/[\p{L}\p{M}]/gu) || []).length;
      if (cleanCustomerName.length < 3 || nameLetters < 3) {
        throw new BadRequestException('يرجى إدخال اسم مستلم صحيح لا يقل عن 3 أحرف (مثال: علي، مازن، محمد)');
      }
    }

    if (dto.customerAddress) {
      const cleanCustomerAddress = dto.customerAddress.trim();
      const addressLetters = (cleanCustomerAddress.match(/[\p{L}\p{M}]/gu) || []).length;
      if (cleanCustomerAddress.length < 5 || addressLetters < 3) {
        throw new BadRequestException('يرجى إدخال عنوان توصيل واضح ومفصل لا يقل عن 5 أحرف');
      }
    }

    const rawProductIds = dto.items.map((i) => Number(i.productId)).filter(Boolean);
    if (rawProductIds.length === 0) {
      throw new BadRequestException('يجب إضافة أصناف في السلة');
    }

    const catalogProducts = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'retail_price', 'stock_qty'])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('id', 'in', rawProductIds)
      .execute();

    const productMap = new Map(catalogProducts.map((p) => [Number(p.id), p]));

    let subtotal = 0;
    const validatedItems: Array<{
      productId: number;
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
      notes?: string;
    }> = [];

    for (const item of dto.items) {
      const p = productMap.get(Number(item.productId));
      if (!p) continue;

      const qty = Math.max(1, Number(item.quantity || 1));
      const price = Number(p.retail_price || 0);
      const lineTotal = price * qty;

      subtotal += lineTotal;
      validatedItems.push({
        productId: Number(p.id),
        name: p.name,
        quantity: qty,
        unitPrice: price,
        total: lineTotal,
        notes: item.notes ? String(item.notes).trim() : undefined,
      });
    }

    if (validatedItems.length === 0) {
      throw new BadRequestException('الأصناف المطلوبة غير متوفرة حالياً');
    }

    if (minOrder > 0 && subtotal < minOrder) {
      throw new BadRequestException(`الحد الأدنى للطلب هو ${minOrder} ج`);
    }

    const totalAmount = subtotal + deliveryFee;

    await this.db
      .updateTable('online_orders')
      .set({
        items_json: JSON.stringify(validatedItems),
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        customer_name: (dto.customerName || order.customer_name).trim(),
        customer_phone: (dto.customerPhone || order.customer_phone).trim(),
        customer_address: dto.customerAddress ? dto.customerAddress.trim() : order.customer_address,
        customer_notes: dto.customerNotes ? dto.customerNotes.trim() : order.customer_notes,
        payment_method: dto.paymentMethod || order.payment_method,
        updated_at: new Date(),
      })
      .where('id', '=', order.id)
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .execute();

    return {
      ok: true,
      orderNumber: order.order_number,
      totalAmount,
      subtotal,
      deliveryFee,
      items: validatedItems,
      message: 'تم تحديث طلبك بنجاح!',
    };
  }

  // --- Merchant Admin Methods ---

  async listOrders(query: Record<string, unknown>, actor: AuthContext) {
    const tenantId = actor.tenantId;
    const status = typeof query.status === 'string' ? query.status.trim() : '';

    let qb = this.db
      .selectFrom('online_orders')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenantId}`);

    if (status && status !== 'all') {
      if (status === 'active') {
        qb = qb.where('status', 'in', ['pending', 'confirmed', 'processing', 'shipped']);
      } else {
        qb = qb.where('status', '=', status as any);
      }
    }

    const rows = await qb.orderBy('created_at', 'desc').execute();

    const counts: Record<string, number> = {
      all: 0,
      active: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    try {
      const countRows = await this.db
        .selectFrom('online_orders')
        .select(['status', sql<number>`COUNT(*)::int`.as('cnt')])
        .where(sql<boolean>`tenant_id = ${tenantId}`)
        .groupBy('status')
        .execute();

      for (const cr of countRows) {
        const s = String(cr.status);
        const c = Number(cr.cnt || 0);
        counts[s] = (counts[s] || 0) + c;
        counts.all += c;
        if (['pending', 'confirmed', 'processing', 'shipped'].includes(s)) {
          counts.active += c;
        }
      }
    } catch {
      // Ignore count aggregation failure
    }

    return {
      orders: rows.map((r) => {
        let items: any[] = [];
        try {
          items = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json;
        } catch {}

        return {
          id: r.id,
          orderNumber: r.order_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          customerAddress: r.customer_address,
          customerNotes: r.customer_notes,
          subtotal: Number(r.subtotal),
          deliveryFee: Number(r.delivery_fee),
          deliveryZoneId: r.delivery_zone_id ? Number(r.delivery_zone_id) : null,
          deliveryZoneName: r.delivery_zone_name || null,
          discountAmount: Number(r.discount_amount || 0),
          couponCode: r.coupon_code || null,
          totalAmount: Number(r.total_amount),
          status: r.status,
          paymentMethod: r.payment_method,
          saleId: r.sale_id,
          createdAt: r.created_at,
          items,
        };
      }),
      counts,
    };
  }

  async getOrder(id: number, actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const order = await this.db
      .selectFrom('online_orders')
      .selectAll()
      .where('id', '=', id)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    if (!order) throw new NotFoundException('الطلب غير موجود');

    let items: any[] = [];
    try {
      items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : order.items_json;
    } catch {}

    return {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee),
      deliveryZoneId: order.delivery_zone_id ? Number(order.delivery_zone_id) : null,
      deliveryZoneName: order.delivery_zone_name || null,
      discountAmount: Number(order.discount_amount || 0),
      couponCode: order.coupon_code || null,
      totalAmount: Number(order.total_amount),
      items,
    };
  }

  async updateOrderStatus(id: number, status: string, actor: AuthContext, saleId?: number) {
    const { tenantId } = requireTenantScope(actor);
    const allowed = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('حالة الطلب غير صالحة');
    }

    const updatePayload: any = {
      status: status as any,
      updated_at: new Date(),
    };
    if (saleId !== undefined && saleId > 0) {
      updatePayload.sale_id = saleId;
    }

    await this.db
      .updateTable('online_orders')
      .set(updatePayload)
      .where('id', '=', id)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();

    return { ok: true, status, saleId };
  }

  async convertToSale(id: number, actor: AuthContext, explicitRepId?: number) {
    const { tenantId, accountId } = requireTenantScope(actor);
    const order = await this.getOrder(id, actor);

    if (order.sale_id) {
      const fullSale = await this.salesService.getSaleById(order.sale_id, actor);
      return { ok: true, saleId: order.sale_id, sale: fullSale, message: 'تم تحويل الطلب لفاتورة مسبقاً' };
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('لا يمكن تحويل طلب ملغي إلى فاتورة');
    }

    // 1. Auto-Register / Find Customer in Customers Directory
    const cleanCustomerPhone = (order.customer_phone || '').replace(/\D/g, '');
    let customer = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'address'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('phone', '=', cleanCustomerPhone)
      .executeTakeFirst();

    let isNewCustomer = false;
    if (!customer && cleanCustomerPhone) {
      try {
        const inserted = await this.db
          .insertInto('customers')
          .values({
            name: (order.customer_name || 'عميل متجر أونلاين').trim(),
            phone: cleanCustomerPhone,
            address: (order.customer_address || '').trim(),
            balance: 0,
            customer_type: 'cash',
            is_active: true,
            tenant_id: tenantId,
            account_id: accountId,
          } as any)
          .returning(['id', 'name', 'phone', 'address'])
          .executeTakeFirst();

        customer = inserted;
        isNewCustomer = true;
      } catch (err) {
        // Fallback if customer insert fails (e.g. duplicate name constraint)
        customer = await this.db
          .selectFrom('customers')
          .select(['id', 'name', 'phone', 'address'])
          .where(sql<boolean>`tenant_id = ${tenantId}`)
          .where('phone', '=', cleanCustomerPhone)
          .executeTakeFirst();
      }
    }

    // 2. Prepare Sale lines
    const items = (order.items || []) as Array<any>;
    const lines = items.map((i) => ({
      productId: Number(i.productId),
      qty: Number(i.quantity ?? i.qty ?? 1),
      quantity: Number(i.quantity ?? i.qty ?? 1),
      price: Number(i.unitPrice ?? i.price ?? 0),
      unitPrice: Number(i.unitPrice ?? i.price ?? 0),
      unitName: 'قطعة',
      unitMultiplier: 1,
      priceType: 'retail',
      discount: 0,
      notes: 'طلب متجر إلكتروني #' + order.order_number,
    }));

    // Find primary location for branch
    const branch = await this.db
      .selectFrom('branches')
      .select(['id', 'default_stock_location_id'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', order.branch_id || 1)
      .executeTakeFirst();

    const branchId = branch?.id || 1;
    const locationId = branch?.default_stock_location_id || 1;

    // 2.5 Resolve delivery representative
    let repId = explicitRepId ? Number(explicitRepId) : 0;
    let repName = 'توصيل المتجر';
    if (!repId || Number.isNaN(repId) || repId <= 0) {
      let activeRep = await this.db
        .selectFrom('delivery_representatives')
        .select(['id', 'name'])
        .where(sql<boolean>`tenant_id = ${tenantId}`)
        .where('is_active', '=', true)
        .orderBy('id', 'asc')
        .executeTakeFirst();

      if (!activeRep) {
        // Auto-create default delivery rep for the store
        const insertedReps = await this.db
          .insertInto('delivery_representatives')
          .values({
            name: 'توصيل المتجر',
            phone: null,
            is_active: true,
            rep_type: 'store_fleet',
            tenant_id: tenantId,
            account_id: String(accountId || 1),
          } as any)
          .returning(['id', 'name'])
          .execute();
        activeRep = insertedReps[0];
      }
      repId = Number(activeRep.id);
      repName = activeRep.name;
    }

    // 3. Call SalesService to create formal sale delivery invoice
    // For COD (Cash on Delivery): paidAmount is 0 and collectionStatus is 'cod' (custody on delivery rep)
    // For Instapay: paidAmount is total and collectionStatus is 'collected'
    const isInstapay = order.payment_method === 'instapay_wallet';
    const salePayload: any = {
      customerId: customer ? Number(customer.id) : undefined,
      customerName: customer ? customer.name : order.customer_name,
      customerPhone: cleanCustomerPhone,
      customerAddress: order.customer_address,
      paymentType: 'cash',
      paymentChannel: isInstapay ? 'instapay' : 'cash',
      orderType: 'delivery',
      deliveryRepId: repId,
      deliveryStatus: 'pending',
      collectionStatus: isInstapay ? 'collected' : 'cod',
      deliveryFeeMode: 'store_fleet',
      branchId,
      locationId,
      deliveryFee: Number(order.deliveryFee || 0),
      items: lines,
      note: `طلب متجر إلكتروني #${order.order_number}`,
      paidAmount: isInstapay ? order.totalAmount : 0,
      tenderedAmount: isInstapay ? order.totalAmount : 0,
      payments: isInstapay
        ? [
            {
              paymentChannel: 'instapay',
              amount: order.totalAmount,
            },
          ]
        : [],
    };

    const saleResult = await this.salesService.createSale(salePayload, actor);
    const saleId = Number((saleResult as any)?.id || (saleResult as any)?.sale?.id || (typeof saleResult === 'number' ? saleResult : 0));

    // Update order with saleId and status 'shipped' (خرجت للتوصيل مع المندوب)
    await this.db
      .updateTable('online_orders')
      .set({
        sale_id: saleId > 0 ? saleId : null,
        status: 'shipped',
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();

    const fullSale = saleId > 0 ? await this.salesService.getSaleById(saleId, actor) : null;

    return {
      ok: true,
      saleId,
      sale: fullSale || saleResult,
      customerName: customer?.name || order.customer_name,
      isNewCustomer,
      customerId: customer?.id,
      deliveryRepName: repName,
    };
  }

  async prepareOrderForPos(id: number, actor: AuthContext) {
    const { tenantId, accountId } = requireTenantScope(actor);
    const order = await this.getOrder(id, actor);

    if (order.status === 'cancelled') {
      throw new BadRequestException('هذا الطلب تم إلغاؤه من قبل العميل ولا يمكن تنزيله في السلة');
    }
    if (order.sale_id) {
      throw new BadRequestException(`هذا الطلب تم تحويله لفاتورة مسبقاً برقم #${order.sale_id}`);
    }

    // 1. Ensure Customer Exists
    const rawPhone = (order.customer_phone || '').trim();
    const cleanCustomerPhone = rawPhone.replace(/\D/g, '');
    let customer = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'address'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where((eb) =>
        eb.or([
          eb('phone', '=', cleanCustomerPhone),
          eb('phone', '=', rawPhone),
        ])
      )
      .executeTakeFirst();

    let isNewCustomer = false;
    if (!customer) {
      try {
        const inserted = await this.db
          .insertInto('customers')
          .values({
            name: order.customer_name || 'عميل متجر أونلاين',
            phone: cleanCustomerPhone || rawPhone,
            address: order.customer_address || '',
            balance: 0,
            customer_type: 'cash',
            is_active: true,
            tenant_id: tenantId,
            account_id: accountId,
          } as any)
          .returning(['id', 'name', 'phone', 'address'])
          .executeTakeFirst();
        customer = inserted;
        isNewCustomer = true;
      } catch (err) {
        customer = await this.db
          .selectFrom('customers')
          .select(['id', 'name', 'phone', 'address'])
          .where(sql<boolean>`tenant_id = ${tenantId}`)
          .where((eb) =>
            eb.or([
              eb('phone', '=', cleanCustomerPhone),
              eb('phone', '=', rawPhone),
            ])
          )
          .executeTakeFirst();
      }
    }

    // 2. Fetch product details for items
    const rawItems = (order.items || []) as Array<any>;
    const productIds = rawItems.map((it) => Number(it.productId)).filter(Boolean);

    const products = productIds.length > 0
      ? await this.db
          .selectFrom('products')
          .select(['id', 'name', 'retail_price', 'cost_price', 'stock_qty'])
          .where(sql<boolean>`tenant_id = ${tenantId}`)
          .where('id', 'in', productIds)
          .execute()
      : [];

    const productMap = new Map(products.map((p) => [Number(p.id), p]));

    const mappedItems = rawItems.map((it: any) => {
      const p = productMap.get(Number(it.productId));
      return {
        productId: Number(it.productId),
        name: p?.name || it.name,
        price: Number(it.unitPrice ?? it.price ?? p?.retail_price ?? 0),
        costPrice: Number(p?.cost_price || 0),
        qty: Number(it.quantity ?? it.qty ?? 1),
        stockQty: Number(p?.stock_qty || 0),
        unitName: 'قطعة',
      };
    });

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.order_number,
      customerId: customer ? Number(customer.id) : null,
      customerName: customer?.name || order.customer_name,
      customerPhone: cleanCustomerPhone,
      customerAddress: customer?.address || order.customer_address || '',
      deliveryFee: Number(order.deliveryFee || 0),
      totalAmount: Number(order.totalAmount || 0),
      items: mappedItems,
      customerNotes: order.customer_notes || '',
      paymentMethod: order.payment_method || 'cod',
      isNewCustomer,
    };
  }

  async getStorefrontSettings(actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const tenant = await this.db
      .selectFrom('tenants')
      .select(['slug', 'business_name', 'owner_phone', 'custom_domain'])
      .where('id', '=', tenantId)
      .executeTakeFirst();

    const settings = await this.getTenantSettingsMap(tenantId);
    const bannerUrl = settings.get('storefront_banner_url') || '';
    const rawBannerUrls = settings.get('storefront_banner_urls');
    let bannerUrls: string[] = [];
    if (rawBannerUrls) {
      try {
        const parsed = JSON.parse(rawBannerUrls);
        if (Array.isArray(parsed)) bannerUrls = parsed.filter(Boolean);
      } catch {}
    }
    if (bannerUrls.length === 0 && bannerUrl) {
      bannerUrls = [bannerUrl];
    }

    const bannerIntervalSeconds = Math.max(1, Number(settings.get('storefront_banner_interval') || 4));
    let bannerPositions: string[] = [];
    try {
      const rawPos = settings.get('storefront_banner_positions');
      if (rawPos) {
        const parsed = JSON.parse(rawPos);
        if (Array.isArray(parsed)) bannerPositions = parsed.filter(Boolean);
      }
    } catch {}

    return {
      slug: settings.get('storefront_slug') || tenant?.slug || '',
      customDomain: tenant?.custom_domain || null,
      enabled: settings.get('storefront_enabled') !== 'false',
      title: settings.get('storefront_title') || settings.get('storeName') || tenant?.business_name || '',
      address: settings.get('storefront_address') || settings.get('address') || '',
      bio: settings.get('storefront_bio') || '',
      announcement: settings.get('storefront_announcement') || '',
      bannerUrl: bannerUrls[0] || bannerUrl,
      bannerUrls,
      bannerFit: settings.get('storefront_banner_fit') || 'contain',
      bannerPosition: settings.get('storefront_banner_position') || 'center',
      bannerPositions,
      bannerIntervalSeconds,
      smartDealsEnabled: settings.get('storefront_smart_deals') === 'true',
      deliveryFee: Number(settings.get('storefront_delivery_fee') || 0),
      minOrder: Number(settings.get('storefront_min_order') || 0),
      freeShippingEnabled: settings.get('storefront_free_shipping_enabled') === 'true',
      freeShippingMinOrder: Number(settings.get('storefront_free_shipping_min_order') || 0),
      whatsappPhone: settings.get('storefront_whatsapp') || settings.get('phone') || tenant?.owner_phone || '',
      currency: settings.get('currency') || 'EGP',
      onlinePaymentEnabled: settings.get('storefront_online_payment_enabled') === 'true',
      onlinePaymentProvider: settings.get('storefront_online_payment_provider') || 'paymob',
      paymobApiKey: settings.get('storefront_paymob_api_key') || '',
      paymobIntegrationId: settings.get('storefront_paymob_integration_id') || '',
      paymobIframeId: settings.get('storefront_paymob_iframe_id') || '',
      paymobHmacSecret: settings.get('storefront_paymob_hmac_secret') || '',
      paymobTestMode: settings.get('storefront_paymob_test_mode') !== 'false',
    };
  }

  async updateStorefrontSettings(payload: UpdateStorefrontSettingsDto, actor: AuthContext) {
    const { tenantId, accountId } = requireTenantScope(actor);

    if (payload.customDomain !== undefined) {
      const cleanDomain = payload.customDomain?.trim()
        ? payload.customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
        : null;
      await this.db
        .updateTable('tenants')
        .set({ custom_domain: cleanDomain, updated_at: new Date() })
        .where('id', '=', tenantId)
        .execute();
    }

    if (payload.slug !== undefined) {
      const cleanSlug = String(payload.slug || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');

      if (cleanSlug && cleanSlug.length >= 3) {
        const reserved = ['admin', 'api', 'trial', 'login', 'store', 'st', 'shop', 'profile', 'settings', 'pos', 'system'];
        if (!reserved.includes(cleanSlug)) {
          const existing = await this.db
            .selectFrom('tenants')
            .select('id')
            .where('slug', '=', cleanSlug)
            .where('id', '!=', tenantId)
            .executeTakeFirst();

          if (!existing) {
            await this.db
              .updateTable('tenants')
              .set({ slug: cleanSlug, updated_at: new Date() })
              .where('id', '=', tenantId)
              .execute();
          }
        }
      }
    }

    const entries: Array<{ key: string; value: any }> = [];
    if (payload.slug !== undefined) {
      const cleanSlug = String(payload.slug || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');
      if (cleanSlug && cleanSlug.length >= 3) {
        entries.push({ key: 'storefront_slug', value: cleanSlug });
      }
    }
    if (payload.enabled !== undefined) entries.push({ key: 'storefront_enabled', value: payload.enabled });
    if (payload.title !== undefined) entries.push({ key: 'storefront_title', value: payload.title });
    if (payload.address !== undefined) entries.push({ key: 'storefront_address', value: payload.address });
    if (payload.bio !== undefined) entries.push({ key: 'storefront_bio', value: payload.bio });
    if (payload.announcement !== undefined) entries.push({ key: 'storefront_announcement', value: payload.announcement });
    if (payload.bannerUrl !== undefined) entries.push({ key: 'storefront_banner_url', value: payload.bannerUrl });
    if (payload.bannerUrls !== undefined) {
      entries.push({ key: 'storefront_banner_urls', value: payload.bannerUrls });
      if (payload.bannerUrls.length > 0 && payload.bannerUrl === undefined) {
        entries.push({ key: 'storefront_banner_url', value: payload.bannerUrls[0] });
      } else if (payload.bannerUrls.length === 0 && payload.bannerUrl === undefined) {
        entries.push({ key: 'storefront_banner_url', value: '' });
      }
    }
    if (payload.bannerFit !== undefined) entries.push({ key: 'storefront_banner_fit', value: payload.bannerFit });
    if (payload.bannerPosition !== undefined) entries.push({ key: 'storefront_banner_position', value: payload.bannerPosition });
    if (payload.bannerPositions !== undefined) entries.push({ key: 'storefront_banner_positions', value: payload.bannerPositions });
    if (payload.bannerIntervalSeconds !== undefined) entries.push({ key: 'storefront_banner_interval', value: payload.bannerIntervalSeconds });
    if (payload.smartDealsEnabled !== undefined) entries.push({ key: 'storefront_smart_deals', value: payload.smartDealsEnabled });
    if (payload.deliveryFee !== undefined) entries.push({ key: 'storefront_delivery_fee', value: payload.deliveryFee });
    if (payload.minOrder !== undefined) entries.push({ key: 'storefront_min_order', value: payload.minOrder });
    if (payload.freeShippingEnabled !== undefined) entries.push({ key: 'storefront_free_shipping_enabled', value: payload.freeShippingEnabled });
    if (payload.freeShippingMinOrder !== undefined) entries.push({ key: 'storefront_free_shipping_min_order', value: payload.freeShippingMinOrder });
    if (payload.whatsappPhone !== undefined) entries.push({ key: 'storefront_whatsapp', value: payload.whatsappPhone });
    if (payload.onlinePaymentEnabled !== undefined) entries.push({ key: 'storefront_online_payment_enabled', value: payload.onlinePaymentEnabled });
    if (payload.onlinePaymentProvider !== undefined) entries.push({ key: 'storefront_online_payment_provider', value: payload.onlinePaymentProvider });
    if (payload.paymobApiKey !== undefined) entries.push({ key: 'storefront_paymob_api_key', value: payload.paymobApiKey });
    if (payload.paymobIntegrationId !== undefined) entries.push({ key: 'storefront_paymob_integration_id', value: payload.paymobIntegrationId });
    if (payload.paymobIframeId !== undefined) entries.push({ key: 'storefront_paymob_iframe_id', value: payload.paymobIframeId });
    if (payload.paymobHmacSecret !== undefined) entries.push({ key: 'storefront_paymob_hmac_secret', value: payload.paymobHmacSecret });
    if (payload.paymobTestMode !== undefined) entries.push({ key: 'storefront_paymob_test_mode', value: payload.paymobTestMode });

    for (const e of entries) {
      await sql`
        INSERT INTO settings (key, value, tenant_id, account_id)
        VALUES (${e.key}, ${JSON.stringify(e.value)}, ${tenantId}, ${accountId})
        ON CONFLICT (tenant_id, key)
        DO UPDATE SET value = EXCLUDED.value, account_id = EXCLUDED.account_id
      `.execute(this.db);
    }

    this.catalogCache.clear();

    return this.getStorefrontSettings(actor);
  }

  async updateProductImage(productId: number, imageUrl: string, actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const existing = await this.db
      .selectFrom('products')
      .select(['id', 'metadata'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', productId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('الصنف غير موجود');
    }

    const currentMeta = typeof existing.metadata === 'object' && existing.metadata ? existing.metadata : {};
    const updatedMeta = { ...currentMeta, imageUrl };

    await this.db
      .updateTable('products')
      .set({
        metadata: JSON.stringify(updatedMeta) as any,
        updated_at: new Date(),
      })
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', productId)
      .execute();

    this.invalidateCatalogCache();

    return { success: true, productId, imageUrl };
  }

  async updateCategoryImage(categoryId: number, imageUrl: string, actor: AuthContext) {
    const { tenantId, accountId } = requireTenantScope(actor);

    // Fetch existing category image map
    const existing = await this.db
      .selectFrom('settings')
      .select(['value'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('key', '=', 'storefront_category_images')
      .executeTakeFirst();

    let map: Record<string, string> = {};
    if (existing?.value) {
      try {
        const parsed = JSON.parse(existing.value);
        map = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      } catch {}
    }

    if (imageUrl) {
      map[String(categoryId)] = imageUrl;
    } else {
      delete map[String(categoryId)];
    }

    await sql`
      INSERT INTO settings (key, value, tenant_id, account_id)
      VALUES ('storefront_category_images', ${JSON.stringify(JSON.stringify(map))}, ${tenantId}, ${accountId})
      ON CONFLICT (tenant_id, key)
      DO UPDATE SET value = EXCLUDED.value, account_id = EXCLUDED.account_id
    `.execute(this.db);

    this.invalidateCatalogCache();

    return { success: true, categoryId, imageUrl };
  }

  async submitProductReview(slug: string, productId: number, dto: CreateProductReviewDto) {
    const tenant = await this.getTenantBySlug(slug);

    // Verify product exists for this tenant
    const product = await this.db
      .selectFrom('products')
      .select(['id', 'name'])
      .where('id', '=', productId)
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .executeTakeFirst();

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    const rating = Math.max(1, Math.min(5, Math.round(Number(dto.rating) || 5)));
    const customerName = (dto.customerName || '').trim() || 'عميل المتجر';
    const customerPhone = (dto.customerPhone || '').trim();
    const comment = (dto.comment || '').trim();

    await this.db
      .insertInto('product_reviews')
      .values({
        tenant_id: tenant.id,
        account_id: tenant.id,
        product_id: productId,
        rating,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        comment: comment || null,
        is_approved: true,
      })
      .execute();

    // Invalidate cache immediately so new rating is live!
    this.invalidateCatalogCache(slug);

    // Calculate new summary for this product
    const stats = await this.db
      .selectFrom('product_reviews')
      .select([
        sql<number>`ROUND(AVG(rating)::numeric, 1)`.as('avg_rating'),
        sql<number>`COUNT(*)::int`.as('review_count'),
      ])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('product_id', '=', productId)
      .where('is_approved', '=', true)
      .executeTakeFirst();

    return {
      ok: true,
      productId,
      avgRating: Number(stats?.avg_rating) || rating,
      reviewCount: Number(stats?.review_count) || 1,
      message: 'شكراً لك! تم تسجيل تقييمك بنجاح.',
    };
  }

  async getProductReviews(slug: string, productId: number) {
    const tenant = await this.getTenantBySlug(slug);

    const reviews = await this.db
      .selectFrom('product_reviews')
      .select(['id', 'rating', 'customer_name', 'comment', 'created_at'])
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('product_id', '=', productId)
      .where('is_approved', '=', true)
      .orderBy('created_at', 'desc')
      .limit(30)
      .execute();

    return {
      ok: true,
      productId,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: Number(r.rating),
        customerName: r.customer_name || 'عميل المتجر',
        comment: r.comment || '',
        createdAt: r.created_at,
      })),
    };
  }

  // --- Coupon & Promo Code Management ---

  async validateCoupon(slug: string, code: string, subtotal: number) {
    const tenant = await this.getTenantBySlug(slug);
    const codeUpper = String(code || '').trim().toUpperCase();
    if (!codeUpper) {
      throw new BadRequestException('يرجى إدخال كود الكوبون');
    }

    const coupon = await this.db
      .selectFrom('storefront_coupons')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('code', '=', codeUpper)
      .executeTakeFirst();

    if (!coupon) {
      return { ok: false, message: 'كود الكوبون غير صحيح أو غير مسجل' };
    }

    if (!coupon.is_active) {
      return { ok: false, message: 'هذا الكوبون تم إيقافه حالياً من قِبل المتجر' };
    }

    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) {
      return { ok: false, message: 'عذراً، هذا الكوبون لم يبدأ بعد' };
    }
    if (coupon.end_date && new Date(coupon.end_date) < now) {
      return { ok: false, message: 'عذراً، هذا الكوبون انتهت فترة صلاحيته' };
    }

    if (coupon.usage_limit !== null && Number(coupon.times_used || 0) >= coupon.usage_limit) {
      return { ok: false, message: 'عذراً، استنفد هذا الكوبون الحد الأقصى لمرات الاستخدام المتاحة' };
    }

    const minOrder = Number(coupon.min_order_amount || 0);
    if (subtotal < minOrder) {
      return {
        ok: false,
        message: `لتفعيل هذا الكوبون، يجب أن تبلغ قيمة المشتريات ${minOrder} ج على الأقل (مشترياتك الآن: ${subtotal.toFixed(0)} ج)`,
      };
    }

    let discountAmount = 0;
    let isFreeShipping = false;
    if (coupon.discount_type === 'free_shipping') {
      isFreeShipping = true;
    } else if (coupon.discount_type === 'percentage') {
      const rawDiscount = (subtotal * Number(coupon.discount_value)) / 100;
      discountAmount = coupon.max_discount_amount
        ? Math.min(rawDiscount, Number(coupon.max_discount_amount))
        : rawDiscount;
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = Math.min(subtotal, Number(coupon.discount_value));
    }

    return {
      ok: true,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      discountAmount: Number(discountAmount.toFixed(2)),
      isFreeShipping,
      minOrderAmount: minOrder,
      maxDiscountAmount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null,
      message: isFreeShipping
        ? 'تم تطبيق كوبون الشحن المجاني بنجاح!'
        : `تم تطبيق كود الخصم بنجاح (- ${discountAmount.toFixed(0)} ج)!`,
    };
  }

  async listCoupons(actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const rows = await this.db
      .selectFrom('storefront_coupons')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .orderBy('created_at', 'desc')
      .execute();

    return {
      ok: true,
      coupons: rows.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discount_type,
        discountValue: Number(c.discount_value),
        minOrderAmount: Number(c.min_order_amount),
        maxDiscountAmount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
        usageLimit: c.usage_limit,
        timesUsed: Number(c.times_used || 0),
        isActive: Boolean(c.is_active),
        startDate: c.start_date,
        endDate: c.end_date,
        createdAt: c.created_at,
      })),
    };
  }

  async createCoupon(dto: CreateCouponDto, actor: AuthContext) {
    const { tenantId, accountId } = requireTenantScope(actor);
    const codeClean = dto.code.trim().toUpperCase();

    const existing = await this.db
      .selectFrom('storefront_coupons')
      .select('id')
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('code', '=', codeClean)
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestException(`كود الكوبون "${codeClean}" موجود بالفعل، يرجى اختيار كود آخر`);
    }

    const inserted = await this.db
      .insertInto('storefront_coupons')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        code: codeClean,
        discount_type: dto.discountType,
        discount_value: dto.discountValue,
        min_order_amount: dto.minOrderAmount || 0,
        max_discount_amount: dto.maxDiscountAmount || null,
        usage_limit: dto.usageLimit || null,
        times_used: 0,
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        start_date: dto.startDate ? new Date(dto.startDate) : null,
        end_date: dto.endDate ? new Date(dto.endDate) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { ok: true, coupon: inserted };
  }

  async updateCoupon(id: number, dto: UpdateCouponDto, actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const existing = await this.db
      .selectFrom('storefront_coupons')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('الكوبون غير موجود');
    }

    const payload: any = { updated_at: new Date() };
    if (dto.code !== undefined) {
      payload.code = dto.code.trim().toUpperCase();
    }
    if (dto.discountType !== undefined) payload.discount_type = dto.discountType;
    if (dto.discountValue !== undefined) payload.discount_value = dto.discountValue;
    if (dto.minOrderAmount !== undefined) payload.min_order_amount = dto.minOrderAmount;
    if (dto.maxDiscountAmount !== undefined) payload.max_discount_amount = dto.maxDiscountAmount;
    if (dto.usageLimit !== undefined) payload.usage_limit = dto.usageLimit;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;
    if (dto.startDate !== undefined) payload.start_date = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) payload.end_date = dto.endDate ? new Date(dto.endDate) : null;

    await this.db
      .updateTable('storefront_coupons')
      .set(payload)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', id)
      .execute();

    return { ok: true, id };
  }

  async deleteCoupon(id: number, actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    await this.db
      .deleteFrom('storefront_coupons')
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', id)
      .execute();

    return { ok: true, id };
  }

  // --- Delivery Zones Management ---

  async listDeliveryZones(actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const rows = await this.db
      .selectFrom('storefront_delivery_zones')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')
      .execute();

    return {
      ok: true,
      zones: rows.map((z) => ({
        id: z.id,
        name: z.name,
        deliveryFee: Number(z.delivery_fee || 0),
        estimatedTime: z.estimated_time || '',
        isActive: Boolean(z.is_active),
        sortOrder: Number(z.sort_order || 0),
        createdAt: z.created_at,
        updatedAt: z.updated_at,
      })),
    };
  }

  async createDeliveryZone(dto: CreateDeliveryZoneDto, actor: AuthContext) {
    const { tenantId, accountId } = requireTenantScope(actor);
    const nameClean = dto.name.trim();

    const inserted = await this.db
      .insertInto('storefront_delivery_zones')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        name: nameClean,
        delivery_fee: dto.deliveryFee,
        estimated_time: dto.estimatedTime ? dto.estimatedTime.trim() : null,
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        sort_order: dto.sortOrder !== undefined ? dto.sortOrder : 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ok: true,
      zone: {
        id: inserted.id,
        name: inserted.name,
        deliveryFee: Number(inserted.delivery_fee || 0),
        estimatedTime: inserted.estimated_time || '',
        isActive: Boolean(inserted.is_active),
        sortOrder: Number(inserted.sort_order || 0),
      },
    };
  }

  async updateDeliveryZone(id: number, dto: UpdateDeliveryZoneDto, actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const existing = await this.db
      .selectFrom('storefront_delivery_zones')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('منطقة التوصيل غير موجودة');
    }

    const payload: any = { updated_at: new Date() };
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.deliveryFee !== undefined) payload.delivery_fee = dto.deliveryFee;
    if (dto.estimatedTime !== undefined) payload.estimated_time = dto.estimatedTime ? dto.estimatedTime.trim() : null;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;
    if (dto.sortOrder !== undefined) payload.sort_order = dto.sortOrder;

    await this.db
      .updateTable('storefront_delivery_zones')
      .set(payload)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', id)
      .execute();

    return { ok: true, id };
  }

  async deleteDeliveryZone(id: number, actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    await this.db
      .deleteFrom('storefront_delivery_zones')
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('id', '=', id)
      .execute();

    return { ok: true, id };
  }
}
