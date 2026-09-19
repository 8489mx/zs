import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { ContractingBoqItem, ContractingProject, ContractingSubcontract } from '../contracting.types';
import { getTextDirection } from '@/lib/arabic-normalization';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';

interface CreateIpcInvoiceModalProps {
  open: boolean;
  project: ContractingProject;
  initialIpcType?: 'client' | 'subcontractor';
  initialSubcontractId?: string;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

interface WorkingItem {
  boqItemId?: string;
  itemCode: string;
  description: string;
  unit: string;
  unitPrice: number;
  contractQty: number;
  previousQty: number;
  currentQty: number;
  storedMaterialsQty: number;
}

export function CreateIpcInvoiceModal({
  open,
  project,
  initialIpcType = 'client',
  initialSubcontractId,
  onClose,
  onCreated,
  onSuccess,
}: CreateIpcInvoiceModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const [ipcType, setIpcType] = useState<'client' | 'subcontractor'>(initialIpcType);
  const [subcontracts, setSubcontracts] = useState<ContractingSubcontract[]>([]);
  const [selectedSubcontractId, setSelectedSubcontractId] = useState<string>(initialSubcontractId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<WorkingItem[]>([]);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [enableAdvRecoveryOverride, setEnableAdvRecoveryOverride] = useState(false);
  const [advRecoveryPercent, setAdvRecoveryPercent] = useState('10');
  const [retentionPercent, setRetentionPercent] = useState(String(project.retentionPercent || 5));
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [notes, setNotes] = useState('');

  // Load BOQ items and subcontracts on open
  useEffect(() => {
    if (open) {
      setIpcType(initialIpcType);
      if (initialSubcontractId) {
        setSelectedSubcontractId(initialSubcontractId);
      }
      contractingApi.getBoqItems(project.id).then((boqs: ContractingBoqItem[]) => {
        const working = boqs.map((b: ContractingBoqItem) => ({
          boqItemId: b.id,
          itemCode: b.itemCode,
          description: b.description,
          unit: b.unit,
          unitPrice: Number(b.unitPrice),
          contractQty: Number(b.contractQty),
          previousQty: Number(b.executedQty || 0),
          currentQty: 0,
          storedMaterialsQty: 0,
        }));
        setItems(working);
      }).catch(() => {});

      contractingApi.getSubcontracts(project.id).then((subs) => {
        setSubcontracts(subs || []);
      }).catch(() => {});
    }
  }, [open, project.id, initialIpcType, initialSubcontractId]);

  // When a subcontract is selected, adjust retention percent if available
  const handleSubcontractSelect = (subId: string) => {
    setSelectedSubcontractId(subId);
    const found = subcontracts.find((s) => s.id === subId);
    if (found && found.retentionPercent !== undefined) {
      setRetentionPercent(String(found.retentionPercent));
    }
  };

  const selectedSubcontract = subcontracts.find((s) => s.id === selectedSubcontractId);

  const handleQtyChange = (index: number, field: 'currentQty' | 'storedMaterialsQty', val: string) => {
    const num = Math.max(0, Number(val || 0));
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: num };
      return copy;
    });
  };

  // Totals calculations
  let currentWorkTotal = 0;
  let storedMaterialsTotal = 0;
  let previousWorkTotal = 0;

  items.forEach((it) => {
    currentWorkTotal += it.currentQty * it.unitPrice;
    storedMaterialsTotal += it.storedMaterialsQty * it.unitPrice;
    previousWorkTotal += it.previousQty * it.unitPrice;
  });

  const periodGrossTotal = currentWorkTotal + storedMaterialsTotal;

  // Estimation preview for holdbacks
  let estimatedAdvDeduction = 0;
  if (enableAdvRecoveryOverride) {
    estimatedAdvDeduction = (currentWorkTotal * Number(advRecoveryPercent || 0)) / 100;
  } else {
    const advAmount = ipcType === 'subcontractor'
      ? Number(selectedSubcontract?.advanceAmount || 0)
      : Number(project.downPaymentAmount || 0);
    const totalVal = ipcType === 'subcontractor'
      ? Number(selectedSubcontract?.totalAmount || 0)
      : Number(project.contractValue || 0);
    const startPct = ipcType === 'subcontractor'
      ? Number(selectedSubcontract?.advanceRecoveryStartPct ?? 10)
      : 10;
    const endPct = ipcType === 'subcontractor'
      ? Number(selectedSubcontract?.advanceRecoveryEndPct ?? 80)
      : 80;

    if (advAmount > 0 && totalVal > 0 && endPct > startPct) {
      const cumWork = previousWorkTotal + currentWorkTotal;
      const prog = cumWork / totalVal;
      const factor = Math.min(1, Math.max(0, (prog - startPct / 100) / (endPct / 100 - startPct / 100)));
      estimatedAdvDeduction = Math.max(0, advAmount * factor);
    }
  }

  const retDeduction = (currentWorkTotal * Number(retentionPercent || 0)) / 100;
  const otherDed = Number(otherDeductions || 0);
  const netPayable = Math.max(0, periodGrossTotal - estimatedAdvDeduction - retDeduction - otherDed);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (ipcType === 'subcontractor' && !selectedSubcontractId) {
      setErrorMsg('يرجى اختيار عقد مقاولة الباطن التابع لهذا المستخلص');
      return;
    }
    if (periodGrossTotal <= 0) {
      setErrorMsg('يرجى إدخال كميات منفذة أو تشوينات في البنود لإصدار المستخلص');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createInvoice(project.id, {
        ipcType,
        subcontractId: ipcType === 'subcontractor' ? selectedSubcontractId : undefined,
        subcontractorId: ipcType === 'subcontractor' ? selectedSubcontract?.subcontractorId : undefined,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        advanceRecoveryOverride: enableAdvRecoveryOverride ? true : undefined,
        advanceRecoveryPercent: enableAdvRecoveryOverride ? Number(advRecoveryPercent || 0) : undefined,
        retentionPercent: Number(retentionPercent || 5),
        otherDeductions: otherDed,
        notes: notes.trim() || undefined,
        items: items
          .filter((it) => it.currentQty > 0 || it.storedMaterialsQty > 0 || it.previousQty > 0)
          .map((it) => ({
            boqItemId: it.boqItemId,
            description: it.description,
            unit: it.unit,
            unitPrice: it.unitPrice,
            previousQty: it.previousQty,
            currentQty: it.currentQty,
            storedMaterialsQty: it.storedMaterialsQty,
          })),
      });
      toast.success(
        ipcType === 'subcontractor'
          ? 'تم إصدار مستخلص مقاول الباطن بنجاح'
          : 'تم إصدار مستخلص العميل بنجاح',
      );
      onCreated?.();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء إنشاء المستخلص');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`إعداد مستخلص جاري للأعمال (AIA G702/G703) - ${project.name}`}
      subtitle="حصر الكميات الحالية، احتساب تشوينات المواد بالموقع، وخصم الدفعة المقدمة وضمان حسن التنفيذ"
      width="min(1240px, 98vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخلص ومراجعة البنود'}
          isSubmitting={isSubmitting}
        />
      )}
    >
      <style>{`
        .ipc-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .ipc-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .ipc-compact-modal input {
          height: 32px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 10px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          outline: none !important;
          width: 100% !important;
          transition: border-color 0.15s, box-shadow 0.15s !important;
        }
        .ipc-compact-modal input:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
        }
        .ipc-compact-modal .table-qty-input {
          height: 28px !important;
          padding: 0 6px !important;
          font-size: 0.78rem !important;
          border-radius: 5px !important;
          text-align: center !important;
          width: 100% !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="ipc-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* نوع المستخلص (عميل مقابل مقاول باطن) */}
        <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIpcType('client')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              background: ipcType === 'client' ? '#170e5e' : 'transparent',
              color: ipcType === 'client' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            مستخلص المالك / العميل (إيراد معتمد)
          </button>
          <button
            type="button"
            onClick={() => setIpcType('subcontractor')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              background: ipcType === 'subcontractor' ? '#170e5e' : 'transparent',
              color: ipcType === 'subcontractor' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            مستخلص مقاول باطن (تكلفة ومستحق مورد)
          </button>
        </div>

        {/* تفاصيل مقاول الباطن عند اختيار مستخلص مقاول باطن */}
        {ipcType === 'subcontractor' && (
          <div style={{ background: '#f0f9ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#0369a1', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Building size={15} />
              <span>تحديد عقد مقاول الباطن التابع للمشروع</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
              <Field label="عقد مقاول الباطن *">
                <CustomSelect
                  value={selectedSubcontractId}
                  onChange={handleSubcontractSelect}
                  placeholder="اختر عقد مقاولة الباطن..."
                  options={subcontracts.map((sub) => ({
                    value: sub.id,
                    label: `${sub.contractNumber} - ${sub.subcontractorName || 'مقاول باطن'} (${sub.scopeOfWork.slice(0, 30)}...)`,
                  }))}
                />
              </Field>

              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>قيمة العقد الإجمالية:</span>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                  {selectedSubcontract ? Number(selectedSubcontract.totalAmount || 0).toLocaleString('ar-EG') : '—'} {currencySymbol}
                </strong>
              </div>

              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>المتبقي من الالتزام:</span>
                <strong style={{ fontSize: '0.82rem', color: '#15803d' }}>
                  {selectedSubcontract && selectedSubcontract.remainingCommitment !== undefined
                    ? Number(selectedSubcontract.remainingCommitment).toLocaleString('ar-EG')
                    : '—'} {currencySymbol}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* 1. فترة المستخلص ونسب الاستقطاع */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calendar size={15} />
            <span>1. فترة المستخلص ونسب الاستقطاع التعاقدي (Billing Period & Retentions)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.6fr 1fr', gap: '10px', alignItems: 'start' }}>
            <Field label="عن الفترة من">
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </Field>

            <Field label="إلى تاريخ">
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </Field>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155' }}>
                  استرداد الدفعة المقدمة
                </span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#170e5e', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enableAdvRecoveryOverride}
                    onChange={(e) => setEnableAdvRecoveryOverride(e.target.checked)}
                    style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                  />
                  <span>تجاوز يدوي</span>
                </label>
              </div>
              {enableAdvRecoveryOverride ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  dir="ltr"
                  value={advRecoveryPercent}
                  onChange={(e) => setAdvRecoveryPercent(e.target.value)}
                  placeholder="نسبة يدوية %"
                  style={{ fontWeight: 600, borderColor: '#170e5e' }}
                />
              ) : (
                <div style={{
                  height: '33px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  background: '#f1f5f9',
                  border: '1px dashed #94a3b8',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  color: '#475569',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }} title="يُحسب آلياً وفق نافذة العقد التعاقدية (Bounded Window)">
                  آلياً وفق نافذة العقد التعاقدية
                </div>
              )}
            </div>

            <Field label="استقطاع ضمان أعمال %">
              <input
                type="number"
                min="0"
                max="20"
                dir="ltr"
                value={retentionPercent}
                onChange={(e) => setRetentionPercent(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </Field>
          </div>
        </div>

        {/* 2. جدول حصر كميات الإنجاز والتشوينات */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.FileText size={15} />
              <span>2. حصر كميات الإنجاز والتشوينات بالموقع (Schedule of Values - SOV)</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              عدد البنود: {items.length} بند مقايسة
            </span>
          </div>

          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: '280px',
              background: '#ffffff',
              width: '100%',
              minWidth: 0,
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '1040px',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                fontSize: '0.78rem',
              }}
            >
              <colgroup>
                <col style={{ width: '80px' }} />  {/* كود */}
                <col style={{ width: '320px' }} /> {/* بند المقايسة */}
                <col style={{ width: '60px' }} />  {/* الوحدة */}
                <col style={{ width: '85px' }} />  {/* الفئة */}
                <col style={{ width: '80px' }} />  {/* التعاقدي */}
                <col style={{ width: '80px' }} />  {/* السابق */}
                <col style={{ width: '95px' }} />  {/* الحالي */}
                <col style={{ width: '95px' }} />  {/* تشوينات */}
                <col style={{ width: '125px' }} /> {/* إجمالي الفترة */}
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>كود</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>بيان بند المقايسة</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>الوحدة</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>الفئة ({currencySymbol})</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>التعاقدي</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>المنفذ سابقاً</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#170e5e', backgroundColor: '#e0e7ff' }}>كمية الحالي *</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#0369a1', backgroundColor: '#e0f2fe' }}>تشوينات موقع</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>إجمالي المستحق</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '0.84rem' }}>
                      لا توجد بنود مقايسة مسجلة في هذا المشروع حتى الآن
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const itemPeriodSum = (it.currentQty + it.storedMaterialsQty) * it.unitPrice;
                    const dir = getTextDirection(it.description);
                    const isRtl = dir === 'rtl';

                    return (
                      <tr
                        key={it.boqItemId || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '6px 10px', fontWeight: 700, fontFamily: 'monospace', color: '#170e5e', textAlign: 'center', verticalAlign: 'middle' }}>
                          {it.itemCode}
                        </td>
                        <td
                          dir={dir}
                          style={{
                            padding: '6px 10px',
                            textAlign: isRtl ? 'justify' : 'left',
                            textJustify: isRtl ? 'inter-word' : undefined,
                            textAlignLast: isRtl ? 'right' : 'left',
                            direction: dir,
                            fontSize: '0.76rem',
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                            whiteSpace: 'normal',
                            verticalAlign: 'middle',
                            color: '#1e293b',
                          }}
                          title={it.description}
                        >
                          <div
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.4,
                              maxHeight: '2.8em',
                            }}
                          >
                            {it.description}
                          </div>
                        </td>
                        <td style={{ padding: '6px 6px', color: '#64748b', textAlign: 'center', verticalAlign: 'middle' }}>
                          {it.unit}
                        </td>
                        <td style={{ padding: '6px 6px', fontFamily: 'monospace', textAlign: 'center', fontWeight: 600, verticalAlign: 'middle' }}>
                          {it.unitPrice.toLocaleString('ar-EG')}
                        </td>
                        <td style={{ padding: '6px 6px', color: '#64748b', textAlign: 'center', verticalAlign: 'middle' }}>
                          {it.contractQty}
                        </td>
                        <td style={{ padding: '6px 6px', color: '#64748b', textAlign: 'center', verticalAlign: 'middle' }}>
                          {it.previousQty}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            dir="ltr"
                            value={it.currentQty || ''}
                            onChange={(e) => handleQtyChange(idx, 'currentQty', e.target.value)}
                            placeholder="0"
                            className="table-qty-input"
                            style={{ fontWeight: 700, borderColor: it.currentQty > 0 ? '#170e5e' : '#cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            dir="ltr"
                            value={it.storedMaterialsQty || ''}
                            onChange={(e) => handleQtyChange(idx, 'storedMaterialsQty', e.target.value)}
                            placeholder="0"
                            className="table-qty-input"
                            style={{ borderColor: it.storedMaterialsQty > 0 ? '#0284c7' : '#cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: itemPeriodSum > 0 ? '#170e5e' : '#94a3b8', textAlign: 'center', verticalAlign: 'middle' }}>
                          {itemPeriodSum > 0 ? itemPeriodSum.toLocaleString('ar-EG') : '—'} {itemPeriodSum > 0 ? currencySymbol : ''}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. التسوية المالية وصافي المستحق */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calculator size={15} />
            <span>3. التسوية المالية وصافي المستحق للصرف (Financial Settlement)</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '8px 12px',
              textAlign: 'center',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>إجمالي أعمال الفترة:</span>
              <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                {periodGrossTotal.toLocaleString('ar-EG')} {currencySymbol}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>استقطاع دفعة مقدمة:</span>
              <span style={{ fontSize: '0.84rem', color: estimatedAdvDeduction > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                {estimatedAdvDeduction > 0 ? `- ${estimatedAdvDeduction.toLocaleString('ar-EG')}` : '0'} {currencySymbol}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>ضمان حسن تنفيذ:</span>
              <span style={{ fontSize: '0.84rem', color: retDeduction > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                {retDeduction > 0 ? `- ${retDeduction.toLocaleString('ar-EG')}` : '0'} {currencySymbol}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>استقطاعات أخرى:</span>
              <input
                type="number"
                min="0"
                dir="ltr"
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(e.target.value)}
                className="table-qty-input"
                style={{ height: '28px', width: '80px', margin: '0 auto', display: 'block' }}
              />
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '0.72rem', color: '#166534', display: 'block', fontWeight: 700 }}>صافي المستحق للصرف:</span>
              <strong style={{ fontSize: '1rem', color: '#15803d', fontWeight: 800 }}>
                {netPayable.toLocaleString('ar-EG')} {currencySymbol}
              </strong>
            </div>
          </div>
        </div>

        {/* 4. الاعتمادات والملاحظات */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Tag size={14} />
            <span>4. الاعتمادات والملاحظات الاستشارية (Consultant Notes & Approvals)</span>
          </div>

          <Field label="ملاحظات واستدراكات المستخلص (اختياري)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات مهندس الموقع أو الاستشاري على قياسات الأعمال المنجزة..."
            />
          </Field>
        </div>
      </form>
    </StandardDialog>
  );
}
