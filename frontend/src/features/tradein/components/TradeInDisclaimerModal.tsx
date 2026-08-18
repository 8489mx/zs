import { useRef } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { buildCode128Svg } from '@/lib/barcode';
import type { TradeInTransaction } from '@/types/domain-models/tradein';
import type { AppSettings } from '@/types/domain';

interface TradeInDisclaimerModalProps {
  open: boolean;
  transaction: TradeInTransaction | null;
  settings?: AppSettings | null;
  onClose: () => void;
}

export function TradeInDisclaimerModal({ open, transaction, settings, onClose }: TradeInDisclaimerModalProps) {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!open || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeSvg = buildCode128Svg(transaction.docNo);

  return (
    <DialogShell open={open} onClose={onClose} ariaLabel="عقد وإقرار بيع جهاز مستعمل">
      <div className="page-stack" dir="rtl" style={{ gap: '16px', maxWidth: '540px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>📄 عقد وإقرار شراء جهاز مستعمل</h3>
          <Button variant="primary" onClick={handlePrint}>
            🖨️ طباعة الإقرار
          </Button>
        </div>

        {/* Printable Contract Card */}
        <div
          ref={printAreaRef}
          className="tradein-printable-disclaimer"
          style={{
            background: '#fff',
            border: '1px solid #94a3b8',
            borderRadius: '8px',
            padding: '20px',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: '#0f172a',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>{settings?.storeName || 'متجر الإلكترونيات'}</h2>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              إقرار وتعهد بيع جهاز مستعمل وإخلاء مسؤولية أمنية
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
              رقم العملية: {transaction.docNo} • التاريخ: {new Date(transaction.createdAt).toLocaleDateString('ar-EG')}
            </div>
          </div>

          {/* Barcode */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} style={{ height: '40px', margin: '0 auto' }} />
          </div>

          {/* Legal Body Statement */}
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <p style={{ margin: 0, textAlign: 'justify' }}>
              أقر أنا الموقع أدناه / <strong>{transaction.sellerName}</strong>
              <br />
              بطاقة رقم قومي: <strong dir="ltr">{transaction.sellerNationalId}</strong>
              <br />
              رقم الهاتف: <strong dir="ltr">{transaction.sellerPhone}</strong>
            </p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ margin: 0, textAlign: 'justify' }}>
              بأنني قد قمت ببيع الجهاز الموضح بياناته أدناه إلى متجر <strong>({settings?.storeName || 'المتجر'})</strong> بكامل إرادتي ومسؤوليتي القانونية:
            </p>
            <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', marginTop: '6px' }}>
              <div>• نوع وموديل الجهاز: <strong>{transaction.deviceBrand ? `${transaction.deviceBrand} ` : ''}{transaction.deviceModel}</strong></div>
              <div>• رقم السيريال / الـ IMEI الأساسي: <strong dir="ltr">{transaction.serialNumber}</strong></div>
              {transaction.imei2 && <div>• رقم الـ IMEI الثاني: <strong dir="ltr">{transaction.imei2}</strong></div>}
              <div>• السعر المتفق عليه والمدفوع: <strong>{transaction.agreedPurchasePrice.toFixed(2)} ج.م</strong></div>
              {transaction.deviceConditionNotes && <div>• حالة الجهاز: <span>{transaction.deviceConditionNotes}</span></div>}
            </div>
          </div>

          {/* Strict Security Undertaking */}
          <div style={{ fontSize: '0.8rem', color: '#334155', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginBottom: '16px' }}>
            <strong>إقرار ملكية وتعهد قانوني:</strong>
            <p style={{ margin: '4px 0 0', textAlign: 'justify', lineHeight: 1.4 }}>
              أقر وأتعهد بأن هذا الجهاز ملكي الخاص ملكية تامة وخالٍ من أي حظر أو نزاع قانوني أو بلاغات سرقة، وأتحمل وحدي المسؤولية الجنائية والمدنية كاملة أمام الجهات المختصة في حال ثبوت خلاف ذلك، ويعتبر هذا الإقرار إبراءً لذمة المتجر وإدارته من أي مسؤولية.
            </p>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '2px solid #0f172a', paddingTop: '12px', textAlign: 'center' }}>
            <div>
              <strong>توقيع البائع (المقر بما فيه)</strong>
              <br /><br />
              الاسم: ..........................
              <br />
              التوقيع / البصمة: ...............
            </div>
            <div>
              <strong>توقيع المستلم / إدارة المتجر</strong>
              <br /><br />
              الاسم: ..........................
              <br />
              الختم / التوقيع: ................
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
