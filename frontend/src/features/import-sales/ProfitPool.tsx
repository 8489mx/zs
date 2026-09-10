import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useProfitReportQuery, usePartnerPayoutMutation, Partner } from './api/shipments.api';
import { formatCurrency } from '@/lib/format';
import { ManagePartnersDialog } from './ManagePartnersDialog';
import { PartnerLedgerDialog } from './PartnerLedgerComponents';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { UsersIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';
import { MutationFeedback } from '@/shared/components/mutation-feedback';

function PartnerPayoutModal({ 
  partner, 
  open, 
  onClose 
}: { 
  partner: { partnerId: string; name: string; shareAmount: number; withdrawnProfit: number; currentBalance: number; percentage: number; capital_amount?: number } | null;
  open: boolean; 
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const payoutMutation = usePartnerPayoutMutation();

  if (!partner) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return;
    await payoutMutation.mutateAsync({ partnerId: partner.partnerId, amount: val });
    setAmount('');
    onClose();
  };

  const handleFillMax = () => {
    if (partner.currentBalance > 0) {
      setAmount(String(partner.currentBalance));
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`صرف دفعة أرباح: ${partner.name}`}
      subtitle="تسجيل صرف دفعة نقدية من صافي الأرباح المستحقة للشريك وخصمها من رصيده المتبقي."
      width="min(500px, 95vw)"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* Partner Info Box */}
        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>إجمالي الربح المستحق</span>
              <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>
                {formatCurrency(partner.shareAmount)} ج.م
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>المنصرف سابقاً</span>
              <strong style={{ color: '#64748b', fontSize: '0.88rem' }}>
                {formatCurrency(partner.withdrawnProfit)} ج.م
              </strong>
            </div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.82rem' }}>الرصيد المتبقي المتاح:</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: partner.currentBalance > 0 ? '#170e5e' : '#64748b' }}>
              {formatCurrency(partner.currentBalance)} ج.م
            </span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
              قيمة الدفعة المنصرفة <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {partner.currentBalance > 0 && (
              <button
                type="button"
                onClick={handleFillMax}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#170e5e',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                صرف كامل المتبقي ({Number(partner.currentBalance).toLocaleString()} ج.م)
              </button>
            )}
          </div>
          <input 
            type="number" 
            min="0.01" 
            step="0.01" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            required 
            placeholder="0.00 ج.م"
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              padding: '0 12px',
              fontSize: '0.88rem',
              fontWeight: 700,
              background: '#ffffff',
              color: '#0f172a',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            style={{ height: '36px', padding: '0 16px', fontSize: '0.82rem', fontWeight: 600, borderRadius: '6px' }}
          >
            إلغاء
          </Button>
          <Button 
            type="submit" 
            disabled={payoutMutation.isPending}
            style={{
              height: '36px',
              padding: '0 20px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '6px',
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
            }}
          >
            {payoutMutation.isPending ? 'جاري التسجيل...' : 'تأكيد وصرف الدفعة'}
          </Button>
        </div>
        <MutationFeedback isError={payoutMutation.isError} isSuccess={payoutMutation.isSuccess} error={payoutMutation.error} />
      </form>
    </StandardDialog>
  );
}

