import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/shared/components/system-alert';
import { Button } from '@/shared/ui/button';
import {
  RefreshCwIcon,
  SlidersIcon,
  SearchIcon,
  MessageSquareIcon,
  CalendarIcon,
  PhoneIcon,
  FileTextIcon,
  CheckShieldIcon,
  AlertCircleIcon,
  ClockIcon,
} from '@/shared/components/icons/AppIcons';
import {
  arCollectionsApi,
  type ArCollectionsOverview,
  type ArCollectionCaseItem,
} from '../api/ar-collections.api';
import { ArCollectionsKpis } from '../components/collections/ArCollectionsKpis';
import { ArPromiseToPayModal } from '../components/collections/ArPromiseToPayModal';
import { ArInteractionLogModal } from '../components/collections/ArInteractionLogModal';
import { ArDunningLevelsModal } from '../components/collections/ArDunningLevelsModal';
import { ArCaseDetailsModal } from '../components/collections/ArCaseDetailsModal';

export const ArCollectionsPage: React.FC = () => {
  const [overview, setOverview] = useState<ArCollectionsOverview | null>(null);
  const [cases, setCases] = useState<ArCollectionCaseItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedCase, setSelectedCase] = useState<ArCollectionCaseItem | null>(null);
  const [showPromiseModal, setShowPromiseModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showLevelsModal, setShowLevelsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, casesRes] = await Promise.all([
        arCollectionsApi.getOverview(),
        arCollectionsApi.getCases({
          status: statusFilter,
          search: searchTerm.trim() || undefined,
          limit: 100,
        }),
      ]);
      setOverview(ovRes);
      setCases(casesRes.cases);
      setTotalCount(casesRes.totalCount);
    } catch (err: any) {
      toast.error('تعذر جلب بيانات التحصيلات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSyncCollections = async () => {
    setSyncing(true);
    try {
      const res = await arCollectionsApi.syncCollections();
      toast.success(
        `اكتملت المزامنة بنجاح: تم فحص ${res.scannedCustomers} عميل، وتحديث ${res.activeCases} ملف نشط، وحظر ${res.creditBlockedCount} عميل متجاوز.`,
      );
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر مزامنة التحصيلات');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleBlock = async (item: ArCollectionCaseItem) => {
    const nextBlock = !item.is_credit_blocked;
    try {
      await arCollectionsApi.toggleCreditBlock(item.id, {
        block: nextBlock,
        reason: nextBlock ? 'حظر يدوي سريع من لوحة التحصيل' : 'رفع حظر يدوي من لوحة التحصيل',
      });
      toast.success(nextBlock ? 'تم إيقاف البيع الآجل للعميل.' : 'تم رفع حظر البيع الآجل.');
      fetchData();
    } catch (err: any) {
      toast.error('تعذر تغيير حالة حظر الآجل');
    }
  };

  const getLevelBadge = (item: ArCollectionCaseItem) => {
    if (!item.level_name) {
      return <span style={{ fontSize: '11px', color: '#94a3b8' }}>—</span>;
    }
    const order = item.level_order || 1;
    let bg = '#eff6ff';
    let color = '#1d4ed8';
    let border = '#bfdbfe';

    if (order === 2) {
      bg = '#fffbeb';
      color = '#b45309';
      border = '#fde68a';
    } else if (order === 3) {
      bg = '#fff7ed';
      color = '#c2410c';
      border = '#fed7aa';
    } else if (order >= 4) {
      bg = '#fef2f2';
      color = '#b91c1c';
      border = '#fecaca';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
        }}
      >
        <span>مستوى {order}:</span>
        <span>{item.level_name}</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'promised_to_pay':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
            تعهد بالسداد
          </span>
        );
      case 'escalated':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            تصعيد وإنذار
          </span>
        );
      case 'settled':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            مسدد بالكامل
          </span>
        );
      default:
        return (
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            مفتوح للمتابعة
          </span>
        );
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        width: 'min(100%, 1280px)',
        margin: '0 auto',
        padding: '20px 16px',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-page-title, 1.15rem)',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 4px 0',
            }}
          >
            مركز متابعة وتصعيد التحصيلات (AR Collections & Dunning Hub)
          </h1>
          <p
            style={{
              fontSize: 'var(--font-subtitle, 0.8125rem)',
              color: '#64748b',
              margin: 0,
            }}
          >
            إدارة استباقية لمتأخرات العملاء، خطابات المطالبة التدريجية، والتطبيق الآلي لحظر التسهيلات الائتمانية.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowLevelsModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <SlidersIcon size={15} color="#170e5e" />
            <span>إعدادات مستويات المطالبة</span>
          </Button>

          <Button
            type="button"
            disabled={syncing}
            onClick={handleSyncCollections}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '12.5px',
            }}
          >
            <RefreshCwIcon size={15} color="#ffffff" className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'جاري الفحص والمزامنة...' : 'مزامنة التحصيلات والتصعيد الآلي'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <ArCollectionsKpis overview={overview} loading={loading} />

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        {/* Filter Strip */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'all', label: 'كافة الملفات' },
              { id: 'open', label: 'مفتوحة للمتابعة' },
              { id: 'promised_to_pay', label: 'تعهد بالسداد' },
              { id: 'escalated', label: 'تحت الإنذار / التصعيد' },
              { id: 'settled', label: 'مسددة' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  border: 'none',
                  backgroundColor: statusFilter === tab.id ? '#ffffff' : 'transparent',
                  color: statusFilter === tab.id ? '#170e5e' : '#475569',
                  fontWeight: 600,
                  fontSize: '12px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم أو رقم الهاتف..."
              style={{
                width: '100%',
                padding: '6px 32px 6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <SearchIcon size={14} color="#94a3b8" />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            جاري تحميل سجلات وملفات التحصيل...
          </div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '60px 16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <CheckShieldIcon size={24} color="#94a3b8" />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              لا توجد ملفات متأخرات تطابق الفلتر
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              جميع الحسابات منتظمة أو لا توجد مطالبات في هذه الفئة. اضغط على «مزامنة التحصيلات والتصعيد الآلي» لتحديث السجلات.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'right' }}>
              <thead style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '10px 14px' }}>العميل</th>
                  <th style={{ padding: '10px 14px' }}>المتأخرات / الرصيد</th>
                  <th style={{ padding: '10px 14px' }}>أقدم تأخير</th>
                  <th style={{ padding: '10px 14px' }}>مستوى المطالبة</th>
                  <th style={{ padding: '10px 14px' }}>الحالة والموعد</th>
                  <th style={{ padding: '10px 14px' }}>موقف الآجل</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات السريعة</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c, idx) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: c.is_credit_blocked ? '#fffbfb' : '#ffffff',
                    }}
                  >
                    {/* Customer */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.customer_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{c.customer_phone || 'بدون هاتف'}</div>
                    </td>

                    {/* Overdue / Balance */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#b91c1c' }}>
                        {Number(c.total_overdue).toLocaleString('ar-EG')} ج.م
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        من رصيد {Number(c.customer_balance).toLocaleString('ar-EG')} ج.م
                      </div>
                    </td>

                    {/* Days Overdue */}
                    <td style={{ padding: '10px 14px' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: c.oldest_overdue_days >= 30 ? '#c2410c' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ClockIcon size={13} color={c.oldest_overdue_days >= 30 ? '#c2410c' : '#64748b'} />
                        <span>{c.oldest_overdue_days} يوم</span>
                      </div>
                    </td>

                    {/* Level */}
                    <td style={{ padding: '10px 14px' }}>{getLevelBadge(c)}</td>

                    {/* Status & Promise Date */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ marginBottom: '3px' }}>{getStatusBadge(c.status)}</div>
                      {c.promised_payment_date && (
                        <div style={{ fontSize: '10.5px', color: '#047857', fontWeight: 600 }}>
                          موعد السداد: {c.promised_payment_date}
                        </div>
                      )}
                    </td>

                    {/* Credit Block */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: c.is_credit_blocked ? '#fef2f2' : '#ecfdf5',
                            color: c.is_credit_blocked ? '#991b1b' : '#065f46',
                            border: `1px solid ${c.is_credit_blocked ? '#fecaca' : '#a7f3d0'}`,
                          }}
                        >
                          {c.is_credit_blocked ? 'محظور' : 'مسموح'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(c)}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10.5px',
                            cursor: 'pointer',
                            color: '#334155',
                          }}
                        >
                          {c.is_credit_blocked ? 'إلغاء' : 'حظر'}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {c.whatsAppUrl ? (
                          <a
                            href={c.whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="إرسال رسالة مطالبة واتساب فورية"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: '#25d366',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            <MessageSquareIcon size={14} color="#ffffff" />
                          </a>
                        ) : (
                          <span
                            title="رقم الهاتف غير مسجل"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              color: '#cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'not-allowed',
                            }}
                          >
                            <MessageSquareIcon size={14} color="#cbd5e1" />
                          </span>
                        )}

                        <button
                          type="button"
                          title="تسجيل تعهد بالسداد"
                          onClick={() => {
                            setSelectedCase(c);
                            setShowPromiseModal(true);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <CalendarIcon size={14} color="#1d4ed8" />
                        </button>

                        <button
                          type="button"
                          title="توثيق إجراء تواصل ومتابعة"
                          onClick={() => {
                            setSelectedCase(c);
                            setShowLogModal(true);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <PhoneIcon size={14} color="#475569" />
                        </button>

                        <button
                          type="button"
                          title="عرض ملف التحصيل الشامل"
                          onClick={() => {
                            setSelectedCase(c);
                            setShowDetailsModal(true);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#170e5e',
                            border: '1px solid #170e5e',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <FileTextIcon size={14} color="#ffffff" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Count */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '12px', color: '#64748b' }}>
          إجمالي الملفات المعروضة: {cases.length} من أصل {totalCount} ملف
        </div>
      </div>

      {/* Modals */}
      <ArPromiseToPayModal
        open={showPromiseModal}
        onClose={() => {
          setShowPromiseModal(false);
          setSelectedCase(null);
        }}
        onSuccess={fetchData}
        caseItem={selectedCase}
      />

      <ArInteractionLogModal
        open={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setSelectedCase(null);
        }}
        onSuccess={fetchData}
        caseItem={selectedCase}
      />

      <ArDunningLevelsModal
        open={showLevelsModal}
        onClose={() => setShowLevelsModal(false)}
        onSaved={fetchData}
      />

      <ArCaseDetailsModal
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCase(null);
        }}
        caseId={selectedCase?.id || null}
        onRefreshList={fetchData}
        onOpenPromiseModal={() => {
          setShowDetailsModal(false);
          setShowPromiseModal(true);
        }}
        onOpenLogModal={() => {
          setShowDetailsModal(false);
          setShowLogModal(true);
        }}
      />
    </div>
  );
};
