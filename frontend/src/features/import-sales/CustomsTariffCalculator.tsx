import React, { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import {
  useCustomsTariffsQuery,
  useCalculateCustomsMutation,
  useUpsertAciComplianceMutation,
} from './api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import {
  SearchIcon,
  RefreshCwIcon,
  PlusCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export default function CustomsTariffCalculator() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: tariffs = [], refetch } = useCustomsTariffsQuery(searchTerm);
  const calculateCustomsMutation = useCalculateCustomsMutation();
  const upsertAciMutation = useUpsertAciComplianceMutation();

  // Calculator State
  const [selectedHsCode, setSelectedHsCode] = useState('8471.30');
  const [cifValueEgp, setCifValueEgp] = useState<number>(500000);
  const [calcResult, setCalcResult] = useState<any>(null);

  // ACI Modal State
  const [isAciModalOpen, setIsAciModalOpen] = useState(false);
  const [acidNumber, setAcidNumber] = useState('');
  const [acidIssueDate, setAcidIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [acidExpiryDate, setAcidExpiryDate] = useState('');
  const [cargoxDocId, setCargoxDocId] = useState('');
  const [importerTaxNo, setImporterTaxNo] = useState('');
  const [exporterId, setExporterId] = useState('');
  const [aciNotes, setAciNotes] = useState('');

  const handleCalculate = async () => {
    try {
      const res = await calculateCustomsMutation.mutateAsync({
        hsCode: selectedHsCode,
        cifValueEgp: Number(cifValueEgp),
      });
      setCalcResult(res);
      toast.success('تم احتساب الرسوم والضرائب الجمركية بنجاح');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء احتساب الرسوم: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleSaveAci = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acidNumber.trim()) {
      toast.error('رقم ACID مطلوب');
      return;
    }

    try {
      await upsertAciMutation.mutateAsync({
        acidNumber: acidNumber.trim(),
        acidIssueDate,
        acidExpiryDate,
        cargoxDocumentId: cargoxDocId,
        importerTaxNumber: importerTaxNo,
        exporterId,
        status: 'issued',
        notes: aciNotes,
        complianceChecklist: {
          proformaInvoiceUploaded: true,
          commercialInvoiceUploaded: Boolean(cargoxDocId),
          packingListUploaded: true,
          billOfLadingAcidEmbedded: true,
        },
      });
      toast.success('تم حفظ وتوثيق بيانات منظومة ACI بنجاح');
      setIsAciModalOpen(false);
      setAcidNumber('');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء حفظ بيانات ACI: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="الامتثال الجمركي المصري وحاسبة الرسوم"
          description="احتساب التعريفة الجمركية وضريبة القيمة المضافة وجهات الرقابة (GOEIC/NTRA) ومتابعة منظومة التسجيل المسبق للشحنات ACI."
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="primary"
                onClick={() => setIsAciModalOpen(true)}
                style={{
                  height: '38px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <PlusCircleIcon size={15} />
                <span>تسجيل شحنة بنظام ACI / نافذة</span>
              </Button>
            </div>
          }
        />

        {/* 2. Customs Calculator Box */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }}>
        <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
          حاسبة الرسوم الجمركية والضرائب على القيمة CIF (Official Egypt Duty Calculator)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              البند الجمركي المستهدف (HS Code)
            </label>
            <select
              value={selectedHsCode}
              onChange={(e) => setSelectedHsCode(e.target.value)}
              style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            >
              {tariffs.map((t) => (
                <option key={t.id} value={t.hs_code}>
                  {t.hs_code} - {t.description_ar} (جمرك: {t.duty_rate_percent}% | ض.ق.م: {t.vat_rate_percent}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              القيمة للأغراض الجمركية CIF (شاملة الشحن والتأمين بالجنيه)
            </label>
            <input
              type="number"
              value={cifValueEgp}
              onChange={(e) => setCifValueEgp(Number(e.target.value))}
              style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculateCustomsMutation.isPending}
            style={{
              height: 36,
              padding: '0 20px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {calculateCustomsMutation.isPending ? 'جاري الاحتساب...' : 'احتساب الرسوم'}
          </button>
        </div>

        {/* Calculation Result */}
        {calcResult && (
          <div style={{ marginTop: 16, backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>الرسوم الجمركية ({calcResult.dutyRatePercent}%)</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {calcResult.customsDuty.toLocaleString()} ج.م
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>ضريبة القيمة المضافة ({calcResult.vatRatePercent}%)</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {calcResult.vatAmount.toLocaleString()} ج.م
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>رسوم جهات الفحص والعرض</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {calcResult.inspectionFees.toLocaleString()} ج.م
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>جهة الرقابة المختصة</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#170e5e', marginTop: 2 }}>
                  {calcResult.regulatoryBody}
                </div>
              </div>

              <div style={{ borderRight: '2px solid #cbd5e1', paddingRight: 14 }}>
                <span style={{ fontSize: '11px', color: '#170e5e', fontWeight: 700 }}>إجمالي المستحقات الجمركية</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', marginTop: 2 }}>
                  {calcResult.totalCustomsDues.toLocaleString()} ج.م
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Tariffs Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 300 }}>
            <input
              type="text"
              placeholder="بحث في بنود التعريفة الجمركية المصرية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: 34, padding: '4px 32px 4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
            <span style={{ position: 'absolute', right: 10, top: 9, color: '#94a3b8' }}>
              <SearchIcon size={14} />
            </span>
          </div>

          <button
            onClick={() => refetch()}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px' }}
          >
            <RefreshCwIcon size={13} />
            تحديث البنود
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>رقم البند (HS Code)</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>بيان وتوصيف السلعة</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>نسبة الوارد الجمركي</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>ضريبة القيمة المضافة VAT</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>جهات العرض والرقابة</th>
                <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>إجراء سريع</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#170e5e' }}>{t.hs_code}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{t.description_ar}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{t.duty_rate_percent}%</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{t.vat_rate_percent}%</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                      {t.regulatory_body || 'GOEIC (صادرات وواردات)'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => {
                        setSelectedHsCode(t.hs_code);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#170e5e',
                        cursor: 'pointer',
                      }}
                    >
                      تطبيق في الحاسبة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ACI Registration Dialog */}
      <StandardDialog
        open={isAciModalOpen}
        onClose={() => setIsAciModalOpen(false)}
        title="تسجيل وتوثيق شحنة بنظام ACI / نافذة (Advance Cargo Information)"
        subtitle="توثيق رقم ACID المسبق الصادر من منصة نافذة وربطه بمستندات CargoX قبل الشحن"
        width="650px"
      >
        <form onSubmit={handleSaveAci} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
              رقم ACID المسبق (19 رقماً من نافذة) *
            </label>
            <input
              type="text"
              required
              value={acidNumber}
              onChange={(e) => setAcidNumber(e.target.value)}
              placeholder="مثال: 2609140019284719283"
              style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>تاريخ الإصدار</label>
              <input
                type="date"
                value={acidIssueDate}
                onChange={(e) => setAcidIssueDate(e.target.value)}
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>تاريخ الانتهاء</label>
              <input
                type="date"
                value={acidExpiryDate}
                onChange={(e) => setAcidExpiryDate(e.target.value)}
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>رقم بوليصة أو ظرف CargoX</label>
              <input
                type="text"
                value={cargoxDocId}
                onChange={(e) => setCargoxDocId(e.target.value)}
                placeholder="معرف الشحنة في CargoX"
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>الرقم الضريبي للمستورد المصري</label>
              <input
                type="text"
                value={importerTaxNo}
                onChange={(e) => setImporterTaxNo(e.target.value)}
                placeholder="السجل الضريبي للمنشأة"
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>معرف المصدر الأجنبي</label>
              <input
                type="text"
                value={exporterId}
                onChange={(e) => setExporterId(e.target.value)}
                placeholder="رقم تسجيل المصدر في CargoX"
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>ملاحظات الامتثال الجمركي</label>
            <textarea
              rows={2}
              value={aciNotes}
              onChange={(e) => setAciNotes(e.target.value)}
              placeholder="تأكيد تطابق البيانات بين الفاتورة وقائمة التعبئة وبوليصة الشحن..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsAciModalOpen(false)}
              style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={upsertAciMutation.isPending}
              style={{ padding: '8px 20px', backgroundColor: '#170e5e', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
            >
              {upsertAciMutation.isPending ? 'جاري الحفظ...' : 'حفظ بيانات ACI'}
            </button>
          </div>
        </form>
      </StandardDialog>
      </main>
    </div>
  );
}
