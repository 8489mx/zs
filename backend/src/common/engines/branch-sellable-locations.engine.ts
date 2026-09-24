/**
 * من أي مخازن يجوز لهذا الفرع أن يبيع — **مصدر واحد للحقيقة**.
 *
 * ## التناقض الذي وُلد منه هذا المحرك (24 سبتمبر 2026)
 *
 * كانت الإجابة مكتوبة في مكان واحد فقط: `SalesWriteService`، ولمسار الكاشير وحده. أما مسار طلب
 * المتجر الإلكتروني (`createOnlineOrder`) فكان يأخذ `default_stock_location_id` للفرع مباشرةً ولا
 * يسأل عن `sales_stock_mode` أصلاً. فنتج عن ذلك على منشأة حقيقية:
 *
 *   - **الكتالوج العام** يعرض الرصيد **العام** (`stock_qty - reserved_qty`) فيقول «متاح»،
 *   - **إنشاء الطلب** يفحص مخزن الفرع الافتراضي فيقول «الرصيد في هذا المخزن 0» ويرفض،
 *   - و**الكاشير** — على نفس الفرع ونفس الصنف — يبيعه بلا مشكلة، لأنه وحده يقرأ
 *     `sales_stock_mode = 'all_operational_locations'`.
 *
 * أي أن الزبون يرى الصنف متاحاً على الموقع ويُرفض عند الطلب، بينما البضاعة موجودة فعلاً (50,000
 * قطعة) في مخزن آخر يملك الفرع حق البيع منه. اكتُشف في جولة حِمل تبيع فعلاً.
 *
 * القاعدة الآن هنا، ويستدعيها المساران معاً.
 */

export type SellableLocationRow = {
  id: number | string;
  location_type?: string | null;
  branch_id?: number | string | null;
};

export type SellableBranch = {
  default_stock_location_id?: number | string | null;
  sales_stock_mode?: string | null;
  allow_external_sales_stock?: boolean | null;
};

export type SellableLocation = { id: number; branchId: number | null };

/** المخازن التي لا يُباع منها بحال: التالف وما هو في الطريق. */
const NEVER_SELLABLE_TYPES = new Set(['damaged', 'in_transit']);

export const ALL_OPERATIONAL_LOCATIONS = 'all_operational_locations';

/**
 * ترتيب المخازن التي يجوز لهذا الفرع السحب منها، **الأولى أولى**.
 *
 * الترتيب مقصود: المخزن الافتراضي للفرع، ثم مخازن الفرع نفسه، ثم المخازن الداخلية غير المرتبطة
 * بفرع، ثم الخارجية إن سُمح بها. فالبيع يستنزف الأقرب قبل الأبعد.
 *
 * حين لا يكون الفرع في وضع «كل المخازن التشغيلية» تبقى الإجابة مخزنه الافتراضي وحده — وهو السلوك
 * السابق بالضبط، فالتغيير لا يوسّع صلاحية أحد لم تكن له.
 */
export function resolveBranchSellableLocations(
  branch: SellableBranch | null | undefined,
  branchId: number | null,
  allLocations: SellableLocationRow[],
): SellableLocation[] {
  const defaultLocationId = branch?.default_stock_location_id != null
    ? Number(branch.default_stock_location_id)
    : null;

  if (!branch || branch.sales_stock_mode !== ALL_OPERATIONAL_LOCATIONS) {
    return defaultLocationId ? [{ id: defaultLocationId, branchId }] : [];
  }

  const eligible = (allLocations || []).filter((location) => {
    const type = String(location.location_type || '');
    if (NEVER_SELLABLE_TYPES.has(type)) return false;

    const id = Number(location.id);
    const locationBranchId = location.branch_id != null ? Number(location.branch_id) : null;

    if (defaultLocationId !== null && id === defaultLocationId) return true;
    if (branchId !== null && locationBranchId === branchId) return true;
    if (type === 'internal_warehouse' && locationBranchId === null) return true;
    if (branch.allow_external_sales_stock && type === 'external_warehouse') return true;
    return false;
  });

  const rank = (location: SellableLocationRow): number => {
    const id = Number(location.id);
    const locationBranchId = location.branch_id != null ? Number(location.branch_id) : null;
    if (defaultLocationId !== null && id === defaultLocationId) return 0;
    if (branchId !== null && locationBranchId === branchId) return 1;
    if (String(location.location_type || '') === 'internal_warehouse') return 2;
    return 3;
  };

  return eligible
    .slice()
    .sort((a, b) => rank(a) - rank(b) || Number(a.id) - Number(b.id))
    .map((location) => ({
      id: Number(location.id),
      branchId: location.branch_id != null ? Number(location.branch_id) : null,
    }));
}

/**
 * يختار **مخزناً واحداً** يغطي كل أسطر الطلب.
 *
 * طلب المتجر يحجز في مخزن واحد (`online_orders.reserved_location_id` عمود مفرد)، بخلاف الكاشير
 * الذي يوزّع السطر الواحد على عدة مخازن. فنختار أول مخزن في ترتيب الأولوية يكفي **كل** الأصناف.
 * وإن لم يوجد، نعيد `null` ليقع الاختيار على المخزن الافتراضي وتظهر رسالة النقص الحقيقية بدل
 * حجزٍ نصفيّ لا يُكمل الطلب.
 */
export function pickLocationCoveringOrder(
  locations: SellableLocation[],
  requiredByProduct: Map<number, number>,
  availableAt: (locationId: number, productId: number) => number,
): SellableLocation | null {
  for (const location of locations) {
    let covers = true;
    for (const [productId, required] of requiredByProduct) {
      if (availableAt(location.id, productId) < required) { covers = false; break; }
    }
    if (covers) return location;
  }
  return null;
}
