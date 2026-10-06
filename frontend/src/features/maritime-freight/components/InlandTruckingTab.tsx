import { useState, useEffect } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { maritimeApi, MaritimeJob } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { printTruckingWaybill } from '../utils/maritime-documents';

export function InlandTruckingTab() {
  const [trips, setTrips] = useState<any[]>([]);
  const [jobs, setJobs] = useState<MaritimeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    jobId: '',
    containerNumber: '',
    truckingCompany: '',
    driverName: '',
    driverPhone: '',
    truckPlate: '',
    trailerPlate: '',
    originPortTerminal: 'ميناء الدخيلة - محطة الإسكندرية لتداول الحاويات',
    deliveryDestination: '',
    costAmount: '',
    sellAmount: '',
    notes: '',
  });

  useEffect(() => {
    fetchTrips();
    fetchJobs();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.listInlandTruckingTrips();
      setTrips(data);
    } catch (err) {
      toast.error('فشل تحميل رحلات النقل البري');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await maritimeApi.getJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTrip = async () => {
    if (!formData.jobId || !formData.truckingCompany || !formData.driverName || !formData.truckPlate || !formData.deliveryDestination) {
      toast.error('يرجى ملء الحقول الإلزامية لأمر النقل');
      return;
    }

    try {
      setIsSubmitting(true);
      await maritimeApi.createInlandTruckingTrip({
        jobId: formData.jobId,
        containerNumber: formData.containerNumber || undefined,
        truckingCompany: formData.truckingCompany,
        driverName: formData.driverName,
        driverPhone: formData.driverPhone || undefined,
        truckPlate: formData.truckPlate,
        trailerPlate: formData.trailerPlate || undefined,
        originPortTerminal: formData.originPortTerminal,
        deliveryDestination: formData.deliveryDestination,
        costAmount: Number(formData.costAmount || 0),
        sellAmount: Number(formData.sellAmount || 0),
        notes: formData.notes || undefined,
      });
      toast.success('تم إصدار أمر نقل وترحيل الحاوية بنجاح');
      setShowCreateModal(false);
      setFormData({
        jobId: '',
        containerNumber: '',
        truckingCompany: '',
        driverName: '',
        driverPhone: '',
        truckPlate: '',
        trailerPlate: '',
        originPortTerminal: 'ميناء الدخيلة - محطة الإسكندرية لتداول الحاويات',
        deliveryDestination: '',
        costAmount: '',
        sellAmount: '',
        notes: '',
      });
      fetchTrips();
    } catch (err: any) {
      toast.error(err.message || 'فشل إصدار أمر النقل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (tripId: string, status: string) => {
    try {
      await maritimeApi.updateInlandTruckingTripStatus(tripId, status, status === 'delivered' ? new Date().toISOString() : undefined);
      toast.success('تم تحديث حالة الرحلة بنجاح');
      fetchTrips();
    } catch (err) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const filteredTrips = statusFilter === 'all' ? trips : trips.filter((t) => t.trip_status === statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* 1. Header Banner */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.Truck size={20} />
            <span>إدارة النقل البري وترحيل الحاويات (Inland Haulage & Container Dispatch)</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            متابعة ترحيل الحاويات من الموانئ إلى مستودعات ومصانع المستوردين وتتبع السائقين ومقاولات النقل وإرجاع الحاويات الفارغة
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            height: '36px',
            padding: '0 16px',
            background: '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AppIcons.Plus size={16} />
          <span>إصدار أمر ترحيل حاوية</span>
        </button>
      </div>

      {/* 2. Filters */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>تصفية حسب حالة الرحلة:</div>
        {['all', 'assigned', 'loading', 'in_transit', 'delivered', 'empty_returned'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: statusFilter === st ? '1px solid #170e5e' : '1px solid #cbd5e1',
              background: statusFilter === st ? '#170e5e' : '#f8fafc',
              color: statusFilter === st ? '#ffffff' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {st === 'all' ? 'الكل' : st === 'assigned' ? 'تم التعيين' : st === 'loading' ? 'جاري التحميل' : st === 'in_transit' ? 'في الطريق' : st === 'delivered' ? 'تم التسليم' : 'تم رد الفارغ'}
          </button>
        ))}
      </div>

      {/* 3. Trips Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>رقم الرحلة</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>رقم الحاوية</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>شركة النقل / السائق</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>لوحة الشاحنة</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>محطة القيام ➔ جهة التسليم</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>التكلفة / الإيراد</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>الحالة</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل رحلات النقل البري...
                </td>
              </tr>
            ) : filteredTrips.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد رحلات نقل بري مسجلة
                </td>
              </tr>
            ) : (
              filteredTrips.map((trip) => (
                <tr key={trip.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: '#170e5e' }}>
                    {trip.trip_number}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace' }}>
                    {trip.container_number || '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700 }}>{trip.driver_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{trip.trucking_company} {trip.driver_phone ? `(${trip.driver_phone})` : ''}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>
                    {trip.truck_plate}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#475569' }}>
                    <div><strong>من:</strong> {trip.origin_port_terminal}</div>
                    <div><strong>إلى:</strong> {trip.delivery_destination}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>
                    <div style={{ color: '#15803d', fontWeight: 700 }}>+{Number(trip.sell_amount).toLocaleString()} ج.م</div>
                    <div style={{ color: '#b91c1c', fontSize: '0.72rem' }}>-{Number(trip.cost_amount).toLocaleString()} ج.م</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background:
                          trip.trip_status === 'delivered' || trip.trip_status === 'empty_returned'
                            ? '#dcfce7'
                            : trip.trip_status === 'in_transit'
                            ? '#fef3c7'
                            : '#eff6ff',
                        color:
                          trip.trip_status === 'delivered' || trip.trip_status === 'empty_returned'
                            ? '#15803d'
                            : trip.trip_status === 'in_transit'
                            ? '#b45309'
                            : '#1d4ed8',
                      }}
                    >
                      {trip.trip_status === 'assigned'
                        ? 'تم التعيين'
                        : trip.trip_status === 'loading'
                        ? 'جاري التحميل'
                        : trip.trip_status === 'in_transit'
                        ? 'في الطريق'
                        : trip.trip_status === 'delivered'
                        ? 'تم تسليم المصنع'
                        : 'تم رد الحاوية فارغة'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {trip.trip_status === 'assigned' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(trip.id, 'in_transit')}
                          style={{ padding: '3px 8px', background: '#b45309', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          خروج من الميناء
                        </button>
                      )}
                      {trip.trip_status === 'in_transit' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(trip.id, 'delivered')}
                          style={{ padding: '3px 8px', background: '#166534', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          تم التسليم
                        </button>
                      )}
                      {trip.trip_status === 'delivered' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(trip.id, 'empty_returned')}
                          style={{ padding: '3px 8px', background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          رد الفارغ للساحة
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Trucking Trip */}
      <StandardDialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="إصدار أمر نقل وترحيل حاوية من الميناء"
        subtitle="تعيين مقاول النقل البري والسائق والمقطورة وتوجيه الشحنة لمقر المستورد"
        width="600px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Field label="أمر تشغيل الشحنة (Job)">
            <select
              value={formData.jobId}
              onChange={(e) => {
                const j = jobs.find((item) => String(item.id) === e.target.value);
                setFormData({
                  ...formData,
                  jobId: e.target.value,
                  containerNumber: j?.containers?.[0]?.container_number || '',
                  deliveryDestination: j?.delivery_address || j?.customer_name || '',
                });
              }}
              style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">اختر الشحنة...</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.job_number} - {j.customer_name} ({j.shipping_line_name})</option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="رقم الحاوية">
              <input
                type="text"
                placeholder="MSCU1234567"
                value={formData.containerNumber}
                onChange={(e) => setFormData({ ...formData, containerNumber: e.target.value.toUpperCase() })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
              />
            </Field>

            <Field label="شركة النقل البري / المقاول">
              <input
                type="text"
                placeholder="شركة الوفاق للنقل الثقيل..."
                value={formData.truckingCompany}
                onChange={(e) => setFormData({ ...formData, truckingCompany: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="اسم السائق">
              <input
                type="text"
                placeholder="السائق المسؤول..."
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="هاتف السائق">
              <input
                type="text"
                placeholder="010XXXXXXXX"
                value={formData.driverPhone}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="رقم لوحة الشاحنة">
              <input
                type="text"
                placeholder="أ ب ج 123"
                value={formData.truckPlate}
                onChange={(e) => setFormData({ ...formData, truckPlate: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          </div>

          <Field label="محطة الميناء (مكان التحميل)">
            <input
              type="text"
              value={formData.originPortTerminal}
              onChange={(e) => setFormData({ ...formData, originPortTerminal: e.target.value })}
              style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="عنوان وموقع التسليم (المصنع / المستودع)">
            <input
              type="text"
              placeholder="المنطقة الصناعية - العاشر من رمضان..."
              value={formData.deliveryDestination}
              onChange={(e) => setFormData({ ...formData, deliveryDestination: e.target.value })}
              style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="تكلفة النقل (للسائق) ج.م">
              <input
                type="number"
                placeholder="0"
                value={formData.costAmount}
                onChange={(e) => setFormData({ ...formData, costAmount: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="سعر البيع (للعميل) ج.م">
              <input
                type="number"
                placeholder="0"
                value={formData.sellAmount}
                onChange={(e) => setFormData({ ...formData, sellAmount: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          </div>
        </div>

        <StandardDialogFooter>
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleCreateTrip}
            disabled={isSubmitting}
            style={{ padding: '8px 20px', background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700 }}
          >
            {isSubmitting ? 'جاري الإصدار...' : 'إصدار أمر النقل'}
          </button>
        </StandardDialogFooter>
      </StandardDialog>
    </div>
  );
}
