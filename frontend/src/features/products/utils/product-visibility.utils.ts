export interface ProductVisibilityOptions {
  settings?: {
    clothingModuleEnabled?: boolean;
    autoPartsModuleEnabled?: boolean;
    enableMobileStoreFeatures?: boolean;
    contractingModuleEnabled?: boolean;
    maritimeFreightModuleEnabled?: boolean;
    enablePharmacyModule?: boolean;
    businessIndustry?: string;
    activityType?: string;
    [key: string]: any;
  } | null;
  tenant?: {
    activityType?: string;
    pillar?: string;
    [key: string]: any;
  } | null;
  itemKind?: string;
  clothingModuleEnabled?: boolean;
}

/**
 * Determines whether the "Expiry Date" field should be displayed in product forms.
 *
 * Expiry date is irrelevant and hidden for:
 * 1. Clothing / Fashion / Apparel businesses or when clothingModuleEnabled is true.
 * 2. Fashion variant items (itemKind === 'fashion').
 * 3. Auto parts businesses (autoPartsModuleEnabled === true).
 * 4. Electronics / Mobile phone stores (enableMobileStoreFeatures === true).
 * 5. Contracting, Maritime freight, and pure Services verticals.
 */
export function shouldShowExpiryDateField(options: ProductVisibilityOptions): boolean {
  const { settings, tenant, itemKind, clothingModuleEnabled } = options;

  // 1. Explicit clothing/fashion indicators
  if (clothingModuleEnabled === true) return false;
  if (settings?.clothingModuleEnabled === true) return false;
  if (itemKind === 'fashion') return false;

  // 2. Hardware / non-perishable specialized modules
  if (settings?.autoPartsModuleEnabled === true) return false;
  if (settings?.enableMobileStoreFeatures === true) return false;
  if (settings?.contractingModuleEnabled === true) return false;
  if (settings?.maritimeFreightModuleEnabled === true) return false;

  // 3. Inspect industry / vertical strings
  const rawIndustry = String(
    settings?.activityType ||
    settings?.businessIndustry ||
    tenant?.activityType ||
    tenant?.pillar ||
    ''
  ).trim().toLowerCase();

  if (rawIndustry) {
    const isNonPerishable =
      rawIndustry.includes('clothing') ||
      rawIndustry.includes('fashion') ||
      rawIndustry.includes('ملابس') ||
      rawIndustry.includes('أزياء') ||
      rawIndustry.includes('أحذية') ||
      rawIndustry.includes('شنط') ||
      rawIndustry.includes('auto_parts') ||
      rawIndustry.includes('autoparts') ||
      rawIndustry.includes('قطع غيار') ||
      rawIndustry.includes('electronics') ||
      rawIndustry.includes('maintenance') ||
      rawIndustry.includes('صيانة') ||
      rawIndustry.includes('موبايل') ||
      rawIndustry.includes('إلكترون') ||
      rawIndustry.includes('contracting') ||
      rawIndustry.includes('مقاول') ||
      rawIndustry.includes('maritime') ||
      rawIndustry.includes('شحن') ||
      rawIndustry.includes('services') ||
      rawIndustry.includes('خدمات');

    if (isNonPerishable) {
      return false;
    }
  }

  return true;
}
