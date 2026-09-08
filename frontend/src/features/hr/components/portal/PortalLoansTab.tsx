import React from 'react';
import { formatCurrency } from '@/lib/format';
import type { LoansAndCustodyData } from '../../api/employee-portal.api';
import { PlusIcon } from '@/shared/components/icons/AppIcons';

export interface PortalLoansTabProps {
  loansData: LoansAndCustodyData | null;
  onRequestAdvance: () => void;
}

export function PortalLoansTab({ loansData, onRequestAdvance }: PortalLoansTabProps) {
  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="portal-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                  السلف النقدية والعهد العينية
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  متابعة أرصدة السلف المستحقة والأصول والعهد المسلمة بعهدتك.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRequestAdvance()}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
                }}
              >
                <PlusIcon size={16} color="#ffffff" />
                <span>طلب سلفة جديدة</span>
              </button>
            </div>

            {/* Loans Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                سجل السلف المالية
              </h3>

              {!loansData?.loans || loansData.loans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                  لا توجد أي سلف مالية مسجلة بعهدتك.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>رقم السلفة</th>
                        <th style={{ padding: '10px 12px' }}>المبلغ الإجمالي</th>
                        <th style={{ padding: '10px 12px' }}>المسدد</th>
                        <th style={{ padding: '10px 12px' }}>المتبقي</th>
                        <th style={{ padding: '10px 12px' }}>القسط الشهري</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loansData.loans.map((l) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{l.loanNo}</td>
                          <td style={{ padding: '12px', fontWeight: 800 }}>{formatCurrency(l.principalAmount)}</td>
                          <td style={{ padding: '12px', color: '#166534' }}>{formatCurrency(l.paidAmount)}</td>
                          <td style={{ padding: '12px', color: '#dc2626', fontWeight: 800 }}>
                            {formatCurrency(l.remainingAmount)}
                          </td>
                          <td style={{ padding: '12px', color: '#64748b' }}>
                            {formatCurrency(l.installmentAmount)} ({l.installmentCount} شهر)
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: l.status === 'paid' ? '#f0fdf4' : '#fffbeb',
                                color: l.status === 'paid' ? '#166534' : '#92400e',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {l.status === 'draft' ? 'قيد المراجعة' : l.status === 'approved' ? 'معتمدة' : l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assets & Physical Custody Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                العهد العينية المسلمة للموظف
              </h3>

              {!loansData?.assets || loansData.assets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                  لا توجد أجهزة أو عهد عينية مسجلة باسمك حالياً.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>اسم العهدة</th>
                        <th style={{ padding: '10px 12px' }}>النوع</th>
                        <th style={{ padding: '10px 12px' }}>كود الأصل / السيريال</th>
                        <th style={{ padding: '10px 12px' }}>تاريخ التسليم</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loansData.assets.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{a.assetName}</td>
                          <td style={{ padding: '12px', color: '#64748b' }}>{a.assetType}</td>
                          <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                            {a.serialNo !== '-' ? a.serialNo : a.assetCode}
                          </td>
                          <td style={{ padding: '12px', color: '#334155' }}>{a.assignedAt}</td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
  );
}
