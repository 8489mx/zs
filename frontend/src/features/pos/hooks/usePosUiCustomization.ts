import { useState, useEffect, useCallback } from 'react';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { settingsApi } from '@/features/settings/api/settings.api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/components/system-alert';

export interface PosUiCustomization {
  showSearchBar: boolean;
  showPriceTierToggle: boolean;
  defaultPriceType: 'retail' | 'wholesale';
  showCategories: boolean;
  showQuickFilters: boolean;
  mobileGridColumns: '2' | '3' | 'auto';
  autoHideBottomNav: boolean;
  cardLayout: 'comfortable' | 'compact' | 'gallery';
}

export const POS_UI_CUSTOMIZATION_KEY = 'pos_ui_customization_v1';
export const POS_UI_CUSTOMIZATION_EVENT = 'pos-ui-customization-changed';

export const DEFAULT_POS_UI_CUSTOMIZATION: PosUiCustomization = {
  showSearchBar: true,
  showPriceTierToggle: true,
  defaultPriceType: 'retail',
  showCategories: true,
  showQuickFilters: true,
  mobileGridColumns: 'auto',
  autoHideBottomNav: true,
  cardLayout: 'comfortable',
};

function readLocalCustomization(): Partial<PosUiCustomization> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POS_UI_CUSTOMIZATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function resolvePosUiCustomization(settings?: Record<string, any> | null): PosUiCustomization {
  const local = readLocalCustomization();

  const showSearchBar = local?.showSearchBar !== undefined
    ? Boolean(local.showSearchBar)
    : settings?.posShowSearchBar !== false;

  const showPriceTierToggle = local?.showPriceTierToggle !== undefined
    ? Boolean(local.showPriceTierToggle)
    : settings?.posShowPriceTierToggle !== false;

  const defaultPriceType: 'retail' | 'wholesale' = local?.defaultPriceType !== undefined
    ? (local.defaultPriceType === 'wholesale' ? 'wholesale' : 'retail')
    : (settings?.posDefaultPriceType === 'wholesale' ? 'wholesale' : 'retail');

  const showCategories = local?.showCategories !== undefined
    ? Boolean(local.showCategories)
    : settings?.posShowCategories !== false;

  const showQuickFilters = local?.showQuickFilters !== undefined
    ? Boolean(local.showQuickFilters)
    : settings?.posShowQuickFilters !== false;

  const mobileGridColumns: '2' | '3' | 'auto' = local?.mobileGridColumns !== undefined
    ? local.mobileGridColumns
    : (settings?.posMobileGridColumns === '3' ? '3' : settings?.posMobileGridColumns === '2' ? '2' : 'auto');

  const autoHideBottomNav = local?.autoHideBottomNav !== undefined
    ? Boolean(local.autoHideBottomNav)
    : settings?.posAutoHideBottomNav !== false;

  const cardLayout: 'comfortable' | 'compact' | 'gallery' = local?.cardLayout !== undefined
    ? local.cardLayout
    : (settings?.posProductCardLayout || 'comfortable');

  return {
    showSearchBar,
    showPriceTierToggle,
    defaultPriceType,
    showCategories,
    showQuickFilters,
    mobileGridColumns,
    autoHideBottomNav,
    cardLayout,
  };
}

export function usePosUiCustomization() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const [customization, setCustomizationState] = useState<PosUiCustomization>(() =>
    resolvePosUiCustomization(settingsQuery.data)
  );

  useEffect(() => {
    setCustomizationState(resolvePosUiCustomization(settingsQuery.data));
  }, [settingsQuery.data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomizationChange = (e: Event) => {
      const detail = (e as CustomEvent<PosUiCustomization>).detail;
      if (detail) {
        setCustomizationState(detail);
      } else {
        setCustomizationState(resolvePosUiCustomization(settingsQuery.data));
      }
    };

    window.addEventListener(POS_UI_CUSTOMIZATION_EVENT, handleCustomizationChange);
    return () => {
      window.removeEventListener(POS_UI_CUSTOMIZATION_EVENT, handleCustomizationChange);
    };
  }, [settingsQuery.data]);

  const saveCustomization = useCallback(
    async (patch: Partial<PosUiCustomization>, persistToTenant = true) => {
      const next: PosUiCustomization = {
        ...customization,
        ...patch,
      };

      setCustomizationState(next);

      if (typeof window !== 'undefined') {
        try {
          const currentLocal = readLocalCustomization() || {};
          window.localStorage.setItem(
            POS_UI_CUSTOMIZATION_KEY,
            JSON.stringify({ ...currentLocal, ...patch })
          );
          window.dispatchEvent(
            new CustomEvent(POS_UI_CUSTOMIZATION_EVENT, { detail: next })
          );
        } catch {}
      }

      if (persistToTenant) {
        try {
          const payload: Record<string, any> = {};
          if (patch.showSearchBar !== undefined) payload.posShowSearchBar = patch.showSearchBar;
          if (patch.showPriceTierToggle !== undefined) payload.posShowPriceTierToggle = patch.showPriceTierToggle;
          if (patch.defaultPriceType !== undefined) payload.posDefaultPriceType = patch.defaultPriceType;
          if (patch.showCategories !== undefined) payload.posShowCategories = patch.showCategories;
          if (patch.showQuickFilters !== undefined) payload.posShowQuickFilters = patch.showQuickFilters;
          if (patch.mobileGridColumns !== undefined) payload.posMobileGridColumns = patch.mobileGridColumns;
          if (patch.autoHideBottomNav !== undefined) payload.posAutoHideBottomNav = patch.autoHideBottomNav;
          if (patch.cardLayout !== undefined) payload.posProductCardLayout = patch.cardLayout;

          if (Object.keys(payload).length > 0) {
            await settingsApi.update(payload);
            void queryClient.invalidateQueries({ queryKey: ['settings'] });
          }
        } catch {
          // Local storage fallback ensures the device keeps the user's choice
        }
      }
    },
    [customization, queryClient]
  );

  const resetCustomization = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(POS_UI_CUSTOMIZATION_KEY);
        window.dispatchEvent(
          new CustomEvent(POS_UI_CUSTOMIZATION_EVENT, { detail: DEFAULT_POS_UI_CUSTOMIZATION })
        );
      } catch {}
    }
    setCustomizationState(DEFAULT_POS_UI_CUSTOMIZATION);
    toast.success('تمت استعادة الإعدادات الافتراضية لواجهة الكاشير');
  }, []);

  return {
    customization,
    saveCustomization,
    resetCustomization,
  };
}
