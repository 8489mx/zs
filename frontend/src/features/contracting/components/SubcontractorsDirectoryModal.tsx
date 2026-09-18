import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { contractingApi } from '../api/contracting.api';
import type { ContractingSubcontractor } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { CreateSubcontractorModal } from './CreateSubcontractorModal';
import { SubcontractorLedgerModal } from './SubcontractorLedgerModal';
import { RecordSubcontractorPaymentModal } from './RecordSubcontractorPaymentModal';
import { systemConfirm } from '@/shared/components/system-alert';

interface SubcontractorsDirectoryModalProps {
  open: boolean;
  projectId?: string;
  onClose: () => void;
  onChanged?: () => void;
}

const SPECIALTY_FILTERS = [
  { value: 'all', label: 'كافة التخصصات' },
  { value: 'مقاولات عامة', label: 'مقاولات عامة' },
  { value: 'أعمال خرسانات وهياكل مسلحة', label: 'خرسانات وهياكل مسلحة' },
  { value: 'حدادة ونجارة مسلحة', label: 'حدادة ونجارة مسلحة' },
  { value: 'أعمال مباني وبلوك', label: 'مباني وبلوك' },
  { value: 'بياض ومحارة ولياسة', label: 'بياض ومحارة' },
  { value: 'أعمال كهربائية وكهروميكانيك', label: 'أعمال كهربائية' },
  { value: 'أعمال صحية وتغذية وصرف', label: 'أعمال صحية وسباكة' },
  { value: 'عزل مائي وحراري', label: 'عزل مائي وحراري' },
  { value: 'دهانات وتشطيبات داخلية وخارجية', label: 'دهانات وتشطيبات' },
  { value: 'سيراميك ورخام وأرضيات', label: 'سيراميك ورخام' },
  { value: 'ألوميتال وواجهات زجاجية (Curtain Walls)', label: 'ألوميتال وواجهات' },
  { value: 'أعمال تكييف وتهوية (HVAC)', label: 'تكييف وتهوية' },
  { value: 'مصاعد وأنظمة حركة', label: 'مصاعد' },
];

