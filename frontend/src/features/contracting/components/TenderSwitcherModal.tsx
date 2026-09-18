import { useState, useMemo } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { useContracting } from '../context/ContractingContext';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface TenderSwitcherModalProps {
  open: boolean;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onNewTender: () => void;
  currentProjectId?: string | null;
}

type FilterCategory = 'all' | 'planning' | 'submitted' | 'active' | 'lost';

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  planning: { label: 'قيد الدراسة والتسعير', bg: '#f1f5f9', color: '#170e5e', border: '#cbd5e1' },
  draft: { label: 'مسودة عطاء', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  submitted: { label: 'تم تقديم العرض', bg: '#f8fafc', color: '#334155', border: '#cbd5e1' },
  negotiation: { label: 'قيد التفاوض والمراجعة', bg: '#f8fafc', color: '#1e293b', border: '#cbd5e1' },
  active: { label: 'مشروع تنفيذي ساري', bg: '#f1f5f9', color: '#170e5e', border: '#cbd5e1' },
  completed: { label: 'مشروع مكتمل', bg: '#f8fafc', color: '#334155', border: '#e2e8f0' },
  lost: { label: 'أرشيف (لم يُرسَ)', bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
};

export function TenderSwitcherModal({
  open,
  onClose,
  onSelectProject,
  onNewTender,
  currentProjectId,
}: TenderSwitcherModalProps) {
  const { projects, reloadProjects, loading } = useContracting();
  const { formatCurrency } = useSystemCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

  // Counts
  const counts = useMemo(() => {
    let planning = 0;
    let submitted = 0;
    let active = 0;
    let lost = 0;

    projects.forEach((p) => {
      if (p.status === 'planning' || p.status === 'draft') planning++;
      else if (p.status === 'submitted' || p.status === 'negotiation') submitted++;
      else if (p.status === 'active' || p.status === 'suspended' || p.status === 'completed' || p.status === 'handed_over') active++;
      else if (p.status === 'lost') lost++;
    });

    return { all: projects.length, planning, submitted, active, lost };
  }, [projects]);

  // Filtered List
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Category filter
      if (filterCategory === 'planning' && p.status !== 'planning' && p.status !== 'draft') return false;
      if (filterCategory === 'submitted' && p.status !== 'submitted' && p.status !== 'negotiation') return false;
      if (filterCategory === 'active' && p.status !== 'active' && p.status !== 'suspended' && p.status !== 'completed' && p.status !== 'handed_over') return false;
      if (filterCategory === 'lost' && p.status !== 'lost') return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = (p.code || '').toLowerCase().includes(q);
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const clientMatch = (p.clientName || '').toLowerCase().includes(q);
      return codeMatch || nameMatch || clientMatch;
    });
  }, [projects, filterCategory, searchQuery]);

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="سجل العطاءات والمشاريع السابقة (Tender Repository)"
      subtitle="تصفح العطاءات والمشاريع المحفوظة للرجوع إليها أو تسعير عطاء جديد فارغ"
      width="min(1080px, 95vw)"
      compact
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '475px', minHeight: '475px', maxHeight: '475px', boxSizing: 'border-box' }} dir="rtl">
        {/* Top Controls: Search + New Tender Button */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بكود العطاء، اسم المشروع، أو اسم العميل..."
              style={{
                width: '100%',
                height: '36px',
                padding: '0 32px 0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: 'var(--font-body)',
                boxSizing: 'border-box',
                background: '#ffffff',
                color: '#0f172a',
              }}
            />
            <span style={{ position: 'absolute', right: '10px', top: '10px', color: '#94a3b8' }}>
              <AppIcons.Search size={16} />
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNewTender();
              }}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                background: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 'var(--font-body)',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(23,14,94,0.15)',
              }}
            >
              <AppIcons.Plus size={15} />
              <span>تسعير عطاء جديد فارغ</span>
            </button>

            <button
              type="button"
              onClick={() => reloadProjects()}
              disabled={loading}
              title="تحديث القائمة"
              style={{
                height: '36px',
                width: '36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <AppIcons.RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Filter Tabs - Fixed font weight & 0ms transition to prevent horizontal tab flicker */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          {[
            { id: 'all', label: 'كافة المشاريع والعطاءات', count: counts.all },
            { id: 'planning', label: 'عطاءات قيد الدراسة والتسعير', count: counts.planning },
            { id: 'submitted', label: 'عطاءات قُدّمت للعميل / تفاوض', count: counts.submitted },
            { id: 'active', label: 'مشاريع تنفيذية سارية', count: counts.active },
            { id: 'lost', label: 'أرشيف العطاءات (لم يُرسَ)', count: counts.lost },
          ].map((tab) => {
            const isActive = filterCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id as FilterCategory)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: 'var(--font-body)',
                  fontWeight: 600, // Uniform font weight prevents tab width shifting
                  background: isActive ? '#170e5e' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#475569',
                  border: isActive ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxSizing: 'border-box',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 'var(--font-badge)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#334155',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List of Tenders / Projects - Strict fixed height to eliminate vertical ballooning/shrinking */}
        <div
          style={{
            flex: '1 1 335px',
            height: '335px',
            minHeight: '335px',
            maxHeight: '335px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#ffffff',
            boxSizing: 'border-box',
          }}
          className="thin-scrollbar"
        >
          {filteredProjects.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '335px',
                textAlign: 'center',
                padding: '20px',
                color: '#64748b',
                boxSizing: 'border-box',
              }}
            >
              <AppIcons.FileText size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
              <div style={{ fontWeight: 600, fontSize: 'var(--font-body)' }}>لا توجد عطاءات أو مشاريع في هذا التبويب</div>
              <div style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', marginTop: '4px' }}>
                يمكنك الضغط على زر (تسعير عطاء جديد فارغ) لبدء إدخال أو استيراد مقايسة جديدة.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>كود العطاء</th>
                  <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>اسم المشروع والجهة المالكة</th>
                  <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>القيمة المالية</th>
                  <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const isCurrent = String(p.id) === String(currentProjectId);
                  const st = STATUS_LABELS[p.status] || { label: p.status, bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
                  const val = p.revisedContractValue || p.contractValue || 0;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isCurrent ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      {/* Code */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            color: '#170e5e',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {p.code || `PRJ-${p.id}`}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              marginRight: '6px',
                              fontSize: 'var(--font-micro)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#e2e8f0',
                              color: '#170e5e',
                              fontWeight: 700,
                            }}
                          >
                            المعروض حالياً
                          </span>
                        )}
                      </td>

                      {/* Name & Client */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--font-body)' }}>{p.name}</div>
                        <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', marginTop: '2px' }}>
                          العميل: {p.clientName || 'غير محدد'}
                        </div>
                      </td>

                      {/* Value */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
                          {formatCurrency(val)}
                        </div>
                        {p.downPaymentAmount ? (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                            مقدم: {formatCurrency(p.downPaymentAmount)}
                          </div>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: 'var(--font-badge)',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectProject(String(p.id));
                          }}
                          style={{
                            padding: '5px 14px',
                            borderRadius: '6px',
                            background: isCurrent ? '#f1f5f9' : '#ffffff',
                            color: isCurrent ? '#475569' : '#170e5e',
                            fontWeight: 700,
                            fontSize: 'var(--font-body)',
                            border: isCurrent ? '1px solid #cbd5e1' : '1px solid #170e5e',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isCurrent ? 'معروض الآن' : 'فتح للتسعير'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-subtitle)', color: '#64748b', paddingTop: '4px' }}>
          <div>إجمالي العطاءات والمشاريع: {filteredProjects.length} من أصل {projects.length}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </StandardDialog>
  );
}
