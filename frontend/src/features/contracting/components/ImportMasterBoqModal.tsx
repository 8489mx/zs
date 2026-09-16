import { useState, useEffect, useMemo } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { contractingApi } from '../api/contracting.api';
import { MasterBoqItem, MasterBoqTrade } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { getTextDirection } from '@/lib/arabic-normalization';

interface ImportMasterBoqModalProps {
  open: boolean;
  projectId?: string;
  projectName?: string;
  onClose: () => void;
  onSuccess?: () => void;
  onImportSelected?: (selectedIds: (string | number)[]) => void;
}

export function ImportMasterBoqModal({
  open,
  projectId = '',
  projectName = '',
  onClose,
  onSuccess,
  onImportSelected,
}: ImportMasterBoqModalProps) {
  const [trades, setTrades] = useState<MasterBoqTrade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [allItems, setAllItems] = useState<MasterBoqItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load available trades and all items once when modal opens
  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedIds(new Set());
    setSearch('');
    setSelectedTrade('all');
    setLoading(true);

    Promise.all([
      contractingApi.getMasterBoqTrades().catch(() => []),
      contractingApi.getMasterBoqLibrary({}).catch(() => []),
    ])
      .then(([tradesData, itemsData]) => {
        setTrades(tradesData || []);
        setAllItems(itemsData || []);
      })
      .catch((err: any) => {
        setErrorMsg(err?.message || 'تعذر تحميل بنك البنود المرجعي');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  // Instant in-memory search and trade filtering (Zero flicker, zero network latency)
  const filteredItems = useMemo(() => {
    let result = allItems;
    if (selectedTrade !== 'all') {
      result = result.filter((it) => it.tradeCategory === selectedTrade);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((it) =>
        it.itemCode.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        (it.description && it.description.toLowerCase().includes(q)) ||
        (it.tradeNameAr && it.tradeNameAr.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allItems, selectedTrade, search]);

  const allVisibleSelected = useMemo(() => {
    if (filteredItems.length === 0) return false;
    return filteredItems.every((it) => selectedIds.has(it.id));
  }, [filteredItems, selectedIds]);

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      filteredItems.forEach((it) => next.delete(it.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredItems.forEach((it) => next.add(it.id));
      setSelectedIds(next);
    }
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      setErrorMsg('يرجى تحديد بند واحد على الأقل للاستيراد');
      return;
    }

    if (onImportSelected) {
      onImportSelected(Array.from(selectedIds));
      return;
    }

    if (!projectId) {
      setErrorMsg('معرف المشروع غير متوفر');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await contractingApi.importMasterBoqToProject(projectId, Array.from(selectedIds));
      setSuccessMsg(`تم استيراد ${res.importedCount} بند بنجاح إلى مقايسة المشروع!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء استيراد البنود');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="سحب واستيراد من بنك بنود المقاولات المرجعي"
      subtitle={`سحب وتوريث البنود القياسية بأسعار السوق المحدثة إلى مشروع: ${projectName}`}
      width="min(1200px, 96vw)"
      maxWidth="1200px"
      minHeight="min(620px, 85vh)"
      footerActions={(
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-subtitle)', color: '#475569' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              المحدد حالياً: {selectedIds.size} بند
            </span>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: 'var(--font-micro)',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                إلغاء التحديد
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 18px', borderRadius: '8px', cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={submitting || selectedIds.size === 0}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                padding: '8px 22px',
                borderRadius: '8px',
                fontWeight: 700,
                border: 'none',
                cursor: selectedIds.size === 0 || submitting ? 'not-allowed' : 'pointer',
                opacity: selectedIds.size === 0 || submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'جاري الاستيراد...' : `سحب (${selectedIds.size}) بند إلى المقايسة`}
            </button>
          </div>
        </div>
      )}
    >
      {/* Container with a fixed, stable height to eliminate all resizing jitter & flickering */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '600px', maxHeight: '75vh' }}>
        {/* Messages */}
        {errorMsg && (
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontSize: 'var(--font-subtitle)', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', fontSize: 'var(--font-subtitle)', fontWeight: 600 }}>
            {successMsg}
          </div>
        )}

        {/* Trade Category Filter Chips & Search Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بكود البند، الاسم، التوصيف الفني، أو التخصص..."
                style={{
                  width: '100%',
                  padding: '8px 34px 8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 'var(--font-body)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <AppIcons.Search size={16} />
              </span>
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: '#e2e8f0', border: 'none', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', fontSize: 'var(--font-micro)', fontWeight: 600 }}
              >
                مسح البحث
              </button>
            )}
          </div>

          {/* Trade Categories Filter Tabs - Clean 2-Row Wrap with fixed bounds */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setSelectedTrade('all')}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '14px',
                fontSize: 'var(--font-badge)',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedTrade === 'all' ? '#170e5e' : '#cbd5e1',
                backgroundColor: selectedTrade === 'all' ? '#170e5e' : '#ffffff',
                color: selectedTrade === 'all' ? '#ffffff' : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>كافة التخصصات</span>
              <span
                style={{
                  background: selectedTrade === 'all' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: selectedTrade === 'all' ? '#ffffff' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 700,
                }}
              >
                {allItems.length}
              </span>
            </button>
            {trades.map((t) => {
              const isSelected = selectedTrade === t.tradeCategory;
              return (
                <button
                  key={t.tradeCategory}
                  type="button"
                  onClick={() => setSelectedTrade(t.tradeCategory)}
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    borderRadius: '14px',
                    fontSize: 'var(--font-badge)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isSelected ? '#170e5e' : '#cbd5e1',
                    backgroundColor: isSelected ? '#170e5e' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{t.tradeNameAr}</span>
                  <span
                    style={{
                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#0f172a',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {t.itemsCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Items Table - Solid flex container with fixed vertical bounds and zero horizontal clipping */}
        <div style={{ flex: 1, minHeight: '350px', overflowX: 'auto', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <colgroup>
              <col style={{ width: '38px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: 'auto' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '9px 8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    title="تحديد كل المعروض"
                  />
                </th>
                <th style={{ padding: '9px 8px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>كود البند</th>
                <th style={{ padding: '9px 10px', fontSize: 'var(--font-table-head)', color: '#475569' }}>اسم البند والتوصيف الهندسي</th>
                <th style={{ padding: '9px 8px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>التخصص</th>
                <th style={{ padding: '9px 8px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>الوحدة</th>
                <th style={{ padding: '9px 10px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'left' }}>تكلفة السوق</th>
                <th style={{ padding: '9px 10px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'left' }}>سعر البيع</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '90px 20px' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', fontWeight: 600 }}>جاري تحميل بنك البنود المرجعي...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    لا توجد بنود مطابقة للبحث أو التخصص المحدد.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const isChecked = selectedIds.has(it.id);
                  return (
                    <tr
                      key={it.id}
                      onClick={() => toggleItem(it.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <td style={{ padding: '8px 8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(it.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 8px', fontFamily: 'monospace', fontWeight: 700, fontSize: 'var(--font-micro)', color: '#0369a1', textAlign: 'center' }}>
                        {it.itemCode}
                      </td>
                      {(() => {
                        const dir = getTextDirection(it.description || it.name);
                        const isRtl = dir === 'rtl';
                        return (
                          <td dir={dir} style={{ padding: '8px 10px', textAlign: isRtl ? 'right' : 'left' }}>
                            <div dir={dir} style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: '#0f172a', textAlign: isRtl ? 'right' : 'left', lineHeight: 1.35 }}>
                              {it.name}
                            </div>
                            {it.description && (
                              <div dir={dir} style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px', textAlign: isRtl ? 'right' : 'left', lineHeight: 1.4 }}>
                                {it.description}
                              </div>
                            )}
                          </td>
                        );
                      })()}
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#334155', fontSize: 'var(--font-badge)', fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}>
                          {it.tradeNameAr}
                        </span>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 'var(--font-micro)' }}>
                        {it.unit}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        {it.standardCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#15803d', fontSize: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        {it.standardPrice.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </StandardDialog>
  );
}
