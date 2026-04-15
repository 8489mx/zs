import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { catalogApi } from '@/shared/api/catalog';
import { pricingCenterApi, type PricingPreviewPayload, type PricingPreviewResponse, type PricingRun } from '@/features/pricing-center/api/pricing-center.api';
import { queryKeys } from '@/app/query-keys';
import { formatCurrency, formatDate } from '@/lib/format';
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

function summarizeRun(run: PricingRun) {
  const operation = (run.operation || {}) as { operation?: { type?: string; value?: number }; targets?: string[]; rounding?: { mode?: string } };
  const op = operation.operation;
  const targets = Array.isArray(operation.targets) ? operation.targets.join(' + ') : '—';
  return `${op?.type || '—'} / ${op?.value ?? '—'} / ${targets}`;
}

export function PricingCenterPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManagePricingCenter = user?.role === 'super_admin' || Boolean(user?.permissions?.includes('pricingCenterManage'));
  const [payload, setPayload] = useState<PricingPreviewPayload>(defaultPayload);
  const [preview, setPreview] = useState<PricingPreviewResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

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

  const previewRows = preview?.rows || [];
  const runs = runsQuery.data?.runs || [];

  return (
    <div className="page-stack page-shell pricing-center-page">
      <PageHeader
        title="مركز التسعير"
        description="نفّذ موجات تسعير جماعية بالمورد أو القسم أو النوع، مع معاينة كاملة قبل الاعتماد، وسجل للتراجع عن آخر موجة."
        badge={<span className="nav-pill">مرحلة تشغيل عملية</span>}
        actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => { setPayload(defaultPayload); setPreview(null); setStatusMessage('تمت إعادة ضبط مركز التسعير.'); }}>إعادة الضبط</Button><Button onClick={() => previewMutation.mutate(payload)} disabled={previewMutation.isPending}>معاينة</Button><Button onClick={() => applyMutation.mutate(payload)} disabled={!canManagePricingCenter || applyMutation.isPending || !preview?.summary?.affectedCount}>اعتماد الموجة</Button></div>}
      />

      <StatsGrid items={stats} />

      {statusMessage ? <Card className="pricing-center-status"><p>{statusMessage}</p></Card> : null}

      <div className="two-column-grid panel-grid pricing-center-scope-grid">
        <Card title="النطاق والعملية" description="اختر المورد والقسم ونوع العملية وقواعد الاستثناء قبل المعاينة.">
          <div className="pricing-scope-stack">
            <div className="form-grid compact-form-grid pricing-scope-primary-grid">
              <Field label="المورد">
                <select value={payload.filters.supplierId || ''} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, supplierId: event.target.value ? Number(event.target.value) : undefined } }))}>
                  <option value="">كل الموردين</option>
                  {(suppliersQuery.data || []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </Field>
              <Field label="القسم">
                <select value={payload.filters.categoryId || ''} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, categoryId: event.target.value ? Number(event.target.value) : undefined } }))}>
                  <option value="">كل الأقسام</option>
                  {(categoriesQuery.data || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </Field>
              <Field label="نوع الصنف">
                <select value={payload.filters.itemKind || ''} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, itemKind: event.target.value ? event.target.value as 'standard' | 'fashion' : undefined } }))}>
                  <option value="">الكل</option>
                  <option value="standard">عادي</option>
                  <option value="fashion">ملابس</option>
                </select>
              </Field>
              <Field label="كود الموديل / المجموعة">
                <input value={payload.filters.styleCode || ''} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, styleCode: event.target.value } }))} placeholder="مثل STYLE-100" />
              </Field>
              <Field label="بحث">
                <input value={payload.filters.q || ''} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, q: event.target.value } }))} placeholder="اسم أو باركود" />
              </Field>
              <Field label="نوع العملية">
                <select value={payload.operation.type} onChange={(event) => setPayload((current) => ({ ...current, operation: { ...current.operation, type: event.target.value as PricingPreviewPayload['operation']['type'] } }))}>
                  <option value="percent_increase">زيادة نسبة</option>
                  <option value="percent_decrease">خفض نسبة</option>
                  <option value="fixed_increase">زيادة مبلغ</option>
                  <option value="fixed_decrease">خفض مبلغ</option>
                  <option value="set_price">تثبيت سعر مباشر</option>
                  <option value="margin_from_cost">هامش من الشراء</option>
                </select>
              </Field>
            </div>

            <div className="pricing-scope-inline-grid">
              <div className="pricing-scope-inline-field">
                <Field label="القيمة">
                  <input type="number" step="0.01" value={payload.operation.value} onChange={(event) => setPayload((current) => ({ ...current, operation: { ...current.operation, value: Number(event.target.value || 0) } }))} />
                </Field>
              </div>

              <div className="pricing-scope-inline-field">
                <Field label="التقريب">
                  <select value={payload.rounding.mode} onChange={(event) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, mode: event.target.value as PricingPreviewPayload['rounding']['mode'] } }))}>
                    <option value="none">بدون تقريب</option>
                    <option value="nearest">لأقرب قيمة</option>
                    <option value="ending">نهاية سعر</option>
                  </select>
                </Field>
              </div>

              <div className="pricing-scope-targets">
                <span className="pricing-scope-inline-label">الأسعار المستهدفة</span>
                <div className="pricing-check-grid pricing-check-grid--compact">
                  <label className="pricing-toggle pricing-toggle--compact">
                    <input type="checkbox" checked={payload.targets.includes('retail')} onChange={(event) => setPayload((current) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'retail'])) : current.targets.filter((entry) => entry !== 'retail') }))} />
                    <span>قطاعي</span>
                  </label>
                  <label className="pricing-toggle pricing-toggle--compact">
                    <input type="checkbox" checked={payload.targets.includes('wholesale')} onChange={(event) => setPayload((current) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'wholesale'])) : current.targets.filter((entry) => entry !== 'wholesale') }))} />
                    <span>جملة</span>
                  </label>
                </div>
              </div>
            </div>

            {payload.rounding.mode === 'nearest' ? (
              <div className="pricing-scope-followup-row">
                <div className="pricing-scope-followup-field">
                  <Field label="أقرب قيمة">
                    <input type="number" step="0.01" value={payload.rounding.nearestStep || 0.5} onChange={(event) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, nearestStep: Number(event.target.value || 0.5) } }))} />
                  </Field>
                </div>
              </div>
            ) : null}

            {payload.rounding.mode === 'ending' ? (
              <div className="pricing-scope-followup-row">
                <div className="pricing-scope-followup-field">
                  <Field label="نهاية السعر">
                    <select value={payload.rounding.ending || 95} onChange={(event) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, ending: Number(event.target.value || 95) } }))}>
                      <option value={95}>95</option>
                      <option value={99}>99</option>
                      <option value={50}>50</option>
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}

            <div className="pricing-scope-options-grid">
              <div className="pricing-option-group">
                <div className="pricing-option-group-title">تصفية النطاق</div>
                <div className="pricing-check-grid">
                  <label className="pricing-toggle">
                    <input type="checkbox" checked={Boolean(payload.filters.activeOnly)} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, activeOnly: event.target.checked } }))} />
                    <span>الأصناف النشطة فقط</span>
                  </label>
                  <label className="pricing-toggle">
                    <input type="checkbox" checked={Boolean(payload.filters.inStockOnly)} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, inStockOnly: event.target.checked } }))} />
                    <span>الأصناف التي لها مخزون فقط</span>
                  </label>
                </div>
              </div>

              <div className="pricing-option-group">
                <div className="pricing-option-group-title">قواعد التوسيع</div>
                <div className="pricing-check-grid">
                  <label className="pricing-toggle">
                    <input type="checkbox" checked={payload.options.applyToWholeStyleCode} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToWholeStyleCode: event.target.checked } }))} />
                    <span>اربط أصناف الملابس بنفس كود الموديل</span>
                  </label>
                  <label className="pricing-toggle">
                    <input type="checkbox" checked={payload.options.applyToPricingGroup} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToPricingGroup: event.target.checked } }))} />
                    <span>وسّع على مجموعة التسعير المعتمدة</span>
                  </label>
                </div>
              </div>

              <div className="pricing-option-group pricing-option-group--wide">
                <div className="pricing-option-group-title">الاستثناءات</div>
                <div className="pricing-check-grid">
                  <label className="pricing-toggle">
                    <input type="checkbox" checked={payload.options.skipActiveOffers} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipActiveOffers: event.target.checked } }))} />
                    <span>تخطّي الأصناف التي عليها عروض</span>
                  </label>
                  <label className="pricing-toggle">
                    <input type="checkbox" checked={payload.options.skipCustomerPrices} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipCustomerPrices: event.target.checked } }))} />
                    <span>تخطّي الأصناف التي عليها أسعار خاصة</span>
                  </label>
                  <label className="pricing-toggle">
                    <input type="checkbox" checked={payload.options.skipManualExceptions} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipManualExceptions: event.target.checked } }))} />
                    <span>تخطّي الأصناف المعلّمة كاستثناء يدوي</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="ملخص المعاينة" description="راجع أثر الموجة على قيمة المخزون وهامش الربح قبل الاعتماد.">
          <div className="stack gap-sm">
            <div className="stat-card"><span>قيمة المخزون قبل</span><strong>{formatCurrency(preview?.summary?.inventoryValueBefore || 0)}</strong></div>
            <div className="stat-card"><span>قيمة المخزون بعد</span><strong>{formatCurrency(preview?.summary?.inventoryValueAfter || 0)}</strong></div>
            <div className="stat-card"><span>هامش الربح قبل</span><strong>{formatCurrency(preview?.summary?.stockMarginBefore || 0)}</strong></div>
            <div className="stat-card"><span>هامش الربح بعد</span><strong>{formatCurrency(preview?.summary?.stockMarginAfter || 0)}</strong></div>
            <div className="stat-card"><span>تحذير أقل من الشراء</span><strong>{preview?.summary?.belowCostCount || 0}</strong></div>
            <div className="muted small">المعاينة متاحة لمن يملك صلاحية عرض مركز التسعير، أمّا الاعتماد والتراجع فيحتاجان صلاحية إدارة مركز التسعير.</div>
          </div>
        </Card>
      </div>

      <Card title="نتائج المعاينة" description="الجدول يعرض قبل/بعد والاستثناءات التي سيتم تخطيها عند التنفيذ.">
        <DataTable
          density="compact"
          rows={previewRows}
          rowKey={(row) => String(row.productId)}
          columns={[
            { key: 'name', header: 'الصنف', cell: (row) => <div><strong>{row.name}</strong><div className="muted small">{row.barcode || '—'}</div></div> },
            { key: 'kind', header: 'النوع', cell: (row) => row.itemKind === 'fashion' ? `ملابس${row.styleCode ? ` / ${row.styleCode}` : ''}` : 'عادي' },
            { key: 'stock', header: 'المخزون', cell: (row) => row.stockQty },
            { key: 'retail', header: 'قطاعي قبل/بعد', cell: (row) => `${formatCurrency(row.retailPriceBefore)} → ${formatCurrency(row.retailPriceAfter)}` },
            { key: 'wholesale', header: 'جملة قبل/بعد', cell: (row) => `${formatCurrency(row.wholesalePriceBefore)} → ${formatCurrency(row.wholesalePriceAfter)}` },
            { key: 'flags', header: 'تنبيهات', cell: (row) => [row.hasActiveOffer ? 'عرض' : '', row.hasCustomerPrice ? 'سعر خاص' : '', row.belowCostAfter ? 'أقل من الشراء' : ''].filter(Boolean).join(' / ') || '—' },
            { key: 'status', header: 'الحالة', cell: (row) => row.skipped ? `مستثنى: ${row.skipReasons.join(' + ')}` : row.changed ? 'سيتغير' : 'بدون تغيير' },
          ]}
          empty={<div className="empty-state"><p>لا توجد معاينة بعد. اختر النطاق واضغط “معاينة”.</p></div>}
        />
      </Card>

      <Card title="سجل موجات التسعير" description="يمكن التراجع فقط عن آخر موجة مطبقة حتى لا يتداخل التاريخ السعري.">
        <DataTable
          density="compact"
          rows={runs}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: 'id', header: '#', cell: (row) => row.id },
            { key: 'createdAt', header: 'وقت التنفيذ', cell: (row) => formatDate(row.createdAt) },
            { key: 'createdBy', header: 'بواسطة', cell: (row) => row.createdBy },
            { key: 'summary', header: 'الملخص', cell: (row) => summarizeRun(row) },
            { key: 'affected', header: 'عدد الأصناف', cell: (row) => row.affectedCount },
            { key: 'status', header: 'الحالة', cell: (row) => row.status === 'undone' ? `تم التراجع ${row.undoneAt ? `(${formatDate(String(row.undoneAt))})` : ''}` : 'مطبقة' },
            { key: 'actions', header: 'إجراءات', cell: (row) => <Button variant="secondary" onClick={() => undoMutation.mutate(row.id)} disabled={!canManagePricingCenter || !row.canUndo || undoMutation.isPending}>تراجع</Button> },
          ]}
          empty={<div className="empty-state"><p>لا توجد موجات تسعير مسجلة بعد.</p></div>}
        />
      </Card>
    </div>
  );
}
