import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { useCreateShipmentMutation, useImportProjectsQuery } from './api/shipments.api';
import { useQuery } from '@tanstack/react-query';
import { suppliersApi } from '@/shared/api/suppliers.api';
import { toast } from '@/shared/components/system-alert';

interface NewShipmentDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewShipmentDialog({ open, onClose }: NewShipmentDialogProps) {
  const [containerNumber, setContainerNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [billOfLading, setBillOfLading] = useState('');
  const [shippingDate, setShippingDate] = useState('');
  const [freightType, setFreightType] = useState('FCL');
  const [containerSize, setContainerSize] = useState('40HQ');
  const [portOfLoading, setPortOfLoading] = useState('Ningbo');
  const [portOfDischarge, setPortOfDischarge] = useState('Alexandria');
  const [freeDemurrageDays, setFreeDemurrageDays] = useState<number>(14);
  const [costAllocationMethod, setCostAllocationMethod] = useState<'value' | 'weight' | 'cbm'>('value');

  const createMutation = useCreateShipmentMutation();
  const { data: projects = [] } = useImportProjectsQuery();

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => suppliersApi.listAll(),
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!containerNumber.trim()) {
      toast.error('يرجى إدخال رقم الحاوية');
      return;
    }

    try {
      await createMutation.mutateAsync({
        containerNumber: containerNumber.trim(),
        projectId: projectId || undefined,
        arrivalDate: arrivalDate || undefined,
        supplierId: supplierId || undefined,
        billOfLading: billOfLading.trim() || undefined,
        shippingDate: shippingDate || undefined,
        freightType,
        containerSize,
        portOfLoading,
        portOfDischarge,
        freeDemurrageDays: Number(freeDemurrageDays),
        costAllocationMethod,
      });

      toast.success('تمت إضافة شحنة الاستيراد بنجاح');
      setContainerNumber('');
      setProjectId('');
      setArrivalDate('');
      setSupplierId('');
      setBillOfLading('');
      setShippingDate('');
      onClose();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء إضافة الشحنة: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إضافة شحنة وحاوية استيراد دولية (New International Shipment)"
      subtitle="تسجيل بيانات الحاوية، مشروع الاستيراد، المصنع الصيني، ميناء الشحن والوصول، وفترة سماح الأرضيات"
      width="min(680px, 95vw)"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitText={createMutation.isPending ? "جاري الإضافة..." : "إضافة الحاوية"}
          cancelText="إلغاء"
          isSubmitting={createMutation.isPending}
        />
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              مشروع الاستيراد المرتبط
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="">-- اختياري: ربط بمشروع استيراد --</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.project_no} - {proj.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              المصنع / المورد الدولي
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="">-- اختر المورد / المصنع --</option>
              {suppliersData?.suppliers?.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              رقم الحاوية أو الشحنة <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value)}
              placeholder="مثال: MSCU1234567 أو AWB-987"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              رقم بوليصة الشحن (B/L أو AWB)
            </label>
            <input
              type="text"
              value={billOfLading}
              onChange={(e) => setBillOfLading(e.target.value)}
              placeholder="مثال: BL-12345"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              طريقة ونوع الشحن
            </label>
            <select
              value={freightType}
              onChange={(e) => setFreightType(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="FCL">حاوية كاملة (FCL)</option>
              <option value="LCL">شحنة مجمعة (LCL)</option>
              <option value="AIR">شحن جوي سريع (AIR)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              مقاس الحاوية
            </label>
            <select
              value={containerSize}
              onChange={(e) => setContainerSize(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="40HQ">40 قدم هاي كيوب (40HQ)</option>
              <option value="20FT">20 قدم قياسي (20FT)</option>
              <option value="40FT">40 قدم قياسي (40FT)</option>
              <option value="LCL">شحنة جزئية (CBM)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              ميناء الشحن (Port of Loading)
            </label>
            <input
              type="text"
              value={portOfLoading}
              onChange={(e) => setPortOfLoading(e.target.value)}
              placeholder="مثال: Ningbo, Shanghai, Shenzhen"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              ميناء الوصول (Port of Discharge)
            </label>
            <input
              type="text"
              value={portOfDischarge}
              onChange={(e) => setPortOfDischarge(e.target.value)}
              placeholder="مثال: Alexandria, Sokhna, Port Said"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              فترة السماح للأرضيات (Free Demurrage Days)
            </label>
            <input
              type="number"
              value={freeDemurrageDays}
              onChange={(e) => setFreeDemurrageDays(Number(e.target.value))}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              طريقة توزيع التكلفة الفعلية (Landed Cost Allocation)
            </label>
            <select
              value={costAllocationMethod}
              onChange={(e) => setCostAllocationMethod(e.target.value as any)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="value">توزيع بحسب القيمة بالدولار (Value %)</option>
              <option value="weight">توزيع بحسب الوزن (Weight %)</option>
              <option value="cbm">توزيع بحسب الحجم (CBM %)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              تاريخ الإبحار الفعلي
            </label>
            <input
              type="date"
              value={shippingDate}
              onChange={(e) => setShippingDate(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              تاريخ الوصول المتوقع للميناء
            </label>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </form>
    </StandardDialog>
  );
}
