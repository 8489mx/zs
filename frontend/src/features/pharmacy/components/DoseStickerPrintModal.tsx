import { useState, useRef } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { IconTag, IconPrinter } from './PharmacyIcons';

interface Props {
  open: boolean;
  onClose: () => void;
  drugName?: string;
  customerName?: string;
  storeName?: string;
}

export function DoseStickerPrintModal({ open, onClose, drugName = '', customerName = '', storeName = 'صيدلية الشفاء' }: Props) {
  const [patientName, setPatientName] = useState(customerName);
  const [medName, setMedName] = useState(drugName);
  const [frequency, setFrequency] = useState('قرص كل 12 ساعة (مرتين يومياً)');
  const [timing, setTiming] = useState('بعد الأكل مباشرة');
  const [duration, setDuration] = useState('لمدة 7 أيام');
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWin = window.open('', '_blank', 'width=350,height=300');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>استيكر تعليمات الجرعة</title>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { margin: 0; padding: 4px; font-family: sans-serif; font-size: 11px; direction: rtl; text-align: center; }
            .box { border: 1px dashed #333; padding: 4px; border-radius: 4px; }
            .title { font-size: 10px; font-weight: bold; margin-bottom: 2px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
            .drug { font-size: 12px; font-weight: 800; color: #000; margin: 2px 0; }
            .dose { font-size: 11px; font-weight: bold; background: #eee; padding: 2px; margin: 2px 0; border-radius: 2px; }
            .timing { font-size: 10px; font-weight: bold; }
            .footer { font-size: 8px; color: #555; margin-top: 3px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <DialogShell open={open} onClose={onClose} width="min(540px, 95vw)" ariaLabel="طباعة استيكر الجرعة الدوائية">
      <div dir="rtl" style={{ padding: '16px 20px' }}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconTag size={20} color="#16a34a" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
              طباعة استيكر تعليمات الجرعة على علبة الدواء
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              ملصق حراري صغير يوضع على علبة الدواء لضمان سلامة المريض والالتزام بالجرعات
            </p>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              اسم المريض:
            </label>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="اسم المريض (اختياري)..."
              style={{ width: '100%', padding: '6px 10px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              اسم الدواء:
            </label>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="اسم الدواء..."
              style={{ width: '100%', padding: '6px 10px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              الجرعة والتكرار:
            </label>
            <select
              className="purchase-prototype-field-input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', background: '#fff' }}
            >
              <option value="قرص مرة واحدة يومياً">قرص مرة واحدة يومياً</option>
              <option value="قرص كل 12 ساعة (مرتين يومياً)">قرص كل 12 ساعة (مرتين يومياً)</option>
              <option value="قرص كل 8 ساعات (3 مرات يومياً)">قرص كل 8 ساعات (3 مرات يومياً)</option>
              <option value="قرص كل 6 ساعات (4 مرات يومياً)">قرص كل 6 ساعات (4 مرات يومياً)</option>
              <option value="ملعقة كبيرة (10 مل) 3 مرات يومياً">ملعقة كبيرة (10 مل) 3 مرات يومياً</option>
              <option value="ملعقة صغيرة (5 مل) 3 مرات يومياً">ملعقة صغيرة (5 مل) 3 مرات يومياً</option>
              <option value="نقطتان في كل عين 3 مرات يومياً">نقطتان في كل عين 3 مرات يومياً</option>
              <option value="دهان موضعي مرتين يومياً">دهان موضعي مرتين يومياً</option>
              <option value="كيس فوار على نصف كوب ماء مرتين يومياً">كيس فوار على نصف كوب ماء مرتين يومياً</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              توقيت التناول:
            </label>
            <select
              className="purchase-prototype-field-input"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', background: '#fff' }}
            >
              <option value="بعد الأكل مباشرة">بعد الأكل مباشرة</option>
              <option value="قبل الأكل بنصف ساعة على معدة فارغة">قبل الأكل بنصف ساعة على معدة فارغة</option>
              <option value="وسط الأكل">وسط الأكل</option>
              <option value="قبل النوم مباشرة">قبل النوم مباشرة</option>
              <option value="عند اللزوم أو الألم الشديد فقط">عند اللزوم أو الألم الشديد فقط</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              المدة وملاحظات خاصة:
            </label>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="مثال: لمدة 5 أيام / تجنب التعرض للشمس..."
              style={{ width: '100%', padding: '6px 10px' }}
            />
          </div>
        </div>

        {/* Live Sticker Preview */}
        <div style={{ marginTop: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>معاينة ملصق العلبة:</div>
          <div
            ref={printRef}
            className="box"
            style={{
              width: '240px',
              margin: '0 auto',
              background: '#fff',
              border: '2px dashed #0284c7',
              borderRadius: '6px',
              padding: '8px 10px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div className="title" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
              {storeName} {patientName ? (' • أ/ ' + patientName) : ''}
            </div>
            <div className="drug" style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0369a1', margin: '3px 0' }}>
              {medName || 'اسم الدواء'}
            </div>
            <div className="dose" style={{ fontSize: '0.82rem', fontWeight: 800, background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', margin: '3px 0', color: '#0f172a' }}>
              {frequency}
            </div>
            <div className="timing" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626' }}>
              {timing} {duration ? ('(' + duration + ')') : ''}
            </div>
            <div className="footer" style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
              نتمنى لكم الشفاء العاجل!
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconPrinter size={16} />
            <span>طباعة الاستيكر فوراً</span>
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
