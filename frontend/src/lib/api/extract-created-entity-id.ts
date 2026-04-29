export function extractCreatedEntityId(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';

  const candidate = payload as {
    id?: string | number | null;
    data?: {
      id?: string | number | null;
      customerId?: string | number | null;
      supplierId?: string | number | null;
      productId?: string | number | null;
      categoryId?: string | number | null;
      branchId?: string | number | null;
      locationId?: string | number | null;
      customer?: { id?: string | number | null } | null;
      supplier?: { id?: string | number | null } | null;
      product?: { id?: string | number | null } | null;
      category?: { id?: string | number | null } | null;
      branch?: { id?: string | number | null } | null;
      location?: { id?: string | number | null } | null;
    } | null;
    customerId?: string | number | null;
    supplierId?: string | number | null;
    productId?: string | number | null;
    categoryId?: string | number | null;
    branchId?: string | number | null;
    locationId?: string | number | null;
    customer?: { id?: string | number | null } | null;
    supplier?: { id?: string | number | null } | null;
    product?: { id?: string | number | null } | null;
    category?: { id?: string | number | null } | null;
    branch?: { id?: string | number | null } | null;
    location?: { id?: string | number | null } | null;
  };

  const id = candidate.id
    ?? candidate.customerId
    ?? candidate.supplierId
    ?? candidate.productId
    ?? candidate.categoryId
    ?? candidate.branchId
    ?? candidate.locationId
    ?? candidate.customer?.id
    ?? candidate.supplier?.id
    ?? candidate.product?.id
    ?? candidate.category?.id
    ?? candidate.branch?.id
    ?? candidate.location?.id
    ?? candidate.data?.id
    ?? candidate.data?.customerId
    ?? candidate.data?.supplierId
    ?? candidate.data?.productId
    ?? candidate.data?.categoryId
    ?? candidate.data?.branchId
    ?? candidate.data?.locationId
    ?? candidate.data?.customer?.id
    ?? candidate.data?.supplier?.id
    ?? candidate.data?.product?.id
    ?? candidate.data?.category?.id
    ?? candidate.data?.branch?.id
    ?? candidate.data?.location?.id
    ?? '';

  return id === '' || id == null ? '' : String(id);
}
