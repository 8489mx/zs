import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { useAppToolbar } from '@/stores/toolbar-store';
import { contractingApi } from '../api/contracting.api';
import { MasterBoqItem, MasterBoqTrade } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CreateMasterBoqItemModal } from '../components/CreateMasterBoqItemModal';
import { downloadExcelFile } from '@/lib/browser';
import { getTextDirection } from '@/lib/arabic-normalization';

export function ContractingMasterBoqPage() {
  useAppToolbar([
    { label: 'الرئيسية', to: '/dashboard' },
    { label: 'المقاولات والمشاريع', to: '/contracting' },
    { label: 'إعدادات وبنك بنود المقاولات', to: '/contracting/master-boq' },
  ]);

  const [trades, setTrades] = useState<MasterBoqTrade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<MasterBoqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterBoqItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load trades on mount
  const loadTrades = useCallback(async () => {
    try {
      const data = await contractingApi.getMasterBoqTrades();
      setTrades(data || []);
    } catch (err) {
      console.error('Failed to load trades:', err);
    }
  }, []);

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contractingApi.getMasterBoqLibrary({
        tradeCategory: selectedTrade !== 'all' ? selectedTrade : undefined,
        search: search.trim() || undefined,
      });
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load master BOQ items:', err);
      setNotification({ type: 'error', text: 'تعذر تحميل بنك البنود المرجعي' });
    } finally {
      setLoading(false);
    }
  }, [selectedTrade, search]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف البند المرجعي "${name}"؟`)) return;
    setDeletingId(id);
    try {
      await contractingApi.deleteMasterBoqItem(id);
      setNotification({ type: 'success', text: 'تم حذف البند المرجعي بنجاح' });
      loadItems();
      loadTrades();
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'تعذر حذف البند المرجعي' });
    } finally {
      setDeletingId(null);
    }
  };

  // KPIs
  const totalItemsCount = items.length;
  const customItemsCount = items.filter((i) => i.isCustom).length;
  const totalTradesCount = trades.length;
  const avgMargin = useMemo(() => {
    if (items.length === 0) return 0;
    const margins = items
      .filter((i) => Number(i.standardPrice) > 0 && Number(i.standardCost) > 0)
      .map((i) => ((Number(i.standardPrice) - Number(i.standardCost)) / Number(i.standardPrice)) * 100);
    if (margins.length === 0) return 0;
    return Math.round(margins.reduce((a, b) => a + b, 0) / margins.length);
  }, [items]);

  const handleExportExcel = () => {
    if (items.length === 0) return;
    const headers = [
      'كود البند',
      'التخصص',
      'مسمى البند',
      'بيان الأعمال والمواصفات',
      'الوحدة',
      'التكلفة المرجعية',
      'سعر الفئة التعاقدي المقترح',
      'هامش الربح التقديري (%)',
      'نوع البند',
    ];
    const rows = items.map((i) => {
      const price = Number(i.standardPrice) || 0;
      const cost = Number(i.standardCost) || 0;
      const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
      return [
        i.itemCode,
        i.tradeNameAr || i.tradeCategory,
        i.name,
        i.description,
        i.unit,
        cost,
        price,
        `${margin}%`,
        i.isCustom ? 'مخصص للشركة' : 'قياسي عام',
      ];
    });
    downloadExcelFile(
      `بنك_بنود_المقاولات_المرجعي_${new Date().toISOString().slice(0, 10)}.xlsx`,
      headers,
      rows,
    );
  };

  return (
    <div className="page-stack page-shell contracting-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* هيدر الصفحة القياسي المستقل */}
        <PageHeader
          title="إعدادات وبنك بنود المقاولات العام"
          description="دليل البنود والمقايسات القياسي لكافة التخصصات الإنشائية والكهروميكانيكية وثوابت التسعير للشركة — تسحب منها كافة المشاريع بضغطة زر."
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={items.length === 0}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: items.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: 'var(--font-body)',
                  opacity: items.length > 0 ? 1 : 0.6,
                }}
              >
                <AppIcons.Download size={14} />
                <span>تصدير Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loadItems();
                  loadTrades();
                }}
                disabled={loading}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: 'var(--font-body)',
                }}
              >
                <AppIcons.RefreshCw size={15} />
                <span>تحديث</span>
              </button>
            </div>
          }
        />

        {/* التنبيهات الإرشادية */}
        {notification && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: notification.type === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            <span>{notification.text}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <AppIcons.X size={16} />
            </button>
          </div>
        )}

        {/* بطاقات المؤشرات العامة (Enterprise KPI Summary) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
              إجمالي البنود بالبنك
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {totalItemsCount.toLocaleString('en-US')}{' '}
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 500, color: '#64748b' }}>بند قياسي</span>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
              التخصصات الإنشائية المعتمدة
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#170e5e' }}>
              {totalTradesCount}{' '}
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 500, color: '#64748b' }}>تخصص هندسي</span>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
              بنود الشركة المخصصة
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af' }}>
              {customItemsCount.toLocaleString('en-US')}{' '}
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 500, color: '#64748b' }}>بند مخصص</span>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
              متوسط هامش الربح المرجعي
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
              {avgMargin}%{' '}
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 500, color: '#64748b' }}>تقديري</span>
            </div>
          </div>
        </div>

        {/* شريط الإجراءات والبحث */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px', maxWidth: '460px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }}>
                <AppIcons.Search size={16} />
              </span>
              <input
                type="text"
                placeholder="ابحث بكود البند أو المسمى أو المواصفات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 36px 0 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: 'var(--font-body)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
            معروض الآن: <strong style={{ color: '#0f172a' }}>{items.length}</strong> بند من أصل {trades.reduce((sum, t) => sum + t.itemsCount, 0)}
          </div>
        </div>

        {/* شبكة تخصصات البنود الإنشائية المتناسقة بصرياً على سطرين بدون سكرول نهائياً */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedTrade('all')}
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              fontSize: 'var(--font-badge)',
              fontWeight: 700,
              border: selectedTrade === 'all' ? '1px solid #170e5e' : '1px solid #e2e8f0',
              background: selectedTrade === 'all' ? '#170e5e' : '#ffffff',
              color: selectedTrade === 'all' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              boxShadow: selectedTrade === 'all' ? '0 1px 2px rgba(23, 14, 94, 0.15)' : 'none',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              كافة التخصصات
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 7px',
                borderRadius: '10px',
                background: selectedTrade === 'all' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                color: selectedTrade === 'all' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                marginInlineStart: '6px',
              }}
            >
              {trades.reduce((sum, t) => sum + t.itemsCount, 0)}
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
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: 'var(--font-badge)',
                  fontWeight: 600,
                  border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: isSelected ? '#170e5e' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 2px rgba(23, 14, 94, 0.15)' : 'none',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.tradeNameAr}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 7px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                    marginInlineStart: '6px',
                  }}
                >
                  {t.itemsCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* شريط الإجراء المباشر أعلى الجدول مباشرة */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>
            قائمة البنود القياسية والمواصفات الفنية
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsCreateModalOpen(true);
            }}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 700,
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
            }}
          >
            <AppIcons.Plus size={15} />
            <span>إضافة بند مرجعي مخصص</span>
          </button>
        </div>

        {/* جدول البنود المرجعية (Master BOQ Table) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {loading ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
              جاري تحميل بنك البنود المرجعي...
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <AppIcons.FileText size={48} />
              </div>
              <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                لا توجد بنود مطابقة
              </div>
              <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                لم يتم العثور على أي بنود في هذا التخصص أو بكلمة البحث المدخلة.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>
                      كود البند
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>
                      التخصص
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>
                      مسمى البند والمواصفات الفنية
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                      الوحدة
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>
                      التكلفة المرجعية
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>
                      سعر البيع المقترح
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                      الهامش
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                      النوع
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const price = Number(item.standardPrice) || 0;
                    const cost = Number(item.standardCost) || 0;
                    const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e', fontFamily: 'monospace' }}>
                          {item.itemCode}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 'var(--font-micro)' }}>
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.tradeNameAr || item.tradeCategory}
                          </span>
                        </td>
                        {(() => {
                          const descText = (item.description && item.description !== item.name) ? item.description : (item.name || '');
                          const dir = getTextDirection(descText);
                          const isRtl = dir === 'rtl';
                          return (
                            <td dir={dir} style={{ padding: '12px 16px', maxWidth: '380px', textAlign: isRtl ? 'right' : 'left' }}>
                              <div
                                dir={dir}
                                style={{
                                  fontSize: 'var(--font-body)',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  marginBottom: '2px',
                                  textAlign: isRtl ? 'right' : 'left',
                                  direction: dir,
                                }}
                              >
                                {item.name}
                              </div>
                              {item.description && item.description !== item.name && (
                                <div
                                  dir={dir}
                                  className="text-justify spec-description"
                                  style={{
                                    fontSize: 'var(--font-micro)',
                                    color: '#64748b',
                                    lineHeight: 1.55,
                                    textAlign: 'justify',
                                    textJustify: 'inter-word',
                                    textAlignLast: isRtl ? 'right' : 'left',
                                    wordBreak: 'break-word',
                                    direction: dir,
                                  }}
                                >
                                  {item.description}
                                </div>
                              )}
                            </td>
                          );
                        })()}
                        <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#475569', textAlign: 'center' }}>
                          {item.unit}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#64748b' }}>
                          {cost > 0 ? cost.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                          {price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: 'var(--font-micro)',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: margin >= 20 ? '#ecfdf5' : margin > 0 ? '#fffbeb' : '#fef2f2',
                              color: margin >= 20 ? '#047857' : margin > 0 ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {margin}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: 'var(--font-micro)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: item.isCustom ? '#eff6ff' : '#f8fafc',
                              color: item.isCustom ? '#1d4ed8' : '#64748b',
                              border: `1px solid ${item.isCustom ? '#bfdbfe' : '#e2e8f0'}`,
                              fontWeight: 600,
                            }}
                          >
                            {item.isCustom ? 'مخصص للشركة' : 'نظام قياسي'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              title="تعديل السعر والمواصفات"
                              onClick={() => {
                                setEditingItem(item);
                                setIsCreateModalOpen(true);
                              }}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <AppIcons.Edit size={13} />
                            </button>
                            {item.isCustom && (
                              <button
                                type="button"
                                title="حذف البند المخصص"
                                disabled={deletingId === item.id}
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  background: '#fef2f2',
                                  color: '#b91c1c',
                                  border: '1px solid #fecaca',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <AppIcons.Trash size={13} />
                              </button>
                            )}
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

        {/* مودال الإضافة والتعديل */}
        {isCreateModalOpen && (
          <CreateMasterBoqItemModal
            open={isCreateModalOpen}
            initialItem={editingItem}
            trades={trades}
            existingItems={items}
            initialTradeCategory={selectedTrade !== 'all' ? selectedTrade : undefined}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingItem(null);
            }}
            onSaved={() => {
              loadItems();
              loadTrades();
              setNotification({
                type: 'success',
                text: editingItem ? 'تم تحديث بيانات البند بنجاح' : 'تمت إضافة البند إلى بنك البنود المرجعي بنجاح',
              });
            }}
          />
        )}
      </main>
    </div>
  );
}
