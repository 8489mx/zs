import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import { ContractingEquipmentAsset } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface EquipmentTrackingModalProps {
  open: boolean;
  projectId?: string;
  projectName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'كافة فئات العِدة والمعدات' },
  { value: 'power_tools', label: 'أدوات كهربائية وهلتيات وصواريخ' },
  { value: 'heavy_machinery', label: 'معدات ثقيلة وخلاطات وأوناش' },
  { value: 'scaffolding', label: 'سقالات معدنية وجكات شدات' },
  { value: 'generators', label: 'مولدات كهرباء وطلمبات مياه' },
  { value: 'measurement_survey', label: 'أجهزة مساحة وتوتال ستيشن وميزان قامة' },
  { value: 'safety_gear', label: 'معدات أمن وسلامة وصناديق إسعاف' },
];

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  active_working: { label: 'تعمل بالموقع', bg: '#dcfce7', color: '#15803d' },
  under_maintenance: { label: 'تحت الصيانة والإصلاح', bg: '#fef3c7', color: '#b45309' },
  idle_in_store: { label: 'بالمخزن الرئيسي (متاحة)', bg: '#eff6ff', color: '#1d4ed8' },
  retired: { label: 'مستهلكة / تالفة', bg: '#fee2e2', color: '#b91c1c' },
};

