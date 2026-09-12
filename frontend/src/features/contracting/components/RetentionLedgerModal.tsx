import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingRetentionRecord } from '../contracting.types';

interface RetentionLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export function RetentionLedgerModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: RetentionLedgerModalProps) {
  const [records, setRecords] = useState<ContractingRetentionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [releaseAmount, setReleaseAmount] = useState<number>(0);
  const [releaseNotes, setReleaseNotes] = useState<string>('');

  // Form state for new retention
  const [entityType, setEntityType] = useState<'subcontractor' | 'client'>('subcontractor');
  const [entityName, setEntityName] = useState('');
  const [retentionAmount, setRetentionAmount] = useState<number>(0);
  const [releaseDueDate, setReleaseDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await contractingApi.getRetentionRecords(projectId ? { projectId } : undefined);
      setRecords(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحميل سجلات الضمان المحتجز');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
      setIsAdding(false);
      setReleasingId(null);
    }
  }, [isOpen, loadRecords]);

  const handleCreateRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retentionAmount || retentionAmount <= 0) {
      setErrorMsg('يرجى تحديد مبلغ ضمان صحيح');
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      await contractingApi.createRetentionRecord(projectId || '', {
        entityType,
        entityName: entityName.trim() || (entityType === 'subcontractor' ? 'مقاول باطن' : 'العميل'),
        retentionAmount: Number(retentionAmount),
        releaseDueDate: releaseDueDate || undefined,
        notes: notes.trim() || undefined,
      });
      setIsAdding(false);
      setEntityName('');
      setRetentionAmount(0);
      setReleaseDueDate('');
      setNotes('');
      await loadRecords();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تسجيل الضمان المحتجز');
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (recordId: string) => {
    if (!releaseAmount || releaseAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ الفك المطلوب');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      await contractingApi.releaseRetentionRecord(recordId, {
        releaseAmount: Number(releaseAmount),
        notes: releaseNotes || undefined,
      });
      setReleasingId(null);
      setReleaseAmount(0);
      setReleaseNotes('');
      await loadRecords();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر فك الضمان');
    } finally {
      setSaving(false);
    }
  };

  const totalHeld = records.reduce((sum, r) => sum + Number(r.retentionAmount || 0), 0);
  const totalReleased = records.reduce((sum, r) => sum + Number(r.releasedAmount || 0), 0);
  const totalRemaining = totalHeld - totalReleased;

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="سجل ضمان الأعمال وحجز الدفعات (Retention Ledger)"
      width="min(1000px, 95vw)"
      minHeight="min(580px, 85vh)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>
              ضمان حسن التنفيذ المحتجز لمقاولي الباطن والعملاء
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
              {projectName ? `المشروع: ${projectName}` : 'متابعة المبالغ المحتجزة ونسب الفك وتواريخ الاستحقاق'}
            </div>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              style={{
                height: '34px',
                padding: '0 14px',
                borderRadius: '6px',
                fontWeight: 700,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-body)',
              }}
            >
              <AppIcons.Plus size={14} />
              <span>تسجيل ضمان محتجز جديد</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الضمان المحتجز</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
              {loading ? '—' : totalHeld.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي ما تم الإفراج عنه</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {loading ? '—' : totalReleased.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>الضمان المحتجز المتبقي</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
              {loading ? '—' : totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* نموذج إضافة ضمان جديد */}
        {isAdding && (
          <form
            onSubmit={handleCreateRetention}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
              تسجيل استقطاع ضمان أعمال جديد (حسن تنفيذ / دفعة محتجزة)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  نوع الطرف
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as any)}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)' }}
                >
                  <option value="subcontractor">مقاول باطن (محتجز عليه)</option>
                  <option value="client">العميل / المالك (محتجز لصالحنا)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  اسم الطرف / المقاول
                </label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="مثال: شركة النور للكهرباء"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  مبلغ الضمان المحتجز
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={retentionAmount || ''}
                  onChange={(e) => setRetentionAmount(Number(e.target.value))}
                  placeholder="0.00"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  تاريخ استحقاق الفك (الاستلام النهائي)
                </label>
                <input
                  type="date"
                  value={releaseDueDate}
                  onChange={(e) => setReleaseDueDate(e.target.value)}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  ملاحظات أو رقم المستخلص
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: ضمان 5% من المستخلص رقم 3"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 'var(--font-body)' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ height: '32px', padding: '0 14px', borderRadius: '6px', border: 'none', background: '#170e5e', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-body)' }}
              >
                {saving ? 'جاري الحفظ...' : 'تأكيد وحفظ الضمان'}
              </button>
            </div>
          </form>
        )}

        {/* جدول السجلات */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', fontWeight: 600 }}>جاري تحميل سجلات الضمان المحتجز...</span>
            </div>
          ) : records.length === 0 ? (
            <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
              لا توجد سجلات ضمان محتجز مسجلة حتى الآن
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الجهة / الطرف</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>النوع</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المبلغ المحتجز</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المفرج عنه</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المتبقي</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>موعد الفك</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const remaining = Number(r.retentionAmount) - Number(r.releasedAmount || 0);
                  const isReleasingThis = releasingId === r.id;

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#1e293b' }}>
                        {r.entityName}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                        {r.entityType === 'subcontractor' ? 'مقاول باطن' : 'عميل'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                        {Number(r.retentionAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#15803d', fontWeight: 600 }}>
                        {Number(r.releasedAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: remaining > 0 ? '#b91c1c' : '#64748b', fontWeight: 700 }}>
                        {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                        {r.releaseDueDate || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: 'var(--font-badge)',
                            fontWeight: 600,
                            background: r.status === 'released' ? '#dcfce7' : r.status === 'partially_released' ? '#fef3c7' : '#fee2e2',
                            color: r.status === 'released' ? '#15803d' : r.status === 'partially_released' ? '#92400e' : '#991b1b',
                          }}
                        >
                          {r.status === 'released' ? 'مفرج عنه بالكامل' : r.status === 'partially_released' ? 'مفرج جزئياً' : 'محتجز قيد العمل'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {remaining > 0 ? (
                          isReleasingThis ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                              <input
                                type="number"
                                min="1"
                                max={remaining}
                                value={releaseAmount || ''}
                                onChange={(e) => setReleaseAmount(Number(e.target.value))}
                                placeholder="مبلغ الفك"
                                style={{ height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 'var(--font-micro)' }}
                              />
                              <input
                                type="text"
                                value={releaseNotes}
                                onChange={(e) => setReleaseNotes(e.target.value)}
                                placeholder="ملاحظات الإفراج"
                                style={{ height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 'var(--font-micro)' }}
                              />
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRelease(r.id)}
                                  disabled={saving}
                                  style={{ height: '26px', padding: '0 8px', borderRadius: '4px', background: '#15803d', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 'var(--font-micro)', fontWeight: 600 }}
                                >
                                  تأكيد
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReleasingId(null)}
                                  style={{ height: '26px', padding: '0 8px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', border: 'none', cursor: 'pointer', fontSize: 'var(--font-micro)' }}
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReleasingId(r.id);
                                setReleaseAmount(remaining);
                              }}
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                borderRadius: '4px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#170e5e',
                                cursor: 'pointer',
                                fontSize: 'var(--font-micro)',
                                fontWeight: 600,
                              }}
                            >
                              فك الضمان
                            </button>
                          )
                        ) : (
                          <span style={{ fontSize: 'var(--font-micro)', color: '#10b981' }}>مكتمل</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StandardDialog>
  );
}