import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import type {
  ContractingDocument,
  ContractingDocumentDetail,
  DocumentType,
  DocumentReviewStatus,
  DocumentRecipientRole,
  DocumentDistributionMethod,
} from '../contracting.types';
import { toast } from '@/shared/components/system-alert';

interface DocumentRegisterModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

const TYPE_CONFIG: Record<DocumentType, string> = {
  drawing: 'مخطط هندسي (Drawing)',
  specification: 'مواصفة فنية (Specification)',
  contract: 'وثيقة تعاقدية (Contract)',
  correspondence: 'مراسلة رسمية (Correspondence)',
  method_statement: 'منهجية تنفيذ (Method Statement)',
  other: 'أخرى',
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'مسودة' },
  for_review: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'قيد المراجعة' },
  approved: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'معتمد' },
  superseded: { bg: '#fed7aa', color: '#c2410c', border: '#fdba74', label: 'مستبدل بمراجعة أحدث' },
  void: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'ملغى' },
  approved_as_noted: { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: 'معتمد مع ملاحظات' },
  revise_resubmit: { bg: '#fed7aa', color: '#c2410c', border: '#fdba74', label: 'يعدل ويعاد تقديمه' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'مرفوض' },
};

export function DocumentRegisterModal({ open, onClose, projectId, projectName }: DocumentRegisterModalProps) {
  const [documents, setDocuments] = useState<ContractingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState('architectural');
  const [docType, setDocType] = useState<DocumentType>('drawing');
  const [fileRef, setFileRef] = useState('');
  const [notes, setNotes] = useState('');

  const [detailDoc, setDetailDoc] = useState<ContractingDocumentDetail | null>(null);
  const [newRevCode, setNewRevCode] = useState('');
  const [newRevFileRef, setNewRevFileRef] = useState('');
  const [reviewStatus, setReviewStatus] = useState<DocumentReviewStatus>('approved');
  const [reviewedBy, setReviewedBy] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [distRecipient, setDistRecipient] = useState('');
  const [distRole, setDistRole] = useState<DocumentRecipientRole>('consultant');
  const [distMethod, setDistMethod] = useState<DocumentDistributionMethod>('email');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await contractingApi.listDocuments(projectId);
      setDocuments(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل سجل المخططات والمستندات');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const openDetail = async (docId: string) => {
    try {
      const detail = await contractingApi.getDocumentDetail(docId);
      setDetailDoc(detail);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تفاصيل المستند');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان المستند أو المخطط');
      return;
    }
    try {
      setIsSubmitting(true);
      await contractingApi.createDocument(projectId, {
        title: title.trim(),
        discipline,
        docType,
        fileRef: fileRef.trim() || undefined,
        notes: notes.trim() || undefined,
        revCode: 'A',
      });
      toast.success('تم تسجيل المستند برقم رسمي ومراجعة أولى (Rev A)');
      setTitle('');
      setFileRef('');
      setNotes('');
      setActiveTab('list');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل المستند');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRevision = async () => {
    if (!detailDoc || !newRevCode.trim()) {
      toast.error('يرجى إدخال رمز المراجعة الجديدة (مثال: B)');
      return;
    }
    try {
      setIsSubmitting(true);
      await contractingApi.addDocumentRevision(detailDoc.document.id, {
        revCode: newRevCode.trim().toUpperCase(),
        fileRef: newRevFileRef.trim() || undefined,
      });
      toast.success('تم رفع مراجعة جديدة واستبدال السابقة تلقائياً');
      setNewRevCode('');
      setNewRevFileRef('');
      await openDetail(detailDoc.document.id);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل رفع المراجعة الجديدة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewCurrentRevision = async () => {
    if (!detailDoc?.document.currentRevisionId) return;
    try {
      setIsSubmitting(true);
      await contractingApi.updateDocumentRevisionStatus(detailDoc.document.currentRevisionId, {
        reviewStatus,
        reviewedBy: reviewedBy.trim() || undefined,
        reviewComments: reviewComments.trim() || undefined,
      });
      toast.success('تم توثيق قرار المراجعة بنجاح');
      setReviewedBy('');
      setReviewComments('');
      await openDetail(detailDoc.document.id);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل توثيق قرار المراجعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDistribute = async () => {
    if (!detailDoc?.document.currentRevisionId || !distRecipient.trim()) {
      toast.error('يرجى إدخال اسم الجهة المستلمة');
      return;
    }
    try {
      setIsSubmitting(true);
      await contractingApi.distributeDocument(detailDoc.document.currentRevisionId, {
        recipientName: distRecipient.trim(),
        recipientRole: distRole,
        distributionMethod: distMethod,
      });
      toast.success('تم تسجيل توزيع المستند بنجاح');
      setDistRecipient('');
      await openDetail(detailDoc.document.id);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل التوزيع');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (detailDoc) {
    const currentRev = detailDoc.revisions.find((r) => r.id === detailDoc.document.currentRevisionId);
    return (
      <StandardDialog
        open={open}
        onClose={onClose}
        title={`سجل مراجعات المستند: [${detailDoc.document.docNumber}] ${detailDoc.document.title}`}
        subtitle={`${TYPE_CONFIG[detailDoc.document.docType]} — ${projectName || ''}`}
        maxWidth="1000px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
          <button
            type="button"
            onClick={() => setDetailDoc(null)}
            style={{ alignSelf: 'flex-start', padding: '4px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-micro)' }}
          >
            ← العودة لسجل المستندات
          </button>

          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 'var(--font-body)' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '8px 10px' }}>المراجعة</th>
                  <th style={{ padding: '8px 10px' }}>تاريخ الإصدار</th>
                  <th style={{ padding: '8px 10px' }}>الحالة</th>
                  <th style={{ padding: '8px 10px' }}>المراجع</th>
                  <th style={{ padding: '8px 10px' }}>ملاحظات المراجعة</th>
                </tr>
              </thead>
              <tbody>
                {detailDoc.revisions.map((rev) => {
                  const cfg = STATUS_CONFIG[rev.reviewStatus] || STATUS_CONFIG.for_review;
                  return (
                    <tr key={rev.id} style={{ borderBottom: '1px solid #f1f5f9', background: rev.id === detailDoc.document.currentRevisionId ? '#f8fafc' : undefined }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#170e5e' }}>Rev {rev.revCode}{rev.id === detailDoc.document.currentRevisionId ? ' (الحالية)' : ''}</td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)', color: '#64748b' }}>{rev.issuedDate}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)' }}>{rev.reviewedBy || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-micro)', color: '#64748b' }}>{rev.reviewComments || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e' }}>رفع مراجعة جديدة</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Field label="رمز المراجعة (مثال: B)">
                  <input type="text" value={newRevCode} onChange={(e) => setNewRevCode(e.target.value)} style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </Field>
                <Field label="رابط/مرجع الملف">
                  <input type="text" value={newRevFileRef} onChange={(e) => setNewRevFileRef(e.target.value)} style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </Field>
                <button type="button" onClick={handleAddRevision} disabled={isSubmitting} style={{ height: '32px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  رفع المراجعة
                </button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e' }}>
                توثيق قرار مراجعة {currentRev ? `Rev ${currentRev.revCode}` : ''}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <CustomSelect
                  value={reviewStatus}
                  onChange={(val) => setReviewStatus((val as DocumentReviewStatus) || 'approved')}
                  options={[
                    { value: 'approved', label: 'معتمد نهائياً' },
                    { value: 'approved_as_noted', label: 'معتمد مع ملاحظات' },
                    { value: 'revise_resubmit', label: 'يعدل ويعاد تقديمه' },
                    { value: 'rejected', label: 'مرفوض' },
                  ]}
                />
                <input type="text" placeholder="اسم المراجع" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <textarea placeholder="ملاحظات المراجعة" value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} rows={2} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <button type="button" onClick={handleReviewCurrentRevision} disabled={isSubmitting || !currentRev} style={{ height: '32px', borderRadius: '6px', border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  حفظ قرار المراجعة
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e' }}>سجل التوزيع</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
              <input type="text" placeholder="اسم الجهة المستلمة" value={distRecipient} onChange={(e) => setDistRecipient(e.target.value)} style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <CustomSelect value={distRole} onChange={(val) => setDistRole((val as DocumentRecipientRole) || 'consultant')} options={[
                { value: 'consultant', label: 'استشاري' },
                { value: 'owner', label: 'مالك المشروع' },
                { value: 'subcontractor', label: 'مقاول باطن' },
                { value: 'authority', label: 'جهة حكومية' },
                { value: 'internal', label: 'داخلي' },
                { value: 'other', label: 'أخرى' },
              ]} />
              <CustomSelect value={distMethod} onChange={(val) => setDistMethod((val as DocumentDistributionMethod) || 'email')} options={[
                { value: 'email', label: 'بريد إلكتروني' },
                { value: 'whatsapp', label: 'واتساب' },
                { value: 'hand', label: 'تسليم يدوي' },
                { value: 'portal', label: 'بوابة إلكترونية' },
                { value: 'other', label: 'أخرى' },
              ]} />
              <button type="button" onClick={handleDistribute} disabled={isSubmitting} style={{ height: '32px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                تسجيل توزيع
              </button>
            </div>
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {detailDoc.distributions.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 'var(--font-micro)', textAlign: 'center', padding: '10px' }}>لا يوجد توزيع مسجل بعد لهذا المستند</div>
              ) : (
                detailDoc.distributions.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid #f1f5f9', fontSize: 'var(--font-micro)' }}>
                    <span style={{ fontWeight: 600 }}>{d.recipientName}</span>
                    <span style={{ color: '#64748b' }}>{d.distributionMethod} — {new Date(d.distributedAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </StandardDialog>
    );
  }

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="سجل المخططات والمستندات (Document Register)"
      subtitle={`سجل موحد للمخططات والمواصفات مع تاريخ المراجعات وتوزيعها — ${projectName || ''}`}
      maxWidth="1100px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <button type="button" onClick={() => setActiveTab('list')} style={{ padding: '6px 16px', borderRadius: '8px', fontWeight: 700, fontSize: 'var(--font-table-head)', border: activeTab === 'list' ? '1.5px solid #170e5e' : '1px solid #cbd5e1', background: activeTab === 'list' ? '#170e5e' : '#f8fafc', color: activeTab === 'list' ? '#fff' : '#334155', cursor: 'pointer' }}>
            السجل ({documents.length})
          </button>
          <button type="button" onClick={() => setActiveTab('create')} style={{ padding: '6px 16px', borderRadius: '8px', fontWeight: 700, fontSize: 'var(--font-table-head)', border: activeTab === 'create' ? '1.5px solid #170e5e' : '1px solid #cbd5e1', background: activeTab === 'create' ? '#170e5e' : '#f8fafc', color: activeTab === 'create' ? '#fff' : '#334155', cursor: 'pointer' }}>
            تسجيل مستند جديد
          </button>
        </div>

        {activeTab === 'create' && (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <Field label="نوع المستند">
                <CustomSelect value={docType} onChange={(val) => setDocType((val as DocumentType) || 'drawing')} options={Object.entries(TYPE_CONFIG).map(([value, label]) => ({ value, label }))} />
              </Field>
              <Field label="التخصص الهندسي">
                <CustomSelect value={discipline} onChange={(val) => setDiscipline(val || 'architectural')} options={[
                  { value: 'architectural', label: 'معماري' },
                  { value: 'structural', label: 'إنشائي' },
                  { value: 'mep', label: 'كهروميكانيكي MEP' },
                  { value: 'civil', label: 'مدني' },
                  { value: 'general', label: 'عام' },
                ]} />
              </Field>
              <Field label="عنوان المستند">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مخطط أساسات المبنى A" style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </Field>
              <Field label="رابط/مرجع الملف (اختياري)">
                <input type="text" value={fileRef} onChange={(e) => setFileRef(e.target.value)} placeholder="رابط الملف أو اسمه" style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setActiveTab('list')} style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
              <button type="submit" disabled={isSubmitting} style={{ height: '36px', padding: '0 20px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {isSubmitting ? 'جارٍ التسجيل...' : 'تسجيل المستند (Rev A)'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'list' && (
          <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جارٍ التحميل...</div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <AppIcons.FileText size={36} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: '#334155' }}>لا توجد مستندات مسجلة بعد</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 'var(--font-body)' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '10px 12px' }}>رقم المستند</th>
                    <th style={{ padding: '10px 12px' }}>النوع</th>
                    <th style={{ padding: '10px 12px' }}>العنوان</th>
                    <th style={{ padding: '10px 12px' }}>التخصص</th>
                    <th style={{ padding: '10px 12px' }}>الحالة</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#170e5e' }}>{doc.docNumber}</td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)' }}>{TYPE_CONFIG[doc.docType]}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{doc.title}</td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>{doc.discipline}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button type="button" onClick={() => openDetail(doc.id)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: 'var(--font-micro)', fontWeight: 700, background: '#fff', border: '1px solid #cbd5e1', color: '#170e5e', cursor: 'pointer' }}>
                            المراجعات والتوزيع
                          </button>
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
