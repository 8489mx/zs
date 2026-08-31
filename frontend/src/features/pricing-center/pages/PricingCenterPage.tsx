import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { AlertTriangleIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
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

  const matchedTotal = summary?.matchedCount || 0;
  const affectedTotal = summary?.affectedCount || 0;
  const skippedTotal = (summary?.skippedOfferCount || 0) + (summary?.skippedCustomerPriceCount || 0) + (summary?.skippedManualExceptionCount || 0);

  return (
    <div className="page-stack page-shell pricing-center-page" dir="rtl">
      <main className="document-prototype-column" style={{ maxWidth: '1280px', paddingBottom: '60px' }}>
        <PageHeader
          title="مركز التسعير الجماعي"
          badge={<span className="nav-pill">تعديل الأسعار</span>}
          actions={(
            <div className="actions compact-actions pricing-center-header-actions">
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

        {/* Top 4 Clean KPI Metric Bar */}
        <div className="pricing-center-stats-grid">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="pricing-center-stat-card"
            >
              <span className="pricing-center-stat-label">{stat.label}</span>
              <strong className="pricing-center-stat-val">{stat.value}</strong>
            </div>
          ))}
        </div>

        {statusMessage ? (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {statusMessage}
          </div>
        ) : null}

        {/* Main 2-Column Work Area with Equal Height Stretch */}
        <div className="pricing-center-top-grid">
          
          {/* Right Column: Pricing Setup (Equal Height) */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FormSection title="نطاق التطبيق ومعادلة التسعير" className="h-full" bodyClassName="flex-1 flex flex-col justify-between">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'space-between' }}>
                
                {/* 1. Target Scope: 5 Equal Width Columns */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    ١. نطاق الأصناف المستهدفة
                  </div>
                  <div className="pricing-center-scope-grid">
                    <Field label="المورد">
                      <CustomSelect
                        value={payload.filters.supplierId || ''}
                        onChange={(val) => setPayload((current) => ({ ...current, filters: { ...current.filters, supplierId: val ? Number(val) : undefined } }))}
                        options={[
                          { value: '', label: 'كل الموردين' },
                          ...suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
                        ]}
                      />
                    </Field>
                    <Field label="القسم">
                      <CustomSelect
                        value={payload.filters.categoryId || ''}
                        onChange={(val) => setPayload((current) => ({ ...current, filters: { ...current.filters, categoryId: val ? Number(val) : undefined } }))}
                        options={[
                          { value: '', label: 'كل الأقسام' },
                          ...categories.map((category) => ({ value: String(category.id), label: category.name })),
                        ]}
                      />
                    </Field>
                    <Field label="نوع الصنف">
                      <CustomSelect
                        value={payload.filters.itemKind || ''}
                        onChange={(val) => setPayload((current) => ({ ...current, filters: { ...current.filters, itemKind: val ? (val as 'standard' | 'fashion') : undefined } }))}
                        options={[
                          { value: '', label: 'الكل' },
                          { value: 'standard', label: 'عادي' },
                          { value: 'fashion', label: 'ملابس' },
                        ]}
                      />
                    </Field>
                    <Field label="كود الموديل">
                      <input
                        value={payload.filters.styleCode || ''}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, styleCode: event.target.value } }))}
                        placeholder="STYLE-100"
                        style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </Field>
                    <Field label="بحث سريع">
                      <input
                        value={payload.filters.q || ''}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, q: event.target.value } }))}
                        placeholder="اسم أو باركود..."
                        style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </Field>
                  </div>
                </div>

                {/* 2. Pricing Formula & Targets: Compact Single Row */}
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    ٢. معادلة التسعير والأسعار المستهدفة
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1.4 1 140px' }}>
                      <Field label="نوع العملية">
                        <CustomSelect
                          value={payload.operation.type}
                          onChange={(val) => setPayload((current) => ({ ...current, operation: { ...current.operation, type: val as PricingOperationType } }))}
                          options={[
                            { value: 'percent_increase', label: 'زيادة نسبة (%)' },
                            { value: 'percent_decrease', label: 'خفض نسبة (%)' },
                            { value: 'fixed_increase', label: 'زيادة مبلغ ثابت' },
                            { value: 'fixed_decrease', label: 'خفض مبلغ ثابت' },
                            { value: 'set_price', label: 'تثبيت سعر مباشر' },
                            { value: 'margin_from_cost', label: 'هامش ربح من الشراء' },
                          ]}
                        />
                      </Field>
                    </div>

                    <div style={{ width: '85px', flexShrink: 0 }}>
                      <Field label="القيمة">
                        <input
                          type="number"
                          step="0.01"
                          value={payload.operation.value}
                          onChange={(event) => setPayload((current) => ({ ...current, operation: { ...current.operation, value: Number(event.target.value || 0) } }))}
                          style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                      </Field>
                    </div>

                    <div style={{ flex: '1.2 1 120px' }}>
                      <Field label="قاعدة التقريب">
                        <CustomSelect
                          value={payload.rounding.mode}
                          onChange={(val) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, mode: val as PricingRoundingMode } }))}
                          options={[
                            { value: 'none', label: 'بدون تقريب' },
                            { value: 'nearest', label: 'لأقرب قيمة' },
                            { value: 'ending', label: 'كسور تسويقية' },
                          ]}
                        />
                      </Field>
                    </div>

                    {payload.rounding.mode === 'nearest' && (
                      <div style={{ width: '75px', flexShrink: 0 }}>
                        <Field label="التقريب">
                          <input
                            type="number"
                            step="0.01"
                            value={payload.rounding.nearestStep || 0.5}
                            onChange={(event) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, nearestStep: Number(event.target.value || 0.5) } }))}
                            style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                          />
                        </Field>
                      </div>
                    )}

                    {payload.rounding.mode === 'ending' && (
                      <div style={{ width: '75px', flexShrink: 0 }}>
                        <Field label="النهاية">
                          <CustomSelect
                            value={payload.rounding.ending || 95}
                            onChange={(val) => setPayload((current) => ({ ...current, rounding: { ...current.rounding, ending: Number(val || 95) } }))}
                            options={[
                              { value: '95', label: '.95' },
                              { value: '99', label: '.99' },
                              { value: '50', label: '.50' },
                            ]}
                          />
                        </Field>
                      </div>
                    )}


                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '34px', paddingInlineStart: '4px' }}>
                      <span style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 600 }}>تطبيق على:</span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.78rem', color: '#0f172a', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={payload.targets.includes('retail')}
                          onChange={(event) => setPayload((current) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'retail'])) : current.targets.filter((entry) => entry !== 'retail') }))}
                          style={{ width: '15px', height: '15px' }}
                        />
                        <span>القطاعي</span>
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.78rem', color: '#0f172a', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={payload.targets.includes('wholesale')}
                          onChange={(event) => setPayload((current) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'wholesale'])) : current.targets.filter((entry) => entry !== 'wholesale') }))}
                          style={{ width: '15px', height: '15px' }}
                        />
                        <span>الجملة</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Rules & Exceptions: Clean 3-Column Grid with Clear Legible Font */}
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    ٣. قواعد الاستثناء والتوسيع
                  </div>
                  <div className="pricing-center-rules-grid">
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(payload.filters.activeOnly)}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, activeOnly: event.target.checked } }))}
                        style={{ width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span>الأصناف النشطة فقط</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(payload.filters.inStockOnly)}
                        onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, inStockOnly: event.target.checked } }))}
                        style={{ width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span>المتوفرة بالمخزن فقط</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.applyToWholeStyleCode}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToWholeStyleCode: event.target.checked } }))}
                        style={{ width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span>ربط ألوان ومقاسات الموديل</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.skipActiveOffers}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipActiveOffers: event.target.checked } }))}
                        style={{ width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span>تخطي الأصناف التي عليها عروض</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.skipCustomerPrices}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipCustomerPrices: event.target.checked } }))}
                        style={{ width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span>تخطي أسعار العملاء الخاصة</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={payload.options.skipManualExceptions}
                        onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipManualExceptions: event.target.checked } }))}
                        style={{ width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span>تخطي الاستثناءات اليدوية</span>
                    </label>
                  </div>
                </div>

              </div>
            </FormSection>
          </div>

          {/* Left Column: Full-Height Clean Financial Impact Summary Card */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FormSection
              title="ملخص الأثر المالي والمعاينة"
              className="h-full"
              bodyClassName="flex-1 flex flex-col justify-between"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between' }}>
                
                {/* 1. Inventory Value Comparative Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>قيمة المخزون (بسعر البيع)</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{formatCurrency(invBefore)}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>➔</span>
                      <strong style={{ fontSize: '0.94rem', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(invAfter)}</strong>
                    </div>
                    {invDiff !== 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: invDiff > 0 ? '#f0fdf4' : '#fef2f2', color: invDiff > 0 ? '#16a34a' : '#dc2626', border: invDiff > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                        {invDiff > 0 ? `+${formatCurrency(invDiff)}` : formatCurrency(invDiff)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Profit Margin Comparative Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>هامش الربح الإجمالي للمخزون</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{formatCurrency(marginBefore)}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>➔</span>
                      <strong style={{ fontSize: '0.94rem', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(marginAfter)}</strong>
                    </div>
                    {marginDiff !== 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: marginDiff > 0 ? '#f0fdf4' : '#fef2f2', color: marginDiff > 0 ? '#16a34a' : '#dc2626', border: marginDiff > 0 ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                        {marginDiff > 0 ? `+${formatCurrency(marginDiff)}` : formatCurrency(marginDiff)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Direct Impact Breakdown (Newly added useful breakdown) */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>تفصيل نطاق الأصناف المتأثرة</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                    <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>المشمول</div>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>{matchedTotal}</strong>
                    </div>
                    <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>سيتأثر</div>
                      <strong style={{ fontSize: '0.92rem', color: '#16a34a', fontWeight: 700 }}>{affectedTotal}</strong>
                    </div>
                    <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#b45309' }}>مستثنى</div>
                      <strong style={{ fontSize: '0.92rem', color: '#b45309', fontWeight: 700 }}>{skippedTotal}</strong>
                    </div>
                  </div>
                </div>

                {/* 4. Cost Safety Indicator (Only shows after running a preview) */}
                {summary ? (
                  <div
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: summary.belowCostCount > 0 ? '#fffbeb' : '#f0fdf4',
                      border: summary.belowCostCount > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: summary.belowCostCount > 0 ? '#92400e' : '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {summary.belowCostCount > 0 ? (
                        <>
                          <AlertTriangleIcon size={14} color="#d97706" />
                          <span>{summary.belowCostCount} صنف سينخفض عن سعر الشراء والتكلفة!</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon size={14} color="#16a34a" />
                          <span>جميع الأسعار المعدلة أعلى من سعر التكلفة</span>
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                      اضغط على تحديث المعاينة لاحتساب الأثر وفحص التكلفة
                    </span>
                  </div>
                )}

                {/* 5. Action CTA */}
                <Button
                  onClick={runPreview}
                  disabled={previewMutation.isPending}
                  style={{ width: '100%', minHeight: '38px', fontSize: '0.86rem', fontWeight: 700, marginTop: 'auto' }}
                >
                  {previewMutation.isPending ? 'جاري الحساب...' : 'تحديث المعاينة الآن'}
                </Button>

              </div>
            </FormSection>
          </div>
        </div>

        {/* Bottom Section 1: Preview Results Table */}
        <FormSection
          title="نتائج المعاينة التفصيلية"
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
                    <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>{row.name}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.barcode || '—'}</div>
                  </div>
                ),
              },
              {
                key: 'kind',
                header: 'النوع',
                cell: (row) => (
                  <span style={{ fontSize: '0.76rem', color: '#475569' }}>
                    {row.itemKind === 'fashion' ? `ملابس${row.styleCode ? ` / ${row.styleCode}` : ''}` : 'عادي'}
                  </span>
                ),
              },
              {
                key: 'stock',
                header: 'المخزون',
                cell: (row) => <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{row.stockQty}</span>,
              },
              {
                key: 'retail',
                header: 'قطاعي (قبل ➔ بعد)',
                cell: (row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
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
              <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
                  لا توجد نتائج معاينة بعد. حدد النطاق واضغط على زر <strong>“معاينة الأثر”</strong>.
                </p>
              </div>
            )}
          />
        </FormSection>

        {/* Bottom Section 2: History of Applied Pricing Waves */}
        <FormSection title="سجل موجات التسعير السابقة">
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
              <div className="empty-state" style={{ padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>لا توجد موجات تسعير مسجلة بعد.</p>
              </div>
            )}
          />
        </FormSection>
      </main>
    </div>
  );
}