export default function ProfitPool() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isManagePartnersOpen, setIsManagePartnersOpen] = useState(false);
  const [payoutPartner, setPayoutPartner] = useState<{ partnerId: string; name: string; shareAmount: number; withdrawnProfit: number; currentBalance: number; percentage: number; capital_amount?: number } | null>(null);
  const [ledgerPartner, setLedgerPartner] = useState<Partner | null>(null);

  const { data, isLoading, isFetching, refetch } = useProfitReportQuery(startDate, endDate);

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '0 16px 80px 16px' }}>
        <PageHeader 
          title="مجمع أرباح الشركاء وتصفية الحسابات" 
          description="حساب صافي الأرباح عن فترة محددة وتوزيعها بناءً على المبيعات والتكلفة الفعلية والمصاريف التشغيلية."
          actions={
            <Button 
              variant="primary" 
              onClick={() => setIsManagePartnersOpen(true)}
              style={{
                height: '38px',
                padding: '0 18px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <UsersIcon size={16} />
              <span>إدارة الشركاء ورأس المال</span>
            </Button>
          }
        />

        {/* Date Filter Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>من تاريخ</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                style={{
                  height: '38px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.825rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>إلى تاريخ</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                style={{
                  height: '38px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.825rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <Button 
                variant="primary" 
                onClick={() => refetch()} 
                disabled={isFetching}
                style={{
                  height: '38px',
                  padding: '0 18px',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCwIcon size={14} className={isFetching ? 'animate-spin' : ''} />
                <span>{isFetching ? 'جاري الحساب...' : 'تحديث التقرير'}</span>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCwIcon size={24} style={{ margin: '0 auto 12px auto', display: 'block', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>جاري احتساب أرباح الشراكة للفترة المحددة...</div>
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 3 Calm & Premium KPI Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Revenue Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
                  إجمالي الإيرادات (المبيعات)
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                  {formatCurrency(data.totalRevenue)} <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8' }}>ج.م</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '6px' }}>
                  إجمالي المبيعات المحققة بالفترة
                </div>
              </div>

              {/* Total Costs Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
                  إجمالي التكلفة والمصاريف
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                  {formatCurrency(data.totalCost + data.totalExpenses)} <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8' }}>ج.م</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                  بضاعة: {formatCurrency(data.totalCost)} ج.م &bull; مصاريف: {formatCurrency(data.totalExpenses)} ج.م
                </div>
              </div>

              {/* Net Profit Distributable Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
                  صافي الربح المتاح للتوزيع
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                  {formatCurrency(data.netProfitPool)} <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8' }}>ج.م</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                  صافي الوعاء القابل للتوزيع على الشركاء
                </div>
              </div>
            </div>

            {/* Partner Distribution Table Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    جدول توزيع الأرباح على الشركاء
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    توزيع صافي الأرباح وفق نسب الشراكة مع تتبع المسحوبات والرصيد المتبقي
                  </span>
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 9px', borderRadius: '12px' }}>
                  {data.partnerShares.length} شركاء
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                      <th style={{ padding: '10px 14px' }}>اسم الشريك</th>
                      <th style={{ padding: '10px 14px', width: '120px' }}>نسبة الشراكة</th>
                      <th style={{ padding: '10px 14px' }}>إجمالي الربح المستحق</th>
                      <th style={{ padding: '10px 14px' }}>ما تم سحبه مسبقاً</th>
                      <th style={{ padding: '10px 14px' }}>الرصيد المتبقي (الحالي)</th>
                      <th style={{ padding: '10px 14px', width: '190px', textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.partnerShares.map((partner: any, idx: number) => (
                      <tr key={partner.partnerId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                          {partner.name}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: '0.76rem' }}>
                            {partner.percentage}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(partner.shareAmount)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>ج.م</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>
                          {formatCurrency(partner.withdrawnProfit)} <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ج.م</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ 
                            fontWeight: 800, 
                            color: partner.currentBalance > 0 ? '#170e5e' : (partner.currentBalance < 0 ? '#dc2626' : '#64748b') 
                          }}>
                            {formatCurrency(partner.currentBalance)} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>ج.م</span>
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <Button 
                              variant="secondary" 
                              onClick={() => setPayoutPartner(partner)}
                              style={{ height: '28px', padding: '0 10px', fontSize: '0.74rem', fontWeight: 700, borderRadius: '4px' }}
                            >
                              تسجيل دفعة
                            </Button>
                            <Button 
                              variant="secondary" 
                              onClick={() => setLedgerPartner({ id: partner.partnerId, name: partner.name, profit_share_percentage: partner.percentage, capital_amount: partner.capital_amount || 0 })}
                              style={{ height: '28px', padding: '0 8px', fontSize: '0.74rem', fontWeight: 600, borderRadius: '4px' }}
                            >
                              كشف حساب
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.partnerShares.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#94a3b8' }}>
                            <UsersIcon size={22} />
                          </div>
                          <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.86rem' }}>لا يوجد شركاء مسجلين في النظام</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>انقر على زر "إدارة الشركاء ورأس المال" بالأعلى لإضافة الشركاء وتحديد نسب الأرباح.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isManagePartnersOpen && (
        <ManagePartnersDialog 
          open={isManagePartnersOpen} 
          onClose={() => setIsManagePartnersOpen(false)} 
        />
      )}

      {payoutPartner && (
        <PartnerPayoutModal 
          open={!!payoutPartner} 
          partner={payoutPartner} 
          onClose={() => setPayoutPartner(null)} 
        />
      )}

      {ledgerPartner && (
        <PartnerLedgerDialog 
          open={!!ledgerPartner} 
          partner={ledgerPartner} 
          onClose={() => setLedgerPartner(null)} 
        />
      )}
    </div>
  );
}
