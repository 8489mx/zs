import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { ContractingGovernmentLicense, LicenseType } from '../contracting.types';

interface GovernmentLicensesModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
}

const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  excavation: 'ترخيص حفر',
  building: 'ترخيص بناء',
  civil_defense: 'موافقة الدفاع المدني',
  road_occupancy: 'إشغال طريق / رافعة',
  environmental: 'موافقة بيئية',
  other: 'أخرى',
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active:        { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'ساري' },
  expiring_soon: { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: 'ينتهي قريباً' },
  expired:       { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'منتهي' },
  renewed:       { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', label: 'تم التجديد' },
};

export function GovernmentLicensesModal({ open, onClose, projectId, projectName }: GovernmentLicensesModalProps) {
  const [licenses, setLicenses] = useState<ContractingGovernmentLicense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    licenseType: 'building' as LicenseType,
    licenseNumber: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
    feeAmount: '',
    alertLeadDays: '30',
    notes: '',
  });

  useEffect(() => {
    if (open && projectId) loadLicenses();
  }, [open, projectId]);

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const data = await contractingApi.getGovernmentLicenses({ projectId });
      setLicenses(data as ContractingGovernmentLicense[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.licenseNumber || !form.issuingAuthority || !form.expiryDate) return;
    setSubmitting(true);
    try {
      await contractingApi.createGovernmentLicense(projectId, {
        licenseType: form.licenseType,
        licenseNumber: form.licenseNumber,
        issuingAuthority: form.issuingAuthority,
        issueDate: form.issueDate || null,
        expiryDate: form.expiryDate,
        feeAmount: parseFloat(form.feeAmount) || 0,
        alertLeadDays: parseInt(form.alertLeadDays) || 30,
        notes: form.notes || null,
      });
      setForm({ licenseType: 'building', licenseNumber: '', issuingAuthority: '', issueDate: '', expiryDate: '', feeAmount: '', alertLeadDays: '30', notes: '' });
      setShowForm(false);
      await loadLicenses();
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  const expiring = licenses.filter(l => l.status === 'expiring_soon' || l.status === 'expired');
  const inp: React.CSSProperties = { width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 'var(--font-body)', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 'var(--font-subtitle)', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' };

  return (
    <DialogShell open={open} onClose={onClose} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }} dir="rtl">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170c5c', margin: 0 }}>تراخيص المشروع الحكومية</h2>
            <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>{projectName || projectId}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
            <AppIcons.X size={18} />
          </button>
        </div>
        {expiring.length > 0 && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.AlertTriangle size={16} style={{ color: '#ea580c', flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#9a3412' }}>
              تحذير: {expiring.length} ترخيص ينتهي قريباً
            </span>
          </div>
        )}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
          {!showForm ? (
            <div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                style={{ height: '34px', padding: '0 14px', borderRadius: '8px', fontWeight: 700, background: '#170e5e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <AppIcons.Plus size={14} />
                <span>إضافة ترخيص جديد</span>
              </button>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>إضافة ترخيص جديد</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>نوع الترخيص</label>
                  <select value={form.licenseType} onChange={e => setForm(p => ({ ...p, licenseType: e.target.value as LicenseType }))} style={{ ...inp, background: '#fff' }}>
                    {(Object.entries(LICENSE_TYPE_LABELS) as [LicenseType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>رقم الترخيص</label>
                  <input value={form.licenseNumber} onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="BLD-2025-00123" style={inp} />
                </div>
                <div>
                  <label style={lbl}>الجهة المصدِرة</label>
                  <input value={form.issuingAuthority} onChange={e => setForm(p => ({ ...p, issuingAuthority: e.target.value }))} placeholder="حي غرب" style={inp} />
                </div>
                <div>
                  <label style={lbl}>تاريخ الإصدار</label>
                  <input type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>تاريخ الانتهاء *</label>
                  <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>قيمة الرسوم</label>
                  <input type="number" value={form.feeAmount} onChange={e => setForm(p => ({ ...p, feeAmount: e.target.value }))} placeholder="0.00" style={inp} />
                </div>
                <div>
                  <label style={lbl}>تنبيه قبل (يوم)</label>
                  <input type="number" value={form.alertLeadDays} onChange={e => setForm(p => ({ ...p, alertLeadDays: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>ملاحظات</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="ملاحظات إضافية" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ height: '34px', padding: '0 14px', borderRadius: '8px', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 'var(--font-body)' }}>إلغاء</button>
                <button onClick={handleSubmit} disabled={submitting || !form.licenseNumber || !form.issuingAuthority || !form.expiryDate}
                  style={{ height: '34px', padding: '0 18px', borderRadius: '8px', fontWeight: 700, background: '#170e5e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 'var(--font-body)', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'جاري الحفظ...' : 'حفظ الترخيص'}
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>جاري تحميل التراخيص...</div>
          ) : licenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <AppIcons.FileText size={36} style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#475569' }}>لا توجد تراخيص مسجلة لهذا المشروع</div>
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>نوع الترخيص</th>
                    <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>رقم الترخيص</th>
                    <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الجهة المصدِرة</th>
                    <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>تاريخ الانتهاء</th>
                    <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الأيام المتبقية</th>
                    <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                    <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الرسوم</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((lic) => {
                    const sc = STATUS_COLORS[lic.status] || STATUS_COLORS['active'];
                    const d = lic.daysUntilExpiry;
                    const dc = d !== undefined && d < 0 ? '#b91c1c' : d !== undefined && d <= 30 ? '#a16207' : '#15803d';
                    const dl = d !== undefined ? (d < 0 ? 'منتهي منذ ' + Math.abs(d) + ' يوم' : d + ' يوم') : '—';
                    return (
                      <tr key={lic.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>{LICENSE_TYPE_LABELS[lic.licenseType] || lic.licenseType}</td>
                        <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', color: '#1e293b', fontFamily: 'monospace' }}>{lic.licenseNumber}</td>
                        <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>{lic.issuingAuthority}</td>
                        <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>{lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString('ar-EG') : '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}><span style={{ fontSize: 'var(--font-badge)', fontWeight: 700, color: dc }}>{dl}</span></td>
                        <td style={{ padding: '10px 14px' }}><span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: sc.bg, color: sc.color, border: '1px solid ' + sc.border }}>{sc.label}</span></td>
                        <td style={{ padding: '10px 14px', fontSize: 'var(--font-body)', color: '#475569', textAlign: 'left' }}>{Number(lic.feeAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={onClose} style={{ height: '36px', padding: '0 20px', borderRadius: '8px', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 'var(--font-body)' }}>إغلاق</button>
        </div>
      </div>
    </DialogShell>
  );
}
