import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { maritimeApi, MaritimeCustomsDeclaration, MaritimeCustomsDeclarationItem } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';

interface CustomsDeclarationModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobNumber?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'قيد الإعداد' },
  submitted: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'مُقدَّم للجمارك' },
  cleared: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'تم التخليص' },
  held: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'محجوز جمركياً' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'مرفوض' },
};

export function CustomsDeclarationModal({ open, onClose, jobId, jobNumber }: CustomsDeclarationModalProps) {
  const [declarations, setDeclarations] = useState<MaritimeCustomsDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detail, setDetail] = useState<{ declaration: MaritimeCustomsDeclaration; items: MaritimeCustomsDeclarationItem[] } | null>(null);

  const [declarationType, setDeclarationType] = useState<'import' | 'export'>('import');
  const [customsAuthority, setCustomsAuthority] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [hsCode, setHsCode] = useState('');
  const [commodityDescription, setCommodityDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('PCS');
  const [customsValue, setCustomsValue] = useState<number>(0);
  const [dutyRatePercent, setDutyRatePercent] = useState<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await maritimeApi.listCustomsDeclarations(jobId);
      setDeclarations(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل البيانات الجمركية');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const openDetail = async (id: string) => {
    try {
      const d = await maritimeApi.getCustomsDeclarationDetail(id);
      setDetail(d);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تفاصيل البيان الجمركي');
    }
  };

  const handleCreateDeclaration = async () => {
    try {
      setIsSubmitting(true);
      const result = await maritimeApi.createCustomsDeclaration(jobId, {
        declarationType,
        customsAuthority: customsAuthority.trim() || undefined,
        brokerName: brokerName.trim() || undefined,
        currency,
      });
      toast.success('تم إنشاء بيان جمركي جديد');
      setCustomsAuthority('');
      setBrokerName('');
      await loadData();
      setDetail({ declaration: result.declaration, items: result.items });
    } catch (err: any) {
      toast.error(err?.message || 'فشل إنشاء البيان الجمركي');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = async () => {
    if (!detail || !hsCode.trim() || customsValue <= 0) {
      toast.error('يرجى إدخال الكود الجمركي (HS Code) والقيمة الجمركية');
      return;
    }
    try {
      setIsSubmitting(true);
      await maritimeApi.addCustomsDeclarationItem(detail.declaration.id, {
        hsCode: hsCode.trim(),
        commodityDescription: commodityDescription.trim() || undefined,
        quantity,
        unit,
        customsValue,
        dutyRatePercent,
      });
      toast.success('تم إضافة الصنف الجمركي');
      setHsCode('');
      setCommodityDescription('');
      setQuantity(1);
      setCustomsValue(0);
      setDutyRatePercent(0);
      await openDetail(detail.declaration.id);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل إضافة الصنف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!detail) return;
    try {
      await maritimeApi.updateCustomsDeclarationStatus(detail.declaration.id, status);
      toast.success('تم تحديث حالة البيان الجمركي');
      await openDetail(detail.declaration.id);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث الحالة');
    }
  };

  const estimatedDuty = Math.round(customsValue * (dutyRatePercent / 100) * 100) / 100;

  if (detail) {
    const cfg = STATUS_CONFIG[detail.declaration.status] || STATUS_CONFIG.pending;
    return (
      <StandardDialog
        open={open}
        onClose={onClose}
        title={`البيان الجمركي — عملية ${jobNumber || ''}`}
        subtitle={detail.declaration.declarationNumber ? `رقم البيان: ${detail.declaration.declarationNumber}` : 'لم يُسجَّل رقم بيان جمركي رسمي بعد'}
        maxWidth="950px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
          <button type="button" onClick={() => setDetail(null)} style={{ alignSelf: 'flex-start', padding: '4px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
            ← العودة لكل البيانات الجمركية
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['pending', 'submitted', 'cleared', 'held', 'rejected'].map((s) => (
                <button key={s} type="button" onClick={() => handleUpdateStatus(s)} disabled={detail.declaration.status === s} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: detail.declaration.status === s ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', color: '#334155', cursor: detail.declaration.status === s ? 'default' : 'pointer' }}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700 }}>إجمالي القيمة الجمركية المصرح بها</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a' }}>{detail.declaration.totalCustomsValue.toLocaleString()} {detail.declaration.currency}</div>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700 }}>إجمالي الرسوم الجمركية</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#78350f' }}>{detail.declaration.totalDutyAmount.toLocaleString()} {detail.declaration.currency}</div>
            </div>
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8rem' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '8px 10px' }}>كود HS</th>
                  <th style={{ padding: '8px 10px' }}>الوصف</th>
                  <th style={{ padding: '8px 10px' }}>الكمية</th>
                  <th style={{ padding: '8px 10px' }}>القيمة الجمركية</th>
                  <th style={{ padding: '8px 10px' }}>نسبة الرسم</th>
                  <th style={{ padding: '8px 10px' }}>مبلغ الرسم</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>لا توجد أصناف مسجلة بعد</td></tr>
                ) : detail.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#170e5e' }}>{item.hsCode}</td>
                    <td style={{ padding: '8px 10px' }}>{item.commodityDescription || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{item.quantity} {item.unit}</td>
                    <td style={{ padding: '8px 10px' }}>{item.customsValue.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px' }}>{item.dutyRatePercent}%</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{item.dutyAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#170e5e' }}>إضافة صنف جمركي</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              <input type="text" placeholder="كود HS" value={hsCode} onChange={(e) => setHsCode(e.target.value)} style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="وصف الصنف" value={commodityDescription} onChange={(e) => setCommodityDescription(e.target.value)} style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="number" min={0} placeholder="الكمية" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="الوحدة" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="number" min={0} placeholder="القيمة الجمركية" value={customsValue} onChange={(e) => setCustomsValue(Number(e.target.value))} style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <input type="number" min={0} max={100} placeholder="نسبة الرسم %" value={dutyRatePercent} onChange={(e) => setDutyRatePercent(Number(e.target.value))} style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>الرسم المقدَّر: <strong style={{ color: '#170e5e' }}>{estimatedDuty.toLocaleString()}</strong></span>
              <button type="button" onClick={handleAddItem} disabled={isSubmitting} style={{ height: '32px', padding: '0 16px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                إضافة الصنف
              </button>
            </div>
          </div>
        </div>
      </StandardDialog>
    );
  }

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`البيانات الجمركية — عملية ${jobNumber || ''}`}
      subtitle="تسجيل أكواد HS والقيمة الجمركية ونسب الرسوم لكل شحنة ومتابعة حالة التخليص"
      maxWidth="800px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#170e5e' }}>إنشاء بيان جمركي جديد</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <Field label="نوع البيان">
              <CustomSelect value={declarationType} onChange={(v) => setDeclarationType((v as 'import' | 'export') || 'import')} options={[{ value: 'import', label: 'استيراد' }, { value: 'export', label: 'تصدير' }]} />
            </Field>
            <Field label="الجهة الجمركية"><input type="text" value={customsAuthority} onChange={(e) => setCustomsAuthority(e.target.value)} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
            <Field label="المخلص الجمركي"><input type="text" value={brokerName} onChange={(e) => setBrokerName(e.target.value)} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
            <Field label="العملة">
              <CustomSelect value={currency} onChange={(v) => setCurrency(v || 'USD')} options={[{ value: 'USD', label: 'USD' }, { value: 'EGP', label: 'EGP' }]} />
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={handleCreateDeclaration} disabled={isSubmitting} style={{ height: '34px', padding: '0 18px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              إنشاء بيان جمركي
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جارٍ التحميل...</div>
          ) : declarations.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              <AppIcons.FileText size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700 }}>لا توجد بيانات جمركية مسجلة لهذه العملية بعد</div>
            </div>
          ) : (
            declarations.map((d) => {
              const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;
              return (
                <div key={d.id} onClick={() => openDetail(d.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.declarationType === 'import' ? 'استيراد' : 'تصدير'} {d.declarationNumber ? `— ${d.declarationNumber}` : ''}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>القيمة: {d.totalCustomsValue.toLocaleString()} {d.currency} — الرسوم: {d.totalDutyAmount.toLocaleString()}</div>
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </StandardDialog>
  );
}
