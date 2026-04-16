import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { pricingCenterApi, type PricingPreviewPayload, type PricingPreviewResponse } from '@/features/pricing-center/api/pricing-center.api';
import { catalogApi } from '@/shared/api/catalog';
import { useAuthStore } from '@/stores/auth-store';

const defaultPayload: PricingPreviewPayload = {
  filters: {
    supplierId: undefined,
    categoryId: undefined,
    itemKind: undefined,
    styleCode: '',
    q: '',
    activeOnly: true,
    inStockOnly: false,
  },
  operation: {
    type: 'percent_increase',
    value: 5,
  },
  targets: ['retail'],
  rounding: {
    mode: 'none',
    nearestStep: 0.5,
    ending: 95,
  },
  options: {
    applyToWholeStyleCode: true,
    applyToPricingGroup: false,
    skipActiveOffers: true,
    skipCustomerPrices: true,
    skipManualExceptions: false,
  },
};

export function usePricingCenterPageController() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManagePricingCenter = user?.role === 'super_admin' || Boolean(user?.permissions?.includes('pricingCenterManage'));
  const [payload, setPayload] = useState<PricingPreviewPayload>(defaultPayload);
  const [preview, setPreview] = useState<PricingPreviewResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const categoriesQuery = useQuery({ queryKey: queryKeys.productsCategories, queryFn: () => catalogApi.categories() });
  const suppliersQuery = useQuery({ queryKey: queryKeys.productsSuppliers, queryFn: () => catalogApi.suppliers() });
  const runsQuery = useQuery({ queryKey: queryKeys.pricingRuns, queryFn: () => pricingCenterApi.runs() });

  const previewMutation = useMutation({
    mutationFn: pricingCenterApi.preview,
    onSuccess: (result) => {
      setPreview(result);
      setStatusMessage('تم تجهيز المعاينة بنجاح.');
    },
  });

  const applyMutation = useMutation({
    mutationFn: pricingCenterApi.apply,
    onSuccess: (result) => {
      setPreview(result.preview);
      setStatusMessage(`تم تنفيذ موجة التسعير رقم ${result.runId}.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.pricingRuns });
    },
  });

  const undoMutation = useMutation({
    mutationFn: pricingCenterApi.undo,
    onSuccess: (result) => {
      setStatusMessage(`تم التراجع عن موجة التسعير رقم ${result.runId}.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.pricingRuns });
      setPreview(null);
    },
  });

  const stats = useMemo(() => {
    const summary = preview?.summary;
    return [
      { key: 'matched', label: 'مطابقون للنطاق', value: summary?.matchedCount ?? 0 },
      { key: 'affected', label: 'سيتأثرون فعليًا', value: summary?.affectedCount ?? 0 },
      { key: 'offers', label: 'تخطّي عروض', value: summary?.skippedOfferCount ?? 0 },
      { key: 'special', label: 'تخطّي أسعار خاصة', value: summary?.skippedCustomerPriceCount ?? 0 },
    ] as const;
  }, [preview]);

  function resetPricingCenter() {
    setPayload(defaultPayload);
    setPreview(null);
    setStatusMessage('تمت إعادة ضبط مركز التسعير.');
  }

  function runPreview() {
    previewMutation.mutate(payload);
  }

  function applyPricingWave() {
    applyMutation.mutate(payload);
  }

  function undoPricingRun(runId: number) {
    undoMutation.mutate(runId);
  }

  return {
    applyMutation,
    applyPricingWave,
    canManagePricingCenter,
    categories: categoriesQuery.data || [],
    categoriesQuery,
    defaultPayload,
    payload,
    preview,
    previewMutation,
    resetPricingCenter,
    runPreview,
    runs: runsQuery.data?.runs || [],
    runsQuery,
    setPayload,
    stats,
    statusMessage,
    suppliers: suppliersQuery.data || [],
    suppliersQuery,
    undoMutation,
    undoPricingRun,
  };
}
