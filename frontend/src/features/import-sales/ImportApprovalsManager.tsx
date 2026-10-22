import React, { useState } from 'react';
import {
  useApprovalRequestsQuery,
  useCreateApprovalRequestMutation,
  useDecideApprovalRequestMutation,
} from './api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import {
  PlusCircleIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export default function ImportApprovalsManager() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const { data: requests = [], isLoading, refetch } = useApprovalRequestsQuery(filterStatus || undefined);
  const createApprovalMutation = useCreateApprovalRequestMutation();
  const decideApprovalMutation = useDecideApprovalRequestMutation();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequestForDecision, setSelectedRequestForDecision] = useState<any | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');

  // New Request Form State
  const [requestType, setRequestType] = useState('foreign_transfer');
  const [entityId, setEntityId] = useState('');
  const [amountEgp, setAmountEgp] = useState<number>(100000);
  const [justification, setJustification] = useState('');

  const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
  const approvedCount = requests.filter((r: any) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r: any) => r.status === 'rejected').length;
  const pendingVolume = requests
    .filter((r: any) => r.status === 'pending')
    .reduce((sum: number, r: any) => sum + Number(r.amount_egp || 0), 0);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createApprovalMutation.mutateAsync({
        requestType,
        entityId: entityId || `REQ-${Date.now()}`,
        amountEgp: Number(amountEgp),
        justification,
      });
      toast.success('تم رفع طلب الاعتماد للرقابة بنجاح');
      setIsCreateModalOpen(false);
      setEntityId('');
      setJustification('');
      refetch();
    } catch (err: any) {
      toast.error('فشل رفع طلب الاعتماد: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleDecision = async () => {
    if (!selectedRequestForDecision) return;
    try {
      await decideApprovalMutation.mutateAsync({
        id: selectedRequestForDecision.id,
        decision: decisionType,
        comments: decisionType === 'approved' ? decisionNotes : undefined,
        rejectionReason: decisionType === 'rejected' ? decisionNotes : undefined,
      });
      toast.success(decisionType === 'approved' ? 'تم اعتماد العملية بنجاح' : 'تم رفض العملية وتوثيق السبب');
      setSelectedRequestForDecision(null);
      setDecisionNotes('');
      refetch();
    } catch (err: any) {
      toast.error('فشل تسجيل القرار: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const getRequestTypeName = (type: string) => {
    switch (type) {
      case 'foreign_transfer':
        return 'حوالة بنكية للمورد الخارجي';
      case 'partner_share_adjustment':
        return 'تعديل نسب مشاركة الشركاء';
      case 'project_closure':
        return 'إقفال حسابات مشروع الاستيراد';
      case 'late_expense_allocation':
        return 'تحميل مصروفات متأخرة على الحاوية';
      default:
        return type;
    }
  };

  return (
    <div dir="rtl" style={{ width: 'min(100%, 1280px)', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: '3px', height: '18px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              مركز الرقابة الثنائية والموافقات المعتمدة (Maker-Checker)
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            فصل الصلاحيات والتحقق المزدوج للعمليات المالية الحرجة (التحويلات الكبرى، تعديل الشركاء، وإقفال المشاريع)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => refetch()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCwIcon size={14} />
            تحديث
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <PlusCircleIcon size={15} />
            رفع طلب اعتماد جديد
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>طلبات قيد المراجعة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>{pendingCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>تتطلب قراراً من مدير معتمد</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>إجمالي القيمة المعلقة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#170e5e' }}>{formatCurrency(pendingVolume)}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>مبالغ بانتظار تصريح الصرف</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>طلبات تم اعتمادها</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>{approvedCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>عمليات مفعلة وموثقة دفترياً</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>طلبات مرفوضة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>{rejectedCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>أوقفت لمنع مخالفات تعاقدية</div>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
        {[
          { key: '', label: 'كافة الطلبات' },
          { key: 'pending', label: 'قيد المراجعة' },
          { key: 'approved', label: 'المعتمدة' },
          { key: 'rejected', label: 'المرفوضة' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid ' + (filterStatus === tab.key ? '#170e5e' : '#e2e8f0'),
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: filterStatus === tab.key ? '#170e5e' : '#f8fafc',
              color: filterStatus === tab.key ? '#ffffff' : '#475569',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Requests Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>جاري تحميل طلبات الرقابة...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            لا توجد طلبات اعتماد مطابقة للتصفية الحالية
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>رقم الطلب والتاريخ</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>نوع العملية</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>القيمة المالية</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>المبرر التشغيلي</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراء الرقابي</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>#{String(r.id).slice(0, 8)}</div>
                      <div style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(r.created_at || Date.now()).toLocaleDateString('ar-EG')}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                      {getRequestTypeName(r.request_type)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, color: '#170e5e' }}>
                      {formatCurrency(r.amount_egp)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569', maxWidth: 300 }}>
                      {r.justification || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: r.status === 'approved' ? '#dcfce7' : r.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: r.status === 'approved' ? '#166534' : r.status === 'rejected' ? '#991b1b' : '#92400e',
                        }}
                      >
                        {r.status === 'approved' ? 'معتمد رسمياً' : r.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequestForDecision(r);
                              setDecisionType('approved');
                              setDecisionNotes('');
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#166534',
                              color: '#ffffff',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            اعتماد
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequestForDecision(r);
                              setDecisionType('rejected');
                              setDecisionNotes('');
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid #ef4444',
                              backgroundColor: '#ffffff',
                              color: '#ef4444',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {r.decision_comments || r.rejection_reason || 'تم اتخاذ القرار'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Create Request Dialog */}
      <StandardDialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="رفع طلب اعتماد مالي ورقابي جديد"
        subtitle="توثيق مبرر العملية الحساسة للحصول على موافقة خطية من الإدارة قبل التنفيذ"
        width="560px"
      >
        <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              نوع العملية الخاضعة للموافقة
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            >
              <option value="foreign_transfer">حوالة بنكية خارجية للمورد (Foreign Transfer)</option>
              <option value="partner_share_adjustment">تعديل نسب مشاركة الشركاء (Partner Share Adjustment)</option>
              <option value="project_closure">إقفال نهائي لحسابات مشروع استيراد (Project Closure)</option>
              <option value="late_expense_allocation">تسوية مصروف متأخر على شحنة مستلمة (Late Expense)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                القيمة التقديرية (ج.م)
              </label>
              <input
                type="number"
                required
                value={amountEgp}
                onChange={(e) => setAmountEgp(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                معرف السجل / رقم الوثيقة
              </label>
              <input
                type="text"
                placeholder="مثال: SHP-2609-001 أو PRJ-01"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              المبرر التشغيلي والتفاصيل
            </label>
            <textarea
              rows={3}
              required
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="اكتب سبب طلب الاعتماد، وأي شروط تعاقدية تم الاتفاق عليها مع المورد أو الشركاء..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createApprovalMutation.isPending}
              style={{ padding: '8px 18px', borderRadius: 6, border: 'none', backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              {createApprovalMutation.isPending ? 'جاري الإرسال...' : 'إرسال طلب الاعتماد'}
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* 6. Decision Dialog */}
      <StandardDialog
        open={Boolean(selectedRequestForDecision)}
        onClose={() => setSelectedRequestForDecision(null)}
        title={decisionType === 'approved' ? 'تأكيد اعتماد العملية المالية' : 'تأكيد رفض طلب العملية المالية'}
        subtitle="توثيق القرار الرقابي في سجل المراجعة غير القابل للتعديل"
        width="500px"
      >
        {selectedRequestForDecision && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px' }}>
              <div style={{ fontSize: '12.5px', marginBottom: 4 }}>
                <strong>العملية:</strong> {getRequestTypeName(selectedRequestForDecision.request_type)}
              </div>
              <div style={{ fontSize: '12.5px', marginBottom: 4 }}>
                <strong>القيمة:</strong> {formatCurrency(selectedRequestForDecision.amount_egp)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <strong>المبرر:</strong> {selectedRequestForDecision.justification}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                {decisionType === 'approved' ? 'ملاحظات وتوجيهات الاعتماد:' : 'سبب الرفض الإلزامي:'}
              </label>
              <textarea
                rows={3}
                required={decisionType === 'rejected'}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={decisionType === 'approved' ? 'مثال: معتمد للصرف وفق بنود الفاتورة المبدئية' : 'اذكر سبب الرفض بالتفصيل...'}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedRequestForDecision(null)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={decideApprovalMutation.isPending}
                onClick={handleDecision}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: decisionType === 'approved' ? '#166534' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {decideApprovalMutation.isPending ? 'جاري التسجيل...' : decisionType === 'approved' ? 'تأكيد الاعتماد' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        )}
      </StandardDialog>
    </div>
  );
}
