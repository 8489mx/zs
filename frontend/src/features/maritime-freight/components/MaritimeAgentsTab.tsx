import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { maritimeApi, ShippingLine } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';

export function MaritimeAgentsTab() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<ShippingLine[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSoaModal, setShowSoaModal] = useState(false);
  const [soaData, setSoaData] = useState<any | null>(null);
  const [loadingSoa, setLoadingSoa] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    agentId: '',
    agentName: '',
    jobId: '',
    jobNumber: '',
    settlementType: 'profit_share',
    currency: 'USD',
    amount: '',
    profitSharePercent: '50',
    exchangeRate: '49.0',
    referenceNumber: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchSettlements();
  }, []);

  const fetchAgents = async () => {
    try {
      const data = await maritimeApi.getShippingLines({ carrierType: 'overseas_agent' });
      setAgents(data);
    } catch (err) {
      console.error('Error fetching overseas agents:', err);
    }
  };

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedAgentId !== 'all') params.agentId = selectedAgentId;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const data = await maritimeApi.listAgentSettlements(params);
      setSettlements(data);
    } catch (err) {
      toast.error('فشل تحميل تسويات وإشعارات الوكلاء');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSoa = async (agentId: string) => {
    try {
      setLoadingSoa(true);
      setShowSoaModal(true);
      const data = await maritimeApi.getAgentStatementOfAccount(agentId);
      setSoaData(data);
    } catch (err) {
      toast.error('فشل تحميل كشف حساب الوكيل');
      setShowSoaModal(false);
    } finally {
      setLoadingSoa(false);
    }
  };

  const handleCreateSettlement = async () => {
    if (!formData.agentName || !formData.amount) {
      toast.error('يرجى تحديد الوكيل الخارجي والمبلغ');
      return;
    }

    try {
      setIsSubmitting(true);
      await maritimeApi.createAgentSettlement({
        agentId: formData.agentId || undefined,
        agentName: formData.agentName,
        jobId: formData.jobId || undefined,
        jobNumber: formData.jobNumber || undefined,
        settlementType: formData.settlementType,
        currency: formData.currency,
        amount: Number(formData.amount),
        profitSharePercent: Number(formData.profitSharePercent || 50),
        exchangeRate: Number(formData.exchangeRate || 1),
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
      });
      toast.success('تم تسجيل إشعار الوكيل بنجاح');
      setShowCreateModal(false);
      setFormData({
        agentId: '',
        agentName: '',
        jobId: '',
        jobNumber: '',
        settlementType: 'profit_share',
        currency: 'USD',
        amount: '',
        profitSharePercent: '50',
        exchangeRate: '49.0',
        referenceNumber: '',
        notes: '',
      });
      fetchSettlements();
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل المعاملة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await maritimeApi.updateAgentSettlementStatus(id, newStatus);
      toast.success('تم تحديث حالة التسوية بنجاح');
      fetchSettlements();
    } catch (err) {
      toast.error('فشل تحديث الحالة');
    }
  };

  // KPIs
  const totalDebitUsd = settlements
    .filter((s) => s.settlement_type === 'debit_note' || s.settlement_type === 'profit_share')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const totalCreditUsd = settlements
    .filter((s) => s.settlement_type === 'credit_note')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const netBalanceUsd = totalDebitUsd - totalCreditUsd;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* 1. Header Banner & KPIs */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.Globe size={20} />
            <span>{t('maritime_freight.maritime_agents_tab.s0', "حسابات ومقاصة شبكة الوكلاء بالخارج (Overseas Agents Reciprocal Accounting & SOA)")}</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            {t('maritime_freight.maritime_agents_tab.s1', "إدارة إشعارات الخصم والإضافة (Debit/Credit Notes)، مناصفة الأرباح (50/50 Profit Sharing)، والمقاصة الدورية المتبادلة")}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              height: '36px',
              padding: '0 14px',
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.Plus size={16} />
            <span>{t('maritime_freight.maritime_agents_tab.s2', "تسجيل إشعار / مناصفة أرباح")}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', minHeight: '88px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>{t('maritime_freight.maritime_agents_tab.s3', "إجمالي إشعارات المدين (لنا بالخارج)")}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              $ {totalDebitUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>{t('maritime_freight.maritime_agents_tab.s4', "شحنات Collect ومناصفات مستحقة لنا")}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d', flexShrink: 0 }}>
            <AppIcons.FileText size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', minHeight: '88px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>{t('maritime_freight.maritime_agents_tab.s5', "إجمالي إشعارات الدائن (علينا للوكلاء)")}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              $ {totalCreditUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>{t('maritime_freight.maritime_agents_tab.s6', "مصاريف منشأ وشحنات Prepaid للوكلاء")}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
            <AppIcons.Receipt size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', minHeight: '88px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>{t('maritime_freight.maritime_agents_tab.s7', "صافي الرصيد المتبادل (Net Balance)")}</span>
              <span style={{ padding: '1px 6px', borderRadius: '4px', background: netBalanceUsd >= 0 ? '#dcfce7' : '#fef3c7', color: netBalanceUsd >= 0 ? '#15803d' : '#b45309', fontSize: '0.68rem', fontWeight: 700 }}>
                {netBalanceUsd >= 0 ? t('maritime_freight.maritime_agents_tab.s8', "مدين لنا") : t('maritime_freight.maritime_agents_tab.s9', "دائن علينا")}
              </span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              $ {Math.abs(netBalanceUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>{t('maritime_freight.maritime_agents_tab.s10', "رصيد المقاصة الإجمالي الصافي")}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#170e5e', flexShrink: 0 }}>
            <AppIcons.Coins size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', minHeight: '88px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>{t('maritime_freight.maritime_agents_tab.s11', "شبكة الوكلاء المعتمدين بالدليل")}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              {agents.length} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{t('maritime_freight.maritime_agents_tab.s12', "وكيل دولي")}</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>{t('maritime_freight.maritime_agents_tab.s13', "شبكات WCA و FIATA حول العالم")}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
            <AppIcons.Globe size={18} />
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '180px' }}>
          <input
            type="text"
            placeholder={t('maritime_freight.maritime_agents_tab.s14', "بحث برقم الإشعار أو أمر الشغل أو اسم الوكيل...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSettlements()}
            style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
          />
        </div>

        <div style={{ width: '200px' }}>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
          >
            <option value="all">{t('maritime_freight.maritime_agents_tab.s15', "كافة الوكلاء الخارجيين")}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name_ar} ({a.country_name || a.code})</option>
            ))}
          </select>
        </div>

        <div style={{ width: '150px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
          >
            <option value="all">{t('maritime_freight.maritime_agents_tab.s16', "كافة الحالات")}</option>
            <option value="pending">{t('maritime_freight.maritime_agents_tab.s17', "قيد المراجعة")}</option>
            <option value="approved">{t('maritime_freight.maritime_agents_tab.s18', "معتمد")}</option>
            <option value="cleared">{t('maritime_freight.maritime_agents_tab.s19', "تمت المقاصة")}</option>
            <option value="disputed">{t('maritime_freight.maritime_agents_tab.s20', "محل نزاع")}</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchSettlements}
          style={{ height: '34px', padding: '0 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
        >
          {t('maritime_freight.maritime_agents_tab.s21', "تحديث")}
        </button>
      </div>

      {/* 3. Settlements Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>{t('maritime_freight.maritime_agents_tab.s22', "رقم الإشعار / المرجع")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>{t('maritime_freight.maritime_agents_tab.s23', "الوكيل الخارجي")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>{t('maritime_freight.maritime_agents_tab.s24', "أمر الشغل")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>{t('maritime_freight.maritime_agents_tab.s25', "نوع المعاملة")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>{t('maritime_freight.maritime_agents_tab.s26', "المبلغ بالدولار")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>{t('maritime_freight.maritime_agents_tab.s27', "المعادل بالجنيه")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>{t('maritime_freight.maritime_agents_tab.s28', "الحالة")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>{t('maritime_freight.maritime_agents_tab.s29', "الإجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  {t('maritime_freight.maritime_agents_tab.s30', "جاري تحميل معاملات الوكلاء...")}
                </td>
              </tr>
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  {t('maritime_freight.maritime_agents_tab.s31', "لا توجد إشعارات أو تسويات مسجلة حالياً")}
                </td>
              </tr>
            ) : (
              settlements.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: '#170e5e' }}>
                    {item.reference_number || `#${item.id}`}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                    {item.agent_name}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>
                    {item.job_number || '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background:
                          item.settlement_type === 'debit_note'
                            ? '#dcfce7'
                            : item.settlement_type === 'credit_note'
                            ? '#fee2e2'
                            : item.settlement_type === 'profit_share'
                            ? '#e0e7ff'
                            : '#fef3c7',
                        color:
                          item.settlement_type === 'debit_note'
                            ? '#15803d'
                            : item.settlement_type === 'credit_note'
                            ? '#b91c1c'
                            : item.settlement_type === 'profit_share'
                            ? '#3730a3'
                            : '#b45309',
                      }}
                    >
                      {item.settlement_type === 'debit_note'
                        ? t('maritime_freight.maritime_agents_tab.s32', "إشعار مدين (Debit Note)")
                        : item.settlement_type === 'credit_note'
                        ? t('maritime_freight.maritime_agents_tab.s33', "إشعار دائن (Credit Note)")
                        : item.settlement_type === 'profit_share'
                        ? `مناصفة أرباح (${item.profit_share_percent}%)`
                        : t('maritime_freight.maritime_agents_tab.s34', "مقاصة متبادلة (Offset)")}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: item.settlement_type === 'credit_note' ? '#b91c1c' : '#166534' }}>
                    $ {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#475569' }}>
                    {Number(item.local_equivalent_amount || 0).toLocaleString()} {t('maritime_freight.maritime_agents_tab.s35', "ج.م")}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background:
                          item.status === 'cleared'
                            ? '#dcfce7'
                            : item.status === 'approved'
                            ? '#eff6ff'
                            : item.status === 'disputed'
                            ? '#fee2e2'
                            : '#f8fafc',
                        color:
                          item.status === 'cleared'
                            ? '#15803d'
                            : item.status === 'approved'
                            ? '#1d4ed8'
                            : item.status === 'disputed'
                            ? '#b91c1c'
                            : '#64748b',
                      }}
                    >
                      {item.status === 'cleared'
                        ? t('maritime_freight.maritime_agents_tab.s36', "تمت المقاصة")
                        : item.status === 'approved'
                        ? t('maritime_freight.maritime_agents_tab.s37', "معتمد")
                        : item.status === 'disputed'
                        ? t('maritime_freight.maritime_agents_tab.s38', "نزاع")
                        : t('maritime_freight.maritime_agents_tab.s39', "قيد المراجعة")}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {item.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'approved')}
                          style={{ padding: '3px 8px', background: '#166534', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          {t('maritime_freight.maritime_agents_tab.s40', "اعتماد")}
                        </button>
                      )}
                      {item.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'cleared')}
                          style={{ padding: '3px 8px', background: '#1d4ed8', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          {t('maritime_freight.maritime_agents_tab.s41', "إتمام المقاصة")}
                        </button>
                      )}
                      {item.agent_id && (
                        <button
                          type="button"
                          onClick={() => handleOpenSoa(item.agent_id)}
                          style={{ padding: '3px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          {t('maritime_freight.maritime_agents_tab.s42', "كشف الحساب SOA")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Settlement */}
      <StandardDialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('maritime_freight.maritime_agents_tab.s43', "تسجيل إشعار خصم/إضافة أو مناصفة أرباح للوكيل الخارجي")}
        subtitle={t('maritime_freight.maritime_agents_tab.s44', "توثيق المعاملات المالية المتبادلة مع شبكة وكلاء الشحن حول العالم")}
        width="620px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Field label={t('maritime_freight.maritime_agents_tab.s45', "الوكيل الخارجي")}>
            <select
              value={formData.agentId}
              onChange={(e) => {
                const ag = agents.find((a) => String(a.id) === e.target.value);
                setFormData({
                  ...formData,
                  agentId: e.target.value,
                  agentName: ag ? ag.name_ar : formData.agentName,
                });
              }}
              style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">{t('maritime_freight.maritime_agents_tab.s46', "اختر الوكيل من الدليل...")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name_ar} ({a.country_name || a.code})</option>
              ))}
            </select>
          </Field>

          {!formData.agentId && (
            <Field label={t('maritime_freight.maritime_agents_tab.s47', "أو أدخل اسم الوكيل يدوياً")}>
              <input
                type="text"
                placeholder={t('maritime_freight.maritime_agents_tab.s48', "اسم وكيل الشحن بالخارج...")}
                value={formData.agentName}
                onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label={t('maritime_freight.maritime_agents_tab.s49', "نوع الإشعار / المعاملة")}>
              <select
                value={formData.settlementType}
                onChange={(e) => setFormData({ ...formData, settlementType: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="profit_share">{t('maritime_freight.maritime_agents_tab.s50', "مناصفة أرباح (Profit Share)")}</option>
                <option value="debit_note">{t('maritime_freight.maritime_agents_tab.s51', "إشعار مدين لنا (Debit Note)")}</option>
                <option value="credit_note">{t('maritime_freight.maritime_agents_tab.s52', "إشعار دائن علينا (Credit Note)")}</option>
                <option value="offset_clearing">{t('maritime_freight.maritime_agents_tab.s53', "تسوية مقاصة (Offset Clearing)")}</option>
              </select>
            </Field>

            <Field label={t('maritime_freight.maritime_agents_tab.s54', "رقم أمر الشغل (Job #)")}>
              <input
                type="text"
                placeholder={t('maritime_freight.maritime_agents_tab.s55', "مثال: JOB-261007-0001")}
                value={formData.jobNumber}
                onChange={(e) => setFormData({ ...formData, jobNumber: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label={t('maritime_freight.maritime_agents_tab.s56', "المبلغ بالدولار ($)")}>
              <input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
              />
            </Field>

            <Field label={t('maritime_freight.maritime_agents_tab.s57', "نسبة المناصفة %")}>
              <input
                type="number"
                placeholder="50"
                value={formData.profitSharePercent}
                onChange={(e) => setFormData({ ...formData, profitSharePercent: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label={t('maritime_freight.maritime_agents_tab.s58', "سعر الصرف (EGP/USD)")}>
              <input
                type="number"
                placeholder="49.0"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          </div>

          <Field label={t('maritime_freight.maritime_agents_tab.s59', "ملاحظات وبيان المعاملة")}>
            <textarea
              rows={2}
              placeholder={t('maritime_freight.maritime_agents_tab.s60', "شحنة Collect، مصاريف ميناء المنشأ، أو تسوية رصيد سنوي...")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </Field>
        </div>

        <StandardDialogFooter>
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('maritime_freight.maritime_agents_tab.s61', "إلغاء")}
          </button>
          <button
            type="button"
            onClick={handleCreateSettlement}
            disabled={isSubmitting}
            style={{ padding: '8px 20px', background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700 }}
          >
            {isSubmitting ? t('maritime_freight.maritime_agents_tab.s62', "جاري الحفظ...") : t('maritime_freight.maritime_agents_tab.s63', "حفظ الإشعار")}
          </button>
        </StandardDialogFooter>
      </StandardDialog>

      {/* Modal: Agent Statement of Account (SOA) */}
      <StandardDialog
        open={showSoaModal}
        onClose={() => setShowSoaModal(false)}
        title={t('maritime_freight.maritime_agents_tab.s64', "كشف حساب ومقاصة الوكيل الخارجي (Statement of Account - SOA)")}
        subtitle={t('maritime_freight.maritime_agents_tab.s65', "مطابقة الأرصدة المتبادلة وحساب صافي التسوية (Receivable vs Payable)")}
        width="680px"
      >
        {loadingSoa ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>{t('maritime_freight.maritime_agents_tab.s66', "جاري استخراج كشف الحساب...")}</div>
        ) : soaData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* SOA Summary Box */}
            <div style={{ background: '#f8fafc', border: '2px solid #170e5e', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#170e5e' }}>
                  {t('maritime_freight.maritime_agents_tab.s67', "صافي الرصيد النهائي للمقاصة (NET CLEARING BALANCE)")}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  {t('maritime_freight.maritime_agents_tab.s68', "إجمالي المدين: $")}{soaData.summary.totalDebitUsd.toLocaleString()} {t('maritime_freight.maritime_agents_tab.s69', "| إجمالي الدائن: $")}{soaData.summary.totalCreditUsd.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: soaData.summary.position === 'receivable' ? '#166534' : '#b91c1c' }}>
                $ {Math.abs(soaData.summary.netBalanceUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span style={{ fontSize: '0.75rem', marginRight: '6px' }}>{soaData.summary.position === 'receivable' ? t('maritime_freight.maritime_agents_tab.s70', "(مستحق لنا)") : t('maritime_freight.maritime_agents_tab.s71', "(مستحق للوكيل)")}</span>
              </div>
            </div>

            {/* SOA Items Table */}
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 10px' }}>{t('maritime_freight.maritime_agents_tab.s72', "المرجع")}</th>
                    <th style={{ padding: '8px 10px' }}>{t('maritime_freight.maritime_agents_tab.s73', "النوع")}</th>
                    <th style={{ padding: '8px 10px' }}>{t('maritime_freight.maritime_agents_tab.s74', "أمر الشغل")}</th>
                    <th style={{ padding: '8px 10px' }}>{t('maritime_freight.maritime_agents_tab.s75', "المبلغ ($)")}</th>
                    <th style={{ padding: '8px 10px' }}>{t('maritime_freight.maritime_agents_tab.s76', "الحالة")}</th>
                  </tr>
                </thead>
                <tbody>
                  {soaData.settlements.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace' }}>{s.reference_number || `#${s.id}`}</td>
                      <td style={{ padding: '8px 10px' }}>{s.settlement_type}</td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{s.job_number || '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, fontFamily: 'monospace' }}>${Number(s.amount).toLocaleString()}</td>
                      <td style={{ padding: '8px 10px' }}>{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <StandardDialogFooter>
          <button
            type="button"
            onClick={() => setShowSoaModal(false)}
            style={{ padding: '8px 18px', background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
          >
            {t('maritime_freight.maritime_agents_tab.s77', "إغلاق")}
          </button>
        </StandardDialogFooter>
      </StandardDialog>
    </div>
  );
}
