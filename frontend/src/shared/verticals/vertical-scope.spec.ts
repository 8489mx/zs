import { describe, it, expect } from 'vitest';
import { resolveCurrentVertical, isRouteAllowedInVertical } from './vertical-scope';

describe('Vertical Scope & Enterprise Isolation Constitution', () => {
  it('resolves retail_general when activityType is retail or retail_general even if businessName contains contracting words', () => {
    const tenant = {
      id: 'demo-mohandes',
      slug: 'almohandes',
      businessName: 'المهندس للمقاولات والاستشارات الهندسية',
      activityType: 'retail',
    };
    const vertical = resolveCurrentVertical(tenant);
    expect(vertical).toBe('retail_general');
    expect(isRouteAllowedInVertical(vertical, '/pos')).toBe(true);
    expect(isRouteAllowedInVertical(vertical, 'pos')).toBe(true);
    expect(isRouteAllowedInVertical(vertical, '/sales')).toBe(true);
  });

  it('resolves contracting and strictly hides retail POS when activityType is contracting', () => {
    const tenant = {
      id: 'contracting-co',
      slug: 'binaa',
      businessName: 'شركة البناء والتشييد',
      activityType: 'contracting',
    };
    const vertical = resolveCurrentVertical(tenant);
    expect(vertical).toBe('contracting');
    expect(isRouteAllowedInVertical(vertical, '/pos')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, 'pos')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, 'cash-drawer')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/contracting/projects')).toBe(true);
  });

  it('resolves maritime and strictly hides retail POS, retail sales, retail quotes, and general purchases when activityType is maritime', () => {
    const tenant = {
      id: 'maritime-co',
      slug: 'blue-ocean',
      businessName: 'بلو أوشن للخدمات اللوجستية',
      activityType: 'maritime',
    };
    const vertical = resolveCurrentVertical(tenant);
    expect(vertical).toBe('maritime');
    expect(isRouteAllowedInVertical(vertical, '/pos')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, 'pos')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/sales')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, 'sales')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/quotations')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, 'quotations')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/purchases')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/purchases/rfqs')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/maritime/jobs')).toBe(true);
    expect(isRouteAllowedInVertical(vertical, '/customers')).toBe(true);
    expect(isRouteAllowedInVertical(vertical, '/suppliers')).toBe(true);
  });

  it('resolves wholesale_van and hides retail POS while enabling van sales', () => {
    const tenant = {
      id: 'dist-co',
      slug: 'fast-dist',
      businessName: 'البركة للتوزيع وتجارة الجملة',
      activityType: 'wholesale_van',
    };
    const vertical = resolveCurrentVertical(tenant);
    expect(vertical).toBe('wholesale_van');
    expect(isRouteAllowedInVertical(vertical, '/pos')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/van-sales/admin')).toBe(true);
  });

  it('resolves maritime when settings.maritimeFreightModuleEnabled is true even if tenant.activityType is retail_general', () => {
    const tenant = {
      id: 'default',
      slug: 'almhnds',
      businessName: 'النظام الأساسي',
      activityType: 'retail_general',
    };
    const settings = {
      maritimeFreightModuleEnabled: true,
      businessIndustry: 'general',
    };
    const vertical = resolveCurrentVertical(tenant, settings);
    expect(vertical).toBe('maritime');
    expect(isRouteAllowedInVertical(vertical, '/maritime/jobs')).toBe(true);
    expect(isRouteAllowedInVertical(vertical, '/pos')).toBe(false);
  });

  it('resolves wholesale_van even when tenant has omnichannel plan with manufacturing feature', () => {
    const tenant = {
      id: 'blue-dolphin',
      slug: 'blue-dolphin',
      businessName: 'بلو دولفين',
      activityType: 'wholesale_van',
      features: ['manufacturing', 'accounting', 'deliveryReps', 'sales', 'inventory', 'purchases'],
    };
    const settings = {
      businessIndustry: 'wholesale_van',
      manufacturingModuleEnabled: false,
      deliveryFleetModuleEnabled: true,
      posModuleEnabled: false,
    };
    const vertical = resolveCurrentVertical(tenant, settings);
    expect(vertical).toBe('wholesale_van');
    expect(isRouteAllowedInVertical(vertical, '/pos')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/van-sales/admin')).toBe(true);
    expect(isRouteAllowedInVertical(vertical, '/manufacturing/work-orders')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/contracting/projects')).toBe(false);
    expect(isRouteAllowedInVertical(vertical, '/maritime/jobs')).toBe(false);
  });
});
