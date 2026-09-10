import { useState } from 'react';
import { ShippingPort, ShippingLine, maritimeApi } from '../api/maritime-freight.api';
import { Field } from '@/shared/ui/field';

interface MaritimeMasterDataTabProps {
  ports: ShippingPort[];
  lines: ShippingLine[];
  onRefresh: () => void;
}

export function MaritimeMasterDataTab({
  ports,
  lines,
  onRefresh,
}: MaritimeMasterDataTabProps) {
  const [subTab, setSubTab] = useState<'ports' | 'lines'>('ports');
  const [newPortCode, setNewPortCode] = useState('');
  const [newPortNameAr, setNewPortNameAr] = useState('');
  const [newPortNameEn, setNewPortNameEn] = useState('');
  const [newPortCountryName, setNewPortCountryName] = useState('مصر');

  const [newLineCode, setNewLineCode] = useState('');
  const [newLineNameAr, setNewLineNameAr] = useState('');
  const [newLineNameEn, setNewLineNameEn] = useState('');
  const [newLineEmail, setNewLineEmail] = useState('');
  const [newLineRfqEmail, setNewLineRfqEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPort = async () => {
    if (!newPortCode || !newPortNameAr) return;
    try {
      setIsSubmitting(true);
      await maritimeApi.createPort({
        code: newPortCode,
        nameAr: newPortNameAr,
        nameEn: newPortNameEn || newPortNameAr,
        countryCode: newPortCode.slice(0, 2) || 'EG',
        countryName: newPortCountryName,
      });
      setNewPortCode('');
      setNewPortNameAr('');
      setNewPortNameEn('');
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'فشل إضافة الميناء');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLine = async () => {
    if (!newLineCode || !newLineNameAr) return;
    try {
      setIsSubmitting(true);
      await maritimeApi.createShippingLine({
        code: newLineCode,
        nameAr: newLineNameAr,
        nameEn: newLineNameEn || newLineNameAr,
        email: newLineEmail || undefined,
        rfqEmail: newLineRfqEmail || undefined,
      });
      setNewLineCode('');
      setNewLineNameAr('');
      setNewLineNameEn('');
      setNewLineEmail('');
      setNewLineRfqEmail('');
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'فشل إضافة الخط الملاحي');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', background: '#ffffff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <button
          type="button"
          onClick={() => setSubTab('ports')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '34px',
            padding: '0 16px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'ports' ? '#170e5e' : '#f1f5f9',
            color: subTab === 'ports' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            transition: 'background-color 0.12s ease, color 0.12s ease',
          }}
        >
          دليل الموانئ البحرية الدولية ({ports.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('lines')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '34px',
            padding: '0 16px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'lines' ? '#170e5e' : '#f1f5f9',
            color: subTab === 'lines' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            transition: 'background-color 0.12s ease, color 0.12s ease',
          }}
        >
          الخطوط الملاحية والوكلاء ({lines.length})
        </button>
      </div>

      {subTab === 'ports' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* إضافة ميناء جديد */}
          <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
              إضافة ميناء بحري جديد
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              <Field label="كود الميناء (UN/LOCODE) *">
                <input
                  type="text"
                  value={newPortCode}
                  onChange={(e) => setNewPortCode(e.target.value.toUpperCase())}
                  placeholder="مثال: EGALY"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="اسم الميناء بالعربية *">
                <input
                  type="text"
                  value={newPortNameAr}
                  onChange={(e) => setNewPortNameAr(e.target.value)}
                  placeholder="ميناء الإسكندرية"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="اسم الميناء بالإنجليزية">
                <input
                  type="text"
                  value={newPortNameEn}
                  onChange={(e) => setNewPortNameEn(e.target.value)}
                  placeholder="Alexandria Port"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="الدولة">
                <input
                  type="text"
                  value={newPortCountryName}
                  onChange={(e) => setNewPortCountryName(e.target.value)}
                  placeholder="مصر"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <button
                type="button"
                onClick={handleAddPort}
                disabled={isSubmitting}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                + إضافة الميناء
              </button>
            </div>
          </div>

          {/* جدول الموانئ */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>كود UN/LOCODE</th>
                  <th style={{ padding: '10px 14px' }}>الاسم بالعربية</th>
                  <th style={{ padding: '10px 14px' }}>الاسم بالإنجليزية</th>
                  <th style={{ padding: '10px 14px' }}>الدولة</th>
                </tr>
              </thead>
              <tbody>
                {ports.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e' }}>{p.code}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name_ar}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{p.name_en}</td>
                    <td style={{ padding: '10px 14px' }}>{p.country_name} ({p.country_code})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* إضافة خط ملاحي جديد */}
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
              إضافة خط ملاحي أو وكيل شحن
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              <Field label="كود SCAC *">
                <input
                  type="text"
                  value={newLineCode}
                  onChange={(e) => setNewLineCode(e.target.value.toUpperCase())}
                  placeholder="مثال: MAEU"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="اسم الخط بالعربية *">
                <input
                  type="text"
                  value={newLineNameAr}
                  onChange={(e) => setNewLineNameAr(e.target.value)}
                  placeholder="ميرسك مصر"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="اسم الخط بالإنجليزية">
                <input
                  type="text"
                  value={newLineNameEn}
                  onChange={(e) => setNewLineNameEn(e.target.value)}
                  placeholder="Maersk Line"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <Field label="إيميل استلام طلبات التسعير (RFQ Email)">
                <input
                  type="email"
                  value={newLineRfqEmail}
                  onChange={(e) => setNewLineRfqEmail(e.target.value)}
                  placeholder="rates@carrier.com"
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </Field>
              <button
                type="button"
                onClick={handleAddLine}
                disabled={isSubmitting}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                + إضافة الخط
              </button>
            </div>
          </div>

          {/* جدول الخطوط */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>كود SCAC</th>
                  <th style={{ padding: '10px 14px' }}>الاسم</th>
                  <th style={{ padding: '10px 14px' }}>إيميل طلبات التسعير (RFQ)</th>
                  <th style={{ padding: '10px 14px' }}>الهاتف</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e' }}>{l.code}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{l.name_ar} ({l.name_en})</td>
                    <td style={{ padding: '10px 14px', color: '#1d4ed8' }}>{l.rfq_email || l.email || 'غير محدد'}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{l.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
