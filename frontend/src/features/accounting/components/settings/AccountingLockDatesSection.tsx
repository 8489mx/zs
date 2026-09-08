import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

interface AccountingLockDatesSectionProps {
  lockDateAll: string;
  setLockDateAll: (v: string) => void;
  lockDateNonAdviser: string;
  setLockDateNonAdviser: (v: string) => void;
  lockDateTax: string;
  setLockDateTax: (v: string) => void;
  lockDatesSavedNotice: boolean;
  onSave: () => void;
  isPending: boolean;
}

export function AccountingLockDatesSection({
  lockDateAll,
  setLockDateAll,
  lockDateNonAdviser,
  setLockDateNonAdviser,
  lockDateTax,
  setLockDateTax,
  lockDatesSavedNotice,
  onSave,
  isPending,
}: AccountingLockDatesSectionProps) {
  return (
    <FormSection
      title="إقفال الفترات المالية والعمليات المحاسبية"
      description="حدد تواريخ الحماية لمنع أي إدخال أو تعديل في العمليات المالية أو الإقرارات الضريبية قبل تاريخ محدد."
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lockDatesSavedNotice && (
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
              تم حفظ تواريخ الإقفال بنجاح
            </span>
          )}
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={onSave}
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ تواريخ الإقفال'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '12px' }}>
        {/* Card 1: Absolute Lock */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>
              الإقفال الشامل (النهائي)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: lockDateAll ? '#fee2e2' : '#f1f5f9',
                color: lockDateAll ? '#991b1b' : '#64748b',
              }}
            >
              {lockDateAll ? 'إقفال نشط' : 'غير محدد'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
            يمنع تماماً إضافة أو تعديل أي قيد يومية أو فاتورة بيع أو شراء أو سند دفع/قبض يسبق أو يطابق هذا التاريخ <strong>لكافة المستخدمين بما فيهم الإدارة العامة والمدير المالي</strong>.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              تاريخ الإقفال النهائي
            </label>
            <input
              type="date"
              value={lockDateAll}
              onChange={(e) => setLockDateAll(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        </div>

        {/* Card 2: Operational Lock */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>
              إقفال العمليات التشغيلية
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: lockDateNonAdviser ? '#fef3c7' : '#f1f5f9',
                color: lockDateNonAdviser ? '#92400e' : '#64748b',
              }}
            >
              {lockDateNonAdviser ? 'إقفال نشط' : 'غير محدد'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
            يمنع تسجيل أو تعديل العمليات التشغيلية (فواتير المبيعات، المشتريات، المصروفات، المرتجعات) بأثر رجعي قبل هذا التاريخ لمدخلي البيانات وموظفي نقاط البيع، ويسمح فقط للمدقق والمدير المالي.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              تاريخ إقفال العمليات التشغيلية
            </label>
            <input
              type="date"
              value={lockDateNonAdviser}
              onChange={(e) => setLockDateNonAdviser(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        </div>

        {/* Card 3: Tax Lock */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>
              إقفال الإقرار الضريبي
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: lockDateTax ? '#e0e7ff' : '#f1f5f9',
                color: lockDateTax ? '#3730a3' : '#64748b',
              }}
            >
              {lockDateTax ? 'إقفال نشط' : 'غير محدد'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
            يمنع تعديل أو إدراج أي عمليات تؤثر على حسابات ضريبة القيمة المضافة للفترات التي تم تقديم واعتماد إقرارها الضريبي لدى الهيئة الضريبية.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              تاريخ إقفال الإقرار الضريبي
            </label>
            <input
              type="date"
              value={lockDateTax}
              onChange={(e) => setLockDateTax(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        </div>
      </div>
    </FormSection>
  );
}
