import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  CalendarIcon,
  PlusIcon,
  RefreshCwIcon,
  LockIcon,
  ScaleIcon,
  TrashIcon,
  SearchIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { useAppToolbar } from '@/stores/toolbar-store';
import { fiscalYearsApi } from '../api/fiscal-years.api';
import type { FiscalYearRecord } from '../types/fiscal-years.types';
import { CreateFiscalYearModal } from '../components/fiscal-years/CreateFiscalYearModal';
import { FiscalYearCloseWizardModal } from '../components/fiscal-years/FiscalYearCloseWizardModal';
import { ReopenFiscalYearModal } from '../components/fiscal-years/ReopenFiscalYearModal';

export function AccountingFiscalYearsPage() {
  useAppToolbar([
    { label: 'المالية والمحاسبة', to: '/accounting/accounts' },
    { label: 'إقفال السنوات المالية' },
  ]);

  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedYearForClose, setSelectedYearForClose] = useState<FiscalYearRecord | null>(null);
  const [selectedYearForReopen, setSelectedYearForReopen] = useState<FiscalYearRecord | null>(null);
  const [yearToDelete, setYearToDelete] = useState<FiscalYearRecord | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Queries
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['accounting', 'fiscal-years'],
    queryFn: () => fiscalYearsApi.listFiscalYears(),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fiscalYearsApi.deleteFiscalYear(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
      setYearToDelete(null);
      showNotice('تم حذف السنة المالية بنجاح.');
    },
    onError: (err: any) => {
      alert(err?.message || 'حدث خطأ أثناء حذف السنة المالية.');
    },
  });

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  const years = data?.data || [];
  const stats = data?.stats || { totalYears: 0, openYears: 0, closedYears: 0, currentYearId: null };

  const filteredYears = years.filter((y) => {
    if (statusFilter !== 'all' && y.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = y.name?.toLowerCase().includes(q);
      const matchCode = y.code?.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <PageHeader
        title="إقفال السنوات المالية وترحيل الأرباح"
        description="إدارة الفترات والدورات المحاسبية السنوية، التدقيق المالي الآلي، تصفير حسابات النتيجة، وترحيل الأرباح المحتجزة مع تأمين وتجميد الفترات السابقة"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => refetch()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCwIcon size={16} />
              <span>تحديث</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PlusIcon size={16} />
              <span>إضافة سنة مالية</span>
            </Button>
          </div>
        }
      />

      {/* Success / Action Notification banner */}
      {actionNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircleIcon size={20} color="#16a34a" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>إجمالي السنوات المسجلة</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarIcon size={18} color="#170e5e" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{stats.totalYears}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>دورات محاسبية موثقة في النظام</div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>السنوات المالية المفتوحة</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircleIcon size={18} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>{stats.openYears}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>تستقبل القيود والحركات اليومية</div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>السنوات المقفلة والمرحلة</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockIcon size={18} color="#1d4ed8" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1d4ed8' }}>{stats.closedYears}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>مرحلة للأرباح المحتجزة ومؤمنة</div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>السنة المالية النشطة حالياً</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#faf5ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScaleIcon size={18} color="#7c3aed" />
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            {years.find((y) => y.id === stats.currentYearId)?.name || 'غير محددة'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            {stats.currentYearId ? 'فترة التاريخ الحالي تطابق هذه السنة' : 'يرجى تسجيل السنة المالية الحالية'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: statusFilter === 'all' ? '1px solid #170e5e' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'all' ? '#170e5e' : '#ffffff',
              color: statusFilter === 'all' ? '#ffffff' : '#475569',
            }}
          >
            الكل ({years.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('open')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: statusFilter === 'open' ? '1px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'open' ? '#f0fdf4' : '#ffffff',
              color: statusFilter === 'open' ? '#15803d' : '#475569',
            }}
          >
            السنوات المفتوحة ({stats.openYears})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('closed')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: statusFilter === 'closed' ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'closed' ? '#eff6ff' : '#ffffff',
              color: statusFilter === 'closed' ? '#1e40af' : '#475569',
            }}
          >
            السنوات المقفلة ({stats.closedYears})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SearchIcon size={16} />
          </div>
        </div>
      </div>

      {/* Fiscal Years Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700 }}>السنة المالية</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700 }}>الكود</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700 }}>تاريخ البداية</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700 }}>تاريخ النهاية</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700 }}>الحالة</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700, textAlign: 'left' }}>إجمالي الإيرادات</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700, textAlign: 'left' }}>إجمالي المصروفات</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700, textAlign: 'left' }}>صافي النتيجة (أرباح/خسائر)</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700 }}>قيد الإقفال</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل بيانات السنوات المالية...
                </td>
              </tr>
            ) : filteredYears.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <CalendarIcon size={36} color="#94a3b8" />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                      لا توجد سنوات مالية مسجلة مطابقة للمحددات
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                      اضغط على زر «إضافة سنة مالية» لتهيئة السنة المالية الحالية وبدء العمل المحاسبي.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredYears.map((fy) => {
                const isCurrent = fy.id === stats.currentYearId;
                const isClosed = fy.status === 'closed';

                return (
                  <tr
                    key={fy.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isCurrent ? '#fbfcfe' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{fy.name}</span>
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                            }}
                          >
                            الحالية
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>
                      {fy.code || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontFamily: 'monospace' }}>
                      {fy.start_date}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontFamily: 'monospace' }}>
                      {fy.end_date}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isClosed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          <LockIcon size={12} />
                          <span>مقفلة ومرحلة</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          <CheckCircleIcon size={12} />
                          <span>مفتوحة نشطة</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#15803d' }}>
                      {isClosed ? formatCurrency(fy.total_revenue) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#b91c1c' }}>
                      {isClosed ? formatCurrency(fy.total_expense) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                      {isClosed ? (
                        <span
                          style={{
                            fontWeight: 800,
                            color: fy.net_profit_loss >= 0 ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {formatCurrency(fy.net_profit_loss)}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>تحسب عند الإقفال</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {fy.closing_entry_id ? (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#170e5e',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          #{fy.closing_entry_id}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {!isClosed ? (
                          <>
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => setSelectedYearForClose(fy)}
                              style={{
                                backgroundColor: '#170e5e',
                                color: '#ffffff',
                                fontSize: '12px',
                                padding: '6px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <ScaleIcon size={14} />
                              <span>إقفال السنة المالية</span>
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setYearToDelete(fy)}
                              style={{
                                color: '#b91c1c',
                                padding: '6px 10px',
                                fontSize: '12px',
                              }}
                              title="حذف السنة المالية"
                            >
                              <TrashIcon size={14} />
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSelectedYearForReopen(fy)}
                            style={{
                              color: '#d97706',
                              borderColor: '#fde68a',
                              backgroundColor: '#fffbeb',
                              fontSize: '12px',
                              padding: '6px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <RefreshCwIcon size={14} />
                            <span>إعادة فتح</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      {yearToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertCircleIcon size={24} color="#b91c1c" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                تأكيد حذف السنة المالية
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
              هل أنت متأكد من حذف السنة المالية «{yearToDelete.name}»؟ لن يتم حذف أي قيود أو حركات يومية، ولكن سيتم حذف النطاق الزمني للسنة المالية.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setYearToDelete(null)}
                disabled={deleteMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => deleteMutation.mutate(yearToDelete.id)}
                disabled={deleteMutation.isPending}
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                {deleteMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateFiscalYearModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => showNotice('تمت إضافة السنة المالية بنجاح.')}
      />

      <FiscalYearCloseWizardModal
        open={!!selectedYearForClose}
        onClose={() => setSelectedYearForClose(null)}
        fiscalYear={selectedYearForClose}
        onClosed={() => showNotice('تم إقفال السنة المالية وترحيل الأرباح وتأمين الفترة بنجاح.')}
      />

      <ReopenFiscalYearModal
        open={!!selectedYearForReopen}
        onClose={() => setSelectedYearForReopen(null)}
        fiscalYear={selectedYearForReopen}
        onReopened={() => showNotice('تمت إعادة فتح السنة المالية وإلغاء قيد الإقفال بنجاح.')}
      />
    </div>
  );
}
