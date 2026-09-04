import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { accountingApi, type FixedAsset } from '@/features/accounting/api/accounting.api';
import { Trash2Icon } from '@/shared/components/icons/AppIcons';
import { StatsGrid } from '@/shared/components/stats-grid';

const categoryLabels: Record<string, string> = {
  general: 'عام',
  equipment: 'معدات وأجهزة',
  vehicle: 'سيارات ونقل',
  building: 'مباني وعقارات',
  furniture: 'أثاث وتجهيزات',
  it: 'أجهزة حاسوب وتقنية',
};

const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'نشط ويعمل', bg: '#dcfce7', color: '#166534' },
  fully_depreciated: { label: 'مستهلك بالكامل', bg: '#fef3c7', color: '#92400e' },
  retired: { label: 'مستبعد / متقاعد', bg: '#fee2e2', color: '#991b1b' },
};

export function AccountingFixedAssetsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'assets' | 'logs'>('assets');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [depreciateModalAsset, setDepreciateModalAsset] = useState<FixedAsset | null>(null);
  const [depreciateMonths, setDepreciateMonths] = useState(1);
  const [depreciateNote, setDepreciateNote] = useState('');
  const [batchDepreciateOpen, setBatchDepreciateOpen] = useState(false);
  const [batchMonths, setBatchMonths] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for New Asset
  const [newAsset, setNewAsset] = useState({
    code: '',
    name: '',
    category: 'equipment',
    purchaseCost: '',
    salvageValue: '0',
    usefulLifeMonths: '60',
    depreciationMethod: 'straight_line' as 'straight_line' | 'declining_balance',
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const assetsQuery = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => {
      const res = await accountingApi.listFixedAssets();
      return res.assets || [];
    },
  });

  const logsQuery = useQuery({
    queryKey: ['fixed-assets-logs'],
    queryFn: async () => {
      const res = await accountingApi.listAssetDepreciationLogs();
      return res.logs || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newAsset) => {
      return await accountingApi.createFixedAsset({
        code: data.code,
        name: data.name,
        category: data.category,
        purchaseCost: Number(data.purchaseCost),
        salvageValue: Number(data.salvageValue || 0),
        usefulLifeMonths: Number(data.usefulLifeMonths || 60),
        depreciationMethod: data.depreciationMethod,
        purchaseDate: data.purchaseDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      setAddModalOpen(false);
      setNewAsset({
        code: '',
        name: '',
        category: 'equipment',
        purchaseCost: '',
        salvageValue: '0',
        usefulLifeMonths: '60',
        depreciationMethod: 'straight_line',
        purchaseDate: new Date().toISOString().split('T')[0],
      });
    },
  });

  const depreciateMutation = useMutation({
    mutationFn: async ({ id, months, note }: { id: number; months: number; note: string }) => {
      return await accountingApi.depreciateFixedAsset(id, { months, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets-logs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-journals'] });
      setDepreciateModalAsset(null);
      setDepreciateNote('');
      setDepreciateMonths(1);
    },
  });

  const batchDepreciateMutation = useMutation({
    mutationFn: async ({ months, note }: { months: number; note: string }) => {
      return await accountingApi.depreciateAllFixedAssets({ months, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets-logs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-journals'] });
      setBatchDepreciateOpen(false);
      setBatchMonths(1);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await accountingApi.deleteFixedAsset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
  });

  const assets = assetsQuery.data || [];
  const logs = logsQuery.data || [];

  // Summary Metrics
  const summary = useMemo(() => {
    let totalCost = 0;
    let totalAccum = 0;
    let totalBook = 0;
    let activeCount = 0;
    for (const a of assets) {
      if (a.status !== 'retired') {
        totalCost += Number(a.purchase_cost || 0);
        totalAccum += Number(a.accumulated_depreciation || 0);
        totalBook += Number(a.book_value || 0);
        if (a.status === 'active') activeCount++;
      }
    }
    return { totalCost, totalAccum, totalBook, activeCount };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchCat = selectedCategory === 'all' || a.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [assets, selectedCategory, searchQuery]);

  const stats = [
    { key: 'cost', label: 'إجمالي تكلفة الشراء', value: formatCurrency(summary.totalCost) },
    { key: 'accum', label: 'مجمع الإهلاك (1290)', value: formatCurrency(summary.totalAccum) },
    { key: 'book', label: 'صافي القيمة الدفترية', value: formatCurrency(summary.totalBook) },
    { key: 'active', label: 'الأصول النشطة القابلة للإهلاك', value: `${summary.activeCount} أصل` },
  ] as const;

  return (
    <div className="page-stack page-shell fixed-assets-workspace" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px' }}>
        {/* Header */}
        <PageHeader
          title="الأصول الثابتة والإهلاك المحاسبي"
          description="تسجيل وإدارة الأصول الرأسمالية واحتساب قسط الإهلاك وتوليد القيود الآلية في شجرة الحسابات."
          badge={<span className="nav-pill">{summary.activeCount} أصل نشط</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                type="button"
                variant={activeTab === 'assets' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('assets')}
              >
                سجل الأصول
              </Button>
              <Button
                type="button"
                variant={activeTab === 'logs' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('logs')}
              >
                سجل القيود ({logs.length})
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBatchDepreciateOpen(true)}
                style={{ borderColor: '#f59e0b', color: '#b45309', fontWeight: 700 }}
                disabled={summary.activeCount === 0}
              >
                إهلاك شهري عام
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setAddModalOpen(true)}
              >
                + إضافة أصل جديد
              </Button>
            </div>
          }
        />

        {/* Summary KPI Cards */}
        <StatsGrid items={stats} />

        {activeTab === 'assets' ? (
          /* Assets Tab */
          <section className="document-prototype-section">
            <div className="section-header-compact-row">
              <h3 className="document-prototype-section-title">سجل الأصول الرأسمالية</h3>
              <div className="section-header-actions-group">
                <span className="muted small">عرض {filteredAssets.length} من {assets.length} أصل</span>
              </div>
            </div>
            {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minWidth: '240px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
            >
              <option value="all">كل التصنيفات</option>
              <option value="equipment">معدات وأجهزة</option>
              <option value="vehicle">سيارات ونقل</option>
              <option value="building">مباني وعقارات</option>
              <option value="furniture">أثاث وتجهيزات</option>
              <option value="it">أجهزة حاسوب وتقنية</option>
              <option value="general">عام</option>
            </select>
            <span style={{ fontSize: '13px', color: '#64748b', marginRight: 'auto' }}>
              عرض {filteredAssets.length} من {assets.length} أصل
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>الكود</th>
                  <th style={{ padding: '12px 14px' }}>اسم الأصل</th>
                  <th style={{ padding: '12px 14px' }}>التصنيف</th>
                  <th style={{ padding: '12px 14px' }}>تاريخ الشراء</th>
                  <th style={{ padding: '12px 14px' }}>التكلفة</th>
                  <th style={{ padding: '12px 14px' }}>طريقة الإهلاك</th>
                  <th style={{ padding: '12px 14px' }}>مجمع الإهلاك</th>
                  <th style={{ padding: '12px 14px' }}>صافي القيمة الدفترية</th>
                  <th style={{ padding: '12px 14px' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      لا توجد أصول ثابتة مسجلة بعد. اضغط على "+ إضافة أصل جديد" للبدء.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const st = statusLabels[asset.status] || { label: asset.status, bg: '#f1f5f9', color: '#475569' };
                    return (
                      <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>{asset.code}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{asset.name}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{categoryLabels[asset.category] || asset.category}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('ar-EG') : '—'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{formatCurrency(Number(asset.purchase_cost))}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {asset.depreciation_method === 'declining_balance' ? (
                            <span style={{ color: '#7c3aed', fontWeight: 600 }}>قسط متناقص</span>
                          ) : (
                            <span style={{ color: '#0284c7', fontWeight: 600 }}>قسط ثابت ({asset.useful_life_months} شهر)</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#d97706', fontWeight: 700 }}>{formatCurrency(Number(asset.accumulated_depreciation))}</td>
                        <td style={{ padding: '12px 14px', color: '#16a34a', fontWeight: 800 }}>{formatCurrency(Number(asset.book_value))}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {asset.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => setDepreciateModalAsset(asset)}
                                title="إهلاك يدوي للأصل وتوليد قيد"
                                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                              >
                                إهلاك
                              </button>
                            )}
                              <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف أو استبعاد الأصل: ${asset.name}؟`)) {
                                  deleteMutation.mutate(asset.id);
                                }
                              }}
                              title="استبعاد أو حذف الأصل"
                              style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2Icon size={14} color="#991b1b" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* Logs Tab */
        <section className="document-prototype-section">
          <div className="section-header-compact-row">
            <h3 className="document-prototype-section-title">سجل عمليات الإهلاك والقيود اليومية الآلية</h3>
            <div className="section-header-actions-group">
              <span className="nav-pill">{logs.length} قيد محاسبي</span>
            </div>
          </div>
          <p className="muted small section-header-subtitle">
            سجل القيود المحاسبية المولدة آلياً في شجرة الحسابات مع أرقام القيود ومجمعات الإهلاك.
          </p>
          <div style={{ overflowX: 'auto', marginTop: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>تاريخ العملية</th>
                  <th style={{ padding: '10px 12px' }}>الأصل</th>
                  <th style={{ padding: '10px 12px' }}>قيمة الإهلاك</th>
                  <th style={{ padding: '10px 12px' }}>مجمع الإهلاك الجديد</th>
                  <th style={{ padding: '10px 12px' }}>القيمة الدفترية المتبقية</th>
                  <th style={{ padding: '10px 12px' }}>رقم القيد المحاسبي</th>
                  <th style={{ padding: '10px 12px' }}>البيان / الملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      لا توجد قيود إهلاك مسجلة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{new Date(l.period_date).toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.asset_name || `أصل #${l.asset_id}`} ({l.asset_code || ''})</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(Number(l.depreciation_amount))}</td>
                      <td style={{ padding: '10px 12px', color: '#d97706' }}>{formatCurrency(Number(l.accumulated_amount))}</td>
                      <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{formatCurrency(Number(l.book_value))}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                          {l.journal_entry_no || `JE-${l.journal_entry_id}`}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '13px' }}>{l.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      </main>

      {/* Modal: Add New Asset */}
      {addModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '600px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#170e5e', marginBottom: '16px' }}>+ إضافة أصل ثابت جديد</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <Field label="كود الأصل *">
                <input
                  type="text"
                  placeholder="مثال: AST-001"
                  value={newAsset.code}
                  onChange={(e) => setNewAsset({ ...newAsset, code: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="اسم الأصل *">
                <input
                  type="text"
                  placeholder="مثال: سيارة نقل تويوتا"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="التصنيف">
                <select
                  value={newAsset.category}
                  onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="equipment">معدات وأجهزة</option>
                  <option value="vehicle">سيارات ونقل</option>
                  <option value="building">مباني وعقارات</option>
                  <option value="furniture">أثاث وتجهيزات</option>
                  <option value="it">أجهزة حاسوب وتقنية</option>
                  <option value="general">عام</option>
                </select>
              </Field>

              <Field label="تاريخ الشراء">
                <input
                  type="date"
                  value={newAsset.purchaseDate}
                  onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="تكلفة الشراء الأصلية *">
                <input
                  type="number"
                  placeholder="0.00"
                  value={newAsset.purchaseCost}
                  onChange={(e) => setNewAsset({ ...newAsset, purchaseCost: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="القيمة التخريدية (الخردة)">
                <input
                  type="number"
                  placeholder="0.00"
                  value={newAsset.salvageValue}
                  onChange={(e) => setNewAsset({ ...newAsset, salvageValue: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="العمر الإنتاجي (بالأشهر)">
                <input
                  type="number"
                  placeholder="60 (5 سنوات)"
                  value={newAsset.usefulLifeMonths}
                  onChange={(e) => setNewAsset({ ...newAsset, usefulLifeMonths: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="طريقة الإهلاك المحاسبي">
                <select
                  value={newAsset.depreciationMethod}
                  onChange={(e) => setNewAsset({ ...newAsset, depreciationMethod: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="straight_line">القسط الثابت (Straight-Line)</option>
                  <option value="declining_balance">القسط المتناقص المضاعف (Declining Balance)</option>
                </select>
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button type="button" variant="secondary" onClick={() => setAddModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => createMutation.mutate(newAsset)}
                disabled={!newAsset.code || !newAsset.name || !Number(newAsset.purchaseCost) || createMutation.isPending}
                style={{ background: '#170e5e', color: '#fff' }}
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الأصل'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Single Asset Depreciate */}
      {depreciateModalAsset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#170e5e', marginBottom: '14px' }}>
              إهلاك الأصل: {depreciateModalAsset.name}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
              سيقوم النظام بحساب الإهلاك للفترة المحددة وتوليد قيد يومية محاسبي آلي في شجرة الحسابات (من حـ/ مصروف الإهلاك إلى حـ/ مجمع الإهلاك).
            </p>

            <div style={{ marginBottom: '14px' }}>
              <Field label="عدد الشهور المطلوب إهلاكها">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={depreciateMonths}
                  onChange={(e) => setDepreciateMonths(Math.max(1, Number(e.target.value)))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Field label="ملاحظة أو بيان القيد (اختياري)">
                <input
                  type="text"
                  placeholder="مثال: إهلاك شهر سبتمبر 2026"
                  value={depreciateNote}
                  onChange={(e) => setDepreciateNote(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button type="button" variant="secondary" onClick={() => setDepreciateModalAsset(null)}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => depreciateMutation.mutate({ id: depreciateModalAsset.id, months: depreciateMonths, note: depreciateNote })}
                disabled={depreciateMutation.isPending}
                style={{ background: '#170e5e', color: '#fff' }}
              >
                {depreciateMutation.isPending ? 'جاري التنفيذ والتسجيل...' : 'تأكيد وتوليد القيد'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Depreciate All */}
      {batchDepreciateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#b45309', marginBottom: '14px' }}>
              إهلاك شهري شامل لجميع الأصول النشطة
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: 1.6 }}>
              سيتم فحص كافة الأصول النشطة ({summary.activeCount} أصل) واحتساب إهلاك الدورة وتوليد القيود المحاسبية وتحديث مجمع الإهلاك لكل أصل تلقائياً.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <Field label="عدد شهور الإهلاك">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={batchMonths}
                  onChange={(e) => setBatchMonths(Math.max(1, Number(e.target.value)))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button type="button" variant="secondary" onClick={() => setBatchDepreciateOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => batchDepreciateMutation.mutate({ months: batchMonths, note: `إهلاك دوري مجمع لعدد ${batchMonths} شهر` })}
                disabled={batchDepreciateMutation.isPending}
                style={{ background: '#170e5e', color: '#fff', fontWeight: 700 }}
              >
                {batchDepreciateMutation.isPending ? 'جاري المعالجة والترحيل...' : 'بدء الإهلاك الشامل'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
