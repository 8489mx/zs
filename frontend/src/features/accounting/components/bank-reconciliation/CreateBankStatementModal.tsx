import React from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface CreateBankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: any[];
  newStmtAccountId: number;
  setNewStmtAccountId: (id: number) => void;
  newStmtNo: string;
  setNewStmtNo: (no: string) => void;
  newStmtDate: string;
  setNewStmtDate: (date: string) => void;
  newStmtNotes: string;
  setNewStmtNotes: (notes: string) => void;
  newStmtStartBal: number;
  setNewStmtStartBal: (bal: number) => void;
  newStmtEndBal: number;
  setNewStmtEndBal: (bal: number) => void;
  newStmtLines: Array<{ lineDate: string; description: string; reference: string; amount: number }>;
  setNewStmtLines: React.Dispatch<React.SetStateAction<Array<{ lineDate: string; description: string; reference: string; amount: number }>>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const CreateBankStatementModal: React.FC<CreateBankStatementModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  newStmtAccountId,
  setNewStmtAccountId,
  newStmtNo,
  setNewStmtNo,
  newStmtDate,
  setNewStmtDate,
  newStmtNotes,
  setNewStmtNotes,
  newStmtStartBal,
  setNewStmtStartBal,
  newStmtEndBal,
  setNewStmtEndBal,
  newStmtLines,
  setNewStmtLines,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="820px"
      zIndex={95}
      ariaLabel="إضافة كشف حساب بنكي"
    >
      <Card title="إضافة كشف حساب بنكي جديد" className="dialog-card">
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>الحساب البنكي:</label>
              <select
                value={newStmtAccountId}
                onChange={(e) => setNewStmtAccountId(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required
              >
                <option value={0}>اختر الحساب البنكي...</option>
                {bankAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رقم كشف الحساب:</label>
              <input
                type="text"
                placeholder="مثال: STMT-2026-001"
                value={newStmtNo}
                onChange={(e) => setNewStmtNo(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>تاريخ كشف الحساب:</label>
              <input
                type="date"
                value={newStmtDate}
                onChange={(e) => setNewStmtDate(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>ملاحظات:</label>
              <input
                type="text"
                placeholder="ملاحظات اختيارية..."
                value={newStmtNotes}
                onChange={(e) => setNewStmtNotes(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رصيد البداية (Starting Balance):</label>
              <input
                type="number"
                step="0.01"
                value={newStmtStartBal}
                onChange={(e) => setNewStmtStartBal(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>رصيد النهاية المطلوب (Ending Balance):</label>
              <input
                type="number"
                step="0.01"
                value={newStmtEndBal}
                onChange={(e) => setNewStmtEndBal(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          {/* Dynamic Lines */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>أسطر الحركات في كشف الحساب:</strong>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setNewStmtLines((prev) => [...prev, { lineDate: newStmtDate, description: '', reference: '', amount: 0 }])}
                style={{ fontSize: '11.5px', padding: '3px 10px' }}
              >
                + إضافة سطر حركة
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {newStmtLines.map((line, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 110px 30px', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={line.lineDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, lineDate: val } : l));
                    }}
                    style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="text"
                    placeholder="البيان (مثال: تحويل عميل / مصاريف بنكية)"
                    value={line.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, description: val } : l));
                    }}
                    style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="text"
                    placeholder="رقم المرجع"
                    value={line.reference}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, reference: val } : l));
                    }}
                    style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="المبلغ (+ أو -)"
                    value={line.amount || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewStmtLines((prev) => prev.map((l, i) => i === idx ? { ...l, amount: val } : l));
                    }}
                    style={{ padding: '5px', fontSize: '11.5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <button
                    type="button"
                    onClick={() => setNewStmtLines((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              style={{ background: '#170e5e', borderColor: '#170e5e', fontWeight: 800 }}
            >
              {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ كشف الحساب'}
            </Button>
          </div>
        </form>
      </Card>
    </DialogShell>
  );
};
