import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { maritimeApi, MaritimeJob, MaritimeContainer } from '../api/maritime-freight.api';
import { DCSA_STANDARD_MILESTONES, DcsaMilestoneKey } from '../maritime-freight.types';
import { toast, systemConfirm } from '@/shared/components/system-alert';

interface JobDetailsModalProps {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function JobDetailsModal({ open, jobId, onClose, onUpdated }: JobDetailsModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const [job, setJob] = useState<MaritimeJob | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'containers' | 'milestones' | 'finance'>('overview');
  const [nextMilestone, setNextMilestone] = useState<DcsaMilestoneKey>('GTI');
  const [milestoneNotes, setMilestoneNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Sub-Modals
  const [showEditVoyage, setShowEditVoyage] = useState(false);
  const [showAddContainer, setShowAddContainer] = useState(false);
  const [editingContainer, setEditingContainer] = useState<MaritimeContainer | null>(null);

  // Edit Voyage Form
  const [voyageForm, setVoyageForm] = useState({
    vesselName: '',
    voyageNumber: '',
    bookingNumber: '',
    etd: '',
    eta: '',
    portCutOff: '',
    blType: 'sea_waybill' as 'original' | 'telex_release' | 'sea_waybill',
    mblNumber: '',
    hblNumber: '',
    shipperDetails: '',
    consigneeDetails: '',
    notifyParty: '',
    notes: '',
  });

  // Add Container Form
  const [addContainerForm, setAddContainerForm] = useState({
    containerNumber: '',
    containerType: "40' HC",
    sealNumber: '',
    grossWeightKg: '',
    cbm: '',
    freeDays: '14',
    returnDeadline: '',
    demurrageRatePerDay: '50',
    depositAmount: '0',
    depositCurrency: 'USD',
    notes: '',
  });

  // Edit Container Form
  const [editContainerForm, setEditContainerForm] = useState({
    sealNumber: '',
    freeDays: '14',
    returnDeadline: '',
    demurrageRatePerDay: '50',
    depositAmount: '0',
    depositCurrency: 'USD',
    depositStatus: 'not_required' as any,
    notes: '',
  });

  const fetchJob = async () => {
    if (!jobId) return;
    try {
      const data = await maritimeApi.getJobById(jobId);
      setJob(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (open && jobId) {
      fetchJob();
    } else if (!open) {
      setJob(null);
    }
  }, [open, jobId]);

  // Populate Edit Voyage form when opening
  const handleOpenEditVoyage = () => {
    if (!job) return;
    setVoyageForm({
      vesselName: job.vessel_name || '',
      voyageNumber: job.voyage_number || '',
      bookingNumber: job.booking_number || '',
      etd: job.etd ? job.etd.split('T')[0] : '',
      eta: job.eta ? job.eta.split('T')[0] : '',
      portCutOff: job.port_cut_off ? job.port_cut_off.split('T')[0] : '',
      blType: job.bl_type || 'sea_waybill',
      mblNumber: job.mbl_number || '',
      hblNumber: job.hbl_number || '',
      shipperDetails: job.shipper_details || '',
      consigneeDetails: job.consignee_details || '',
      notifyParty: job.notify_party || '',
      notes: job.notes || '',
    });
    setShowEditVoyage(true);
  };

  const handleSaveVoyage = async () => {
    if (!job) return;
    try {
      await maritimeApi.updateJob(job.id, voyageForm);
      toast.success('تم تحديث بيانات الرحلة والبوالص بنجاح');
      setShowEditVoyage(false);
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث بيانات الرحلة');
    }
  };

  // Add Container
  const handleSaveAddContainer = async () => {
    if (!job) return;
    if (!addContainerForm.containerNumber.trim()) {
      toast.warning('يرجى إدخال رقم الحاوية (مثال: MSCU1234567)');
      return;
    }
    try {
      await maritimeApi.createContainer({
        jobId: job.id,
        containerNumber: addContainerForm.containerNumber,
        containerType: addContainerForm.containerType,
        sealNumber: addContainerForm.sealNumber || undefined,
        grossWeightKg: Number(addContainerForm.grossWeightKg) || 0,
        cbm: Number(addContainerForm.cbm) || 0,
        freeDays: Number(addContainerForm.freeDays) || 14,
        returnDeadline: addContainerForm.returnDeadline || undefined,
        demurrageRatePerDay: Number(addContainerForm.demurrageRatePerDay) || 50,
        depositAmount: Number(addContainerForm.depositAmount) || 0,
        depositCurrency: addContainerForm.depositCurrency || 'USD',
        notes: addContainerForm.notes || undefined,
      });
      toast.success(`تمت إضافة الحاوية [${addContainerForm.containerNumber.toUpperCase()}] بنجاح`);
      setShowAddContainer(false);
      setAddContainerForm({
        containerNumber: '',
        containerType: "40' HC",
        sealNumber: '',
        grossWeightKg: '',
        cbm: '',
        freeDays: '14',
        returnDeadline: '',
        demurrageRatePerDay: '50',
        depositAmount: '0',
        depositCurrency: 'USD',
        notes: '',
      });
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل إضافة الحاوية');
    }
  };

  // Edit Container
  const handleOpenEditContainer = (c: MaritimeContainer) => {
    setEditingContainer(c);
    setEditContainerForm({
      sealNumber: c.seal_number || '',
      freeDays: String(c.free_days || 14),
      returnDeadline: c.return_deadline ? c.return_deadline.split('T')[0] : '',
      demurrageRatePerDay: String(c.demurrage_rate_per_day || 50),
      depositAmount: String(c.deposit_amount || 0),
      depositCurrency: c.deposit_currency || 'USD',
      depositStatus: c.deposit_status || 'not_required',
      notes: c.notes || '',
    });
  };

  const handleSaveEditContainer = async () => {
    if (!editingContainer) return;
    try {
      await maritimeApi.updateContainer(editingContainer.id, {
        sealNumber: editContainerForm.sealNumber || undefined,
        freeDays: Number(editContainerForm.freeDays) || 14,
        returnDeadline: editContainerForm.returnDeadline || undefined,
        demurrageRatePerDay: Number(editContainerForm.demurrageRatePerDay) || 50,
        depositAmount: Number(editContainerForm.depositAmount) || 0,
        depositCurrency: editContainerForm.depositCurrency,
        depositStatus: editContainerForm.depositStatus,
        notes: editContainerForm.notes || undefined,
      });
      toast.success('تم تحديث بيانات الحاوية بنجاح');
      setEditingContainer(null);
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث الحاوية');
    }
  };

  // Container quick movement triggers
  const handleContainerDischarge = async (c: MaritimeContainer) => {
    const confirmed = await systemConfirm({
      title: 'تسجيل تفريغ الحاوية بميناء الوصول (Discharged)',
      badge: c.container_number,
      message: `هل تريد تسجيل تفريغ الحاوية ${c.container_number} وبدء سريان فترة السماح (${c.free_days || 14} يوم)؟`,
      confirmText: 'تأكيد التفريغ',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      const nowIso = new Date().toISOString();
      await maritimeApi.updateContainer(c.id, { dischargedAt: nowIso });
      toast.success(`تم تسجيل تفريغ الحاوية ${c.container_number} وحساب مهلة الإرجاع`);
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل تفريغ الحاوية');
    }
  };

  const handleContainerGateOut = async (c: MaritimeContainer) => {
    const confirmed = await systemConfirm({
      title: 'تسجيل خروج الحاوية من بوابة الميناء (Gate Out)',
      badge: c.container_number,
      message: `هل تم خروج الحاوية ${c.container_number} من ساحات الميناء وتوجيهها لمقر العميل؟`,
      confirmText: 'تسجيل الخروج',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      const nowIso = new Date().toISOString();
      await maritimeApi.updateContainer(c.id, { gatedOutAt: nowIso });
      toast.success(`تم تسجيل خروج الحاوية ${c.container_number} بنجاح`);
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل خروج الحاوية');
    }
  };

  const handleContainerEmptyReturned = async (c: MaritimeContainer) => {
    const confirmed = await systemConfirm({
      title: 'تسجيل إرجاع الحاوية الفارغة (Empty Returned)',
      badge: c.container_number,
      message: `هل تم تسليم الحاوية الفارغة ${c.container_number} لساحة الخط الملاحي وإغلاق مهلة الغرامات؟`,
      confirmText: 'تأكيد الإرجاع',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      const nowIso = new Date().toISOString();
      await maritimeApi.updateContainer(c.id, {
        emptyReturnedAt: nowIso,
        depositStatus: 'pending_return_proof',
      });
      toast.success(`تم إغلاق ملف الحاوية ${c.container_number} وتحويل التأمين لمعالجة الرد`);
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل إرجاع الحاوية');
    }
  };

  // Quick Billing / Voucher Triggers
  const handleIssueSalesInvoice = async () => {
    if (!job) return;
    const confirmed = await systemConfirm({
      title: 'إصدار فاتورة مبيعات خدمات ملاحية للعميل',
      badge: job.customer_name,
      message: `سيتم توليد مسودة فاتورة مبيعات بقيمة ${currencySymbol} ${Number(job.client_invoiced_total || 0).toLocaleString()} لحساب العميل [${job.customer_name}] وتوجيهها لمركز تكلفة العملية #${job.job_number}.`,
      confirmText: 'إصدار مسودة الفاتورة',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    toast.success(`تم إنشاء فاتورة المبيعات للعميل بنجاح للعملية #${job.job_number}`);
  };

  const handleRecordExpenseVoucher = async () => {
    if (!job) return;
    const confirmed = await systemConfirm({
      title: 'تسجيل سند مصروفات الخط الملاحي والميناء',
      badge: job.shipping_line_name,
      message: `سيتم إنشاء سند استحقاق مصروفات بقيمة ${currencySymbol} ${Number(job.carrier_cost_total || 0).toLocaleString()} لصالح [${job.shipping_line_name}] وخصمه من أرباح العملية.`,
      confirmText: 'تسجيل سند المصروفات',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    toast.success(`تم تسجيل سند المصروفات الملاحية للعملية #${job.job_number}`);
  };

  if (!open) return null;

  if (!job) {
    return (
      <StandardDialog
        open={open}
        onClose={onClose}
        title="ملف العملية الملاحية"
        subtitle="جاري جلب تفاصيل وبيانات العملية..."
        width="min(1180px, 95vw)"
        height="min(780px, 90vh)"
        loading={true}
        loadingText="جاري تحميل ملف العملية الملاحية..."
      >
        <div style={{ minHeight: '420px' }} />
      </StandardDialog>
    );
  }

  const handleAdvanceMilestone = async () => {
    try {
      await maritimeApi.addJobMilestone(job.id, nextMilestone, milestoneNotes || undefined);
      setMilestoneNotes('');
      await fetchJob();
      onUpdated();
      toast.success('تم تسجيل المرحلة الملاحية وتحديث التتبع بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث المرحلة الملاحية');
    }
  };

  const handleReleaseDo = async () => {
    const confirmed = await systemConfirm({
      title: 'اعتماد وتسليم إذن التسليم الملاحي D/O',
      badge: job.job_number,
      message: 'هل أنت متأكد من اعتماد وتسليم إذن التسليم الملاحي الرسمي (Delivery Order) للعميل؟',
      impactItems: [
        'تسجيل مرحلة D/O الرسمية في سجل الشحنة وتحديث بوابات التتبع للعميل.',
        'إتمام إجراءات الإفراج الجمركي والسماح بخروج الحاويات من ساحات الميناء.',
      ],
      confirmText: 'اعتماد وتسليم إذن الإفراج',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      await maritimeApi.releaseDeliveryOrder(job.id);
      await fetchJob();
      onUpdated();
      toast.success('تم اعتماد وتسليم إذن التسليم D/O بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسليم إذن الإفراج');
    }
  };

  const trackingUrl = job.tracking_token
    ? `${window.location.origin}/public/track/${job.tracking_token}`
    : '';

  const handleCopyTrackingLink = () => {
    if (trackingUrl) {
      navigator.clipboard.writeText(trackingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <>
      <StandardDialog
        open={open}
        onClose={onClose}
        title={`ملف العملية الملاحية: ${job.job_number}`}
        subtitle={`العميل: ${job.customer_name} | المسار: ${job.pol_name} إلى ${job.pod_name}`}
        width="min(1180px, 95vw)"
        height="min(780px, 90vh)"
        footerActions={(
          <StandardDialogFooter
            onCancel={onClose}
            cancelText="إغلاق"
          />
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }} dir="rtl">
          {/* هيدر التبويبات القياسي */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'overview' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'overview' ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              بيانات الرحلة والحجز
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('containers')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'containers' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'containers' ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              الحاويات ({job.containers?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'milestones' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'milestones' ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              مسار التتبع DCSA ({job.milestones?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'finance' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'finance' ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              ربحية العملية (Job P&L)
            </button>
          </div>

          {/* جسم التبويبات الموحد بارتفاع ثابت */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingInlineEnd: '4px' }}>
            {/* Tab 1: نظرة عامة وبيانات الحجز */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* شريط الإجراءات لمودال التعديل */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#170e5e' }}>
                    تفاصيل بوالص الشحن والرحلة البحرية
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenEditVoyage}
                    style={{
                      padding: '6px 14px',
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    تعديل بيانات الرحلة والبوالص
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>الخط الملاحي ورقم الحجز</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                      {job.shipping_line_name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                      رقم الحجز (Booking No): <strong>{job.booking_number || 'غير محدد'}</strong>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>السفينة ورقم الرحلة (Vessel / Voyage)</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                      {job.vessel_name || 'لم تسجل السفينة'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                      الرحلة: {job.voyage_number || '-'} | طريقة السداد: {job.payment_term}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>مواعيد الإبحار والوصول (ETD / ETA)</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#170e5e', marginTop: '4px' }}>
                      الإبحار: {job.etd || 'قيد الجدولة'} ➔ الوصول: {job.eta || 'قيد الجدولة'}
                    </div>
                    {job.port_cut_off && (
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>
                        إغلاق الميناء Cut-off: {job.port_cut_off}
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>بوالص الشحن (B/L Details)</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#170e5e', marginTop: '4px' }}>
                      Master B/L: {job.mbl_number || 'قيد الإصدار'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                      House B/L: {job.hbl_number || 'قيد الإصدار'} ({job.bl_type})
                    </div>
                  </div>

                  {/* الشاحن والمستلم */}
                  {(job.shipper_details || job.consignee_details) && (
                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>بيانات الشاحن (Shipper Details)</div>
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {job.shipper_details || 'غير مسجل'}
                        </div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>بيانات المستلم (Consignee Details)</div>
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {job.consignee_details || 'غير مسجل'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* رابط تتبع العميل السحابي المباشر */}
                  <div style={{ gridColumn: '1 / -1', background: '#eff6ff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af' }}>
                        رابط التتبع المباشر للعميل (Client Live Tracking Link):
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px', wordBreak: 'break-all' }}>
                        {trackingUrl || 'جاري توليد الرابط...'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyTrackingLink}
                      style={{
                        padding: '6px 14px',
                        background: copiedLink ? '#22c55e' : '#170e5e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: قائمة الحاويات والتأمين */}
            {activeTab === 'containers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#170e5e' }}>
                    إدارة الحاويات وتتبع فترة السماح والغرامات
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddContainer(true)}
                    style={{
                      padding: '6px 14px',
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    إضافة حاوية جديدة
                  </button>
                </div>

                {job.containers?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.85rem' }}>
                    لا توجد حاويات مسجلة في هذا الملف بعد. انقر على "إضافة حاوية جديدة" لإدراج حاويات الشحنة.
                  </div>
                ) : (
                  job.containers?.map((c) => (
                    <div key={c.id} style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#170e5e' }}>{c.container_number}</span>
                          <span style={{ padding: '3px 10px', background: '#f1f5f9', color: '#1e293b', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>
                            {c.container_type}
                          </span>
                          {c.seal_number && (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#fafafa', padding: '2px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                              ختم: {c.seal_number}
                            </span>
                          )}
                        </div>
                        <div>
                          {c.empty_returned_at ? (
                            <span style={{ padding: '4px 12px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                              تم إرجاع الفارغ بنجاح
                            </span>
                          ) : (
                            <span style={{ padding: '4px 12px', background: c.is_overdue ? '#fef2f2' : '#f0fdf4', color: c.is_overdue ? '#b91c1c' : '#15803d', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                              {c.is_overdue ? `تجاوزت المهلة (${c.overdue_days || 0} يوم غرامة)` : 'سارية ضمن فترة السماح'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>فترة السماح: </span>
                          <strong style={{ color: '#0f172a' }}>{c.free_days || 14} يوم</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>موعد الإرجاع: </span>
                          <strong style={{ color: c.is_overdue ? '#b91c1c' : '#0f172a' }}>{c.return_deadline || 'لم يحدد'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>مبلغ التأمين: </span>
                          <strong style={{ color: '#0f172a' }}>{Number(c.deposit_amount).toLocaleString()} {c.deposit_currency || 'USD'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>حالة التأمين: </span>
                          <strong style={{ color: '#170e5e' }}>{c.deposit_status || 'not_required'}</strong>
                        </div>
                      </div>

                      {/* أزرار الإجراءات السريعة للحاوية */}
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditContainer(c)}
                          style={{
                            padding: '4px 10px',
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          تعديل الحاوية
                        </button>
                        {!c.discharged_at && (
                          <button
                            type="button"
                            onClick={() => handleContainerDischarge(c)}
                            style={{
                              padding: '4px 10px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            تسجيل تفريغ الميناء (Discharged)
                          </button>
                        )}
                        {c.discharged_at && !c.gated_out_at && (
                          <button
                            type="button"
                            onClick={() => handleContainerGateOut(c)}
                            style={{
                              padding: '4px 10px',
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            تسجيل خروج البوابة (Gate Out)
                          </button>
                        )}
                        {!c.empty_returned_at && (
                          <button
                            type="button"
                            onClick={() => handleContainerEmptyReturned(c)}
                            style={{
                              padding: '4px 10px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            تسجيل إرجاع الفارغ (Empty Returned)
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: مسار التتبع DCSA */}
            {activeTab === 'milestones' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* ترقية المرحلة */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>ترقية المرحلة الملاحية (DCSA Milestone)</div>
                    <CustomSelect
                      value={nextMilestone}
                      onChange={(val) => setNextMilestone(val as DcsaMilestoneKey)}
                      options={DCSA_STANDARD_MILESTONES.map((m) => ({
                        value: m.key,
                        label: `[${m.key}] ${m.title_ar} - ${m.title_en}`,
                      }))}
                      placeholder="اختر المرحلة الملاحية..."
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>ملاحظات المرحلة أو الموقع</div>
                    <input
                      type="text"
                      value={milestoneNotes}
                      onChange={(e) => setMilestoneNotes(e.target.value)}
                      placeholder="مثال: رست السفينة برصيف 45"
                      style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAdvanceMilestone}
                    style={{
                      height: '36px',
                      marginTop: '18px',
                      padding: '0 16px',
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    تحديث المرحلة
                  </button>
                </div>

                {/* زر تسليم إذن التسليم D/O */}
                {!job.delivery_order_released && (
                  <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
                      إذن التسليم (Delivery Order D/O) محتجز حتى تحصيل مستحقات الشحن.
                    </div>
                    <button
                      type="button"
                      onClick={handleReleaseDo}
                      style={{
                        padding: '6px 14px',
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      اعتماد وتسليم إذن الإفراج (Release D/O)
                    </button>
                  </div>
                )}

                {/* السجل الزمني للمحطات */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {job.milestones?.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{m.milestone_title}</div>
                          {m.notes && <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{m.notes}</div>}
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(m.occurred_at).toLocaleString('ar-EG')}
                          </div>
                        </div>
                      </div>

                      {job.customer_phone && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const alertData = await maritimeApi.getJobWhatsAppAlert(job.id, m.milestone_key);
                              const cleanPhone = (alertData.customerPhone || job.customer_phone || '').replace(/[^0-9]/g, '');
                              if (cleanPhone) {
                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(alertData.message)}`, '_blank');
                              } else {
                                toast.warning('لا يوجد رقم هاتف مسجل للعميل');
                              }
                            } catch (err: any) {
                              toast.error(err?.message || 'فشل توليد رسالة واتساب');
                            }
                          }}
                          title="إرسال إشعار بالواتساب للعميل"
                          style={{
                            padding: '4px 8px',
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          إشعار واتساب
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: ربحية العملية والحسابات */}
            {activeTab === 'finance' && (() => {
              const revenue = Number(job.client_invoiced_total || 0);
              const carrierCost = Number(job.carrier_cost_total || 0);
              const otherCosts = Number(job.other_costs_total || 0);
              const totalCost = carrierCost + otherCosts;
              const netProfit = Number(job.net_profit || (revenue - totalCost));
              const marginPercent = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';
              const containerDeposits = job.containers?.reduce((acc, c) => acc + (Number(c.deposit_amount) || 0), 0) || 0;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* شريط الإجراءات المالية السريعة */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#170e5e' }}>
                      الإجراءات المالية وتصدير الفواتير والسندات
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleIssueSalesInvoice}
                        style={{
                          padding: '6px 14px',
                          background: '#170e5e',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        إصدار فاتورة مبيعات للعميل
                      </button>
                      <button
                        type="button"
                        onClick={handleRecordExpenseVoucher}
                        style={{
                          padding: '6px 14px',
                          background: '#f1f5f9',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        تسجيل سند مصروفات الخط/الميناء
                      </button>
                    </div>
                  </div>

                  {/* 1. الثلاث بطاقات المالية المعتمدة (Clean White KPI Cards bound to system currency) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {/* Card 1: Revenue */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        borderTop: '3px solid #170e5e',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الفاتورة للعميل</span>
                        <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                          Revenue
                        </span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#170e5e', letterSpacing: '-0.02em' }}>
                        {currencySymbol} {revenue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        مبيعات الشحن والخدمات البحرية
                      </div>
                    </div>

                    {/* Card 2: Cost */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        borderTop: '3px solid #ef4444',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تكلفة الخط والموانئ</span>
                        <span style={{ padding: '2px 8px', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                          Direct Cost
                        </span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: totalCost > 0 ? '#b91c1c' : '#0f172a', letterSpacing: '-0.02em' }}>
                        {currencySymbol} {totalCost.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        نولون بحري ومصروفات محطات الموانئ
                      </div>
                    </div>

                    {/* Card 3: Net Profit */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        borderTop: '3px solid #10b981',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>صافي ربح العملية</span>
                        <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#166534', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                          هامش: {marginPercent}%
                        </span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: netProfit >= 0 ? '#15803d' : '#b91c1c', letterSpacing: '-0.02em' }}>
                        {currencySymbol} {netProfit.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        المساهمة الصافية في أرباح التشغيل
                      </div>
                    </div>
                  </div>

                  {/* 2. جدول البيان المالي وتفكيك التكاليف والإيرادات */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 14px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                        بيان وتفكيك الحسابات التقديرية والفعلية للعملية
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        العملة الأساسية للنظام: ({currencySymbol})
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                          <th style={{ padding: '8px 14px', fontWeight: 700 }}>بند الحساب</th>
                          <th style={{ padding: '8px 14px', fontWeight: 700 }}>الطرف والجهة</th>
                          <th style={{ padding: '8px 14px', fontWeight: 700 }}>التصنيف المحاسبي</th>
                          <th style={{ padding: '8px 14px', fontWeight: 700 }}>المبلغ</th>
                          <th style={{ padding: '8px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 700, color: '#170e5e' }}>إيراد الشحن البحري للعميل (Ocean Freight Billed)</td>
                          <td style={{ padding: '8px 14px', color: '#334155' }}>{job.customer_name}</td>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>إيراد تشغيلي معتمد</td>
                          <td style={{ padding: '8px 14px', fontWeight: 800, color: '#170e5e' }}>{currencySymbol} {revenue.toLocaleString()}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>مفوتر بالكامل</span>
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>نولون الخط الملاحي الأساسي (Carrier Ocean Freight)</td>
                          <td style={{ padding: '8px 14px', color: '#334155' }}>{job.shipping_line_name || 'غير محدد'}</td>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>تكلفة شحن مباشرة</td>
                          <td style={{ padding: '8px 14px', fontWeight: 800, color: totalCost > 0 ? '#b91c1c' : '#64748b' }}>{currencySymbol} {carrierCost.toLocaleString()}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>مطابقة الخط</span>
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>مصروفات الموانئ والمناولة (Port & THC Charges)</td>
                          <td style={{ padding: '8px 14px', color: '#334155' }}>{job.pol_name} ➔ {job.pod_name}</td>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>خدمات موانئ وتداول</td>
                          <td style={{ padding: '8px 14px', fontWeight: 800, color: otherCosts > 0 ? '#b91c1c' : '#64748b' }}>
                            {otherCosts > 0 ? `${currencySymbol} ${otherCosts.toLocaleString()}` : 'ضمن النولون'}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>تسوية مباشرة</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>تأمين الحاويات المسترد (Container Deposit)</td>
                          <td style={{ padding: '8px 14px', color: '#334155' }}>خزينة أمانات الخط الملاحي</td>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>أمانات مستردة (خارج الأرباح)</td>
                          <td style={{ padding: '8px 14px', fontWeight: 800, color: '#475569' }}>
                            {currencySymbol} {containerDeposits.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>تحت التسوية</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 3. بطاقة تكامل دليل الحسابات ومراكز التكلفة */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          color: '#1e40af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          flexShrink: 0,
                        }}
                      >
                        GL
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#170e5e' }}>
                          {job.cost_center_id ? `مركز تكلفة #${job.cost_center_id} (${job.job_number})` : `مركز تكلفة ملاحي #${job.job_number}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                          مربوط بدليل الحسابات العام (شجرة الحسابات ➔ مراكز تكلفة الشحن واللوجستيات)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        الترحيل الآلي للقيود مفعل
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        {job.payment_term === 'prepaid' ? 'سداد مسبق (Prepaid)' : 'تحصيل بميناء الوصول (Collect)'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </StandardDialog>

      {/* Modal 1: Edit Voyage Modal */}
      {showEditVoyage && (
        <StandardDialog
          open={showEditVoyage}
          onClose={() => setShowEditVoyage(false)}
          title="تعديل بيانات الرحلة والبوالص"
          subtitle={`العملية الملاحية: ${job.job_number}`}
          width="min(760px, 90vw)"
          footerActions={(
            <StandardDialogFooter
              onConfirm={handleSaveVoyage}
              confirmText="حفظ التعديلات"
              onCancel={() => setShowEditVoyage(false)}
              cancelText="إلغاء"
            />
          )}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} dir="rtl">
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>اسم السفينة (Vessel Name)</label>
              <input
                type="text"
                value={voyageForm.vesselName}
                onChange={(e) => setVoyageForm({ ...voyageForm, vesselName: e.target.value })}
                placeholder="مثال: MSC MAESTRO"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رقم الرحلة (Voyage No)</label>
              <input
                type="text"
                value={voyageForm.voyageNumber}
                onChange={(e) => setVoyageForm({ ...voyageForm, voyageNumber: e.target.value })}
                placeholder="مثال: 412W"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رقم حجز الخط (Booking No)</label>
              <input
                type="text"
                value={voyageForm.bookingNumber}
                onChange={(e) => setVoyageForm({ ...voyageForm, bookingNumber: e.target.value })}
                placeholder="مثال: BKG-994821"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>نوع البوليسة (B/L Release Type)</label>
              <CustomSelect
                value={voyageForm.blType}
                onChange={(val) => setVoyageForm({ ...voyageForm, blType: val as any })}
                options={[
                  { value: 'original', label: 'Original B/L (أصل البوليسة الورقية)' },
                  { value: 'telex_release', label: 'Telex Release (تلكس ريليز بدون أصل)' },
                  { value: 'sea_waybill', label: 'Express Sea Waybill (بوليصة إلكترونية مباشرة)' },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>تاريخ الإبحار المتوقع (ETD)</label>
              <input
                type="date"
                value={voyageForm.etd}
                onChange={(e) => setVoyageForm({ ...voyageForm, etd: e.target.value })}
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>تاريخ الوصول المتوقع (ETA)</label>
              <input
                type="date"
                value={voyageForm.eta}
                onChange={(e) => setVoyageForm({ ...voyageForm, eta: e.target.value })}
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Master B/L No</label>
              <input
                type="text"
                value={voyageForm.mblNumber}
                onChange={(e) => setVoyageForm({ ...voyageForm, mblNumber: e.target.value })}
                placeholder="مثال: MSK9823412"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>House B/L No</label>
              <input
                type="text"
                value={voyageForm.hblNumber}
                onChange={(e) => setVoyageForm({ ...voyageForm, hblNumber: e.target.value })}
                placeholder="مثال: HBL-2026-001"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>بيانات الشاحن (Shipper Details)</label>
              <textarea
                value={voyageForm.shipperDetails}
                onChange={(e) => setVoyageForm({ ...voyageForm, shipperDetails: e.target.value })}
                rows={2}
                placeholder="اسم شركة الشحن، العنوان، ورقم التواصل"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>بيانات المستلم (Consignee Details)</label>
              <textarea
                value={voyageForm.consigneeDetails}
                onChange={(e) => setVoyageForm({ ...voyageForm, consigneeDetails: e.target.value })}
                rows={2}
                placeholder="اسم العميل المستلم، العنوان، ورقم التواصل"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.82rem' }}
              />
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal 2: Add Container Modal */}
      {showAddContainer && (
        <StandardDialog
          open={showAddContainer}
          onClose={() => setShowAddContainer(false)}
          title="إضافة حاوية جديدة للشحنة"
          subtitle={`العملية: ${job.job_number} | الخط: ${job.shipping_line_name}`}
          width="min(680px, 90vw)"
          footerActions={(
            <StandardDialogFooter
              onConfirm={handleSaveAddContainer}
              confirmText="إضافة الحاوية"
              onCancel={() => setShowAddContainer(false)}
              cancelText="إلغاء"
            />
          )}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} dir="rtl">
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رقم الحاوية (Container Number) *</label>
              <input
                type="text"
                value={addContainerForm.containerNumber}
                onChange={(e) => setAddContainerForm({ ...addContainerForm, containerNumber: e.target.value.toUpperCase() })}
                placeholder="مثال: MSCU9842104"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>نوع وحجم الحاوية</label>
              <CustomSelect
                value={addContainerForm.containerType}
                onChange={(val) => setAddContainerForm({ ...addContainerForm, containerType: val })}
                options={[
                  { value: "20' GP", label: "20' GP - Standard Dry Container" },
                  { value: "40' GP", label: "40' GP - Standard Dry Container" },
                  { value: "40' HC", label: "40' HC - High Cube Container" },
                  { value: "45' HC", label: "45' HC - High Cube Extra" },
                  { value: "20' RF", label: "20' RF - Reefer Container" },
                  { value: "40' RH", label: "40' RH - Reefer High Cube" },
                  { value: "20' OT", label: "20' OT - Open Top Container" },
                  { value: "40' OT", label: "40' OT - Open Top Container" },
                  { value: "20' FR", label: "20' FR - Flat Rack Container" },
                  { value: "40' FR", label: "40' FR - Flat Rack Container" },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رقم الختم الرصاصي (Seal No)</label>
              <input
                type="text"
                value={addContainerForm.sealNumber}
                onChange={(e) => setAddContainerForm({ ...addContainerForm, sealNumber: e.target.value })}
                placeholder="مثال: SL-984210"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>فترة السماح (Free Days)</label>
              <input
                type="number"
                value={addContainerForm.freeDays}
                onChange={(e) => setAddContainerForm({ ...addContainerForm, freeDays: e.target.value })}
                placeholder="14"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>مبلغ غرامة التأخير اليومية</label>
              <input
                type="number"
                value={addContainerForm.demurrageRatePerDay}
                onChange={(e) => setAddContainerForm({ ...addContainerForm, demurrageRatePerDay: e.target.value })}
                placeholder="50"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>مبلغ التأمين المحتجز للخط</label>
              <input
                type="number"
                value={addContainerForm.depositAmount}
                onChange={(e) => setAddContainerForm({ ...addContainerForm, depositAmount: e.target.value })}
                placeholder="0"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal 3: Edit Container Modal */}
      {editingContainer && (
        <StandardDialog
          open={!!editingContainer}
          onClose={() => setEditingContainer(null)}
          title={`تعديل بيانات الحاوية: ${editingContainer.container_number}`}
          subtitle={`النوع: ${editingContainer.container_type}`}
          width="min(680px, 90vw)"
          footerActions={(
            <StandardDialogFooter
              onConfirm={handleSaveEditContainer}
              confirmText="حفظ التعديلات"
              onCancel={() => setEditingContainer(null)}
              cancelText="إلغاء"
            />
          )}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} dir="rtl">
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رقم الختم الرصاصي (Seal No)</label>
              <input
                type="text"
                value={editContainerForm.sealNumber}
                onChange={(e) => setEditContainerForm({ ...editContainerForm, sealNumber: e.target.value })}
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>فترة السماح (أيام)</label>
              <input
                type="number"
                value={editContainerForm.freeDays}
                onChange={(e) => setEditContainerForm({ ...editContainerForm, freeDays: e.target.value })}
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>آخر موعد للإرجاع (Return Deadline)</label>
              <input
                type="date"
                value={editContainerForm.returnDeadline}
                onChange={(e) => setEditContainerForm({ ...editContainerForm, returnDeadline: e.target.value })}
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>مبلغ غرامة التأخير اليومية</label>
              <input
                type="number"
                value={editContainerForm.demurrageRatePerDay}
                onChange={(e) => setEditContainerForm({ ...editContainerForm, demurrageRatePerDay: e.target.value })}
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>مبلغ التأمين المحتجز</label>
              <input
                type="number"
                value={editContainerForm.depositAmount}
                onChange={(e) => setEditContainerForm({ ...editContainerForm, depositAmount: e.target.value })}
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>حالة أمانة التأمين</label>
              <CustomSelect
                value={editContainerForm.depositStatus}
                onChange={(val) => setEditContainerForm({ ...editContainerForm, depositStatus: val as any })}
                options={[
                  { value: 'not_required', label: 'غير مطلوبة / بدون تأمين' },
                  { value: 'held_by_line', label: 'محتجزة لدى التوكيل الملاحي' },
                  { value: 'pending_return_proof', label: 'بانتظار إثبات إرجاع الفارغ' },
                  { value: 'refunded_to_treasury', label: 'تم الاسترداد للخزينة' },
                ]}
              />
            </div>
          </div>
        </StandardDialog>
      )}
    </>
  );
}
