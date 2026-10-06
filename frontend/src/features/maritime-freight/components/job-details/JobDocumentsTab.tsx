import { useState, useEffect } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { maritimeApi, MaritimeJob, MaritimeJobDocument } from '../../api/maritime-freight.api';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import {
  printOceanBillOfLading,
  printAirWaybill,
  printDeliveryOrder,
  printArrivalNotice,
  printFreightInvoice,
  printSolasVgmCertificate,
  printShippingInstructions,
  printJobProfitabilitySheet,
  printTruckingWaybill,
  printCargoInsuranceCertificate,
  printWarehouseReceipt,
} from '../../utils/maritime-documents';

interface Props {
  job: MaritimeJob;
  onUpdated: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'bl_copy', label: 'صورة بوليصة الشحن (B/L Copy)' },
  { value: 'commercial_invoice', label: 'الفاتورة التجارية (Commercial Invoice)' },
  { value: 'packing_list', label: 'بيان العبوة (Packing List)' },
  { value: 'certificate_of_origin', label: 'شهادة المنشأ (Certificate of Origin)' },
  { value: 'eur1', label: 'شهادة يورو 1 (EUR.1 Movement Certificate)' },
  { value: 'customs_declaration', label: 'الشهادة الجمركية / نموذج 4 (Customs Declaration)' },
  { value: 'acid_document', label: 'مستند القيد الجمركي المسبق (ACI / ACID Document)' },
  { value: 'cargo_manifest', label: 'مانيفست الشحنة (Cargo Manifest)' },
  { value: 'delivery_order', label: 'إذن التسليم (Delivery Order - D/O)' },
  { value: 'inspection_cert', label: 'شهادة الفحص والمطابقة (Inspection Certificate)' },
  { value: 'insurance_policy', label: 'بوليصة التأمين الملاحي (Marine Insurance Policy)' },
  { value: 'vgm_certificate', label: 'شهادة الوزن المؤكد (VGM Certificate)' },
  { value: 'other', label: 'مستندات أخرى (Other Attachment)' },
];

