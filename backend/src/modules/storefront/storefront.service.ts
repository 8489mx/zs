import { Inject, Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { UpdateStorefrontSettingsDto } from './dto/update-storefront-settings.dto';
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

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      businessName: tenant.business_name,
      enabled: isEnabled,
      title,
      bio,
      announcement,
      bannerUrl: bannerUrls[0] || bannerUrl,
      bannerUrls,
      bannerFit,
      bannerPosition,
      deliveryFee,
      minOrder,
      whatsappPhone,
      currency,
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

    const formattedProducts = products.map((p) => {
      let meta: Record<string, any> = {};
      if (p.metadata) {
        try {
          meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
        } catch {}
      }

      const stockQty = Number(p.stock_qty ?? 0);
      const retailPrice = Number(p.retail_price ?? 0);

      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode || '',
        price: retailPrice,
        categoryId: p.category_id,
        categoryName: (p.category_id && catMap.get(p.category_id)) || 'عام',
        stockQty,
        inStock: stockQty > 0,
        icon: meta.icon || '',
        imageUrl: meta.imageUrl || meta.image || '',
        description: p.notes || meta.description || '',
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
    if (cleanCustomerPhone.length !== 11 || !cleanCustomerPhone.startsWith('01')) {
      throw new BadRequestException('يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً يبدأ بـ 01 (مثال: 01012345678)');
    }

    const minOrder = Number(settings.get('storefront_min_order') || 0);
    const deliveryFee = Number(settings.get('storefront_delivery_fee') || 0);

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

    const totalAmount = subtotal + deliveryFee;

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
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

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
        total_amount: totalAmount,
        status: 'pending',
        payment_method: dto.paymentMethod || 'cod',
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

    const paymentLabel = (dto.paymentMethod === 'instapay_wallet') ? 'تحويل مسبق (إنستاباي / محفظة)' : 'دفع عند الاستلام (كاش)';
    const notesPart = dto.customerNotes ? `\nملاحظات: ${dto.customerNotes}` : '';

    const whatsappMessage = encodeURIComponent(
      `مرحباً، أود متابعة طلبي من متجركم:\n` +
      `رقم الطلب: #${orderNumber}\n` +
      `العميل: ${dto.customerName}\n` +
      `الهاتف: ${dto.customerPhone}\n` +
      `العنوان: ${dto.customerAddress || 'غير محدد'}` +
      `${notesPart}\n` +
      `طريقة الدفع: ${paymentLabel}\n\n` +
      `الأصناف المطلوبة:\n${itemsSummary}\n\n` +
      `الإجمالي: ${totalAmount} ج (شامل التوصيل ${deliveryFee} ج)`
    );

    const whatsappUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${whatsappMessage}` : null;

    return {
      ok: true,
      orderId: insertedOrder.id,
      orderNumber: insertedOrder.order_number,
      totalAmount: Number(insertedOrder.total_amount),
      subtotal,
      deliveryFee,
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
      .selectFrom('online_orders')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`);

    qb = qb.where((eb) => {
      const conditions: any[] = [];
      if (cleanPhone) {
        conditions.push(eb('customer_phone', 'like', `%${cleanPhone.slice(-9)}%`));
      }
      if (validOrderNumbers.length > 0) {
        conditions.push(eb('order_number', 'in', validOrderNumbers));
      }
      return eb.or(conditions);
    });

    const rows = await qb.orderBy('created_at', 'desc').limit(20).execute();

    return {
      ok: true,
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
          totalAmount: Number(r.total_amount),
          status: r.status,
          paymentMethod: r.payment_method,
          saleId: r.sale_id,
          createdAt: r.created_at,
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
      qb = qb.where('status', '=', status as any);
    }

    const rows = await qb.orderBy('created_at', 'desc').execute();

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
          totalAmount: Number(r.total_amount),
          status: r.status,
          paymentMethod: r.payment_method,
          saleId: r.sale_id,
          createdAt: r.created_at,
          items,
        };
      }),
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

    return {
      slug: tenant?.slug || '',
      customDomain: tenant?.custom_domain || null,
      enabled: settings.get('storefront_enabled') !== 'false',
      title: settings.get('storefront_title') || settings.get('storeName') || tenant?.business_name || '',
      bio: settings.get('storefront_bio') || '',
      announcement: settings.get('storefront_announcement') || '',
      bannerUrl: bannerUrls[0] || bannerUrl,
      bannerUrls,
      bannerFit: settings.get('storefront_banner_fit') || 'contain',
      bannerPosition: settings.get('storefront_banner_position') || 'center',
      deliveryFee: Number(settings.get('storefront_delivery_fee') || 0),
      minOrder: Number(settings.get('storefront_min_order') || 0),
      whatsappPhone: settings.get('storefront_whatsapp') || settings.get('phone') || tenant?.owner_phone || '',
      currency: settings.get('currency') || 'EGP',
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

    const entries: Array<{ key: string; value: any }> = [];
    if (payload.enabled !== undefined) entries.push({ key: 'storefront_enabled', value: payload.enabled });
    if (payload.title !== undefined) entries.push({ key: 'storefront_title', value: payload.title });
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
    if (payload.deliveryFee !== undefined) entries.push({ key: 'storefront_delivery_fee', value: payload.deliveryFee });
    if (payload.minOrder !== undefined) entries.push({ key: 'storefront_min_order', value: payload.minOrder });
    if (payload.whatsappPhone !== undefined) entries.push({ key: 'storefront_whatsapp', value: payload.whatsappPhone });

    for (const e of entries) {
      await sql`
        INSERT INTO settings (key, value, tenant_id, account_id)
        VALUES (${e.key}, ${JSON.stringify(e.value)}, ${tenantId}, ${accountId})
        ON CONFLICT (tenant_id, key)
        DO UPDATE SET value = EXCLUDED.value, account_id = EXCLUDED.account_id
      `.execute(this.db);
    }

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
}
