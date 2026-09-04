import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency } from '@/lib/format';
import {
  purchasesApi,
  ReorderItemSuggestion,
  SupplierReorderGroup,
  GenerateDraftOrdersPayload,
} from '@/features/purchases/api/purchases.api';

export function SmartReorderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters state
  const [daysAnalysis, setDaysAnalysis] = useState<number>(30);
  const [targetCoverageDays, setTargetCoverageDays] = useState<number>(30);
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState<number>(3);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'needs_reorder' | 'out_of_stock' | 'critical' | 'warning'>('needs_reorder');
  const [search, setSearch] = useState<string>('');

  // Overridden quantities & selection states (productId -> qty, productId -> boolean)
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


  // Helper to get effective qty for an item
  const getEffectiveQty = (item: ReorderItemSuggestion): number => {
    if (customQuantities[item.productId] !== undefined) {
      return customQuantities[item.productId];
    }
    return item.suggestedQty;
  };

  // Helper to check if an item is selected (default to true if item.needsReorder)
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
    const num = Math.max(0, parseInt(val, 10) || 0);
    setCustomQuantities((prev) => ({
      ...prev,
      [productId]: num,
    }));
  };

  // Selected totals calculation
  const { totalSelectedItemsCount, totalSelectedCost, selectedOrdersPayload } = useMemo(() => {
    const orders: GenerateDraftOrdersPayload['orders'] = [];
    let count = 0;
    let cost = 0;

    const groupsToProcess = targetSupplierForOrder ? [targetSupplierForOrder] : supplierGroups;

    groupsToProcess.forEach((group) => {
      if (!group.supplierId) return; // Skip unassigned supplier groups from auto-generation unless assigned

      const validItems = group.items
        .filter((item) => isItemSelected(item))
        .map((item) => {
          const qty = getEffectiveQty(item);
          return {
            productId: item.productId,
            name: item.name,
            qty,
            cost: item.costPrice,
          };
        })
        .filter((i) => i.qty > 0);

      if (validItems.length > 0) {
        orders.push({
          supplierId: group.supplierId,
          notes: batchNote,
          items: validItems,
        });
        count += validItems.length;
        validItems.forEach((vi) => {
          cost += vi.qty * vi.cost;
        });
      }
    });

    return {
      totalSelectedItemsCount: count,
      totalSelectedCost: cost,
      selectedOrdersPayload: { orders, notes: batchNote },
    };
  }, [supplierGroups, targetSupplierForOrder, selectedProductIds, customQuantities, batchNote]);

  // Mutation for generating purchase orders
  const generateMutation = useMutation({
    mutationFn: (payload: GenerateDraftOrdersPayload) => purchasesApi.generateDraftOrders(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setCreatedOrdersResult(res.createdOrders as any);
      setShowConfirmModal(false);
      setTargetSupplierForOrder(null);
    },
  });

  const handleOpenBatchConfirm = () => {
    setTargetSupplierForOrder(null);
    setShowConfirmModal(true);
  };

  const handleOpenSupplierConfirm = (group: SupplierReorderGroup) => {
    setTargetSupplierForOrder(group);
    setShowConfirmModal(true);
  };

  const handleExecuteGenerate = () => {
    if (selectedOrdersPayload.orders.length === 0) return;
    generateMutation.mutate(selectedOrdersPayload);
  };

  return (
    <div className="page-stack page-shell purchases-workspace smart-reorder-workspace" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '48px' }}>
        {/* 1. Page Header */}
        <PageHeader
          title="مقترح أوامر الشراء التلقائي الذكي (Smart Auto-Reordering)"
          description="تحليل معدل الاستهلاك اليومي (Daily Run Rate) وفترة توريد المورد وتوليد مسودات أوامر الشراء بضغطة زر واحدة."
          badge={
            <span className="nav-pill" style={{ backgroundColor: '#e0e7ff', color: '#170e5e', fontWeight: 700 }}>
              {summary?.needsReorderCount || 0} صنف بحاجة لإعادة الطلب
            </span>
          }
          actions={
            <div className="actions compact-actions" style={{ gap: '10px' }}>
              <Button
                variant="primary"
                style={{ backgroundColor: '#170e5e', borderColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
                onClick={handleOpenBatchConfirm}
                disabled={totalSelectedItemsCount === 0 || generateMutation.isPending}
              >
                ⚡ توليد مسودات أوامر الشراء المحددة ({totalSelectedItemsCount})
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
        <div className="stats-grid compact-grid workspace-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي الأصناف المراقبة</span>
            <strong style={{ fontSize: '22px', color: '#1e293b' }}>{summary?.totalMonitoredProducts || 0}</strong>
          </div>
          <div className="stat-card" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>أصناف نفدت تماماً</span>
            <strong style={{ fontSize: '22px', color: '#dc2626' }}>{summary?.outOfStockCount || 0}</strong>
          </div>
          <div className="stat-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '13px', color: '#b45309', fontWeight: 600 }}>أصناف حرجة وشيكة</span>
            <strong style={{ fontSize: '22px', color: '#d97706' }}>{summary?.criticalCount || 0}</strong>
          </div>
          <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>أصناف في مرحلة التحذير</span>
            <strong style={{ fontSize: '22px', color: '#475569' }}>{summary?.warningCount || 0}</strong>
          </div>
          <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي التكلفة التقديرية</span>
            <strong style={{ fontSize: '20px', color: '#170e5e' }}>{formatCurrency(summary?.totalEstimatedProcurementCost || 0)}</strong>
          </div>
          <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>الموردين المستهدفين</span>
            <strong style={{ fontSize: '22px', color: '#1e293b' }}>{summary?.suppliersCount || 0}</strong>
          </div>
        </div>

        {/* 3. Parameter Controls & Search Toolbar */}
        <section
          className="workspace-panel"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
            marginTop: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              {/* Analysis Days */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>فترة تحليل المبيعات:</label>
                <select
                  value={daysAnalysis}
                  onChange={(e) => setDaysAnalysis(Number(e.target.value))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value={14}>آخر 14 يوماً</option>
                  <option value={30}>آخر 30 يوماً (موصى به)</option>
                  <option value={60}>آخر 60 يوماً</option>
                  <option value={90}>آخر 90 يوماً</option>
                </select>
              </div>

              {/* Target Coverage Days */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>أيام التغطية المستهدفة:</label>
                <select
                  value={targetCoverageDays}
                  onChange={(e) => setTargetCoverageDays(Number(e.target.value))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value={14}>14 يوماً (أسبوعين)</option>
                  <option value={30}>30 يوماً (شهر كامل)</option>
                  <option value={45}>45 يوماً</option>
                  <option value={60}>60 يوماً (شهرين)</option>
                </select>
              </div>

              {/* Default Lead Time */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>فترة التوريد الافتراضية:</label>
                <select
                  value={defaultLeadTimeDays}
                  onChange={(e) => setDefaultLeadTimeDays(Number(e.target.value))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value={2}>2 أيام</option>
                  <option value={3}>3 أيام (افتراضي)</option>
                  <option value={5}>5 أيام</option>
                  <option value={7}>7 أيام (أسبوع)</option>
                  <option value={14}>14 يوماً</option>
                </select>
              </div>

              {/* Urgency Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>مستوى الإلحاح:</label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value as any)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="needs_reorder">يحتاج إعادة طلب فقط (موصى به)</option>
                  <option value="out_of_stock">نافد المخزون فقط</option>
                  <option value="critical">حرج ووشيك النفاد فقط</option>
                  <option value="warning">تحذيري فقط</option>
                  <option value="all">جميع الأصناف</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '260px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>بحث سريع بالصنف أو الباركود:</label>
              <input
                type="text"
                placeholder="ابحث بالاسم أو الباركود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
          </div>
        </section>

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
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
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
            {supplierGroups.map((group) => {
              const allSupplierItemsSelected = group.items.every((item) => isItemSelected(item));
              const selectedItemsInGroup = group.items.filter((item) => isItemSelected(item));
              const supplierSelectedTotalCost = selectedItemsInGroup.reduce(
                (sum, item) => sum + getEffectiveQty(item) * item.costPrice,
                0
              );

              return (
                <section
                  key={group.supplierId || 'unassigned'}
                  className="workspace-panel"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Supplier Card Header */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '16px 20px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <input
                        type="checkbox"
                        checked={allSupplierItemsSelected}
                        onChange={() => handleToggleSupplier(group, allSupplierItemsSelected)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#170e5e' }}
                        title="تحديد أو إلغاء تحديد كافة أصناف هذا المورد"
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                            {group.supplierName}
                          </h4>
                          {group.supplierPhone ? (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>({group.supplierPhone})</span>
                          ) : null}
                          {!group.supplierId ? (
                            <span
                              style={{
                                fontSize: '11px',
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 600,
                              }}
                            >
                              يحتاج تعيين مورد في شاشة الأصناف
                            </span>
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          <span>⏱️ فترة التوريد: <strong>{group.leadTimeDays} أيام</strong></span>
                          <span>📦 الأصناف المطلوبة: <strong>{group.itemsCount} صنف</strong></span>
                          {group.criticalCount > 0 ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ {group.criticalCount} أصناف حرجة/نافدة</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>التكلفة التقديرية للمحدد:</div>
                        <strong style={{ fontSize: '16px', color: '#170e5e' }}>{formatCurrency(supplierSelectedTotalCost)}</strong>
                      </div>
                      {group.supplierId ? (
                        <Button
                          variant="secondary"
                          style={{
                            borderColor: '#170e5e',
                            color: '#170e5e',
                            fontWeight: 600,
                            fontSize: '12px',
                            padding: '6px 14px',
                          }}
                          disabled={selectedItemsInGroup.length === 0 || generateMutation.isPending}
                          onClick={() => handleOpenSupplierConfirm(group)}
                        >
                          إنشاء مسودة أمر شراء لهذا المورد ({selectedItemsInGroup.length})
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Supplier Items Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                      <thead>
                        <tr style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                          <th style={{ padding: '12px 16px', width: '40px' }}>اختيار</th>
                          <th style={{ padding: '12px 16px' }}>الصنف</th>
                          <th style={{ padding: '12px 16px' }}>المخزون الحالي</th>
                          <th style={{ padding: '12px 16px' }}>معدل الاستهلاك (يومياً)</th>
                          <th style={{ padding: '12px 16px' }}>الأيام المتبقية</th>
                          <th style={{ padding: '12px 16px' }}>حد الطلب (ROP)</th>
                          <th style={{ padding: '12px 16px' }}>الحالة</th>
                          <th style={{ padding: '12px 16px', minWidth: '130px' }}>الكمية المقترحة</th>
                          <th style={{ padding: '12px 16px' }}>سعر الشراء</th>
                          <th style={{ padding: '12px 16px' }}>الإجمالي التقديري</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => {
                          const isSelected = isItemSelected(item);
                          const qty = getEffectiveQty(item);
                          const itemTotal = qty * item.costPrice;

                          // Urgency styles
                          let urgencyBadge = { label: 'آمن', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
                          if (item.urgency === 'out_of_stock') {
                            urgencyBadge = { label: 'نفد المخزون', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
                          } else if (item.urgency === 'critical') {
                            urgencyBadge = { label: 'حرج جداً', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
                          } else if (item.urgency === 'warning') {
                            urgencyBadge = { label: 'يلزم الطلب', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
                          } else if (item.urgency === 'overstocked') {
                            urgencyBadge = { label: 'فائض', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
                          }

                          return (
                            <tr
                              key={item.productId}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isSelected ? '#ffffff' : '#fafafa',
                                opacity: isSelected ? 1 : 0.6,
                                transition: 'background-color 0.15s',
                              }}
                            >
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleItem(item.productId, isSelected)}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#170e5e' }}
                                />
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                  {item.barcode ? `باركود: ${item.barcode}` : `كود #${item.productId}`}
                                  {item.categoryName ? ` · ${item.categoryName}` : ''}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: item.currentStock <= 0 ? '#dc2626' : item.currentStock <= item.minStock ? '#d97706' : '#1e293b',
                                  }}
                                >
                                  {item.currentStock}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div><strong>{item.dailyRunRate}</strong> <span style={{ fontSize: '11px', color: '#64748b' }}>وحدة/يوم</span></div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>مبيعات الفترة: {item.qtySoldPeriod}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: item.daysRemaining <= item.leadTimeDays ? '#dc2626' : '#475569',
                                  }}
                                >
                                  {item.daysRemaining === 999 ? '—' : `${item.daysRemaining} يوم`}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569' }}>
                                <div>نقطة الطلب: <strong>{item.reorderPoint}</strong></div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>الحد الأدنى: {item.minStock}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: urgencyBadge.bg,
                                    color: urgencyBadge.color,
                                    border: `1px solid ${urgencyBadge.border}`,
                                  }}
                                >
                                  {urgencyBadge.label}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    value={qty}
                                    onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                                    style={{
                                      width: '80px',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '13px',
                                      color: '#1e293b',
                                      backgroundColor: '#ffffff',
                                    }}
                                  />
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>وحدة</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569' }}>
                                {formatCurrency(item.costPrice)}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#170e5e' }}>
                                {formatCurrency(itemTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* 6. Confirmation Modal */}
        <DialogShell
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          width="min(560px, 95vw)"
          ariaLabel="تأكيد توليد مسودات أوامر الشراء"
          showCloseButton={true}
        >
          <div className="dialog-card" style={{ padding: '24px', direction: 'rtl' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
              تأكيد توليد مسودات أوامر الشراء
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '16px' }}>
              سيتم إنشاء أوامر شراء مسودة (Draft POs) مجمعة تلقائياً في سجل المشتريات.
              <strong> لن يتم التأثير على رصيد المخزون </strong> حتى تقوم باعتماد الاستلام المخزني الفعلي.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>عدد أوامر الشراء المستهدفة:</span>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>{selectedOrdersPayload.orders.length} أمر شراء</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي الأصناف المحددة:</span>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>{totalSelectedItemsCount} صنف</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي القيمة التقديرية:</span>
                <strong style={{ fontSize: '16px', color: '#170e5e' }}>{formatCurrency(totalSelectedCost)}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                ملاحظة على مسودات الشراء:
              </label>
              <input
                type="text"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            {generateMutation.isError ? (
              <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                {(generateMutation.error as any)?.message || 'فشل توليد أوامر الشراء'}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={generateMutation.isPending}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                style={{ backgroundColor: '#170e5e', borderColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
                onClick={handleExecuteGenerate}
                disabled={generateMutation.isPending || selectedOrdersPayload.orders.length === 0}
              >
                {generateMutation.isPending ? 'جاري الإنشاء...' : 'نعم، توليد أوامر الشراء'}
              </Button>
            </div>
          </div>
        </DialogShell>

        {/* 7. Success Modal */}
        <DialogShell
          open={Boolean(createdOrdersResult)}
          onClose={() => setCreatedOrdersResult(null)}
          width="min(600px, 95vw)"
          ariaLabel="تم توليد مسودات أوامر الشراء بنجاح"
          showCloseButton={true}
        >
          <div className="dialog-card" style={{ padding: '24px', direction: 'rtl', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
              تم توليد مسودات أوامر الشراء بنجاح!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              تم حفظ مسودات أوامر الشراء في النظام بنجاح. يمكنك استعراضها الآن أو الانتقال لسجل فواتير المشتريات.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', textAlign: 'right' }}>
              {(createdOrdersResult || []).map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>أمر شراء #{ord.docNo || ord.id}</strong>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      المورد: {ord.supplierName || '—'} · {ord.itemsCount} أصناف
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <strong style={{ color: '#170e5e' }}>{formatCurrency(ord.total)}</strong>
                    <Button
                      variant="secondary"
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                      onClick={() => navigate('/purchases')}
                    >
                      معاينة في السجل
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button
                variant="primary"
                style={{ backgroundColor: '#170e5e', borderColor: '#170e5e', color: '#ffffff' }}
                onClick={() => navigate('/purchases')}
              >
                الانتقال لسجل المشتريات
              </Button>
              <Button variant="secondary" onClick={() => setCreatedOrdersResult(null)}>
                البقاء في مقترح الطلب
              </Button>
            </div>
          </div>
        </DialogShell>
      </main>
    </div>
  );
}