export function JobDocumentsTab({ job, onUpdated }: Props) {
  const [documents, setDocuments] = useState<MaritimeJobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    documentType: 'bl_copy',
    documentNumber: '',
    title: '',
    issueDate: '',
    expiryDate: '',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    mimeType: 'application/pdf',
    notes: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, [job.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getJobDocuments(job.id);
      setDocuments(data || []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
        // Creating a local object url for preview/mock
        fileUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleUploadSubmit = async () => {
    if (!form.title.trim()) {
      toast.warning('يرجى كتابة اسم أو وصف للمستند');
      return;
    }

    try {
      setIsSubmitting(true);
      await maritimeApi.uploadJobDocument(job.id, {
        documentType: form.documentType,
        documentNumber: form.documentNumber || undefined,
        title: form.title,
        issueDate: form.issueDate || undefined,
        expiryDate: form.expiryDate || undefined,
        fileUrl: form.fileUrl || '/mock-doc.pdf',
        fileName: form.fileName || `${form.title}.pdf`,
        fileSize: form.fileSize || 1024,
        mimeType: form.mimeType || 'application/pdf',
        notes: form.notes || undefined,
      });

      toast.success('تم إرفاق المستند الإلكتروني بنجاح في ملف الشحنة');
      setShowAddModal(false);
      setForm({
        documentType: 'bl_copy',
        documentNumber: '',
        title: '',
        issueDate: '',
        expiryDate: '',
        fileUrl: '',
        fileName: '',
        fileSize: 0,
        mimeType: 'application/pdf',
        notes: '',
      });
      fetchDocuments();
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل إرفاق المستند');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (doc: MaritimeJobDocument) => {
    const confirmed = await systemConfirm({
      title: 'حذف المستند الإلكتروني',
      badge: doc.title,
      message: `هل أنت متأكد من حذف المستند "${doc.title}" نهائياً من أرشيف الشحنة؟`,
      confirmText: 'تأكيد الحذف',
      cancelText: 'إلغاء',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await maritimeApi.deleteJobDocument(doc.id);
      toast.success('تم حذف المستند بنجاح');
      fetchDocuments();
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف المستند');
    }
  };

  const filteredDocs = filterType === 'all'
    ? documents
    : documents.filter((d) => d.document_type === filterType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* 1. قسم الحافظة الرقمية ومستندات الأرشيف (e-Folder Digital Binder) */}
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
                background: '#e0e7ff',
                color: '#3730a3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcons.Folder size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>الحافظة الرقمية الإلكترونية للشحنة (e-Folder Document Binder)</span>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: '#e2e8f0', color: '#334155' }}>
                  {documents.length} مستند
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                أرشفة وحفظ المرفقات الرقمية للشحنة: بوالص، فواتير، شهادات منشأ، كشوف عبوة، ونماذج جمركية مع إمكانية التحميل والمعاينة
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.76rem',
                background: '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
              }}
            >
              <option value="all">كافة أنواع المستندات</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '6px 14px',
                background: '#170e5e',
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
              <span>إرفاق مستند جديد</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
            جاري تحميل المستندات المرفقة...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
            <AppIcons.FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>
              لا توجد مستندات مرفقة في حافظة هذه الشحنة بعد
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
              اضغط على "إرفاق مستند جديد" لرفع بوالص الشحن، الفواتير التجارية، شهادات المنشأ، أو إذن التسليم.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>نوع المستند</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>اسم المستند / الوصف</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم المستند</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>تاريخ الإصدار / الصلاحية</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>الملف والحجم</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const typeObj = DOCUMENT_TYPES.find((t) => t.value === doc.document_type);
                  return (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            display: 'inline-block',
                          }}
                        >
                          {typeObj?.label.split('(')[0].trim() || doc.document_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        <div>{doc.title}</div>
                        {doc.notes && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{doc.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                        {doc.document_number || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: '0.74rem' }}>
                        <div>إصدار: {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('ar-EG') : '—'}</div>
                        {doc.expiry_date && (
                          <div style={{ color: '#b45309' }}>انتهاء: {new Date(doc.expiry_date).toLocaleDateString('ar-EG')}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.74rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{doc.file_name}</div>
                        <div>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download={doc.file_name}
                              style={{
                                padding: '4px 8px',
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <AppIcons.Download size={13} />
                              تحميل / عرض
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(doc)}
                            style={{
                              padding: '4px 8px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. قسم نماذج وبوالص الشحن القياسية المعتمدة للطباعة المباشرة */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.Printer size={18} />
            <span>مركز إصدار وطباعة المستندات القياسية (Standard Printing Hub)</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
            طباعة بوالص الشحن الدولية ونماذج الإفراج والتسليم والتأمين المعتمدة وفق معايير المنظمات الدولية (FIATA, BIMCO, IATA, DCSA)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {/* 1. بوليصة الشحن البحري HBL */}
          {job.transport_mode !== 'air' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e' }}>بوليصة الشحن البحري (HBL)</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>بوليصة فياتا وبيمكو البحرية المعتمدة تتضمن بيانات النافذة (ACI) وبيانات الحاويات</div>
              </div>
              <button
                type="button"
                onClick={() => printOceanBillOfLading(job, job.containers || [])}
                style={{
                  width: '100%',
                  padding: '7px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Printer size={14} />
                طباعة بوليصة HBL
              </button>
            </div>
          )}

          {/* 2. بوليصة الشحن الجوي AWB */}
          {(job.transport_mode === 'air' || job.mawb_number) && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0369a1' }}>بوليصة الشحن الجوي (AWB)</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>بوليصة إياتا القياسية (IATA Neutral AWB) مع تفكيك الوزن الحجمي والمحاسبي</div>
              </div>
              <button
                type="button"
                onClick={() => printAirWaybill(job)}
                style={{
                  width: '100%',
                  padding: '7px',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Printer size={14} />
                طباعة بوليصة AWB
              </button>
            </div>
          )}

          {/* 3. إذن التسليم D/O */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#15803d' }}>إذن التسليم (Delivery Order)</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>إذن صرف وتسليم الشحنة الموجه لساحات الموانئ ومستودعات الترانزيت</div>
            </div>
            <button
              type="button"
              onClick={() => printDeliveryOrder(job, job.containers || [])}
              style={{
                width: '100%',
                padding: '7px',
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Printer size={14} />
              طباعة إذن التسليم (D/O)
            </button>
          </div>

          {/* 4. إشعار الوصول Arrival Notice */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#b45309' }}>إشعار وصول الشحنة (Arrival Notice)</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>إخطار رسمي للعميل بوصول السفينة وتفاصيل سداد المستحقات واستلام البضاعة</div>
            </div>
            <button
              type="button"
              onClick={() => printArrivalNotice(job, job.containers || [])}
              style={{
                width: '100%',
                padding: '7px',
                background: '#b45309',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Printer size={14} />
              طباعة إشعار الوصول
            </button>
          </div>

          {/* 5. فاتورة النولون والخدمات Freight Invoice */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#4338ca' }}>فاتورة النولون المعتمدة (Freight Invoice)</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>فاتورة ضريبية رسمية تتضمن تفكيك الرسوم، سعر الصرف التعاقدي، وبنود ACI</div>
            </div>
            <button
              type="button"
              onClick={() => printFreightInvoice(job, job.containers || [])}
              style={{
                width: '100%',
                padding: '7px',
                background: '#4338ca',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Printer size={14} />
              طباعة فاتورة النولون
            </button>
          </div>

          {/* 6. شهادة وزن الحاوية SOLAS VGM */}
          {job.transport_mode !== 'air' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#334155' }}>شهادة الوزن المؤكد (SOLAS VGM)</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>شهادة معتمدة للوزن الإجمالي المتحقق للحاويات وفق اتفاقية سولاس الدولية</div>
              </div>
              <button
                type="button"
                onClick={() => printSolasVgmCertificate(job, job.containers || [])}
                style={{
                  width: '100%',
                  padding: '7px',
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Printer size={14} />
                طباعة شهادة VGM
              </button>
            </div>
          )}

          {/* 7. تعليمات الشحن Shipping Instructions */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f766e' }}>تعليمات الشحن (Shipping Instructions)</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>وثيقة التعليمات الملاحية الموجهة للخط الملاحي لإصدار البوليصة الرسمية</div>
            </div>
            <button
              type="button"
              onClick={() => printShippingInstructions(job, job.containers || [])}
              style={{
                width: '100%',
                padding: '7px',
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Printer size={14} />
              طباعة تعليمات SI
            </button>
          </div>

          {/* 8. كشف ربحية الشحنة Job Profitability Sheet */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#475569' }}>كشف ربحية العملية (Job P&L)</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>تقرير داخلي تفصيلي للإيرادات، المصروفات، وهامش الربح الفعلي للعملية</div>
            </div>
            <button
              type="button"
              onClick={() => printJobProfitabilitySheet(job)}
              style={{
                width: '100%',
                padding: '7px',
                background: '#475569',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Printer size={14} />
              طباعة كشف الربحية
            </button>
          </div>
        </div>
      </div>

      {/* مودال إرفاق مستند جديد */}
      {showAddModal && (
        <StandardDialog
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="إرفاق مستند إلكتروني في ملف الشحنة"
          subtitle={`العملية: ${job.job_number} | العميل: ${job.customer_name}`}
          width="min(560px, 95vw)"
          footerActions={(
            <StandardDialogFooter
              onCancel={() => setShowAddModal(false)}
              onConfirm={handleUploadSubmit}
              confirmText="حفظ المستند"
              cancelText="إلغاء"
              confirmLoading={isSubmitting}
            />
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <Field label="نوع المستند" required>
              <CustomSelect
                value={form.documentType}
                onChange={(val) => setForm({ ...form, documentType: val })}
                options={DOCUMENT_TYPES}
              />
            </Field>

            <Field label="اسم / وصف المستند" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: صورة بوليصة الشحن الأصلية MBL موثقة"
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
              <Field label="رقم المستند (إن وجد)">
                <input
                  type="text"
                  value={form.documentNumber}
                  onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                  placeholder="مثال: INV-9921 / CO-2026"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                  }}
                />
              </Field>

              <Field label="تاريخ الإصدار">
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
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

            <Field label="تاريخ الصلاحية / الانتهاء (إن وجد)">
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                }}
              />
            </Field>

            <Field label="اختيار الملف الرقمي" required>
              <input
                type="file"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  background: '#f8fafc',
                }}
              />
              {form.fileName && (
                <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
                  تم اختيار الملف: {form.fileName} ({(form.fileSize / 1024).toFixed(1)} KB)
                </div>
              )}
            </Field>

            <Field label="ملاحظات توضيحية">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="أي ملاحظات تخص النسخ، الترخيص، أو التصديق القنصلي..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  resize: 'none',
                }}
              />
            </Field>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
