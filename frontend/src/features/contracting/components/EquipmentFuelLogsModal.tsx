import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import type {
  ContractingEquipmentFuelLog,
  ContractingBoqItem,
} from '../contracting.types';
import { toast } from '@/shared/components/system-alert';

interface EquipmentFuelLogsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

export function EquipmentFuelLogsModal({ open, onClose, projectId, projectName }: EquipmentFuelLogsModalProps) {
  const [fuelLogs, setFuelLogs] = useState<ContractingEquipmentFuelLog[]>([]);
  const [boqItems, setBoqItems] = useState<ContractingBoqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentName, setEquipmentName] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [startMeterHours, setStartMeterHours] = useState<number | ''>('');
  const [endMeterHours, setEndMeterHours] = useState<number | ''>('');
  const [fuelLitersAdded, setFuelLitersAdded] = useState<number | ''>('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<number | ''>(13.5); // Default Egyptian diesel reference
  const [driverOperatorName, setDriverOperatorName] = useState('');
  const [boqItemId, setBoqItemId] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [logsData, boqData] = await Promise.all([
        contractingApi.getEquipmentFuelLogs(projectId),
        contractingApi.getBoqItems(projectId).catch(() => []),
      ]);
      setFuelLogs(logsData || []);
      setBoqItems(boqData || []);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل سجلات وقود وتشغيل المعدات');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  // Derived operating hours
  const calculatedOperatingHours =
    Number(endMeterHours) > Number(startMeterHours)
      ? Number((Number(endMeterHours) - Number(startMeterHours)).toFixed(2))
      : 0;

  // Derived total fuel cost
  const calculatedFuelCost =
    Number(fuelLitersAdded) > 0 && Number(fuelPricePerLiter) > 0
      ? Number((Number(fuelLitersAdded) * Number(fuelPricePerLiter)).toFixed(2))
      : 0;

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentName.trim()) {
      toast.error('يرجى إدخال اسم أو كود المعدة');
      return;
    }
    if (endMeterHours !== '' && startMeterHours !== '' && Number(endMeterHours) < Number(startMeterHours)) {
      toast.error('قراءة العداد النهائية يجب أن تكون أكبر من أو تساوي قراءة العداد الابتدائية');
      return;
    }

    try {
      setIsSubmitting(true);
      await contractingApi.createEquipmentFuelLog(projectId, {
        equipmentName: equipmentName.trim(),
        logDate,
        startMeterHours: Number(startMeterHours) || 0,
        endMeterHours: Number(endMeterHours) || 0,
        operatingHours: calculatedOperatingHours,
        fuelLitersAdded: Number(fuelLitersAdded) || 0,
        fuelCostTotal: calculatedFuelCost,
        driverOperatorName: driverOperatorName.trim() || undefined,
        boqItemId: boqItemId || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('تم تسجيل يومية تشغيل وتزويد وقود المعدة بنجاح');
      setEquipmentName('');
      setStartMeterHours('');
      setEndMeterHours('');
      setFuelLitersAdded('');
      setDriverOperatorName('');
      setBoqItemId('');
      setNotes('');
      setActiveTab('list');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل بيانات المعدة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number = 0) =>
    Number(val || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';

  // Overall Statistics
  const totalHours = fuelLogs.reduce((acc, c) => acc + (Number(c.operatingHours) || 0), 0);
  const totalLiters = fuelLogs.reduce((acc, c) => acc + (Number(c.fuelLitersAdded) || 0), 0);
  const totalFuelCost = fuelLogs.reduce((acc, c) => acc + (Number(c.fuelCostTotal) || 0), 0);
  const avgConsumption = totalHours > 0 ? (totalLiters / totalHours).toFixed(2) : '0';

  const filteredLogs = fuelLogs.filter((item) => {
    if (!searchTerm) return true;
    return (
      item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.driverOperatorName && item.driverOperatorName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="سجل استهلاك الوقود وساعات تشغيل المعدات (Equipment Fuel & Meter Logs)"
      subtitle={`متابعة عدادات الديزل وساعات تشغيل الآليات الثقيلة لمشروع: ${projectName || 'المشروع المحدد'}`}
      width="1180px"
      compact
      minHeight="min(580px, 86vh)"
    >
      {/* Top Tab Bar & Quick Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: activeTab === 'list' ? '1px solid #170e5e' : '1px solid #e2e8f0',
              background: activeTab === 'list' ? '#170e5e' : '#ffffff',
              color: activeTab === 'list' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.Layers size={14} />
            سجل التشغيل والوقود ({fuelLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: activeTab === 'create' ? '1px solid #170e5e' : '1px solid #e2e8f0',
              background: activeTab === 'create' ? '#170e5e' : '#ffffff',
              color: activeTab === 'create' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.PlusCircle size={14} />
            تسجيل يومية تشغيل وقود
          </button>
        </div>

        {/* Mini KPI summary */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '8px', fontSize: '11.5px' }}>
            ساعات التشغيل: <strong style={{ color: '#0f172a' }}>{totalHours.toFixed(1)} ساعة</strong>
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '8px', fontSize: '11.5px', color: '#1e40af' }}>
            إجمالي الوقود: <strong>{totalLiters.toLocaleString()} لتر</strong>
          </div>
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '8px', fontSize: '11.5px', color: '#b45309' }}>
            تكلفة الوقود: <strong>{formatCurrency(totalFuelCost)}</strong>
          </div>
          <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '8px', fontSize: '11.5px', color: '#15803d' }}>
            معدل الاستهلاك: <strong>{avgConsumption} لتر/ساعة</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', borderRadius: '50%' }} />
          <div style={{ color: '#64748b', fontSize: '13px' }}>جاري تحميل سجلات وقود وتشغيل الآليات...</div>
        </div>
      ) : activeTab === 'create' ? (
        /* Create Form */
        <form onSubmit={handleCreateLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
            <Field label="اسم / كود المعدة أو الآلية *">
              <input
                type="text"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                placeholder="مثال: حفار كوماتسو 200 - لودر كاتربيلر 966"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                required
              />
            </Field>

            <Field label="تاريخ التشغيل والتزويد *">
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                required
              />
            </Field>

            <Field label="اسم السائق / المشغل">
              <input
                type="text"
                value={driverOperatorName}
                onChange={(e) => setDriverOperatorName(e.target.value)}
                placeholder="اسم السائق أو الفني المسؤول"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
              />
            </Field>
          </div>

          {/* Meter & Hours Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'center' }}>
            <Field label="قراءة العداد الابتدائية (ساعة)">
              <input
                type="number"
                step="0.1"
                min="0"
                value={startMeterHours}
                onChange={(e) => setStartMeterHours(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.0"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
              />
            </Field>

            <Field label="قراءة العداد النهائية (ساعة)">
              <input
                type="number"
                step="0.1"
                min="0"
                value={endMeterHours}
                onChange={(e) => setEndMeterHours(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.0"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
              />
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي ساعات التشغيل المحسوبة:</span>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                {calculatedOperatingHours} ساعة
              </span>
            </div>
          </div>

          {/* Fuel liters & Cost Card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <Field label="كمية الوقود المعبأة (لتر)">
              <input
                type="number"
                step="0.1"
                min="0"
                value={fuelLitersAdded}
                onChange={(e) => setFuelLitersAdded(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.0"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
              />
            </Field>

            <Field label="سعر لتر السولار / البنزين (ج.م)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={fuelPricePerLiter}
                onChange={(e) => setFuelPricePerLiter(e.target.value ? Number(e.target.value) : '')}
                placeholder="13.50"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
              />
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي تكلفة الوقود المحسوبة:</span>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>
                {formatCurrency(calculatedFuelCost)}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="ربط ببند المقايسة (لتوزيع التكلفة المباشرة للنشاط)">
              <CustomSelect
                value={boqItemId}
                onChange={(val) => setBoqItemId(String(val))}
                options={[
                  { value: '', label: '-- بدون ربط (تكاليف عامة للموقع) --' },
                  ...boqItems.map((b) => ({
                    value: b.id,
                    label: `${b.itemCode || ''} - ${b.description}`,
                  })),
                ]}
                placeholder="-- اختر بند المقايسة --"
              />
            </Field>

            <Field label="ملاحظات وسجل الصيانة الدورية">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تغيير زيت، تبديل فلاتر، صيانة تشحيم، أو موقع العمل..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ يومية المعدة والوقود'}
            </button>
          </div>
        </form>
      ) : (
        /* List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المعدة أو السائق..."
              style={{ width: '280px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>

          {filteredLogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
              لا توجد سجلات وقود وتشغيل مسجلة للمعدات في هذا المشروع.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '340px', border: '1px solid #e2e8f0', borderRadius: '10px' }} className="thin-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'right' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>المعدة / الآلية</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>التاريخ</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>العداد (من - إلى)</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>ساعات التشغيل</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>الوقود (لتر)</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>التكلفة</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>المشغل / السائق</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>بند المقايسة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#170e5e' }}>{item.equipmentName}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.logDate}</td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {item.startMeterHours || 0} - {item.endMeterHours || 0}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                        {item.operatingHours || 0} س
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e40af' }}>
                        {item.fuelLitersAdded || 0} لتر
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b91c1c' }}>
                        {formatCurrency(item.fuelCostTotal)}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{item.driverOperatorName || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11.5px' }}>
                        {item.boqItemCode ? `بند ${item.boqItemCode}` : 'تكلفة عامة'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </StandardDialog>
  );
}
