import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import {
  purchasesApi,
  ReorderItemSuggestion,
  SupplierReorderGroup,
  GenerateDraftOrdersPayload,
} from '@/features/purchases/api/purchases.api';
import { CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { SmartReorderStats } from '../components/smart-reorder/SmartReorderStats';
import { SmartReorderFilters } from '../components/smart-reorder/SmartReorderFilters';
import { SmartReorderSupplierGroupCard } from '../components/smart-reorder/SmartReorderSupplierGroupCard';
import { SmartReorderConfirmModal } from '../components/smart-reorder/SmartReorderConfirmModal';
import { SmartReorderSuccessModal } from '../components/smart-reorder/SmartReorderSuccessModal';

export function SmartReorderPage() {
  const queryClient = useQueryClient();

  // Filters state
  const [daysAnalysis, setDaysAnalysis] = useState<number>(30);
  const [targetCoverageDays, setTargetCoverageDays] = useState<number>(30);
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState<number>(3);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'needs_reorder' | 'out_of_stock' | 'critical' | 'warning'>('needs_reorder');
  const [search, setSearch] = useState<string>('');

  // Overridden quantities & selection states
  const [customQuantities, setCustomQuantities] = useState<Record<number, number>>({});
  const [selectedProductIds, setSelectedProductIds] = useState<Record<number, boolean>>({});

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [targetSupplierForOrder, setTargetSupplierForOrder] = useState<SupplierReorderGroup | null>(null);
  const [batchNote, setBatchNote] = useState<string>('مسودة أمر شراء - مقترح إعادة الطلب الذكي');
  const [createdOrdersResult, setCreatedOrdersResult] = useState<Array<{
    id: number;
    docNo?: string;
    supplierId: number;
    supplierName?: string;
    total: number;
    itemsCount: number;
  }> | null>(null);

  // Fetch suggestions
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchases', 'reorder-suggestions', daysAnalysis, targetCoverageDays, defaultLeadTimeDays, urgencyFilter, search],
    queryFn: () =>
      purchasesApi.getReorderSuggestions({
        daysAnalysis,
        targetCoverageDays,
        defaultLeadTimeDays,
        urgencyFilter,
        search,
      }),
  });

  const summary = data?.summary;
  const supplierGroups = data?.supplierGroups || [];

  const getEffectiveQty = (item: ReorderItemSuggestion): number => {
    if (customQuantities[item.productId] !== undefined) {
      return customQuantities[item.productId];
    }
    return item.suggestedQty;
  };

  const isItemSelected = (item: ReorderItemSuggestion): boolean => {
    if (selectedProductIds[item.productId] !== undefined) {
      return selectedProductIds[item.productId];
    }
    return item.needsReorder;
  };

  const handleToggleItem = (productId: number, currentSelected: boolean) => {
    setSelectedProductIds((prev) => ({
      ...prev,
      [productId]: !currentSelected,
    }));
  };

  const handleToggleSupplier = (group: SupplierReorderGroup, currentAllSelected: boolean) => {
    const nextState = !currentAllSelected;
    setSelectedProductIds((prev) => {
      const updated = { ...prev };
      group.items.forEach((item) => {
        updated[item.productId] = nextState;
      });
      return updated;
    });
  };

  const handleQuantityChange = (productId: number, val: string) => {
    const parsed = parseInt(val, 10);
    setCustomQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(parsed) || parsed < 0 ? 0 : parsed,
    }));
  };

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: (payload: GenerateDraftOrdersPayload) => purchasesApi.generateDraftOrders(payload),
    onSuccess: (result) => {
      setCreatedOrdersResult(result.orders || result.createdOrders);
      setShowConfirmModal(false);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });

  const selectedOrdersPayload = useMemo<GenerateDraftOrdersPayload>(() => {
    const groupsToProcess = targetSupplierForOrder ? [targetSupplierForOrder] : supplierGroups;

    const orders: GenerateDraftOrdersPayload['orders'] = [];

    groupsToProcess.forEach((group) => {
      if (!group.supplierId) return;

      const selectedItems = group.items.filter((item) => isItemSelected(item));
      if (selectedItems.length === 0) return;

      orders.push({
        supplierId: group.supplierId,
        note: batchNote,
        items: selectedItems.map((item) => ({
          productId: item.productId,
          qty: getEffectiveQty(item),
          quantity: getEffectiveQty(item),
          name: item.name,
          productName: item.name,
          cost: item.costPrice,
          costPrice: item.costPrice,
        })),
      });
    });

    return { orders };
  }, [supplierGroups, targetSupplierForOrder, selectedProductIds, customQuantities, batchNote]);

  const totalSelectedItemsCount = useMemo(() => {
    return selectedOrdersPayload.orders.reduce((acc, ord) => acc + ord.items.length, 0);
  }, [selectedOrdersPayload]);

  const totalSelectedCost = useMemo(() => {
    return selectedOrdersPayload.orders.reduce((acc, ord) => {
      const ordSum = ord.items.reduce((sum, item) => sum + (item.qty || (item as any).quantity || 0) * (item.cost || (item as any).costPrice || 0), 0);
      return acc + ordSum;
    }, 0);
  }, [selectedOrdersPayload]);

  const handleOpenSupplierConfirm = (group: SupplierReorderGroup) => {
    setTargetSupplierForOrder(group);
    setShowConfirmModal(true);
  };

  const handleOpenAllConfirm = () => {
    setTargetSupplierForOrder(null);
    setShowConfirmModal(true);
  };

  const handleExecuteGenerate = () => {
    if (selectedOrdersPayload.orders.length === 0) return;
    generateMutation.mutate(selectedOrdersPayload);
  };

  return (
    <div className="page-stack page-shell purchases-workspace smart-reorder-workspace" dir="rtl">
      <main className="page-content workspace-body" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
        {/* 1. Header */}
        <PageHeader
          title="مقترح إعادة الطلب والتوريد الذكي"
          description="حساب نقطة إعادة الطلب وتوليد مسودات أوامر شراء مجمعة تلقائياً حسب الموردين استناداً إلى سرعة الاستهلاك وأيام التغطية"
          actions={
            <div className="actions compact-actions" style={{ gap: '10px' }}>
              <Button
                variant="primary"
                style={{ backgroundColor: '#170e5e', borderColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
                onClick={handleOpenAllConfirm}
                disabled={isLoading || totalSelectedItemsCount === 0 || generateMutation.isPending}
              >
                توليد أوامر شراء لجميع المحددين ({totalSelectedItemsCount})
              </Button>
              <Button variant="secondary" onClick={() => void refetch()} disabled={isLoading}>
                تحديث التحليل
              </Button>
              <Link to="/purchases">
                <Button variant="secondary">سجل المشتريات</Button>
              </Link>
            </div>
          }
        />

        {/* 2. KPI Summary Cards */}
        <SmartReorderStats summary={summary} />

        {/* 3. Parameter Controls & Search Toolbar */}
        <SmartReorderFilters
          daysAnalysis={daysAnalysis}
          setDaysAnalysis={setDaysAnalysis}
          targetCoverageDays={targetCoverageDays}
          setTargetCoverageDays={setTargetCoverageDays}
          defaultLeadTimeDays={defaultLeadTimeDays}
          setDefaultLeadTimeDays={setDefaultLeadTimeDays}
          urgencyFilter={urgencyFilter}
          setUrgencyFilter={setUrgencyFilter}
          search={search}
          setSearch={setSearch}
        />

        {/* 4. Loading / Error / Empty States */}
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>جاري تحليل معدلات الاستهلاك وحساب نقاط إعادة الطلب...</div>
          </div>
        ) : isError ? (
          <div style={{ padding: '40px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', margin: '20px 0', color: '#dc2626' }}>
            <strong>تعذر جلب مقترحات إعادة الطلب:</strong> {(error as any)?.message || 'خطأ غير معروف'}
          </div>
        ) : supplierGroups.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              marginTop: '20px',
            }}
          >
            <div style={{ display: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <CheckCircleIcon size={44} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              المخزون في حالة ممتازة ومستقرة!
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
              لا توجد أصناف توشك على النفاد وفق إعدادات التحليل الحالية. يمكنك تغيير فلتر مستوى الإلحاح إلى "جميع الأصناف" إذا أردت معاينة باقي المنتجات.
            </p>
          </div>
        ) : (
          /* 5. Supplier Groups List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px' }}>
            {supplierGroups.map((group) => (
              <SmartReorderSupplierGroupCard
                key={group.supplierId || 'unassigned'}
                group={group}
                isItemSelected={isItemSelected}
                getEffectiveQty={getEffectiveQty}
                handleToggleSupplier={handleToggleSupplier}
                handleToggleItem={handleToggleItem}
                handleQuantityChange={handleQuantityChange}
                handleOpenSupplierConfirm={handleOpenSupplierConfirm}
                isGeneratePending={generateMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* 6. Confirmation Modal */}
        <SmartReorderConfirmModal
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          ordersCount={selectedOrdersPayload.orders.length}
          totalItemsCount={totalSelectedItemsCount}
          totalCost={totalSelectedCost}
          batchNote={batchNote}
          setBatchNote={setBatchNote}
          isPending={generateMutation.isPending}
          isError={generateMutation.isError}
          errorMessage={(generateMutation.error as any)?.message}
          onExecute={handleExecuteGenerate}
        />

        {/* 7. Success Modal */}
        <SmartReorderSuccessModal
          orders={createdOrdersResult}
          onClose={() => setCreatedOrdersResult(null)}
        />
      </main>
    </div>
  );
}
