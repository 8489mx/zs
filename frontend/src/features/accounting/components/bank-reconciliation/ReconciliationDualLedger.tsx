import React from 'react';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import { XIcon, SearchIcon } from '@/shared/components/icons/AppIcons';
import { BankStatementLine } from '../../api/accounting.api';

interface ReconciliationDualLedgerProps {
  statementLines: BankStatementLine[];
  statementFilterStatus: 'all' | 'pending' | 'reconciled';
  onStatementFilterStatusChange: (status: 'all' | 'pending' | 'reconciled') => void;
  selectedStatementLineId: number | null;
  onSelectStatementLine: (id: number | null) => void;
  onUnmatchLine: (id: number) => void;
  onOpenFeeModal: (line: BankStatementLine) => void;

  glLines: any[];
  glFilterText: string;
  onGlFilterTextChange: (text: string) => void;
  selectedGlLineId: number | null;
  onSelectGlLine: (id: number | null) => void;
}

export const ReconciliationDualLedger: React.FC<ReconciliationDualLedgerProps> = ({
  statementLines,
  statementFilterStatus,
  onStatementFilterStatusChange,
  selectedStatementLineId,
  onSelectStatementLine,
  onUnmatchLine,
  onOpenFeeModal,
  glLines,
  glFilterText,
  onGlFilterTextChange,
  selectedGlLineId,
  onSelectGlLine,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {/* RIGHT: Bank Statement Lines */}
      <Card title="حركات كشف الحساب البنكي (Bank Statement)" className="workspace-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'pending', 'reconciled'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => onStatementFilterStatusChange(filter)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: statementFilterStatus === filter ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                  background: statementFilterStatus === filter ? '#170e5e' : '#ffffff',
                  color: statementFilterStatus === filter ? '#ffffff' : '#475569',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {filter === 'all' ? 'الكل' : filter === 'pending' ? 'المعلق فقط' : 'المطابق'}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <th style={{ padding: '8px 10px', color: '#64748b' }}>التاريخ</th>
                  <th style={{ padding: '8px 10px', color: '#64748b' }}>البيان والمرجع</th>
                  <th style={{ padding: '8px 10px', color: '#64748b' }}>المبلغ</th>
                  <th style={{ padding: '8px 10px', color: '#64748b', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {statementLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>لا توجد أسطر مطابقة للمحدد</td>
                  </tr>
                ) : (
                  statementLines.map((line) => {
                    const isSelected = selectedStatementLineId === line.id;
                    const isDeposit = line.amount > 0;

                    return (
                      <tr
                        key={line.id}
                        onClick={() => !line.isReconciled && onSelectStatementLine(isSelected ? null : line.id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#eff6ff' : line.isReconciled ? '#f0fdf4' : '#ffffff',
                          cursor: line.isReconciled ? 'default' : 'pointer',
                        }}
                      >
                        <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{line.lineDate}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{line.description}</div>
                          {line.reference && <div style={{ fontSize: '11px', color: '#64748b' }}>مرجع: {line.reference}</div>}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: isDeposit ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                          {isDeposit ? `+${formatCurrency(line.amount)}` : formatCurrency(line.amount)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {line.isReconciled ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10.5px', color: '#166534', fontWeight: 800 }}>مطابق</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnmatchLine(line.id);
                                }}
                                title="إلغاء المطابقة"
                                style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                              >
                                <XIcon size={12} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: isSelected ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                                  background: isSelected ? '#170e5e' : '#ffffff',
                                  color: isSelected ? '#ffffff' : '#0f172a',
                                  cursor: 'pointer',
                                }}
                              >
                                {isSelected ? 'محدد' : 'تحديد'}
                              </button>
                              {!isDeposit && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenFeeModal(line);
                                  }}
                                  title="تسوية عمولة ومصاريف بنكية فورية"
                                  style={{
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    border: '1px solid #fca5a5',
                                    background: '#fef2f2',
                                    color: '#b91c1c',
                                    cursor: 'pointer',
                                  }}
                                >
                                  عمولة
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* LEFT: General Ledger Journal Lines */}
      <Card title="حركات دفتر الأستاذ العام (General Ledger)" className="workspace-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="بحث برقم القيد أو البيان أو المبلغ..."
              value={glFilterText}
              onChange={(e) => onGlFilterTextChange(e.target.value)}
              style={{ width: '100%', padding: '6px 30px 6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
            <div style={{ position: 'absolute', right: '8px', top: '8px', color: '#94a3b8' }}>
              <SearchIcon size={14} />
            </div>
          </div>

          {/* Table */}
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <th style={{ padding: '8px 10px', color: '#64748b' }}>التاريخ والقيد</th>
                  <th style={{ padding: '8px 10px', color: '#64748b' }}>البيان</th>
                  <th style={{ padding: '8px 10px', color: '#64748b' }}>مدين (+)</th>
                  <th style={{ padding: '8px 10px', color: '#64748b' }}>دائن (-)</th>
                  <th style={{ padding: '8px 10px', color: '#64748b', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {glLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>لا توجد قيود معلقة في دفتر الأستاذ لهذا الحساب</td>
                  </tr>
                ) : (
                  glLines.map((gl) => {
                    const isSelected = selectedGlLineId === gl.id;

                    return (
                      <tr
                        key={gl.id}
                        onClick={() => onSelectGlLine(isSelected ? null : gl.id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#170e5e' }}>{gl.entryNo}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{gl.entryDate}</div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ color: '#0f172a', fontWeight: 600 }}>{gl.description || 'قيد مرحل'}</div>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: gl.debit > 0 ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
                          {gl.debit > 0 ? formatCurrency(gl.debit) : '-'}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: gl.credit > 0 ? '#dc2626' : '#94a3b8', whiteSpace: 'nowrap' }}>
                          {gl.credit > 0 ? formatCurrency(gl.credit) : '-'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              border: isSelected ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                              background: isSelected ? '#170e5e' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#0f172a',
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected ? 'محدد' : 'تحديد'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
