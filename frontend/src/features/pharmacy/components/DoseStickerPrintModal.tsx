import { useState, useRef } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { IconPrinter } from './PharmacyIcons';

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
    <DialogShell open={open} onClose={onClose} width="min(540px, 95vw)" ariaLabel="طباعة استيكر تعليمات الجرعة">
      <div dir="rtl" style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              طباعة استيكر تعليمات الجرعة على علبة الدواء
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              ملصق حراري صغير يوضع على علبة الدواء لضمان سلامة المريض والالتزام بالجرعات
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              اسم المريض:
            </label>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="اسم المريض (اختياري)..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              اسم الدواء:
            </label>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="اسم الدواء..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              الجرعة والتكرار:
            </label>
            <CustomSelect
              value={frequency}
              onChange={(val) => setFrequency(val)}
              options={[
                { value: 'قرص مرة واحدة يومياً', label: 'قرص مرة واحدة يومياً' },
                { value: 'قرص كل 12 ساعة (مرتين يومياً)', label: 'قرص كل 12 ساعة (مرتين يومياً)' },
                { value: 'قرص كل 8 ساعات (3 مرات يومياً)', label: 'قرص كل 8 ساعات (3 مرات يومياً)' },
                { value: 'قرص كل 6 ساعات (4 مرات يومياً)', label: 'قرص كل 6 ساعات (4 مرات يومياً)' },
                { value: 'ملعقة كبيرة (10 مل) 3 مرات يومياً', label: 'ملعقة كبيرة (10 مل) 3 مرات يومياً' },
                { value: 'ملعقة صغيرة (5 مل) 3 مرات يومياً', label: 'ملعقة صغيرة (5 مل) 3 مرات يومياً' },
                { value: 'نقطتان في كل عين 3 مرات يومياً', label: 'نقطتان في كل عين 3 مرات يومياً' },
                { value: 'دهان موضعي مرتين يومياً', label: 'دهان موضعي مرتين يومياً' },
                { value: 'كيس فوار على نصف كوب ماء مرتين يومياً', label: 'كيس فوار على نصف كوب ماء مرتين يومياً' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              توقيت التناول:
            </label>
            <CustomSelect
              value={timing}
              onChange={(val) => setTiming(val)}
              options={[
                { value: 'بعد الأكل مباشرة', label: 'بعد الأكل مباشرة' },
                { value: 'قبل الأكل بنصف ساعة على معدة فارغة', label: 'قبل الأكل بنصف ساعة على معدة فارغة' },
                { value: 'وسط الأكل', label: 'وسط الأكل' },
                { value: 'قبل النوم مباشرة', label: 'قبل النوم مباشرة' },
                { value: 'عند اللزوم أو الألم الشديد فقط', label: 'عند اللزوم أو الألم الشديد فقط' },
              ]}
            />
          </div>


          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              المدة وملاحظات خاصة:
            </label>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="مثال: لمدة 5 أيام / تجنب التعرض للشمس..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Live Sticker Preview */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>معاينة ملصق العلبة:</div>
          <div
            ref={printRef}
            className="box"
            style={{
              width: '240px',
              margin: '0 auto',
              background: '#fff',
              border: '1px dashed #cbd5e1',
              borderRadius: '6px',
              padding: '8px 10px',
              textAlign: 'center',
            }}
          >
            <div className="title" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
              {storeName} {patientName ? (' • أ/ ' + patientName) : ''}
            </div>
            <div className="drug" style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--primary, #1e1b4b)', margin: '3px 0' }}>
              {medName || 'اسم الدواء'}
            </div>
            <div className="dose" style={{ fontSize: '0.82rem', fontWeight: 700, background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', margin: '3px 0', color: '#0f172a' }}>
              {frequency}
            </div>
            <div className="timing" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#b91c1c' }}>
              {timing} {duration ? ('(' + duration + ')') : ''}
            </div>
            <div className="footer" style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
              نتمنى لكم الشفاء العاجل!
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IconPrinter size={15} />
            <span>طباعة الاستيكر فوراً</span>
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
