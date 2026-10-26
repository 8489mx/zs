import { describe, it, expect } from 'vitest';
import { shouldShowExpiryDateField } from './product-visibility.utils';

describe('shouldShowExpiryDateField', () => {
  it('hides expiry date when clothingModuleEnabled is true directly or in settings', () => {
    expect(shouldShowExpiryDateField({ clothingModuleEnabled: true })).toBe(false);
    expect(shouldShowExpiryDateField({ settings: { clothingModuleEnabled: true } })).toBe(false);
  });

  it('hides expiry date when itemKind is fashion', () => {
    expect(shouldShowExpiryDateField({ itemKind: 'fashion' })).toBe(false);
  });

  it('hides expiry date for auto parts and mobile stores', () => {
    expect(shouldShowExpiryDateField({ settings: { autoPartsModuleEnabled: true } })).toBe(false);
    expect(shouldShowExpiryDateField({ settings: { enableMobileStoreFeatures: true } })).toBe(false);
  });

  it('hides expiry date for non-perishable industries (clothing, contracting, maritime, services)', () => {
    expect(shouldShowExpiryDateField({ settings: { activityType: 'clothing' } })).toBe(false);
    expect(shouldShowExpiryDateField({ settings: { businessIndustry: 'fashion' } })).toBe(false);
    expect(shouldShowExpiryDateField({ settings: { activityType: 'ملابس وأزياء' } })).toBe(false);
    expect(shouldShowExpiryDateField({ settings: { activityType: 'contracting' } })).toBe(false);
    expect(shouldShowExpiryDateField({ settings: { activityType: 'maritime' } })).toBe(false);
    expect(shouldShowExpiryDateField({ tenant: { activityType: 'auto_parts' } })).toBe(false);
  });

  it('shows expiry date for pharmacies, supermarkets, restaurants and general trade', () => {
    expect(shouldShowExpiryDateField({ settings: { enablePharmacyModule: true, activityType: 'pharmacy' } })).toBe(true);
    expect(shouldShowExpiryDateField({ settings: { activityType: 'supermarket' } })).toBe(true);
    expect(shouldShowExpiryDateField({ settings: { activityType: 'restaurant' } })).toBe(true);
    expect(shouldShowExpiryDateField({ settings: { activityType: 'retail_general' } })).toBe(true);
    expect(shouldShowExpiryDateField({})).toBe(true);
  });
});
