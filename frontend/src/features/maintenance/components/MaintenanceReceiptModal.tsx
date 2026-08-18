import { useRef } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { buildCode128Svg } from '@/lib/barcode';
import type { MaintenanceTicket } from '@/types/domain-models/maintenance';
import type { AppSettings } from '@/types/domain';

interface MaintenanceReceiptModalProps {
  open: boolean;
  ticket: MaintenanceTicket | null;
  settings?: AppSettings | null;
  onClose: () => void;
}

export function MaintenanceReceiptModal({ open, ticket, settings, onClose }: MaintenanceReceiptModalProps) {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!open || !ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeSvg = buildCode128Svg(ticket.ticketNo);
  const remainingAmount = Math.max(0, (ticket.finalCost || ticket.expectedCost || 0) - (ticket.advancePayment || 0));

  return (
    <DialogShell open={open} onClose={onClose} ariaLabel="طباعة إيصال استلام الصيانة">
      <div className="page-stack" dir="rtl" style={{ gap: '16px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>📄 إيصال استلام صيانة</h3>
          <Button variant="primary" onClick={handlePrint}>
            🖨️ طباعة الإيصال
          </Button>
        </div>

        {/* Printable Receipt Card */}
        <div
          ref={printAreaRef}
          className="maintenance-printable-receipt"
          style={{
            background: '#fff',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: '#0f172a',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>{settings?.storeName || 'مركز الصيانة'}</h2>
            {settings?.phone && <div style={{ fontSize: '0.85rem', color: '#475569' }}>هاتف: {settings.phone}</div>}
            {settings?.address && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{settings.address}</div>}
            <div style={{ marginTop: '8px', display: 'inline-block', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              إيصال استلام جهاز للإصلاح
            </div>
          </div>

          {/* Barcode & Ticket No */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} style={{ height: '45px', margin: '0 auto' }} />
            <strong style={{ fontSize: '1.1rem', letterSpacing: '1px', display: 'block', marginTop: '4px' }}>
              {ticket.ticketNo}
            </strong>
            <small style={{ color: '#64748b' }}>
              التاريخ: {new Date(ticket.receivedAt).toLocaleDateString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' } as any)}
            </small>
          </div>

          {/* Customer & Device Details Table */}
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>العميل: <strong>{ticket.customerName}</strong></div>
              <div>الهاتف: <strong dir="ltr">{ticket.customerPhone}</strong></div>
              <div>الجهاز: <strong>{ticket.deviceBrand ? `${ticket.deviceBrand} ` : ''}{ticket.deviceModel}</strong></div>
              {ticket.serialNumber && <div>السيريال/IMEI: <strong dir="ltr">{ticket.serialNumber}</strong></div>}
              {ticket.passcode && <div style={{ gridColumn: 'span 2' }}>الرمز/النمط: <strong dir="ltr">{ticket.passcode}</strong></div>}
            </div>
          </div>

          {/* Problem & Condition */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 600, color: '#dc2626' }}>العطل المشتكى منه:</div>
            <div style={{ background: '#fef2f2', padding: '6px 8px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
              {ticket.problemDescription}
            </div>

            {ticket.deviceCondition && (
              <div style={{ marginTop: '6px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>حالة الجهاز الظاهرية: </span>
                <span>{ticket.deviceCondition}</span>
              </div>
            )}
          </div>

          {/* Financials */}
          <div style={{ borderTop: '1px dashed #94a3b8', borderBottom: '1px dashed #94a3b8', padding: '8px 0', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>التكلفة التقديرية / النهائية:</span>
              <strong>{(ticket.finalCost || ticket.expectedCost || 0).toFixed(2)} ج.م</strong>
            </div>
            {ticket.advancePayment > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#16a34a' }}>
                <span>المدفوع مقدماً:</span>
                <strong>{ticket.advancePayment.toFixed(2)} ج.م</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
              <span>المتبقي عند الاستلام:</span>
              <span>{remainingAmount.toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Disclaimer / Terms */}
          <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'justify', lineHeight: 1.3 }}>
            <strong>شروط الاستلام:</strong>
            <ul style={{ paddingRight: '16px', margin: '4px 0' }}>
              <li>المركز غير مسؤول عن الأجهزة المتروكة لأكثر من 30 يوماً من تاريخ الإصلاح.</li>
              <li>المركز غير مسؤول عن فقدان البيانات (Data Loss) أثناء عمليات الصيانة أو السوفت وير.</li>
              <li>فترة الضمان على قطع الغيار المستبدلة {ticket.warrantyDays || 30} يوماً بموجب هذا الإيصال.</li>
              <li>لا يتم تسليم الجهاز إلا بأصل هذا الإيصال أو إثبات الشخصية.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', textAlign: 'center' }}>
            <div>توقيع المستلم / الفني<br /><br />...................</div>
            <div>توقيع العميل<br /><br />...................</div>
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
