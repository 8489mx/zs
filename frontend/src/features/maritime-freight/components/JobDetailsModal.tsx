import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { maritimeApi, MaritimeJob, MaritimeContainer } from '../api/maritime-freight.api';
import { DCSA_STANDARD_MILESTONES, DcsaMilestoneKey } from '../maritime-freight.types';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { printOceanBillOfLading, printDeliveryOrder, printArrivalNotice } from '../utils/maritime-documents';

interface JobDetailsModalProps {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function JobDetailsModal({ open, jobId, onClose, onUpdated }: JobDetailsModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const [job, setJob] = useState<MaritimeJob | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'containers' | 'milestones' | 'documents' | 'finance'>('overview');
  const [nextMilestone, setNextMilestone] = useState<DcsaMilestoneKey>('GTI');
  const [milestoneNotes, setMilestoneNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingWhatsAppKey, setSendingWhatsAppKey] = useState<string | null>(null);

  // Sub-Modals
  const [showEditVoyage, setShowEditVoyage] = useState(false);
  const [showAddContainer, setShowAddContainer] = useState(false);
  const [editingContainer, setEditingContainer] = useState<MaritimeContainer | null>(null);

  // Financial Posting Modals State
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceAmountInput, setInvoiceAmountInput] = useState('');
  const [invoiceNotesInput, setInvoiceNotesInput] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseAmountInput, setExpenseAmountInput] = useState('');
  const [expenseTypeInput, setExpenseTypeInput] = useState<'carrier' | 'port' | 'other'>('carrier');
  const [expensePaymentMethodInput, setExpensePaymentMethodInput] = useState<'payable' | 'cash' | 'bank'>('payable');
  const [expenseNotesInput, setExpenseNotesInput] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Smart Booking Extraction State
  const [showSmartParseModal, setShowSmartParseModal] = useState(false);
  const [smartParseText, setSmartParseText] = useState('');
  const [isParsingSmartBooking, setIsParsingSmartBooking] = useState(false);
  const [parsedBookingData, setParsedBookingData] = useState<any | null>(null);
  const [isApplyingParsedData, setIsApplyingParsedData] = useState(false);

  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

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

  const fetchLedger = async (id: string) => {
    try {
      setLoadingLedger(true);
      const res = await maritimeApi.getJobFinancialLedger(id);
      setLedgerEntries(res.entries || []);
    } catch {
      setLedgerEntries([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (open && jobId) {
      fetchJob();
    } else if (!open) {
      setJob(null);
      setLedgerEntries([]);
    }
  }, [open, jobId]);

  useEffect(() => {
    if (activeTab === 'finance' && job?.id) {
      fetchLedger(String(job.id));
    }
  }, [activeTab, job?.id]);

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
  const handleOpenIssueInvoice = () => {
    if (!job) return;
    setInvoiceAmountInput(String(job.client_invoiced_total || ''));
    setInvoiceNotesInput(`فاتورة مبيعات خدمات ملاحية - العملية #${job.job_number} (${job.customer_name})`);
    setShowInvoiceDialog(true);
  };

  const handleConfirmIssueInvoice = async () => {
    if (!job) return;
    const amount = Number(invoiceAmountInput);
    if (!amount || amount <= 0) {
      toast.warning('يرجى إدخال مبلغ صالح للفاتورة أكبر من صفر');
      return;
    }
    try {
      setIsSubmittingInvoice(true);
      const res = await maritimeApi.issueJobSalesInvoice(job.id, {
        amount,
        notes: invoiceNotesInput,
      });
      toast.success(res.message || `تم إصدار وترحيل فاتورة المبيعات للعملية #${job.job_number} بقيمة ${amount} بنجاح`);
      setShowInvoiceDialog(false);
      await fetchJob();
      await fetchLedger(String(job.id));
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل إصدار فاتورة المبيعات');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleOpenRecordExpense = () => {
    if (!job) return;
    setExpenseAmountInput('');
    setExpenseTypeInput('carrier');
    setExpensePaymentMethodInput('payable');
    setExpenseNotesInput(`سند استحقاق نولون ومصروفات ملاحية - العملية #${job.job_number}`);
    setShowExpenseDialog(true);
  };

  const handleConfirmRecordExpense = async () => {
    if (!job) return;
    const amount = Number(expenseAmountInput);
    if (!amount || amount <= 0) {
      toast.warning('يرجى إدخال مبلغ صالح للمصروف أكبر من صفر');
      return;
    }
    try {
      setIsSubmittingExpense(true);
      const res = await maritimeApi.recordJobExpenseVoucher(job.id, {
        amount,
        expenseType: expenseTypeInput,
        paymentMethod: expensePaymentMethodInput,
        description: expenseNotesInput,
      });
      toast.success(res.message || `تم تسجيل وترحيل سند المصروفات للعملية #${job.job_number} بقيمة ${amount} بنجاح`);
      setShowExpenseDialog(false);
      await fetchJob();
      await fetchLedger(String(job.id));
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل سند المصروفات');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const [isSettlingFromBalance, setIsSettlingFromBalance] = useState(false);

  const handleSettleFromBalance = async () => {
    if (!job?.id) return;
    const availableCredit = Number(job.customerAvailableCredit || 0);
    const invoiced = Number(job.client_invoiced_total || 0);
    const paid = Number(job.client_paid_total || 0);
    const unpaid = Math.max(0, invoiced - paid);
    const amountToSettle = Math.min(unpaid > 0 ? unpaid : invoiced, availableCredit);

    if (amountToSettle <= 0) {
      toast.warning('لا يوجد مبلغ مستحق للتسوية أو رصيد دائن متاح');
      return;
    }

    const confirmed = await systemConfirm({
      title: 'تأكيد سداد الشحنة من الرصيد الدائن',
      message: `هل تريد تسوية وخصم مبلغ ${currencySymbol} ${amountToSettle.toLocaleString()} من رصيد العميل المتاح (${job.customer_name}) لصالح هذه الشحنة؟`,
      confirmText: 'نعم، خصم وسداد الشحنة',
      cancelText: 'إلغاء',
    });

    if (!confirmed) return;

    try {
      setIsSettlingFromBalance(true);
      const res = await maritimeApi.settleJobFromBalance(String(job.id), amountToSettle);
      toast.success(res.message);
      await fetchJob();
      if (activeTab === 'finance') {
        await fetchLedger(String(job.id));
      }
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسوية الشحنة من رصيد العميل');
    } finally {
      setIsSettlingFromBalance(false);
    }
  };

  const handleParseBookingEmail = async () => {
    if (!smartParseText.trim()) {
      toast.warning('يرجى لصق نص إيميل أو تأكيد الحجز أولاً');
      return;
    }
    try {
      setIsParsingSmartBooking(true);
      const res = await maritimeApi.parseBookingText(smartParseText);
      setParsedBookingData(res);
      toast.success('تم استخراج بيانات الحجز والرحلة بنجاح. يرجى مراجعتها واعتمادها');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر استخراج بيانات الحجز');
    } finally {
      setIsParsingSmartBooking(false);
    }
  };

  const handleApplyParsedBooking = async () => {
    if (!job?.id || !parsedBookingData) return;
    try {
      setIsApplyingParsedData(true);
      const updatePayload: any = {};
      if (parsedBookingData.bookingNumber) updatePayload.bookingNumber = parsedBookingData.bookingNumber;
      if (parsedBookingData.vesselName) updatePayload.vesselName = parsedBookingData.vesselName;
      if (parsedBookingData.voyageNumber) updatePayload.voyageNumber = parsedBookingData.voyageNumber;
      if (parsedBookingData.etd) updatePayload.etd = parsedBookingData.etd;
      if (parsedBookingData.eta) updatePayload.eta = parsedBookingData.eta;
      if (parsedBookingData.portCutOff) updatePayload.portCutOff = parsedBookingData.portCutOff;
      if (parsedBookingData.mblNumber) updatePayload.mblNumber = parsedBookingData.mblNumber;
      if (parsedBookingData.shippingLineName) updatePayload.shippingLineName = parsedBookingData.shippingLineName;

      await maritimeApi.updateJob(String(job.id), updatePayload);

      // Auto add containers if found
      if (parsedBookingData.containers && parsedBookingData.containers.length > 0) {
        for (const c of parsedBookingData.containers) {
          try {
            await maritimeApi.createContainer({
              jobId: String(job.id),
              containerNumber: c.containerNumber,
              containerType: c.containerType || '40HC',
              freeDays: 14,
            });
          } catch {
            // ignore duplicates
          }
        }
      }

      toast.success('تم اعتماد وتحديث بيانات الحجز والرحلة بنجاح');
      setShowSmartParseModal(false);
      setSmartParseText('');
      setParsedBookingData(null);
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحديث بيانات الحجز');
    } finally {
      setIsApplyingParsedData(false);
    }
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

  const handleSendDirectWhatsApp = async (milestoneKey: string) => {
    if (!job) return;
    try {
      setSendingWhatsAppKey(milestoneKey);
      const res = await maritimeApi.sendJobMilestoneWhatsApp(job.id, milestoneKey, job.customer_phone || undefined);
      if (res.success) {
        toast.success('تم إرسال إشعار الواتساب للعميل عبر بوابة Cloud WhatsApp بنجاح');
      } else {
        toast.info(res.message || 'تمت محاولة الإرسال');
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل إرسال إشعار الواتساب المباشر');
    } finally {
      setSendingWhatsAppKey(null);
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
              onClick={() => setActiveTab('documents')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'documents' ? '#170e5e' : '#f1f5f9',
                color: activeTab === 'documents' ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              مستندات الشحن وبوالص B/L
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSmartParseText('');
                        setParsedBookingData(null);
                        setShowSmartParseModal(true);
                      }}
                      style={{
                        padding: '6px 14px',
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      استخراج ذكي من إيميل الحجز
                    </button>
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
                </div>

                {/* بطاقة الموقف المالي وحالة السداد */}
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
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: job.payment_status === 'paid' ? '#dcfce7' : job.payment_status === 'partially_paid' ? '#fef3c7' : '#f1f5f9',
                        color: job.payment_status === 'paid' ? '#15803d' : job.payment_status === 'partially_paid' ? '#b45309' : '#64748b',
                      }}
                    >
                      {job.payment_status === 'paid' ? 'مسددة بالكامل' : job.payment_status === 'partially_paid' ? 'مسددة جزئياً' : 'غير مسددة'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      المفوتر: <strong style={{ color: '#170e5e' }}>{currencySymbol} {Number(job.client_invoiced_total || 0).toLocaleString()}</strong>
                      {' | '}
                      المسدد: <strong style={{ color: '#15803d' }}>{currencySymbol} {Number(job.client_paid_total || 0).toLocaleString()}</strong>
                    </div>
                  </div>

                  {Number(job.customerAvailableCredit || 0) > 0 && job.payment_status !== 'paid' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>
                        رصيد العميل المتاح: {currencySymbol} {Number(job.customerAvailableCredit || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={handleSettleFromBalance}
                        disabled={isSettlingFromBalance}
                        style={{
                          padding: '5px 12px',
                          background: '#166534',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: isSettlingFromBalance ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isSettlingFromBalance ? 'جاري السداد...' : 'سداد الشحنة من الرصيد المتاح'}
                      </button>
                    </div>
                  )}
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
                      الإبحار: {job.etd || 'قيد الجدولة'} ← الوصول: {job.eta || 'قيد الجدولة'}
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

                  {/* رادار القمر الصناعي الحي (AIS) وتتبع السفينة */}
                  <div style={{ gridColumn: '1 / -1', background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 800, color: '#170e5e' }}>
                        <AppIcons.Ship size={18} />
                        <span>رادار القمر الصناعي لتتبع حركة السفينة الحية (Live Satellite AIS Tracker)</span>
                      </div>
                      {job.vessel_name && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                          رادار AIS متصل
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                          {job.vessel_name || 'لم يتم تسجيل اسم السفينة بعد'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                          المسار البحري: <strong>{job.pol_name}</strong> ← <strong>{job.pod_name}</strong> {job.voyage_number ? `| رحلة رقم: ${job.voyage_number}` : ''}
                        </div>
                      </div>

                      {job.vessel_name ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <a
                            href={`https://www.marinetraffic.com/en/ais/details/ships/shipid:0/vessel:${encodeURIComponent(job.vessel_name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px',
                              background: '#1d4ed8',
                              color: '#ffffff',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>MarineTraffic AIS</span>
                            <AppIcons.Globe size={14} />
                          </a>
                          <a
                            href={`https://www.vesselfinder.com/vessels?name=${encodeURIComponent(job.vessel_name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px',
                              background: '#047857',
                              color: '#ffffff',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>VesselFinder AIS</span>
                            <AppIcons.Globe size={14} />
                          </a>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                          قم بإدخال اسم السفينة في بيانات الرحلة لتفعيل الرادار الملاحي
                        </div>
                      )}
                    </div>
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
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={sendingWhatsAppKey === m.milestone_key}
                            onClick={() => handleSendDirectWhatsApp(m.milestone_key)}
                            title="إرسال إشعار فوري عبر بوابة Cloud WhatsApp"
                            style={{
                              padding: '4px 10px',
                              background: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: sendingWhatsAppKey === m.milestone_key ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                              opacity: sendingWhatsAppKey === m.milestone_key ? 0.7 : 1,
                            }}
                          >
                            {sendingWhatsAppKey === m.milestone_key ? 'جاري الإرسال...' : 'إرسال سحابي فوري'}
                          </button>
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
                            title="فتح تطبيق أو ويب واتساب مباشرة"
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
                            فتح واتساب
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: مستندات الشحن وبوالص B/L */}
            {activeTab === 'documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#170e5e' }}>
                      مركز إصدار وطباعة المستندات الملاحية المعتمدة (e-B/L & Maritime Documents)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                      طباعة وثائق وبوالص الشحن القياسية المتوافقة مع معايير FIATA و BIMCO والجمارك
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                  {/* 1. بوليصة الشحن B/L */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
                          بوليصة الشحن البحري (Bill of Lading - HBL)
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8' }}>
                          {job.bl_type?.toUpperCase() || 'SEA WAYBILL'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                        وثيقة شحن بحرية متعددة الوسائط قياسية معتمدة تتضمن بيانات الشاحن والمستلم ومواصفات الحاويات والأختام والأوزان، وتصلح للتداول والتوثيق البنكي.
                      </div>
                      <div style={{ marginTop: '10px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                        <div>رقم البوليصة: <strong style={{ color: '#0f172a' }}>{job.hbl_number || job.mbl_number || job.job_number}</strong></div>
                        <div>الحاويات المسجلة: <strong style={{ color: '#0f172a' }}>{job.containers?.length || 0} حاوية</strong></div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => printOceanBillOfLading(job, job.containers || [])}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#170e5e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <AppIcons.FileText size={16} />
                      <span>طباعة بوليصة الشحن الرسمية (Print HBL)</span>
                    </button>
                  </div>

                  {/* 2. إذن التسليم D/O */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
                          إذن التسليم الملاحي (Delivery Order - D/O)
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: job.delivery_order_released ? '#f0fdf4' : '#fffbeb', color: job.delivery_order_released ? '#15803d' : '#b45309' }}>
                          {job.delivery_order_released ? 'معتمد ومسلّم' : 'محتجز مؤقتاً'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                        مستند رسمي موجه لسلطات الميناء والجمارك ومحطات الحاويات للإفراج عن البضائع واستلام الحاويات، موضحاً به مهل السماح ومربعات أختام الإفراج.
                      </div>
                      <div style={{ marginTop: '10px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                        <div>كود إذن التسليم: <strong style={{ color: '#0f172a' }}>DO-{job.job_number}</strong></div>
                        <div>ميناء التفريغ: <strong style={{ color: '#0f172a' }}>{job.pod_name}</strong></div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => printDeliveryOrder(job, job.containers || [])}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <AppIcons.FileText size={16} />
                      <span>طباعة إذن التسليم الملاحي (Print D/O)</span>
                    </button>
                  </div>

                  {/* 3. إشعار الوصول Arrival Notice */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
                          إشعار وصول الشحنة (Consignee Arrival Notice)
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#faf5ff', color: '#7e22ce' }}>
                          إخطار عميل
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                        إشعار رسمي مرسل للمستلم وجهة الإخطار بتوقيت وصول السفينة وتفريغ الحاويات بمحطة الوصول وتفاصيل المستندات المطلوبة لاستلام إذن التسليم.
                      </div>
                      <div style={{ marginTop: '10px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                        <div>تاريخ الوصول المقدر (ETA): <strong style={{ color: '#0f172a' }}>{job.eta || 'قيد الجدولة'}</strong></div>
                        <div>جهة الإخطار: <strong style={{ color: '#0f172a' }}>{job.notify_party || job.customer_name}</strong></div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => printArrivalNotice(job, job.containers || [])}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#475569',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <AppIcons.FileText size={16} />
                      <span>طباعة إشعار الوصول (Arrival Notice)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: ربحية العملية والحسابات */}
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
                        onClick={handleOpenIssueInvoice}
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
                        onClick={handleOpenRecordExpense}
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

                  {/* شريط تسوية رصيد العميل الدائن المتاح */}
                  {Number(job.customerAvailableCredit || 0) > 0 && (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>
                          رصيد العميل المتاح للخصم (دفعات مقدمة / على الحساب): {currencySymbol} {Number(job.customerAvailableCredit || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '2px' }}>
                          العميل ({job.customer_name}) قام بسداد مبالغ على حسابه العام، ويمكنك تسوية نولون هذه الشحنة مباشرة دون الحاجة لطلب تحويل إضافي.
                        </div>
                      </div>

                      {job.payment_status === 'paid' ? (
                        <span style={{ padding: '5px 12px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                          الشحنة مسددة بالكامل
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSettleFromBalance}
                          disabled={isSettlingFromBalance}
                          style={{
                            padding: '7px 16px',
                            background: '#166534',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: isSettlingFromBalance ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSettlingFromBalance ? 'جاري التسوية...' : 'سداد الشحنة من الرصيد المتاح'}
                        </button>
                      )}
                    </div>
                  )}

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
                        <span style={{
                          padding: '2px 8px',
                          background: job.payment_status === 'paid' ? '#dcfce7' : job.payment_status === 'partially_paid' ? '#fef3c7' : '#eff6ff',
                          color: job.payment_status === 'paid' ? '#15803d' : job.payment_status === 'partially_paid' ? '#b45309' : '#1e40af',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}>
                          {job.payment_status === 'paid' ? 'مسدد بالكامل' : job.payment_status === 'partially_paid' ? `مسدد: ${Number(job.client_paid_total || 0).toLocaleString()}` : 'غير مسدد'}
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
                          <td style={{ padding: '8px 14px', color: '#334155' }}>{job.pol_name} ← {job.pod_name}</td>
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
                          مربوط بدليل الحسابات العام (شجرة الحسابات ← مراكز تكلفة الشحن واللوجستيات)
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

                  {/* 4. قيود اليومية المحاسبية المعتمدة (Live GL Entries) */}
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
                        سجل قيود اليومية المحاسبية المعتمدة للعملية (General Ledger)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: ledgerEntries.length > 0 ? '#15803d' : '#64748b', fontWeight: 700 }}>
                        {loadingLedger
                          ? 'جاري تحميل القيود...'
                          : ledgerEntries.length > 0
                          ? `قيود معتمدة (${ledgerEntries.length} حركة)`
                          : 'لا توجد قيود مرحلة بعد'}
                      </div>
                    </div>

                    {ledgerEntries.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                            <th style={{ padding: '6px 12px', fontWeight: 700 }}>رقم القيد والتاريخ</th>
                            <th style={{ padding: '6px 12px', fontWeight: 700 }}>الحساب المحاسبي</th>
                            <th style={{ padding: '6px 12px', fontWeight: 700 }}>البيان / الوصف</th>
                            <th style={{ padding: '6px 12px', fontWeight: 700, color: '#15803d' }}>مدين (Debit)</th>
                            <th style={{ padding: '6px 12px', fontWeight: 700, color: '#b91c1c' }}>دائن (Credit)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerEntries.map((row: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 12px', fontWeight: 700, color: '#170e5e' }}>
                                <div>{row.entry_no}</div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                  {row.entry_date ? new Date(row.entry_date).toLocaleDateString('ar-EG') : '-'}
                                </div>
                              </td>
                              <td style={{ padding: '6px 12px', color: '#0f172a' }}>
                                <span style={{ fontWeight: 700 }}>[{row.account_code}]</span> {row.account_name}
                              </td>
                              <td style={{ padding: '6px 12px', color: '#475569' }}>
                                {row.line_description || row.entry_description}
                              </td>
                              <td style={{ padding: '6px 12px', fontWeight: 700, color: Number(row.debit) > 0 ? '#15803d' : '#94a3b8' }}>
                                {Number(row.debit) > 0 ? `${currencySymbol} ${Number(row.debit).toLocaleString()}` : '-'}
                              </td>
                              <td style={{ padding: '6px 12px', fontWeight: 700, color: Number(row.credit) > 0 ? '#b91c1c' : '#94a3b8' }}>
                                {Number(row.credit) > 0 ? `${currencySymbol} ${Number(row.credit).toLocaleString()}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                        اضغط على "إصدار فاتورة مبيعات" أو "تسجيل سند مصروفات" لترحيل القيود لمركز تكلفة الشحنة.
                      </div>
                    )}
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
          width="min(800px, 92vw)"
          minHeight="auto"
          footerActions={(
            <StandardDialogFooter
              onSubmit={handleSaveVoyage}
              submitText="حفظ التعديلات"
              onCancel={() => setShowEditVoyage(false)}
              cancelText="إلغاء"
            />
          )}
        >
          <style>{`
            .job-submodal-compact .field {
              margin-bottom: 0 !important;
              gap: 3px !important;
            }
            .job-submodal-compact .field span {
              font-size: 0.74rem !important;
              font-weight: 600 !important;
              color: #334155 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            .job-submodal-compact input,
            .job-submodal-compact textarea {
              height: 33px !important;
              font-size: 0.8125rem !important;
              border-radius: 6px !important;
              padding: 0 10px !important;
              border: 1px solid #cbd5e1 !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
              outline: none !important;
              width: 100% !important;
            }
            .job-submodal-compact textarea {
              height: auto !important;
              min-height: 48px !important;
              padding: 6px 10px !important;
              resize: vertical !important;
              line-height: 1.4 !important;
            }
            .job-submodal-compact input:focus,
            .job-submodal-compact textarea:focus {
              border-color: #170e5e !important;
              box-shadow: 0 0 0 1px #170e5e !important;
            }
            .job-submodal-compact .custom-select-trigger {
              min-height: 33px !important;
              height: 33px !important;
              font-size: 0.8125rem !important;
              border-radius: 6px !important;
            }
          `}</style>
          <div className="job-submodal-compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
            {/* Card 1: بيانات السفينة والحجز */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
                <AppIcons.Ship size={15} />
                <span>1. بيانات السفينة ورقم الحجز (Vessel & Booking)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr', gap: '10px' }}>
                <Field label="اسم السفينة (Vessel Name)">
                  <input
                    type="text"
                    value={voyageForm.vesselName}
                    onChange={(e) => setVoyageForm({ ...voyageForm, vesselName: e.target.value })}
                    placeholder="مثال: MSC MAESTRO"
                  />
                </Field>
                <Field label="رقم الرحلة (Voyage No)">
                  <input
                    type="text"
                    value={voyageForm.voyageNumber}
                    onChange={(e) => setVoyageForm({ ...voyageForm, voyageNumber: e.target.value })}
                    placeholder="مثال: 412W"
                  />
                </Field>
                <Field label="رقم حجز الخط (Booking No)">
                  <input
                    type="text"
                    value={voyageForm.bookingNumber}
                    onChange={(e) => setVoyageForm({ ...voyageForm, bookingNumber: e.target.value })}
                    placeholder="مثال: BKG-994821"
                  />
                </Field>
                <Field label="نوع البوليسة (B/L Type)">
                  <CustomSelect
                    value={voyageForm.blType}
                    onChange={(val) => setVoyageForm({ ...voyageForm, blType: val as any })}
                    options={[
                      { value: 'original', label: 'Original B/L (أصل ورقي)' },
                      { value: 'telex_release', label: 'Telex Release (تلكس)' },
                      { value: 'sea_waybill', label: 'Sea Waybill (إلكترونية)' },
                    ]}
                  />
                </Field>
              </div>
            </div>

            {/* Card 2: المواعيد الزمنية للرحلة */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
                <AppIcons.Clock size={15} />
                <span>2. المواعيد الزمنية للرحلة (Schedule Dates)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="تاريخ الإبحار المتوقع (ETD)">
                  <input
                    type="date"
                    value={voyageForm.etd}
                    onChange={(e) => setVoyageForm({ ...voyageForm, etd: e.target.value })}
                  />
                </Field>
                <Field label="تاريخ الوصول المتوقع (ETA)">
                  <input
                    type="date"
                    value={voyageForm.eta}
                    onChange={(e) => setVoyageForm({ ...voyageForm, eta: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            {/* Card 3: بوالص الشحن والأطراف التعاقدية */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
                <AppIcons.FileText size={15} />
                <span>3. بوالص الشحن والأطراف التعاقدية (Bills of Lading & Parties)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <Field label="Master B/L No">
                  <input
                    type="text"
                    value={voyageForm.mblNumber}
                    onChange={(e) => setVoyageForm({ ...voyageForm, mblNumber: e.target.value })}
                    placeholder="مثال: MSK9823412"
                  />
                </Field>
                <Field label="House B/L No">
                  <input
                    type="text"
                    value={voyageForm.hblNumber}
                    onChange={(e) => setVoyageForm({ ...voyageForm, hblNumber: e.target.value })}
                    placeholder="مثال: HBL-260914-0001"
                  />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="بيانات الشاحن (Shipper Details)">
                  <textarea
                    value={voyageForm.shipperDetails}
                    onChange={(e) => setVoyageForm({ ...voyageForm, shipperDetails: e.target.value })}
                    rows={2}
                    placeholder="اسم شركة الشحن، العنوان، ورقم التواصل"
                  />
                </Field>
                <Field label="بيانات المستلم (Consignee Details)">
                  <textarea
                    value={voyageForm.consigneeDetails}
                    onChange={(e) => setVoyageForm({ ...voyageForm, consigneeDetails: e.target.value })}
                    rows={2}
                    placeholder="اسم العميل المستلم، العنوان، ورقم التواصل"
                  />
                </Field>
              </div>
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
          width="min(720px, 92vw)"
          minHeight="auto"
          footerActions={(
            <StandardDialogFooter
              onSubmit={handleSaveAddContainer}
              submitText="إضافة الحاوية"
              onCancel={() => setShowAddContainer(false)}
              cancelText="إلغاء"
            />
          )}
        >
          <div className="job-submodal-compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
            {/* Card 1: مواصفات وهوية الحاوية */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
                <AppIcons.Container size={15} />
                <span>1. هوية الحاوية والمواصفات الفنية (Container Specs)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr', gap: '10px' }}>
                <Field label="رقم الحاوية (Container Number) *">
                  <input
                    type="text"
                    value={addContainerForm.containerNumber}
                    onChange={(e) => setAddContainerForm({ ...addContainerForm, containerNumber: e.target.value.toUpperCase() })}
                    placeholder="مثال: MSCU9842104"
                    style={{ fontWeight: 700 }}
                  />
                </Field>
                <Field label="نوع وحجم الحاوية *">
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
                </Field>
                <Field label="رقم الختم (Seal No)">
                  <input
                    type="text"
                    value={addContainerForm.sealNumber}
                    onChange={(e) => setAddContainerForm({ ...addContainerForm, sealNumber: e.target.value })}
                    placeholder="مثال: SL-984210"
                  />
                </Field>
              </div>
            </div>

            {/* Card 2: شروط السماح والغرامات والتأمين */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
                <AppIcons.Clock size={15} />
                <span>2. شروط السماح والغرامات والتأمين (Free Days & Deposit)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '10px' }}>
                <Field label="فترة السماح (أيام) *">
                  <input
                    type="number"
                    value={addContainerForm.freeDays}
                    onChange={(e) => setAddContainerForm({ ...addContainerForm, freeDays: e.target.value })}
                    placeholder="14"
                  />
                </Field>
                <Field label="غرامة التأخير اليومية ($)">
                  <input
                    type="number"
                    value={addContainerForm.demurrageRatePerDay}
                    onChange={(e) => setAddContainerForm({ ...addContainerForm, demurrageRatePerDay: e.target.value })}
                    placeholder="50"
                  />
                </Field>
                <Field label="مبلغ التأمين المحتجز للخط">
                  <input
                    type="number"
                    value={addContainerForm.depositAmount}
                    onChange={(e) => setAddContainerForm({ ...addContainerForm, depositAmount: e.target.value })}
                    placeholder="0"
                  />
                </Field>
              </div>
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
          width="min(720px, 92vw)"
          minHeight="auto"
          footerActions={(
            <StandardDialogFooter
              onSubmit={handleSaveEditContainer}
              submitText="حفظ التعديلات"
              onCancel={() => setEditingContainer(null)}
              cancelText="إلغاء"
            />
          )}
        >
          <div className="job-submodal-compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
            {/* Card 1: الختم والمواعيد */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
                <AppIcons.Container size={15} />
                <span>1. بيانات الختم والمواعيد (Seal & Schedule)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <Field label="رقم الختم الرصاصي (Seal No)">
                  <input
                    type="text"
                    value={editContainerForm.sealNumber}
                    onChange={(e) => setEditContainerForm({ ...editContainerForm, sealNumber: e.target.value })}
                  />
                </Field>
                <Field label="فترة السماح (أيام)">
                  <input
                    type="number"
                    value={editContainerForm.freeDays}
                    onChange={(e) => setEditContainerForm({ ...editContainerForm, freeDays: e.target.value })}
                  />
                </Field>
                <Field label="آخر موعد للإرجاع (Return Deadline)">
                  <input
                    type="date"
                    value={editContainerForm.returnDeadline}
                    onChange={(e) => setEditContainerForm({ ...editContainerForm, returnDeadline: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            {/* Card 2: الغرامات وحالة التأمين */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
                <AppIcons.DollarSign size={15} />
                <span>2. الغرامات وحالة التأمين (Demurrage & Deposit)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '10px' }}>
                <Field label="غرامة التأخير اليومية ($)">
                  <input
                    type="number"
                    value={editContainerForm.demurrageRatePerDay}
                    onChange={(e) => setEditContainerForm({ ...editContainerForm, demurrageRatePerDay: e.target.value })}
                  />
                </Field>
                <Field label="مبلغ التأمين المحتجز">
                  <input
                    type="number"
                    value={editContainerForm.depositAmount}
                    onChange={(e) => setEditContainerForm({ ...editContainerForm, depositAmount: e.target.value })}
                  />
                </Field>
                <Field label="حالة أمانة التأمين">
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
                </Field>
              </div>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal 4: Issue Sales Invoice Dialog */}
      {showInvoiceDialog && (
        <StandardDialog
          open={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          title="إصدار وترحيل فاتورة مبيعات خدمات ملاحية"
          subtitle={`العملية: ${job.job_number} | العميل: ${job.customer_name}`}
          width="min(580px, 95vw)"
          minHeight="auto"
          footerActions={(
            <StandardDialogFooter
              onSubmit={handleConfirmIssueInvoice}
              submitText={isSubmittingInvoice ? 'جاري الترحيل...' : 'ترحيل الفاتورة للدفاتر'}
              isSubmitting={isSubmittingInvoice}
              onCancel={() => setShowInvoiceDialog(false)}
              cancelText="إلغاء"
            />
          )}
        >
          <div className="job-submodal-compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
            <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.78rem', color: '#1e40af' }}>
              سيتم إنشاء وترحيل قيد يومية معتمد (مدين: حساب العملاء 1130 / دائن: مبيعات الخدمات 4200) وتوجيهه آلياً لمركز تكلفة العملية <strong>#{job.job_number}</strong>.
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Field label={`مبلغ الفاتورة المفوتر للعميل (${currencySymbol}) *`}>
                <input
                  type="number"
                  value={invoiceAmountInput}
                  onChange={(e) => setInvoiceAmountInput(e.target.value)}
                  placeholder="0.00"
                  style={{ fontWeight: 800, color: '#170e5e' }}
                />
              </Field>

              <Field label="بيان ووصف الفاتورة">
                <input
                  type="text"
                  value={invoiceNotesInput}
                  onChange={(e) => setInvoiceNotesInput(e.target.value)}
                  placeholder="بيان الفاتورة..."
                />
              </Field>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal 5: Record Expense Voucher Dialog */}
      {showExpenseDialog && (
        <StandardDialog
          open={showExpenseDialog}
          onClose={() => setShowExpenseDialog(false)}
          title="تسجيل وترحيل سند مصروفات ملاحية"
          subtitle={`العملية: ${job.job_number} | التوكيل: ${job.shipping_line_name}`}
          width="min(620px, 95vw)"
          minHeight="auto"
          footerActions={(
            <StandardDialogFooter
              onSubmit={handleConfirmRecordExpense}
              submitText={isSubmittingExpense ? 'جاري الترحيل...' : 'ترحيل سند المصروفات'}
              isSubmitting={isSubmittingExpense}
              onCancel={() => setShowExpenseDialog(false)}
              cancelText="إلغاء"
            />
          )}
        >
          <div className="job-submodal-compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
            <div style={{ background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.78rem', color: '#991b1b' }}>
              سيتم إنشاء قيد استحقاق مصروفات (مدين: مصروفات نقل وشحن 6400 بمركز تكلفة العملية / دائن: حساب السداد المحدد) وخصمه من أرباح العملية.
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="نوع المصروف">
                  <CustomSelect
                    value={expenseTypeInput}
                    onChange={(val) => setExpenseTypeInput(val as any)}
                    options={[
                      { value: 'carrier', label: 'نولون وتكاليف الخط الملاحي' },
                      { value: 'port', label: 'رسوم ومصروفات محطات الميناء THC' },
                      { value: 'other', label: 'مصروفات تخليص أو خدمات أخرى' },
                    ]}
                  />
                </Field>

                <Field label="طريقة السداد والتسوية">
                  <CustomSelect
                    value={expensePaymentMethodInput}
                    onChange={(val) => setExpensePaymentMethodInput(val as any)}
                    options={[
                      { value: 'payable', label: 'استحقاق أجل على حساب المورد (2110)' },
                      { value: 'cash', label: 'صرف نقدي فوري من الخزينة (1110)' },
                      { value: 'bank', label: 'تحويل / شيك بنكي (1120)' },
                    ]}
                  />
                </Field>
              </div>

              <Field label={`مبلغ المصروف (${currencySymbol}) *`}>
                <input
                  type="number"
                  value={expenseAmountInput}
                  onChange={(e) => setExpenseAmountInput(e.target.value)}
                  placeholder="0.00"
                  style={{ fontWeight: 800, color: '#b91c1c' }}
                />
              </Field>

              <Field label="البيان / الوصف">
                <input
                  type="text"
                  value={expenseNotesInput}
                  onChange={(e) => setExpenseNotesInput(e.target.value)}
                  placeholder="بيان سند المصروفات..."
                />
              </Field>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal 6: Smart Booking Confirmation Parser Dialog */}
      {showSmartParseModal && (
        <StandardDialog
          open={showSmartParseModal}
          onClose={() => {
            setShowSmartParseModal(false);
            setParsedBookingData(null);
          }}
          title="الاستخراج والتحليل الذكي لبيانات الحجز الملاحي"
          subtitle={`العملية: ${job.job_number} | يدعم Maersk, MSC, CMA CGM, Hapag-Lloyd, Cosco, Evergreen والخطوط العالمية`}
          width="min(720px, 95vw)"
          footerActions={
            parsedBookingData ? (
              <StandardDialogFooter
                onSubmit={handleApplyParsedBooking}
                submitText={isApplyingParsedData ? 'جاري الاعتماد...' : 'اعتماد وملء بيانات الحجز بالشحنة'}
                isSubmitting={isApplyingParsedData}
                onCancel={() => {
                  setShowSmartParseModal(false);
                  setParsedBookingData(null);
                }}
                cancelText="إلغاء"
              />
            ) : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#334155', lineHeight: 1.6 }}>
              انسخ نص إيميل تأكيد الحجز (Booking Confirmation) المستلم من الخط الملاحي أو الوكيل والصقه في الحقل أدناه. سيقوم الذكاء الاصطناعي ومحلل النصوص باستخراج رقم الحجز، اسم السفينة، رقم الرحلة، تواريخ ETD / ETA، موعد Cut-off، ورقم البوليصة والحاويات تمهيداً لمراجعتها واعتمادها بنقرة واحدة.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نص تأكيد الحجز أو محتوى الإيميل الملاحي *
              </label>
              <textarea
                rows={6}
                value={smartParseText}
                onChange={(e) => setSmartParseText(e.target.value)}
                placeholder="الصق نص إيميل تأكيد الحجز هنا (مثال: Booking Confirmation: MSK12345678, Vessel: MAERSK MC-KINNEY MOLLER, Voyage: 2401E, ETD: 2026-09-20, ETA: 2026-10-05, Port Cut-off: 2026-09-18, Containers: MSKU1234567, MSKU7654321)..."
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={handleParseBookingEmail}
                disabled={isParsingSmartBooking || !smartParseText.trim()}
                style={{
                  padding: '8px 20px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isParsingSmartBooking || !smartParseText.trim() ? 'not-allowed' : 'pointer',
                  opacity: isParsingSmartBooking || !smartParseText.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AppIcons.Search size={15} />
                {isParsingSmartBooking ? 'جاري التحليل والاستخراج...' : 'تحليل واستخراج البيانات'}
              </button>
            </div>

            {/* Results Preview Card */}
            {parsedBookingData && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#166534' }}>
                    نتائج الاستخراج المكتشفة من نص الحجز:
                  </span>
                  {parsedBookingData.shippingLineName && (
                    <span style={{ padding: '3px 10px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                      الخط المكتشف: {parsedBookingData.shippingLineName}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>رقم الحجز (Booking No)</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e' }}>{parsedBookingData.bookingNumber || '—'}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>السفينة والرحلة (Vessel / Voyage)</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e' }}>
                      {parsedBookingData.vesselName || '—'} {parsedBookingData.voyageNumber ? ` / ${parsedBookingData.voyageNumber}` : ''}
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>تاريخ الإبحار (ETD)</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e' }}>{parsedBookingData.etd || '—'}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>تاريخ الوصول (ETA)</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e' }}>{parsedBookingData.eta || '—'}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>إغلاق الميناء (Cut-Off)</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#b91c1c' }}>{parsedBookingData.portCutOff || '—'}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>بوليصة الشحن (MBL)</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e' }}>{parsedBookingData.mblNumber || '—'}</div>
                  </div>
                </div>

                {parsedBookingData.containers && parsedBookingData.containers.length > 0 && (
                  <div style={{ marginTop: '12px', background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                      الحاويات المكتشفة ({parsedBookingData.containers.length} حاوية):
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {parsedBookingData.containers.map((cnt: any, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: '#1e293b',
                          }}
                        >
                          {cnt.containerNumber} ({cnt.containerType || "40' HC"})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </StandardDialog>
      )}
    </>
  );
}
