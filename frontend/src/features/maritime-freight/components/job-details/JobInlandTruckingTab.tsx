import { useState, useEffect } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { maritimeApi, MaritimeJob, MaritimeInlandTruckingTrip } from '../../api/maritime-freight.api';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { printTruckingWaybill } from '../../utils/maritime-documents';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface Props {
  job: MaritimeJob;
  onUpdated: () => void;
}

export function JobInlandTruckingTab({ job, onUpdated }: Props) {
  const { currencySymbol } = useSystemCurrency();
  const [trips, setTrips] = useState<MaritimeInlandTruckingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    tripNumber: '',
    truckingCompany: '',
    driverName: '',
    driverPhone: '',
    truckPlateNumber: '',
    containerNumber: job.containers?.[0]?.container_number || '',
    pickupLocation: job.pod_name || 'ميناء الإسكندرية',
    deliveryLocation: 'مقر العميل / المستودع',
    scheduledPickupTime: '',
    scheduledDeliveryTime: '',
    costAmount: '',
    sellAmount: '',
    currency: 'EGP',
    cargoDescription: job.cargo_description || 'بضائع عامة',
    notes: '',
  });

  useEffect(() => {
    fetchTrips();
  }, [job.id]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getJobTruckingTrips(job.id);
      setTrips(data || []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!form.truckingCompany.trim() || !form.truckPlateNumber.trim()) {
      toast.warning('يرجى تحديد شركة النقل ورقم لوحة الشاحنة');
      return;
    }

    try {
      setIsSubmitting(true);
      await maritimeApi.createJobTruckingTrip(job.id, {
        tripNumber: form.tripNumber || undefined,
        truckingCompany: form.truckingCompany,
        driverName: form.driverName || undefined,
        driverPhone: form.driverPhone || undefined,
        truckPlateNumber: form.truckPlateNumber,
        containerNumber: form.containerNumber || undefined,
        pickupLocation: form.pickupLocation,
        deliveryLocation: form.deliveryLocation,
        scheduledPickupTime: form.scheduledPickupTime || undefined,
        scheduledDeliveryTime: form.scheduledDeliveryTime || undefined,
        costAmount: Number(form.costAmount) || 0,
        sellAmount: Number(form.sellAmount) || 0,
        currency: form.currency || 'EGP',
        cargoDescription: form.cargoDescription || undefined,
        notes: form.notes || undefined,
      });

      toast.success('تم تسجيل وتوجيه رحلة النقل البري بنجاح');
      setShowAddModal(false);
      fetchTrips();
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل رحلة النقل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (trip: MaritimeInlandTruckingTrip, newStatus: string) => {
    try {
      await maritimeApi.updateTruckingTrip(trip.id, {
        status: newStatus as any,
        actualPickupTime: newStatus === 'in_transit' ? new Date().toISOString() : undefined,
        actualDeliveryTime: newStatus === 'delivered' ? new Date().toISOString() : undefined,
      });
      toast.success('تم تحديث حالة رحلة النقل');
      fetchTrips();
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث الحالة');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>مجدولة ومسندة</span>;
      case 'in_transit':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>في الطريق</span>;
      case 'delivered':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>تم التسليم</span>;
      case 'cancelled':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>ملغاة</span>;
      default:
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#64748b' }}>{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#ffedd5',
                color: '#c2410c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcons.Truck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>رحلات النقل البري والترحيل الداخلي (Inland Haulage / Trucking)</span>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: '#e2e8f0', color: '#334155' }}>
                  {trips.length} رحلة
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                إدارة أذون التحميل، توجيه الشاحنات وسائقي المقطورات من وإلى الموانئ، وطباعة بوالص النقل البري (CMR / Trucking Waybill)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '6px 14px',
              background: '#c2410c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.PlusCircle size={15} />
            <span>+ تسجيل رحلة نقل جديدة</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
            جاري تحميل رحلات النقل...
          </div>
        ) : trips.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
            <AppIcons.Truck size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>
              لا توجد رحلات نقل بري مسجلة لهذه العملية بعد
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
              اضغط على "+ تسجيل رحلة نقل جديدة" لجدولة ترحيل الحاوية أو الطرود من الميناء لمستودع العميل.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم الرحلة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>شركة النقل والسائق</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>الشاحنة / الحاوية</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>المسار (التحميل ⬅️ التفريغ)</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>التكلفة / السعر</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((tr) => (
                  <tr key={tr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#170e5e' }}>
                      {tr.trip_number}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#0f172a' }}>
                      <div style={{ fontWeight: 700 }}>{tr.trucking_company}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        السائق: {tr.driver_name || 'غير محدد'} {tr.driver_phone ? `(${tr.driver_phone})` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>
                      <div style={{ fontWeight: 600 }}>لوحة: {tr.truck_plate_number}</div>
                      {tr.container_number && (
                        <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#0369a1' }}>
                          حاوية: {tr.container_number}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                      <div>من: <strong>{tr.pickup_location}</strong></div>
                      <div>إلى: <strong>{tr.delivery_location}</strong></div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      <div>تكلفة: <strong>{currencySymbol} {Number(tr.cost_amount || 0).toLocaleString()}</strong></div>
                      <div>مبيع: <strong style={{ color: '#15803d' }}>{currencySymbol} {Number(tr.sell_amount || 0).toLocaleString()}</strong></div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {getStatusBadge(tr.status)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => printTruckingWaybill(job, tr)}
                          style={{
                            padding: '4px 8px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <AppIcons.Printer size={13} />
                          بوليصة نقل
                        </button>
                        {tr.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(tr, 'in_transit')}
                            style={{
                              padding: '4px 8px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            بدء النقل
                          </button>
                        )}
                        {tr.status === 'in_transit' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(tr, 'delivered')}
                            style={{
                              padding: '4px 8px',
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            تأكيد التسليم
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال تسجيل رحلة نقل جديدة */}
      {showAddModal && (
        <StandardDialog
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="تسجيل وتوجيه رحلة نقل بري (Inland Trucking Trip)"
          subtitle={`العملية: ${job.job_number} | العميل: ${job.customer_name}`}
          width="min(600px, 95vw)"
          footerActions={(
            <StandardDialogFooter
              onCancel={() => setShowAddModal(false)}
              onConfirm={handleCreateTrip}
              confirmText="حفظ وتوجيه الشاحنة"
              cancelText="إلغاء"
              confirmLoading={isSubmitting}
            />
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="شركة النقل / مقاول النقل" required>
                <input
                  type="text"
                  value={form.truckingCompany}
                  onChange={(e) => setForm({ ...form, truckingCompany: e.target.value })}
                  placeholder="مثال: شركة مصر الدولية للنقل والتخليص"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>

              <Field label="رقم لوحة الشاحنة / المقطورة" required>
                <input
                  type="text"
                  value={form.truckPlateNumber}
                  onChange={(e) => setForm({ ...form, truckPlateNumber: e.target.value })}
                  placeholder="مثال: ط س ر 1928"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="اسم السائق">
                <input
                  type="text"
                  value={form.driverName}
                  onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                  placeholder="اسم السائق المسند إليه التحميل"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>

              <Field label="رقم هاتف السائق">
                <input
                  type="text"
                  value={form.driverPhone}
                  onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                  placeholder="010xxxxxxxx"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="موقع التحميل (Pickup Location)" required>
                <input
                  type="text"
                  value={form.pickupLocation}
                  onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>

              <Field label="موقع التفريغ (Delivery Location)" required>
                <input
                  type="text"
                  value={form.deliveryLocation}
                  onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="رقم الحاوية المحمولة">
                <input
                  type="text"
                  value={form.containerNumber}
                  onChange={(e) => setForm({ ...form, containerNumber: e.target.value })}
                  placeholder="MSKU1234567"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>

              <Field label="تاريخ وتوقيت التحميل">
                <input
                  type="datetime-local"
                  value={form.scheduledPickupTime}
                  onChange={(e) => setForm({ ...form, scheduledPickupTime: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Field label="تكلفة النقل (شراء)">
                <input
                  type="number"
                  value={form.costAmount}
                  onChange={(e) => setForm({ ...form, costAmount: e.target.value })}
                  placeholder="مثال: 4500"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>

              <Field label="سعر البيع للعميل">
                <input
                  type="number"
                  value={form.sellAmount}
                  onChange={(e) => setForm({ ...form, sellAmount: e.target.value })}
                  placeholder="مثال: 6000"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>

              <Field label="العملة">
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </Field>
            </div>

            <Field label="ملاحظات وتوجيهات السائق">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="توجيهات الدخول لبوابات الميناء، تعليمات الوزن، رقم إذن الصرف..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', resize: 'none' }}
              />
            </Field>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