export function SubcontractorsDirectoryModal({
  open,
  projectId,
  onClose,
  onChanged,
}: SubcontractorsDirectoryModalProps) {
  const { currencySymbol } = useSystemCurrency();

  const [subcontractors, setSubcontractors] = useState<ContractingSubcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  // Modals inside Directory
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<ContractingSubcontractor | null>(null);
  const [selectedLedgerSubId, setSelectedLedgerSubId] = useState<number | null>(null);
  const [paymentSub, setPaymentSub] = useState<ContractingSubcontractor | null>(null);

  const loadSubcontractors = useCallback(async () => {
    if (!open) return;
    try {
      setLoading(true);
      const data = await contractingApi.getSubcontractors({
        search: search.trim() || undefined,
        tradeSpecialty: selectedSpecialty !== 'all' ? selectedSpecialty : undefined,
      });
      setSubcontractors(data || []);
    } catch (err) {
      console.error('Failed to load subcontractors:', err);
    } finally {
      setLoading(false);
    }
  }, [open, search, selectedSpecialty]);

  useEffect(() => {
    loadSubcontractors();
  }, [loadSubcontractors]);

  const handleDelete = async (sub: ContractingSubcontractor) => {
    const confirmed = await systemConfirm({
      title: 'حذف أو إيقاف مقاول باطن',
      message: `هل أنت متأكد من حذف أو إيقاف حساب المقاول "${sub.name}"؟ إذا كانت لديه عقود مسندة سيتم إيقافه فقط لحفظ القيود المحاسبية.`,
      confirmText: 'تأكيد الإجراء',
      cancelText: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await contractingApi.deleteSubcontractor(sub.id);
      loadSubcontractors();
      onChanged?.();
    } catch (err) {
      console.error('Failed to delete subcontractor:', err);
    }
  };

  return (
    <>
      <StandardDialog
        open={open}
        onClose={onClose}
        title="دليل وسجل مقاولي الباطن المعتمدين (Subcontractors Master Directory)"
        subtitle="دليل مستقل للمقاولين المنفذين، تخصصاتهم، ومتابعة كشوفات حساباتهم ومستحقاتهم المالية"
        maxWidth="1150px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
          {/* شريط الأدوات العلوي والبحث */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '320px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث باسم المقاول، التخصص، الهاتف، الرقم الضريبي..."
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: 'var(--font-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ width: '220px' }}>
                <CustomSelect
                  value={selectedSpecialty}
                  onChange={(val) => setSelectedSpecialty(val)}
                  options={SPECIALTY_FILTERS}
                  placeholder="فلترة التخصص..."
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingSub(null);
                setIsCreateOpen(true);
              }}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 'var(--font-body)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <AppIcons.Plus size={15} />
              <span>إضافة مقاول باطن جديد</span>
            </button>
          </div>

          {/* جدول المقاولين */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', minHeight: '340px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8' }}>جاري تحميل دليل المقاولين...</span>
              </div>
            ) : subcontractors.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                <AppIcons.Users size={44} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: 'var(--font-section-title)', color: '#334155' }}>لا يوجد مقاولو باطن مسجلين مطابقين للبحث</div>
                <div style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', marginTop: '4px', marginBottom: '16px' }}>
                  قم بإضافة مقاولي الباطن والتنفيذ المعتمدين لربطهم بعقود الأعمال والمستخلصات.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSub(null);
                    setIsCreateOpen(true);
                  }}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    background: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 'var(--font-body)',
                  }}
                >
                  إضافة أول مقاول باطن
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '1040px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <colgroup>
                    <col style={{ width: '240px' }} /> {/* المقاول والتخصص */}
                    <col style={{ width: '180px' }} /> {/* بيانات الاتصال */}
                    <col style={{ width: '130px' }} /> {/* إجمالي الالتزام */}
                    <col style={{ width: '130px' }} /> {/* المستخلص المنفذ */}
                    <col style={{ width: '140px' }} /> {/* صافي المستحق الحالي */}
                    <col style={{ width: '85px' }} />  {/* الحالة */}
                    <col style={{ width: '135px' }} /> {/* إجراءات */}
                  </colgroup>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>المقاول والتخصص</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>بيانات الاتصال</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>إجمالي الالتزام</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>المستخلص المنفذ</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#170e5e' }}>صافي المستحق</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                      <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcontractors.map((sub) => {
                      const net = Number(sub.netBalance || 0);
                      return (
                        <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--font-body)' }}>{sub.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: 'var(--font-micro)', background: '#eff6ff', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {sub.tradeSpecialty || 'مقاولات عامة'}
                              </span>
                              {sub.subcontractsCount !== undefined && sub.subcontractsCount > 0 && (
                                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                                  ({sub.subcontractsCount} عقد)
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px', fontSize: 'var(--font-micro)', color: '#475569' }}>
                            <div>{sub.phone || sub.mobile || '-'}</div>
                            {sub.contactPerson && <div style={{ color: '#94a3b8' }}>المسؤول: {sub.contactPerson}</div>}
                          </td>

                          <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                            {(sub.totalCommitted || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                          </td>

                          <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap' }}>
                            {(sub.totalInvoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                          </td>

                          <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', fontWeight: 800, color: net > 0 ? '#15803d' : '#475569', whiteSpace: 'nowrap' }}>
                            {net.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: 'var(--font-micro)',
                                fontWeight: 600,
                                background: sub.status === 'active' ? '#dcfce7' : '#fee2e2',
                                color: sub.status === 'active' ? '#15803d' : '#991b1b',
                              }}
                            >
                              {sub.status === 'active' ? 'نشط' : 'موقوف'}
                            </span>
                          </td>

                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedLedgerSubId(sub.id)}
                                title="كشف حساب المقاول (ما له وما عليه)"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #c7d2fe',
                                  background: '#eff6ff',
                                  color: '#1e40af',
                                  fontSize: 'var(--font-micro)',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <AppIcons.FileText size={13} />
                                <span>كشف حساب</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPaymentSub(sub)}
                                title="تسجيل دفعة وصرف للمقاول"
                                style={{
                                  padding: '4px',
                                  borderRadius: '6px',
                                  border: '1px solid #bbf7d0',
                                  background: '#f0fdf4',
                                  color: '#16a34a',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <AppIcons.CreditCard size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSub(sub);
                                  setIsCreateOpen(true);
                                }}
                                title="تعديل بيانات المقاول"
                                style={{
                                  padding: '4px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <AppIcons.Edit size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(sub)}
                                title="حذف أو إيقاف"
                                style={{
                                  padding: '4px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <AppIcons.Trash size={14} />
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
        </div>
      </StandardDialog>

      {/* المودالات المضمنة */}
      <CreateSubcontractorModal
        open={isCreateOpen}
        subcontractor={editingSub}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingSub(null);
        }}
        onSuccess={() => {
          loadSubcontractors();
          onChanged?.();
        }}
      />

      {selectedLedgerSubId && (
        <SubcontractorLedgerModal
          open={Boolean(selectedLedgerSubId)}
          subcontractorId={selectedLedgerSubId}
          initialProjectId={projectId}
          onClose={() => setSelectedLedgerSubId(null)}
        />
      )}

      {paymentSub && (
        <RecordSubcontractorPaymentModal
          open={Boolean(paymentSub)}
          subcontractor={paymentSub}
          projectId={projectId}
          onClose={() => setPaymentSub(null)}
          onSuccess={() => {
            loadSubcontractors();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
