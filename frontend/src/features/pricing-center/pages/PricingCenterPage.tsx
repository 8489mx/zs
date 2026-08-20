import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePricingCenterPageController } from '@/features/pricing-center/hooks/usePricingCenterPageController';
import { summarizeRun } from '@/features/pricing-center/lib/pricing-center.utils';

type PricingOperationType = 'percent_increase' | 'percent_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_price' | 'margin_from_cost';
type PricingRoundingMode = 'none' | 'nearest' | 'ending';

export function PricingCenterPage() {
  const {
    applyMutation,
    applyPricingWave,
    canManagePricingCenter,
    categories,
    payload,
    preview,
    previewMutation,
    resetPricingCenter,
    runPreview,
    runs,
    setPayload,
    stats,
    statusMessage,
    suppliers,
    undoMutation,
    undoPricingRun,
  } = usePricingCenterPageController();

  const previewRows = preview?.rows || [];
  const summary = preview?.summary;

  const invBefore = Number(summary?.inventoryValueBefore || 0);
  const invAfter = Number(summary?.inventoryValueAfter || 0);
  const invDiff = invAfter - invBefore;

  const marginBefore = Number(summary?.stockMarginBefore || 0);
  const marginAfter = Number(summary?.stockMarginAfter || 0);
  const marginDiff = marginAfter - marginBefore;

  return (
    <div className="page-stack page-shell pricing-center-page" dir="rtl">
      <main className="document-prototype-column" style={{ maxWidth: '1280px', paddingBottom: '100px' }}>
        <PageHeader
          title="مركز التسعير الجماعي"
          description="نفّذ موجات تسعير جماعية بالمورد أو القسم أو النوع، مع معاينة كاملة للأثر المالي قبل الاعتماد والتنفيذ."
          badge={<span className="nav-pill">إدارة الأسعار والموجات</span>}
          actions={(
            <div className="actions compact-actions">
              <Button variant="secondary" onClick={resetPricingCenter}>إعادة الضبط</Button>
              <Button onClick={runPreview} disabled={previewMutation.isPending}>
                {previewMutation.isPending ? 'جاري المعاينة...' : 'معاينة الأثر'}
              </Button>
              <Button variant="primary" onClick={applyPricingWave} disabled={!canManagePricingCenter || applyMutation.isPending || !summary?.affectedCount}>
                {applyMutation.isPending ? 'جاري الاعتماد...' : 'اعتماد الموجة'}
              </Button>
            </div>
          )}
        />

        {/* Top 4 KPI Metrics */}
        <StatsGrid items={stats} />

        {statusMessage ? (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '0.86rem',
              fontWeight: 600,
            }}
          >
            {statusMessage}
          </div>
        ) : null}

        {/* Main 2-Column Work Area */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
          
          {/* Right Column: Target Scope & Pricing Formula */}
          <div className="page-stack" style={{ gap: '16px' }}>
            <FormSection
              title="نطاق التطبيق ومعادلة التسعير"
              description="حدد المورد أو القسم المراد تعديل أسعاره، ثم اختر نوع ونسبة التعديل."
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. Target Scope Filters */}
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    ١. نطاق الأصناف المستهدفة
                  </div>
                  <div className="form-grid compact-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <Field label="المورد">
                      <select
                        value={payload.filters.supplierId || ''}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, supplierId: event.target.value ? Number(event.target.value) : undefined } }))}
                      >
                        <option value="">كل الموردين</option>
                        {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                      </select>
                    </Field>
                    <Field label="القسم">
                      <select
                        value={payload.filters.categoryId || ''}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, categoryId: event.target.value ? Number(event.target.value) : undefined } }))}
                      >
                        <option value="">كل الأقسام</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </Field>
                    <Field label="نوع الصنف">
                      <select
                        value={payload.filters.itemKind || ''}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, itemKind: event.target.value ? event.target.value as 'standard' | 'fashion' : undefined } }))}
                      >
                        <option value="">الكل</option>
                        <option value="standard">عادي</option>
                        <option value="fashion">ملابس</option>
                      </select>
                    </Field>
                    <Field label="كود الموديل / المجموعة">
                      <input
                        value={payload.filters.styleCode || ''}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, styleCode: event.target.value } }))}
                        placeholder="مثل STYLE-100"
                      />
                    </Field>
                    <Field label="بحث سريع">
                      <input
                        value={payload.filters.q || ''}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, q: event.target.value } }))}
                        placeholder="اسم أو باركود الصنف"
                      />
                    </Field>
                  </div>
                </div>

                {/* 2. Pricing Formula & Targets */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    ٢. معادلة التسعير والأسعار المستهدفة
                  </div>
                  <div className="form-grid compact-form-grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <Field label="نوع العملية">
                      <select
                        value={payload.operation.type}
                        onChange={(event) => setPayload((current) => ({ ...current, operation: { ...current.operation, type: event.target.value as PricingOperationType } }))}
                      >
                        <option value="percent_increase">زيادة نسبة (%)</option>
                        <option value="percent_decrease">خفض نسبة (%)</option>
                        <option value="fixed_increase">زيادة مبلغ ثابت</option>
                        <option value="fixed_decrease">خفض مبلغ ثابت</option>
                        <option value="set_price">تثبيت سعر مباشر</option>
                        <option value="margin_from_cost">هامش ربح من سعر الشراء</option>
                      </select>
                    </Field>
                    <Field label="القيمة">
                      <input
                        type="number"
                        step="0.01"
                        value={payload.operation.value}
                        onChange={(event) => setPayload((current) => ({ ...current, operation: { ...current.operation, value: Number(event.target.value || 0) } }))}
                      />
                    </Field>
                    <Field label="قاعدة التقريب">
                      <select
                        value={payload.rounding.mode}
                        onChange={(event) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, mode: event.target.value as PricingRoundingMode } }))}
                      >
                        <option value="none">بدون تقريب</option>
                        <option value="nearest">لأقرب قيمة</option>
                        <option value="ending">نهاية سعر (كسور تسويقية)</option>
                      </select>
                    </Field>
                  </div>

                  {payload.rounding.mode === 'nearest' && (
                    <div style={{ marginBottom: '10px', maxWidth: '200px' }}>
                      <Field label="أقرب قيمة">
                        <input
                          type="number"
                          step="0.01"
                          value={payload.rounding.nearestStep || 0.5}
                          onChange={(event) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, nearestStep: Number(event.target.value || 0.5) } }))}
                        />
                      </Field>
                    </div>
                  )}

                  {payload.rounding.mode === 'ending' && (
                    <div style={{ marginBottom: '10px', maxWidth: '200px' }}>
                      <Field label="نهاية السعر">
                        <select
                          value={payload.rounding.ending || 95}
                          onChange={(event) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, ending: Number(event.target.value || 95) } }))}
                        >
                          <option value={95}>.95</option>
                          <option value={99}>.99</option>
                          <option value={50}>.50</option>
                        </select>
                      </Field>
                    </div>
                  )}

                  {/* Target Prices Selection */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>تطبيق التعديل على:</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', background: payload.targets.includes('retail') ? '#eff6ff' : '#ffffff', border: payload.targets.includes('retail') ? '1px solid #93c5fd' : '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '6px' }}>
                      <input
                        type="checkbox"
                        checked={payload.targets.includes('retail')}
                        onChange={(event) => setPayload((current) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'retail'])) : current.targets.filter((entry) => entry !== 'retail') }))}
                      />
                      <span>سعر القطاعي</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', background: payload.targets.includes('wholesale') ? '#eff6ff' : '#ffffff', border: payload.targets.includes('wholesale') ? '1px solid #93c5fd' : '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '6px' }}>
                      <input
                        type="checkbox"
                        checked={payload.targets.includes('wholesale')}
                        onChange={(event) => setPayload((current) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'wholesale'])) : current.targets.filter((entry) => entry !== 'wholesale') }))}
                      />
                      <span>سعر الجملة</span>
                    </label>
                  </div>
                </div>

                {/* 3. Rules & Exceptions */}
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    ٣. قواعد الاستثناء والتوسيع
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(payload.filters.activeOnly)}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, activeOnly: event.target.checked } }))}
                      />
                      <span>الأصناف النشطة فقط</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(payload.filters.inStockOnly)}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, inStockOnly: event.target.checked } }))}
                      />
                      <span>الأصناف المتوفرة بالمخزون فقط</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.applyToWholeStyleCode}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToWholeStyleCode: event.target.checked } }))}
                      />
                      <span>ربط ألوان ومقاسات نفس الموديل</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.skipActiveOffers}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipActiveOffers: event.target.checked } }))}
                      />
                      <span>تخطّي الأصناف التي عليها عروض</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.skipCustomerPrices}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipCustomerPrices: event.target.checked } }))}
                      />
                      <span>تخطّي أسعار العملاء الخاصة</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.skipManualExceptions}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipManualExceptions: event.target.checked } }))}
                      />
                      <span>تخطّي الاستثناءات اليدوية</span>
                    </label>
                  </div>
                </div>

              </div>
            </FormSection>
          </div>

          {/* Left Column: Comprehensive Financial Preview Summary Card */}
          <div>
            <FormSection
              title="ملخص الأثر المالي والمعاينة"
              description="مقارنة فورية لقيمة المخزون وهامش الربح قبل وبعد تطبيق الموجة."
              actions={summary?.affectedCount ? <span className="nav-pill">{summary.affectedCount} صنف سيتأثر</span> : undefined}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* 1. Inventory Value Comparative Card */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>قيمة المخزون الإجمالية (بسعر البيع)</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{formatCurrency(invBefore)}</span>
                      <span style={{ color: '#94a3b8' }}>➔</span>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{formatCurrency(invAfter)}</strong>
                    </div>
                    {invDiff !== 0 && (
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: invDiff > 0 ? '#f0fdf4' : '#fef2f2', color: invDiff > 0 ? '#16a34a' : '#dc2626', border: invDiff > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                        {invDiff > 0 ? `+${formatCurrency(invDiff)}` : formatCurrency(invDiff)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Profit Margin Comparative Card */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>هامش الربح الإجمالي للمخزون</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{formatCurrency(marginBefore)}</span>
                      <span style={{ color: '#94a3b8' }}>➔</span>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{formatCurrency(marginAfter)}</strong>
                    </div>
                    {marginDiff !== 0 && (
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: marginDiff > 0 ? '#f0fdf4' : '#fef2f2', color: marginDiff > 0 ? '#16a34a' : '#dc2626', border: marginDiff > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                        {marginDiff > 0 ? `+${formatCurrency(marginDiff)}` : formatCurrency(marginDiff)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Below Cost Safety Indicator */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: (summary?.belowCostCount || 0) > 0 ? '#fffbeb' : '#f0fdf4',
                    border: (summary?.belowCostCount || 0) > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: (summary?.belowCostCount || 0) > 0 ? '#92400e' : '#166534' }}>
                    {(summary?.belowCostCount || 0) > 0
                      ? `⚠️ يوجد ${summary?.belowCostCount} صنف سينخفض سعرها عن الشراء!`
                      : '✅ جميع الأسعار المعدلة أعلى من سعر التكلفة'}
                  </span>
                </div>

                {/* 4. Action CTA Card */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    المعاينة تتيح لك مراجعة جميع التغييرات في الجدول أدناه قبل حفظها فعلياً في النظام.
                  </p>
                  <Button
                    onClick={runPreview}
                    disabled={previewMutation.isPending}
                    style={{ width: '100%' }}
                  >
                    {previewMutation.isPending ? 'جاري الحساب...' : '🔄 تحديث المعاينة الآن'}
                  </Button>
                </div>

              </div>
            </FormSection>
          </div>
        </div>

        {/* Bottom Section 1: Preview Results Table */}
        <FormSection
          title="نتائج المعاينة التفصيلية"
          description="تفاصيل الأسعار قبل وبعد والاستثناءات لكل صنف مشمول في النطاق."
          actions={previewRows.length ? <span className="nav-pill">{previewRows.length} صنف</span> : undefined}
        >
          <DataTable
            density="compact"
            rows={previewRows}
            rowKey={(row) => String(row.productId)}
            columns={[
              {
                key: 'name',
                header: 'الصنف والباركود',
                cell: (row) => (
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{row.name}</strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{row.barcode || '—'}</div>
                  </div>
                ),
              },
              {
                key: 'kind',
                header: 'النوع',
                cell: (row) => (
                  <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                    {row.itemKind === 'fashion' ? `ملابس${row.styleCode ? ` / ${row.styleCode}` : ''}` : 'عادي'}
                  </span>
                ),
              },
              {
                key: 'stock',
                header: 'المخزون',
                cell: (row) => <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{row.stockQty}</span>,
              },
              {
                key: 'retail',
                header: 'قطاعي (قبل ➔ بعد)',
                cell: (row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b' }}>{formatCurrency(row.retailPriceBefore)}</span>
                    <span style={{ color: '#94a3b8' }}>➔</span>
                    <strong style={{ color: row.retailPriceAfter !== row.retailPriceBefore ? '#2563eb' : '#0f172a', fontWeight: 800 }}>
                      {formatCurrency(row.retailPriceAfter)}
                    </strong>
                  </div>
                ),
              },
              {
                key: 'wholesale',
                header: 'جملة (قبل ➔ بعد)',
                cell: (row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b' }}>{formatCurrency(row.wholesalePriceBefore)}</span>
                    <span style={{ color: '#94a3b8' }}>➔</span>
                    <strong style={{ color: row.wholesalePriceAfter !== row.wholesalePriceBefore ? '#2563eb' : '#0f172a', fontWeight: 800 }}>
                      {formatCurrency(row.wholesalePriceAfter)}
                    </strong>
                  </div>
                ),
              },
              {
                key: 'flags',
                header: 'تنبيهات',
                cell: (row) => {
                  const flags = [
                    row.hasActiveOffer ? 'عرض' : '',
                    row.hasCustomerPrice ? 'سعر خاص' : '',
                    row.belowCostAfter ? 'أقل من الشراء' : '',
                  ].filter(Boolean);

                  if (!flags.length) return <span style={{ color: '#94a3b8' }}>—</span>;

                  return (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {flags.map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: f === 'أقل من الشراء' ? '#fee2e2' : '#fef3c7',
                            color: f === 'أقل من الشراء' ? '#b91c1c' : '#92400e',
                            border: f === 'أقل من الشراء' ? '1px solid #fecaca' : '1px solid #fde68a',
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  );
                },
              },
              {
                key: 'status',
                header: 'الحالة',
                cell: (row) => {
                  if (row.skipped) {
                    return (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '999px', border: '1px solid #fde68a' }}>
                        مستثنى ({row.skipReasons.join(' + ')})
                      </span>
                    );
                  }
                  if (row.changed) {
                    return (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '999px', border: '1px solid #bbf7d0' }}>
                        سيتغير
                      </span>
                    );
                  }
                  return (
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      بدون تغيير
                    </span>
                  );
                },
              },
            ]}
            empty={(
              <div className="empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  لا توجد نتائج معاينة بعد. حدد النطاق واضغط على زر <strong>“معاينة الأثر”</strong>.
                </p>
              </div>
            )}
          />
        </FormSection>

        {/* Bottom Section 2: History of Applied Pricing Waves */}
        <FormSection
          title="سجل موجات التسعير السابقة"
          description="سجل العمليات السابقة مع إمكانية التراجع الفوري عن آخر موجة مطبقة."
        >
          <DataTable
            density="compact"
            rows={runs}
            rowKey={(row) => String(row.id)}
            columns={[
              { key: 'id', header: '#', cell: (row) => <strong style={{ color: '#0f172a' }}>{row.id}</strong> },
              { key: 'createdAt', header: 'وقت التنفيذ', cell: (row) => formatDate(row.createdAt) },
              { key: 'createdBy', header: 'بواسطة', cell: (row) => <span style={{ fontSize: '0.8rem', color: '#334155' }}>{row.createdBy}</span> },
              { key: 'summary', header: 'الملخص', cell: (row) => summarizeRun(row) },
              { key: 'affected', header: 'الأصناف المتأثرة', cell: (row) => <span style={{ fontWeight: 700 }}>{row.affectedCount} صنف</span> },
              {
                key: 'status',
                header: 'الحالة',
                cell: (row) => (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: row.status === 'undone' ? '#f1f5f9' : '#f0fdf4',
                      color: row.status === 'undone' ? '#64748b' : '#16a34a',
                      border: row.status === 'undone' ? '1px solid #cbd5e1' : '1px solid #bbf7d0',
                    }}
                  >
                    {row.status === 'undone' ? `تم التراجع ${row.undoneAt ? `(${formatDate(String(row.undoneAt))})` : ''}` : 'مطبقة'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => (
                  <Button
                    variant="secondary"
                    onClick={() => undoPricingRun(row.id)}
                    disabled={!canManagePricingCenter || !row.canUndo || undoMutation.isPending}
                  >
                    تراجع
                  </Button>
                ),
              },
            ]}
            empty={(
              <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>لا توجد موجات تسعير مسجلة بعد.</p>
              </div>
            )}
          />
        </FormSection>
      </main>
    </div>
  );
}
