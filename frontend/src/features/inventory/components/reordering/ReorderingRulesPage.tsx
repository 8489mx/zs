import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import {
  LayersIcon,
  SlidersIcon,
  CheckShieldIcon,
  RefreshCwIcon,
  PlusCircleIcon,
  TruckIcon,
  AlertTriangleIcon,
  ClockIcon,
} from '@/shared/components/icons/AppIcons';
import {
  reorderingRulesApi,
  type ReorderingRuleRecord,
} from '../../api/reordering-rules.api';
import { useInventoryActionCatalog } from '../../hooks/useInventoryActionCatalog';
import { CreateReorderingRuleModal } from './CreateReorderingRuleModal';

export function ReorderingRulesPage() {
  const queryClient = useQueryClient();
  const inventoryCatalog = useInventoryActionCatalog();

  const [statusFilter, setStatusFilter] = useState<'all' | 'breached' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [ruleToEdit, setRuleToEdit] = useState<ReorderingRuleRecord | null>(null);
  const [isRunningEvaluation, setIsRunningEvaluation] = useState<boolean>(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reordering-rules', statusFilter, searchQuery, selectedWarehouseId],
    queryFn: () =>
      reorderingRulesApi.listRules({
        status: statusFilter,
        q: searchQuery,
        warehouseId: selectedWarehouseId,
      }),
  });

  const rules = data?.rules || [];
  const summary = data?.summary || {
    totalRules: 0,
    activeRules: 0,
    breachedCount: 0,
    generatedOrdersCount: 0,
  };

  const products = useMemo(
    () =>
      (inventoryCatalog.productsQuery.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        costPrice: Number(p.costPrice || 0),
      })),
    [inventoryCatalog.productsQuery.data],
  );

  const suppliers = useMemo(
    () =>
      (inventoryCatalog.suppliersQuery.data || []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
    [inventoryCatalog.suppliersQuery.data],
  );

  const locations = useMemo(
    () =>
      (inventoryCatalog.locationsQuery.data || []).map((l) => ({
        id: l.id,
        name: l.name,
        branchId: l.branchId ? Number(l.branchId) : undefined,
      })),
    [inventoryCatalog.locationsQuery.data],
  );

  const branches = useMemo(
    () =>
      (inventoryCatalog.branchesQuery.data || []).map((b) => ({
        id: b.id,
        name: b.name,
      })),
    [inventoryCatalog.branchesQuery.data],
  );

  const handleOpenCreateModal = () => {
    setRuleToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: ReorderingRuleRecord) => {
    setRuleToEdit(rule);
    setIsModalOpen(true);
  };

  const handleDeleteRule = async (rule: ReorderingRuleRecord) => {
    const confirmed = await systemConfirm({
      title: 'حذف قاعدة إعادة الطلب',
      message: `هل أنت متأكد من حذف قاعدة إعادة الطلب للصنف «${rule.product_name}»؟ لن يتم توليد أوامر شراء تلقائية له بعد الآن.`,
      confirmText: 'نعم، حذف القاعدة',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await reorderingRulesApi.deleteRule(rule.id);
      toast.success('تم حذف قاعدة إعادة الطلب بنجاح');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حذف القاعدة');
    }
  };

  const handleRunEvaluation = async () => {
    setIsRunningEvaluation(true);
    try {
      const res = await reorderingRulesApi.runEvaluation({
        warehouseId: selectedWarehouseId,
        autoCreateOrders: true,
      });

      if (res.generatedOrdersCount > 0) {
        const orderNums = res.generatedOrders.map((o) => o.order_number).join('، ');
        toast.success(
          `تم بنجاح فحص ${res.evaluatedRulesCount} قاعدة، ورصد ${res.breachedRulesCount} صنف بحاجة لتوريد، وتوليد ${res.generatedOrdersCount} أمر شراء مسودة برقم: (${orderNums}).`,
        );
      } else if (res.breachedRulesCount === 0) {
        toast.info(`فحص مكتمل: كافة الأصناف المستهدفة (${res.evaluatedRulesCount}) عند مستويات رصيد آمنة ومستقرة.`);
      } else {
        toast.warning(`تم رصد ${res.breachedRulesCount} صنف تحت حد الأمان بدون توليد أوامر جديدة.`);
      }

      refetch();
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء تشغيل محرك إعادة الطلب');
    } finally {
      setIsRunningEvaluation(false);
    }
  };

  return (
    <div
      className="reordering-rules-page"
      style={{
        maxWidth: '1280px',
        width: 'min(100%, 1280px)',
        margin: '0 auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersIcon size={20} color="#170e5e" />
            <h1 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
              قواعد إعادة الطلب التلقائي وأوامر الشراء (Automated Reordering Rules)
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
            محرك أودو 18 لمراقبة حدود الأمان ونقاط إعادة الطلب (Min/Max) وتوليد مسودات أوامر الشراء للموردين آلياً
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={isRunningEvaluation || isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '7px',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: isRunningEvaluation ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            title="تشغيل فحص شامل لكافة القواعد وتوليد أوامر الشراء للأصناف التي كسرت حد الأمان"
          >
            <RefreshCwIcon size={14} className={isRunningEvaluation ? 'spin' : ''} />
            <span>{isRunningEvaluation ? 'جارٍ فحص النواقص والتوليد...' : 'تشغيل محرك إعادة الطلب الآن'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '7px',
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <PlusCircleIcon size={15} />
            <span>إضافة قاعدة إعادة طلب</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <Card style={{ padding: '14px 16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>إجمالي القواعد المسجلة</span>
            <LayersIcon size={16} color="#64748b" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {summary.totalRules}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
            {summary.activeRules} قاعدة نشطة ومراقبة
          </div>
        </Card>

        <Card style={{ padding: '14px 16px', background: '#ffffff', border: summary.breachedCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: summary.breachedCount > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
              أصناف تحت حد الأمان (عاجل)
            </span>
            <AlertTriangleIcon size={16} color={summary.breachedCount > 0 ? '#dc2626' : '#64748b'} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: summary.breachedCount > 0 ? '#dc2626' : '#0f172a', marginTop: '6px' }}>
            {summary.breachedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: summary.breachedCount > 0 ? '#b91c1c' : '#64748b', marginTop: '2px', fontWeight: 600 }}>
            {summary.breachedCount > 0 ? 'تتطلب توريد فوري للوصول للحد الأقصى' : 'كافة الأرصدة أعلى من حد الأمان'}
          </div>
        </Card>

        <Card style={{ padding: '14px 16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>أوامر شراء مسودة مولدة</span>
            <TruckIcon size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2563eb', marginTop: '6px' }}>
            {summary.generatedOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
            تم تجميعها وتجهيزها للاعتماد
          </div>
        </Card>

        <Card style={{ padding: '14px 16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>نمط الجدولة والتحفيز</span>
            <CheckShieldIcon size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#170e5e', marginTop: '8px' }}>
            توليد مسودات آلي (Draft PO)
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
            مواءمة معيار أودو 18 للمخازن
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === 'all' ? '#170e5e' : 'transparent',
                color: statusFilter === 'all' ? '#ffffff' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              كافة القواعد ({summary.totalRules})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('breached')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === 'breached' ? '#dc2626' : 'transparent',
                color: statusFilter === 'breached' ? '#ffffff' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              تحتاج إعادة طلب ({summary.breachedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('normal')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === 'normal' ? '#10b981' : 'transparent',
                color: statusFilter === 'normal' ? '#ffffff' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              مستقرة وآمنة ({summary.totalRules - summary.breachedCount})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '220px', maxWidth: '360px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالصنف، الباركود، أو المورد..."
              style={{
                width: '100%',
                height: '34px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                padding: '0 10px',
                fontSize: '0.8125rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Rules Table */}
      <Card style={{ padding: '0', background: '#ffffff', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>الصنف</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>المستودع / الفرع</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>المورد المفضل</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الرصيد الفعلي</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>بالطريق (PO)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>المحجوز (حجز مبيعات)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>المتوقع (Forecast)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>حد الأمان (Min)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحد الأقصى (Max)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الكمية المقترحة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCwIcon size={20} className="spin" />
                    <div style={{ marginTop: '8px' }}>جارٍ جلب وتدقيق قواعد إعادة الطلب...</div>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <LayersIcon size={32} color="#cbd5e1" />
                    <div style={{ marginTop: '10px', fontSize: '0.92rem', fontWeight: 600 }}>لا توجد قواعد إعادة طلب مطابقة</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                      قم بإنشاء قاعدة جديدة لضبط حدود الأمان للأصناف الحيوية ومنع نفاد المخزون.
                    </div>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  return (
                    <tr
                      key={rule.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: rule.isBreached ? '#fffafb' : '#ffffff',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* الصنف */}
                      <td style={{ padding: '10px 14px' }}>
                        <strong style={{ display: 'block', color: '#0f172a' }}>{rule.product_name}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          {rule.product_barcode && <span>باركود: {rule.product_barcode}</span>}
                          {rule.product_sku && <span>كود: {rule.product_sku}</span>}
                        </div>
                      </td>

                      {/* المخزن */}
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        <div>{rule.warehouse_name || 'كافة المستودعات'}</div>
                        {rule.branch_name && <small className="muted">{rule.branch_name}</small>}
                      </td>

                      {/* المورد */}
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {rule.preferred_supplier_name || <span className="muted">بدون مورد محدد</span>}
                      </td>

                      {/* الرصيد الفعلي */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                        {rule.onHandQty}
                      </td>

                      {/* بالطريق */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: rule.incomingQty > 0 ? '#2563eb' : '#94a3b8', fontWeight: rule.incomingQty > 0 ? 700 : 500 }}>
                        {rule.incomingQty > 0 ? `+${rule.incomingQty}` : '0'}
                      </td>

                      {/* المحجوز */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: (rule.reservedQty || 0) > 0 ? '#ea580c' : '#94a3b8', fontWeight: (rule.reservedQty || 0) > 0 ? 700 : 500 }}>
                        {(rule.reservedQty || 0) > 0 ? `-${rule.reservedQty}` : '0'}
                      </td>

                      {/* المتوقع */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: rule.isBreached ? '#dc2626' : '#10b981' }}>
                        {rule.forecastedQty}
                      </td>

                      {/* حد الأمان */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                        {Number(rule.min_qty)}
                      </td>

                      {/* الحد الأقصى */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                        {Number(rule.max_qty)}
                      </td>

                      {/* الكمية المقترحة */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {rule.suggestedOrderQty > 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '5px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                            }}
                          >
                            +{rule.suggestedOrderQty}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0</span>
                        )}
                      </td>

                      {/* الحالة */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {rule.isBreached ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <AlertTriangleIcon size={12} />
                            <span>تحت حد الأمان</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#ecfdf5',
                              color: '#047857',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckShieldIcon size={12} />
                            <span>رصيد آمن</span>
                          </span>
                        )}
                      </td>

                      {/* الإجراءات */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rule)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              border: '1px solid #fecaca',
                              background: '#fff5f5',
                              color: '#dc2626',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <CreateReorderingRuleModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => refetch()}
          ruleToEdit={ruleToEdit}
          products={products}
          suppliers={suppliers}
          locations={locations}
          branches={branches}
        />
      )}
    </div>
  );
}
