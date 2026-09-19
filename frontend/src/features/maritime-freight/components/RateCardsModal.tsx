import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { maritimeApi, MaritimeRateCard } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';

interface RateCardsModalProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'ساري' },
  expired: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'منتهي' },
  draft: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'مسودة' },
};

export function RateCardsModal({ open, onClose }: RateCardsModalProps) {
  const [rateCards, setRateCards] = useState<MaritimeRateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterPol, setFilterPol] = useState('');
  const [filterPod, setFilterPod] = useState('');

  const [carrierName, setCarrierName] = useState('');
  const [polCode, setPolCode] = useState('');
  const [podCode, setPodCode] = useState('');
  const [containerType, setContainerType] = useState('40HC');
  const [cargoMode, setCargoMode] = useState('FCL');
  const [oceanFreight, setOceanFreight] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [thcOrigin, setThcOrigin] = useState<number>(0);
  const [thcDestination, setThcDestination] = useState<number>(0);
  const [bafCharges, setBafCharges] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [transitTimeDays, setTransitTimeDays] = useState<number>(18);
  const [freeDays, setFreeDays] = useState<number>(14);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await maritimeApi.listRateCards({
        polCode: filterPol.trim() || undefined,
        podCode: filterPod.trim() || undefined,
      });
      setRateCards(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تعرفات الأسعار');
    } finally {
      setLoading(false);
    }
  }, [filterPol, filterPod]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const totalFreight = oceanFreight + thcOrigin + thcDestination + bafCharges + otherCharges;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polCode.trim() || !podCode.trim() || !validUntil) {
      toast.error('يرجى إدخال ميناء الشحن والتفريغ وتاريخ انتهاء صلاحية التعرفة');
      return;
    }
    try {
      setIsSubmitting(true);
      await maritimeApi.createRateCard({
        carrierName: carrierName.trim() || undefined,
        polCode: polCode.trim().toUpperCase(),
        podCode: podCode.trim().toUpperCase(),
        containerType,
        cargoMode,
        oceanFreight,
        currency,
        thcOrigin,
        thcDestination,
        bafCharges,
        otherCharges,
        transitTimeDays,
        freeDays,
        validUntil,
        notes: notes.trim() || undefined,
      } as any);
      toast.success('تم حفظ التعرفة بنجاح وأصبحت متاحة للتسعير الفوري');
      setCarrierName('');
      setPolCode('');
      setPodCode('');
      setOceanFreight(0);
      setThcOrigin(0);
      setThcDestination(0);
      setBafCharges(0);
      setOtherCharges(0);
      setNotes('');
      setActiveTab('list');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ التعرفة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (card: MaritimeRateCard) => {
    const newStatus = card.status === 'active' ? 'expired' : 'active';
    try {
      await maritimeApi.updateRateCardStatus(card.id, newStatus);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث حالة التعرفة');
    }
  };

  const handleDelete = async (card: MaritimeRateCard) => {
    try {
      await maritimeApi.deleteRateCard(card.id);
      toast.success('تم حذف التعرفة');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حذف التعرفة');
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تعرفات وعقود الأسعار الملاحية (Rate Management)"
      subtitle="أسعار متعاقد عليها جاهزة للتسعير الفوري بدلاً من انتظار عروض RFQ جديدة في كل مرة"
      maxWidth="1150px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setActiveTab('list')} style={{ padding: '6px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', border: activeTab === 'list' ? '1.5px solid #170e5e' : '1px solid #cbd5e1', background: activeTab === 'list' ? '#170e5e' : '#f8fafc', color: activeTab === 'list' ? '#fff' : '#334155', cursor: 'pointer' }}>
              التعرفات ({rateCards.length})
            </button>
            <button type="button" onClick={() => setActiveTab('create')} style={{ padding: '6px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', border: activeTab === 'create' ? '1.5px solid #170e5e' : '1px solid #cbd5e1', background: activeTab === 'create' ? '#170e5e' : '#f8fafc', color: activeTab === 'create' ? '#fff' : '#334155', cursor: 'pointer' }}>
              إضافة تعرفة جديدة
            </button>
          </div>
          {activeTab === 'list' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" placeholder="ميناء الشحن" value={filterPol} onChange={(e) => setFilterPol(e.target.value)} style={{ width: '110px', height: '30px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }} />
              <input type="text" placeholder="ميناء التفريغ" value={filterPod} onChange={(e) => setFilterPod(e.target.value)} style={{ width: '110px', height: '30px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }} />
            </div>
          )}
        </div>

        {activeTab === 'create' && (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <Field label="اسم الناقل/الخط الملاحي"><input type="text" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} placeholder="مثال: MSC" style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="ميناء الشحن (POL)"><input type="text" value={polCode} onChange={(e) => setPolCode(e.target.value)} placeholder="CNSHA" style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="ميناء التفريغ (POD)"><input type="text" value={podCode} onChange={(e) => setPodCode(e.target.value)} placeholder="EGALY" style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="نوع الحاوية">
                <CustomSelect value={containerType} onChange={(v) => setContainerType(v || '40HC')} options={[
                  { value: '20GP', label: '20GP' }, { value: '40GP', label: '40GP' }, { value: '40HC', label: '40HC' }, { value: '45HC', label: '45HC' },
                ]} />
              </Field>
              <Field label="نمط الشحن">
                <CustomSelect value={cargoMode} onChange={(v) => setCargoMode(v || 'FCL')} options={[{ value: 'FCL', label: 'FCL' }, { value: 'LCL', label: 'LCL' }]} />
              </Field>
              <Field label="العملة">
                <CustomSelect value={currency} onChange={(v) => setCurrency(v || 'USD')} options={[{ value: 'USD', label: 'USD' }, { value: 'EGP', label: 'EGP' }, { value: 'EUR', label: 'EUR' }]} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <Field label="النولون البحري"><input type="number" min={0} value={oceanFreight} onChange={(e) => setOceanFreight(Number(e.target.value))} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="THC ميناء الشحن"><input type="number" min={0} value={thcOrigin} onChange={(e) => setThcOrigin(Number(e.target.value))} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="THC ميناء التفريغ"><input type="number" min={0} value={thcDestination} onChange={(e) => setThcDestination(Number(e.target.value))} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="رسوم الوقود BAF"><input type="number" min={0} value={bafCharges} onChange={(e) => setBafCharges(Number(e.target.value))} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="رسوم أخرى"><input type="number" min={0} value={otherCharges} onChange={(e) => setOtherCharges(Number(e.target.value))} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <Field label="مدة الرحلة (يوم)"><input type="number" min={0} value={transitTimeDays} onChange={(e) => setTransitTimeDays(Number(e.target.value))} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="أيام السماح Free Days"><input type="number" min={0} value={freeDays} onChange={(e) => setFreeDays(Number(e.target.value))} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="صالحة حتى تاريخ *"><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></Field>
              <Field label="الإجمالي المحسوب">
                <div style={{ height: '34px', display: 'flex', alignItems: 'center', fontWeight: 800, color: '#170e5e', fontSize: '0.95rem' }}>{totalFreight.toLocaleString()} {currency}</div>
              </Field>
            </div>

            <Field label="ملاحظات">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setActiveTab('list')} style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
              <button type="submit" disabled={isSubmitting} style={{ height: '36px', padding: '0 20px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعرفة'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'list' && (
          <div style={{ maxHeight: '440px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جارٍ التحميل...</div>
            ) : rateCards.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <AppIcons.DollarSign size={36} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: '#334155' }}>لا توجد تعرفات مسجلة بعد</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.82rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px 10px' }}>الناقل</th>
                    <th style={{ padding: '8px 10px' }}>المسار</th>
                    <th style={{ padding: '8px 10px' }}>الحاوية</th>
                    <th style={{ padding: '8px 10px' }}>الإجمالي</th>
                    <th style={{ padding: '8px 10px' }}>صالحة حتى</th>
                    <th style={{ padding: '8px 10px' }}>المصدر</th>
                    <th style={{ padding: '8px 10px' }}>الحالة</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rateCards.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{c.carrierName}</td>
                        <td style={{ padding: '8px 10px' }}>{c.polCode} → {c.podCode}</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.76rem', color: '#64748b' }}>{c.containerType} / {c.cargoMode}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#170e5e' }}>{c.totalFreightCost.toLocaleString()} {c.currency}</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.76rem', color: '#64748b' }}>{c.validUntil}</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.76rem' }}>{c.source === 'carrier_bid' ? 'من عرض RFQ' : 'يدوي'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button type="button" onClick={() => handleToggleStatus(c)} style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#fff', border: '1px solid #cbd5e1', color: '#170e5e', cursor: 'pointer' }}>
                              {c.status === 'active' ? 'تعطيل' : 'تفعيل'}
                            </button>
                            <button type="button" onClick={() => handleDelete(c)} style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: '#fff', border: '1px solid #fecaca', color: '#b91c1c', cursor: 'pointer' }}>
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
