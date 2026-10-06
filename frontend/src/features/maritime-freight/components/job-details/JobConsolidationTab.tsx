import { useState, useEffect } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { maritimeApi, MaritimeJob } from '../../api/maritime-freight.api';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface Props {
  job: MaritimeJob;
  onUpdated: () => void;
  onSelectSubJob?: (subJobId: string) => void;
}

export function JobConsolidationTab({ job, onUpdated, onSelectSubJob }: Props) {
  const { currencySymbol } = useSystemCurrency();
  const [subJobs, setSubJobs] = useState<MaritimeJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    hblNumber: '',
    cargoDescription: '',
    packageCount: '1',
    grossWeightKg: '',
    cbm: '',
    clientInvoicedTotal: '',
    currency: 'USD',
  });

  const isMaster = !!job.is_consolidation || (job.sub_job_count || 0) > 0;
  const isHouse = !!job.master_job_id;

  useEffect(() => {
    if (isMaster || job.is_consolidation) {
      fetchSubJobs();
    }
  }, [job.id, isMaster]);

  const fetchSubJobs = async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getJobSubJobs(job.id);
      setSubJobs(data || []);
    } catch {
      setSubJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableConsolidation = async () => {
    try {
      await maritimeApi.updateJob(job.id, {
        isConsolidation: true,
      } as any);
      toast.success('تم تحويل العملية إلى شحنة تجميع ماستر (Master Consolidation Job)');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل تفعيل نمط التجميع');
    }
  };

  const handleCreateSubJob = async () => {
    if (!form.customerName.trim()) {
      toast.warning('يرجى تحديد اسم العميل للشحنة المجمعة');
      return;
    }

    try {
      setIsSubmitting(true);
      await maritimeApi.createJobSubJob(job.id, {
        customerName: form.customerName,
        hblNumber: form.hblNumber || undefined,
        cargoDescription: form.cargoDescription || undefined,
        packageCount: Number(form.packageCount) || 1,
        grossWeightKg: Number(form.grossWeightKg) || 0,
        cbm: Number(form.cbm) || 0,
        clientInvoicedTotal: Number(form.clientInvoicedTotal) || 0,
        currency: form.currency || 'USD',
      });

      toast.success('تم إنشاء شحنة الهاوس المجمعة بنجاح وربطها بالماستر');
      setShowAddModal(false);
      setForm({
        customerName: '',
        hblNumber: '',
        cargoDescription: '',
        packageCount: '1',
        grossWeightKg: '',
        cbm: '',
        clientInvoicedTotal: '',
        currency: 'USD',
      });
      fetchSubJobs();
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة شحنة الهاوس المجمعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for Master Summary
  const totalSubWeight = subJobs.reduce((acc, sj) => acc + Number(sj.gross_weight_kg || 0), 0);
  const totalSubCbm = subJobs.reduce((acc, sj) => acc + Number(sj.cbm || 0), 0);
  const totalSubPackages = subJobs.reduce((acc, sj) => acc + Number(sj.package_count || 0), 0);
  const totalSubRevenue = subJobs.reduce((acc, sj) => acc + Number(sj.client_invoiced_total || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* في حالة كانت هذه الشحنة نفسها عبارة عن هاوس مربوطة بماستر */}
      {isHouse && (
        <div
          style={{
            background: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcons.Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e40af' }}>
                شحنة مجمعة فرعية (House Sub-Job)
              </div>
              <div style={{ fontSize: '0.76rem', color: '#3b82f6', marginTop: '2px' }}>
                هذه العملية مرتبطة ومحمولة ضمن حاوية مجمعة تحت الشحنة الأم الرئيسية (Master Job #{job.master_job_id})
              </div>
            </div>
          </div>
          {onSelectSubJob && job.master_job_id && (
            <button
              type="button"
              onClick={() => onSelectSubJob(String(job.master_job_id))}
              style={{
                padding: '6px 14px',
                background: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              الانتقال للشحنة الأم (Master)
            </button>
          )}
        </div>
      )}

      {/* بطاقة معلومات التجميع وشريط الحالة */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppIcons.Layers size={18} />
              <span>إدارة تجميع الشحنات والحاويات المشتركة (LCL / Consolidation Hub)</span>
              {isMaster && (
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                  Master Consolidation
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              دمج وتجميع عدة بوالص هاوس (House B/Ls) لعدة عملاء داخل نفس بوليصة الماستر والحاوية الواحدة، وتتبع أوزانهم وإيراداتهم
            </div>
          </div>

          {!isMaster && !isHouse && (
            <button
              type="button"
              onClick={handleEnableConsolidation}
              style={{
                padding: '7px 16px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.PlusCircle size={15} />
              <span>تفعيل نمط التجميع (تحويل لـ Master Job)</span>
            </button>
          )}

          {isMaster && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '7px 16px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.PlusCircle size={15} />
              <span>+ إضافة شحنة هاوس مجمعة (Sub-Job)</span>
            </button>
          )}
        </div>

        {/* مؤشرات التجميع المجمعة للماستر */}
        {isMaster && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>عدد الشحنات الفرعية</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                {subJobs.length} شحنات
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>إجمالي الطرود المجمعة</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {totalSubPackages.toLocaleString()} طرد
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>إجمالي الوزن القائم (Gross)</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                {totalSubWeight.toLocaleString()} كجم
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>إجمالي الحجم التكعيبي (CBM)</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                {totalSubCbm.toFixed(2)} م³
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>إجمالي إيراد الهاوس المفوتر</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                {currencySymbol} {totalSubRevenue.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* جدول شحنات الهاوس التابعة للماستر */}
      {isMaster && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
              قائمة بوالص الهاوس المجمعة في هذه الحاوية (House Bills of Lading)
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {subJobs.length} شحنة فرعية مسجلة
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              جاري تحميل شحنات التجميع...
            </div>
          ) : subJobs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
              <AppIcons.Layers size={30} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>
                لا توجد شحنات هاوس مجمعة مسجلة تحت هذا الماستر بعد
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                اضغط على "+ إضافة شحنة هاوس مجمعة" لتقسيم الحاوية على عدة عملاء وبوالص فرعية
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم العملية (Job #)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>العميل / المستورد</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم بوليصة الهاوس (HBL)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>وصف البضاعة والطرود</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>الوزن / الحجم</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>قيمة الفاتورة</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>فتح</th>
                  </tr>
                </thead>
                <tbody>
                  {subJobs.map((sj) => (
                    <tr key={sj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#170e5e' }}>
                        {sj.job_number}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {sj.customer_name}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#1e293b' }}>
                        {sj.hbl_number || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        <div>{sj.cargo_description || 'بضائع عامة'}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{sj.package_count || 1} طرد</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        <div>{Number(sj.gross_weight_kg || 0).toLocaleString()} كجم</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{Number(sj.cbm || 0).toFixed(2)} م³</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#15803d' }}>
                        {currencySymbol} {Number(sj.client_invoiced_total || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: sj.status === 'completed' ? '#dcfce7' : '#f1f5f9',
                            color: sj.status === 'completed' ? '#15803d' : '#475569',
                          }}
                        >
                          {sj.status === 'completed' ? 'مكتملة' : 'قيد التشغيل'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {onSelectSubJob && (
                          <button
                            type="button"
                            onClick={() => onSelectSubJob(String(sj.id))}
                            style={{
                              padding: '4px 10px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            عرض الملف
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* مودال إنشاء شحنة هاوس جديدة تابعة للماستر */}
      {showAddModal && (
        <StandardDialog
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="إضافة شحنة هاوس مجمعة (House Sub-Job)"
          subtitle={`تحت الشحنة الأم الماستر: ${job.job_number} | مسار الرحلة: ${job.pol_name} إلى ${job.pod_name}`}
          width="min(560px, 95vw)"
          footerActions={(
            <StandardDialogFooter
              onCancel={() => setShowAddModal(false)}
              onConfirm={handleCreateSubJob}
              confirmText="إنشاء شحنة الهاوس"
              cancelText="إلغاء"
              isSubmitting={isSubmitting}
            />
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <Field label="اسم العميل / المستورد *">
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="اسم العميل صاحب البضاعة الجزئية..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                }}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="رقم بوليصة الهاوس (HBL Number)">
                <input
                  type="text"
                  value={form.hblNumber}
                  onChange={(e) => setForm({ ...form, hblNumber: e.target.value })}
                  placeholder="مثال: HBL-EGY-001"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </Field>

              <Field label="عدد الطرود / الصناديق">
                <input
                  type="number"
                  value={form.packageCount}
                  onChange={(e) => setForm({ ...form, packageCount: e.target.value })}
                  placeholder="1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="الوزن القائم (Gross Weight Kg)">
                <input
                  type="number"
                  value={form.grossWeightKg}
                  onChange={(e) => setForm({ ...form, grossWeightKg: e.target.value })}
                  placeholder="مثال: 1200"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </Field>

              <Field label="الحجم التكعيبي (CBM)">
                <input
                  type="number"
                  step="0.01"
                  value={form.cbm}
                  onChange={(e) => setForm({ ...form, cbm: e.target.value })}
                  placeholder="مثال: 3.5"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <Field label="قيمة فاتورة المبيعات للعميل">
                <input
                  type="number"
                  value={form.clientInvoicedTotal}
                  onChange={(e) => setForm({ ...form, clientInvoicedTotal: e.target.value })}
                  placeholder="مثال: 1500"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </Field>

              <Field label="العملة">
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </Field>
            </div>

            <Field label="وصف البضاعة">
              <input
                type="text"
                value={form.cargoDescription}
                onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })}
                placeholder="مثال: قطع غيار، أقمشة ومنسوجات..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                }}
              />
            </Field>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
