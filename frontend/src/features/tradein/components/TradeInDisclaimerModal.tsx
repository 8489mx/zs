import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { buildCode128Svg } from '@/lib/barcode';
import { escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { TradeInTransaction } from '@/types/domain-models/tradein';
import type { AppSettings } from '@/types/domain';
import { getMaintenanceProfile } from '@/features/maintenance/constants/maintenance-profiles';

interface TradeInDisclaimerModalProps {
  open: boolean;
  transaction: TradeInTransaction | null;
  settings?: AppSettings | null;
  onClose: () => void;
}

export function TradeInDisclaimerModal({ open, transaction, settings, onClose }: TradeInDisclaimerModalProps) {
  const profile = getMaintenanceProfile(settings?.maintenanceProfile);

  if (!open || !transaction) return null;

  const handlePrint = () => {
    const barcodeSvg = buildCode128Svg(transaction.docNo);
    const storeName = settings?.storeName || 'متجر الإلكترونيات';
    const dateFormatted = new Date(transaction.createdAt).toLocaleDateString('ar-EG');
    const deviceLabel = `${transaction.deviceBrand ? `${transaction.deviceBrand} ` : ''}${transaction.deviceModel}`;

    const bodyHtml = `
      <div style="text-align:center; padding-bottom:12px; margin-bottom:16px; border-bottom:2px solid #0f172a;">
        <div style="font-size:0.85rem; font-weight:700; color:#1e293b; margin-bottom:4px;">
          إقرار وتعهد بيع وتنازل عن جهاز وإخلاء مسؤولية أمنية
        </div>
        <div style="font-size:0.78rem; color:#64748b;">
          رقم العملية: <strong style="font-family:monospace;">${escapeHtml(transaction.docNo)}</strong>
          &nbsp;•&nbsp; التاريخ: ${escapeHtml(dateFormatted)}
        </div>
      </div>

      <div style="text-align:center; margin-bottom:14px;">
        <div style="max-width:220px; height:52px; margin:0 auto;">${barcodeSvg}</div>
        <div style="font-family:monospace; font-size:0.9rem; font-weight:700; letter-spacing:1px; margin-top:4px;">${escapeHtml(transaction.docNo)}</div>
      </div>

      <div style="background:#f8fafc; padding:14px 16px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:16px; font-size:0.9rem; line-height:1.7;">
        <p style="margin:0;">
          أقر أنا الموقع أدناه / <strong>${escapeHtml(transaction.sellerName)}</strong><br/>
          بطاقة رقم قومي: <strong dir="ltr">${escapeHtml(transaction.sellerNationalId)}</strong><br/>
          رقم الهاتف: <strong dir="ltr">${escapeHtml(transaction.sellerPhone)}</strong>
        </p>
      </div>

      <p style="margin:0 0 10px; font-size:0.9rem; line-height:1.6; text-align:justify;">
        بأنني قد قمت ببيع الجهاز الموضح بياناته أدناه إلى متجر <strong>(${escapeHtml(storeName)})</strong> بكامل إرادتي ومسؤوليتي القانونية:
      </p>

      <div style="background:#f1f5f9; padding:12px 16px; border-radius:8px; margin-bottom:16px; font-size:0.9rem; line-height:1.8;">
        <div>• نوع وموديل الجهاز: <strong>${escapeHtml(deviceLabel)}</strong></div>
        <div>• ${escapeHtml(profile.serialLabel)}: <strong dir="ltr">${escapeHtml(transaction.serialNumber)}</strong></div>
        ${transaction.imei2 ? `<div>• ${escapeHtml(profile.secondarySerialLabel)}: <strong dir="ltr">${escapeHtml(transaction.imei2)}</strong></div>` : ''}
        <div>• السعر المتفق عليه والمدفوع: <strong>${Number(transaction.agreedPurchasePrice).toFixed(2)} ج.م</strong></div>
        ${transaction.deviceConditionNotes ? `<div>• حالة وملاحظات الجهاز: ${escapeHtml(transaction.deviceConditionNotes)}</div>` : ''}
      </div>

      <div style="border-top:1px dashed #cbd5e1; padding-top:12px; margin-bottom:20px; font-size:0.82rem; color:#334155; line-height:1.5;">
        <strong>إقرار ملكية وتعهد قانوني:</strong>
        <p style="margin:6px 0 0; text-align:justify;">
          أقر وأتعهد بأن هذا الجهاز ملكي الخاص ملكية تامة وخالٍ من أي حظر أو نزاع قانوني أو بلاغات سرقة، وأتحمل وحدي المسؤولية الجنائية والمدنية كاملة أمام الجهات المختصة في حال ثبوت خلاف ذلك، ويعتبر هذا الإقرار إبراءً لذمة المتجر وإدارته من أي مسؤولية.
        </p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; border-top:2px solid #0f172a; padding-top:16px; text-align:center; font-size:0.9rem; line-height:2;">
        <div>
          <strong>توقيع البائع (المقر بما فيه)</strong><br/><br/>
          الاسم: ..........................<br/>
          التوقيع / البصمة: ...............
        </div>
        <div>
          <strong>توقيع المستلم / إدارة المتجر</strong><br/><br/>
          الاسم: ..........................<br/>
          الختم / التوقيع: ................
        </div>
      </div>
    `;

    printHtmlDocument(
      `إقرار بيع وتنازل - ${transaction.docNo}`,
      bodyHtml,
      {
        subtitle: `عقد وتعهد بيع وتنازل عن جهاز وإخلاء مسؤولية أمنية`,
        pageSize: 'A4',
        orientation: 'portrait',
        layout: 'centered',
        printDelayMs: 400,
        autoClose: true,
        extraStyles: `
          .doc-panel { border: none !important; background: transparent !important; }
          .print-content { gap: 0 !important; }
        `,
      }
    );
  };

  const barcodeSvg = buildCode128Svg(transaction.docNo);
  const dateFormatted = new Date(transaction.createdAt).toLocaleDateString('ar-EG');

  return (
    <DialogShell open={open} onClose={onClose} ariaLabel="عقد وإقرار بيع وتنازل عن جهاز">
      <div className="page-stack" dir="rtl" style={{ gap: '16px', maxWidth: '540px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>عقد وإقرار بيع وتنازل عن جهاز</h3>
          <Button variant="primary" onClick={handlePrint}>
            طباعة الإقرار
          </Button>
        </div>

        {/* Preview card shown in modal */}
        <div style={{ background: '#fff', border: '1px solid #94a3b8', borderRadius: '8px', padding: '20px', fontSize: '0.875rem', lineHeight: 1.6, color: '#0f172a' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>{settings?.storeName || 'متجر الإلكترونيات'}</h2>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>إقرار وتعهد بيع وتنازل عن جهاز وإخلاء مسؤولية أمنية</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>رقم العملية: {transaction.docNo} • التاريخ: {dateFormatted}</div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} style={{ height: '40px', margin: '0 auto' }} />
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <p style={{ margin: 0 }}>
              أقر أنا الموقع أدناه / <strong>{transaction.sellerName}</strong><br />
              بطاقة رقم قومي: <strong dir="ltr">{transaction.sellerNationalId}</strong><br />
              رقم الهاتف: <strong dir="ltr">{transaction.sellerPhone}</strong>
            </p>
          </div>
          <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', marginBottom: '14px' }}>
            <div>• الجهاز: <strong>{transaction.deviceBrand ? `${transaction.deviceBrand} ` : ''}{transaction.deviceModel}</strong></div>
            <div>• {profile.serialLabel}: <strong dir="ltr">{transaction.serialNumber}</strong></div>
            <div>• السعر المتفق عليه: <strong>{Number(transaction.agreedPurchasePrice).toFixed(2)} ج.م</strong></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '2px solid #0f172a', paddingTop: '12px', textAlign: 'center', fontSize: '0.8rem' }}>
            <div><strong>توقيع البائع</strong><br /><br />الاسم: .............<br />التوقيع: ............</div>
            <div><strong>توقيع المستلم</strong><br /><br />الاسم: .............<br />الختم: .............</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </DialogShell>
  );
}