export function EquipmentTrackingModal({
  open,
  projectId,
  projectName = '',
  onClose,
  onSuccess,
}: EquipmentTrackingModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [equipmentList, setEquipmentList] = useState<ContractingEquipmentAsset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [transferAsset, setTransferAsset] = useState<ContractingEquipmentAsset | null>(null);

  // New Equipment Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('power_tools');
  const [serialNumber, setSerialNumber] = useState('');
  const [currentLocationDesc, setCurrentLocationDesc] = useState(projectName || 'المخزن الرئيسي');
  const [assignedSupervisor, setAssignedSupervisor] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('');
  const [operationalStatus, setOperationalStatus] = useState<any>('active_working');

  // Transfer Form
  const [toProjectId, _setToProjectId] = useState('');
  const [toProjectName, setToProjectName] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [conditionOnDispatch, setConditionOnDispatch] = useState('سليمة وتعمل بكفاءة');
  const [transferNotes, setTransferNotes] = useState('');

  const loadEquipment = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await contractingApi.getEquipmentAssets({
        projectId: projectId || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setEquipmentList(data);
    } catch (err: any) {
      console.error('Failed to load equipment assets:', err);
      setErrorMsg(err?.message || 'فشل تحميل سجل العِدة والمعدات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadEquipment();
      setShowAddForm(false);
      setTransferAsset(null);
    }
  }, [open, projectId, selectedCategory]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('يرجى تحديد اسم المعدة أو العِدة');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await contractingApi.createEquipmentAsset({
        name: name.trim(),
        category,
        serialNumber: serialNumber.trim() || undefined,
        currentProjectId: projectId || undefined,
        currentLocationDesc: currentLocationDesc.trim() || 'الموقع العام',
        assignedSupervisor: assignedSupervisor.trim() || undefined,
        operationalStatus,
        purchaseCost: Number(purchaseCost) || 0,
      });

      setName('');
      setSerialNumber('');
      setAssignedSupervisor('');
      setPurchaseCost('');
      setShowAddForm(false);
      await loadEquipment();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to create equipment asset:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء تكويد العِدة');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAsset) return;
    if (!dispatchedBy.trim() || !receivedBy.trim()) {
      setErrorMsg('يرجى تحديد اسم المشرف المُسلِّم والمُستلِم');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await contractingApi.transferEquipmentAsset(transferAsset.id, {
        toProjectId: toProjectId.trim() || undefined,
        toProjectName: toProjectName.trim() || 'المخزن الرئيسي',
        dispatchedBy: dispatchedBy.trim(),
        receivedBy: receivedBy.trim(),
        conditionOnDispatch: conditionOnDispatch.trim() || 'سليمة',
        conditionOnReceipt: 'تم الفحص والاستلام بحالة جيدة',
        notes: transferNotes.trim() || undefined,
      });

      setTransferAsset(null);
      setDispatchedBy('');
      setReceivedBy('');
      setTransferNotes('');
      await loadEquipment();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to transfer equipment asset:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء نقل العِدة');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = equipmentList.filter((e) => e.operationalStatus === 'active_working').length;
  const maintenanceCount = equipmentList.filter((e) => e.operationalStatus === 'under_maintenance').length;
  const storeCount = equipmentList.filter((e) => e.operationalStatus === 'idle_in_store').length;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تكويد وتتبع العِدة والآلات والمعدات بالمواقع"
      subtitle={projectName ? `المشروع: ${projectName}` : 'إدارة ومتابعة أماكن تواجد الهلتيات، الخلاطات، السقالات، وأجهزة المساحة'}
      width="min(1100px, 95vw)"
      minHeight="min(600px, 85vh)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
            تتبع العِدة يمنع فقدان الأدوات ويوثق عهدة كل مشرف وموقع ميدانياً.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 22px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إغلاق النافذة
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--font-body)', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الأصول والعدد</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {loading ? '—' : `${equipmentList.length} أصل / عِدة`}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#166534', fontWeight: 600 }}>تعمل بالموقع حالياً</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {loading ? '—' : `${activeCount} عِدة نشطة`}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#92400e', fontWeight: 600 }}>تحت الصيانة والإصلاح</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
              {loading ? '—' : `${maintenanceCount} عِدة`}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: 'var(--font-micro)', color: '#1e40af', fontWeight: 600 }}>بالمخزن الرئيسي (متاحة)</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
              {loading ? '—' : `${storeCount} عِدة جاهزة`}
            </div>
          </div>
        </div>

        {/* Action Header & Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '280px' }}>
            <CustomSelect
              value={selectedCategory}
              options={CATEGORY_OPTIONS}
              onChange={(val) => setSelectedCategory(val)}
              placeholder="تصفية حسب فئة العِدة..."
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setTransferAsset(null);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: showAddForm ? '#f1f5f9' : '#170e5e',
              color: showAddForm ? '#334155' : '#ffffff',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {showAddForm ? <AppIcons.X size={15} /> : <AppIcons.Plus size={15} />}
            <span>{showAddForm ? 'إلغاء التكويد' : 'تكويد عِدة / معدة جديدة'}</span>
          </button>
        </div>

        {/* Add Equipment Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateAsset}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              إدخال وتكويد أصل أو عِدة جديدة للشركة
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اسم العِدة أو الأداة *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: هلتي تكسير بوش 16 كجم، أو خلاطة نصف برميل..."
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  الفئة والتصنيف *
                </label>
                <CustomSelect
                  value={category}
                  options={CATEGORY_OPTIONS.filter((o) => o.value !== 'all')}
                  onChange={(val) => setCategory(val)}
                  placeholder="اختر الفئة..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  الرقم التسلسلي (سيريال)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="SN-98213..."
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تكلفة الشراء ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  مكان التواجد الميداني الحالي
                </label>
                <input
                  type="text"
                  value={currentLocationDesc}
                  onChange={(e) => setCurrentLocationDesc(e.target.value)}
                  placeholder="مثال: مخزن الموقع الرئيسي - القطاع الغربي..."
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  المشرف المسؤول عن العهدة
                </label>
                <input
                  type="text"
                  value={assignedSupervisor}
                  onChange={(e) => setAssignedSupervisor(e.target.value)}
                  placeholder="اسم المشرف / أمين المخزن..."
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  الحالة التشغيلية
                </label>
                <CustomSelect
                  value={operationalStatus}
                  options={[
                    { value: 'active_working', label: 'تعمل بالموقع' },
                    { value: 'idle_in_store', label: 'بالمخزن الرئيسي' },
                    { value: 'under_maintenance', label: 'تحت الصيانة' },
                  ]}
                  onChange={(val) => setOperationalStatus(val)}
                  placeholder="الحالة..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: 'var(--font-body)',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '7px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: 'var(--font-body)',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'جارٍ التكويد...' : 'حفظ وتكويد العِدة'}
              </button>
            </div>
          </form>
        )}

        {/* Transfer Asset Subform */}
        {transferAsset && (
          <form
            onSubmit={handleTransfer}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #93c5fd',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 'var(--font-body)' }}>
                نقل العِدة: [{transferAsset.assetCode}] {transferAsset.name}
              </div>
              <button
                type="button"
                onClick={() => setTransferAsset(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <AppIcons.X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                  الموقع / المشروع المنقول إليه *
                </label>
                <input
                  type="text"
                  value={toProjectName}
                  onChange={(e) => setToProjectName(e.target.value)}
                  placeholder="مشروع التجمع الخامس / المخزن الرئيسي..."
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #93c5fd',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                  المشرف المُسلِّم (المسؤول) *
                </label>
                <input
                  type="text"
                  value={dispatchedBy}
                  onChange={(e) => setDispatchedBy(e.target.value)}
                  placeholder="اسم المشرف القائم بالتسليم..."
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #93c5fd',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                  المشرف المُستلِم بالموقع الجديد *
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="اسم مهندس / مشرف الاستلام..."
                  required
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #93c5fd',
                    fontSize: 'var(--font-body)',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                حالة العِدة وقت التسليم وملاحظات
              </label>
              <input
                type="text"
                value={conditionOnDispatch}
                onChange={(e) => setConditionOnDispatch(e.target.value)}
                placeholder="سليمة وجاهزة للعمل / بها سلك يحتاج تغيير..."
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #93c5fd',
                  fontSize: 'var(--font-body)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setTransferAsset(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: 'var(--font-body)',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '6px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1e40af',
                  color: '#ffffff',
                  fontSize: 'var(--font-body)',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'جارٍ التسليم...' : 'تأكيد نقل العِدة وتحديث العهدة'}
              </button>
            </div>
          </form>
        )}

        {/* Equipment Table */}
        <div
          style={{
            minHeight: '280px',
            maxHeight: '380px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', gap: '12px', backgroundColor: '#f8fafc', color: '#64748b' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600 }}>
                جارٍ تحميل سجل العِدة والمعدات...
              </span>
            </div>
          ) : equipmentList.length === 0 ? (
            <div style={{ flex: 1, minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '36px', textAlign: 'center', color: '#64748b' }}>
              <AppIcons.Tool size={32} style={{ color: '#94a3b8' }} />
              <div style={{ fontWeight: 600 }}>لا توجد عِدة مسجلة في هذا التصنيف.</div>
              <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8' }}>
                اضغط على "تكويد عِدة / معدة جديدة" لبدء حصر الهلتيات والأدوات وسقالات الموقع.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الكود</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>اسم المعدة والأداة</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الموقع والتواجد الحالي</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المشرف المسؤول</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحالة التشغيلية</th>
                    <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentList.map((asset) => {
                    const statusInfo = STATUS_LABELS[asset.operationalStatus] || {
                      label: asset.operationalStatus,
                      bg: '#f1f5f9',
                      color: '#475569',
                    };
                    return (
                      <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                          {asset.assetCode}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                          {asset.name}
                          {asset.serialNumber && (
                            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginRight: '6px' }}>
                              (سيريال: {asset.serialNumber})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#334155' }}>
                          {asset.currentLocationDesc || asset.currentProjectName || 'المخزن الرئيسي'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#64748b' }}>
                          {asset.assignedSupervisor || 'غير محدد'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.color,
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferAsset(asset);
                              setShowAddForm(false);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #93c5fd',
                              backgroundColor: '#eff6ff',
                              color: '#1e40af',
                              fontSize: 'var(--font-micro)',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            نقل / تسليم
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
      </div>
    </StandardDialog>
  );
}
