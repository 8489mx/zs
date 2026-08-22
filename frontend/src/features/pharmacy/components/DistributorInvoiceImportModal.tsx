import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { pharmacyApi } from '../api/pharmacy.api';
import { IconBox, IconPlus, IconTrash, IconCheck } from './PharmacyIcons';

interface Props {
  open: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

interface InvoiceLine {
  productName: string;
  barcode: string;
  quantity: number;
  bonusQuantity: number;
  publicPrice: number;
  costPrice: number;
  expiryDate: string;
  batchNumber: string;
}

export function DistributorInvoiceImportModal({
  open,
  onClose,
  onImportSuccess,
}: Props) {
  const [distributor, setDistributor] = useState('الشركة المتحدة للصيادلة (UCP)');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [rawText, setRawText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      productName: 'Panadol Extra 500mg',
      barcode: '6221001000018',
      quantity: 10,
      bonusQuantity: 1,
      costPrice: 33.75,
      publicPrice: 45.0,
      expiryDate: '2027-10',
      batchNumber: 'UCP-98124',
    },
    {
      productName: 'Augmentin 1g',
      barcode: '6221008000011',
      quantity: 5,
      bonusQuantity: 0,
      costPrice: 97.5,
      publicPrice: 130.0,
      expiryDate: '2028-03',
      batchNumber: 'UCP-98125',
    },
  ]);
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productName: '',
        barcode: '',
        quantity: 1,
        bonusQuantity: 0,
        costPrice: 0,
        publicPrice: 0,
        expiryDate: '2027-12',
        batchNumber: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, field: keyof InvoiceLine, val: any) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    const rawRows = rawText.split('\n');
    const parsed: InvoiceLine[] = [];

    for (const row of rawRows) {
      if (!row.trim()) continue;
      const parts = row.split(/\t|,|;/);
      if (parts.length >= 2) {
        parsed.push({
          productName: parts[0]?.trim() || 'صنف غير محدد',
          barcode: parts[1]?.trim() || '',
          quantity: Number(parts[2]) || 1,
          bonusQuantity: Number(parts[3]) || 0,
          costPrice: Number(parts[4]) || 0,
          publicPrice: Number(parts[5]) || 0,
          expiryDate: parts[6]?.trim() || '2027-12',
          batchNumber: parts[7]?.trim() || '',
        });
      }
    }

    if (parsed.length > 0) {
      setLines(parsed);
      setStatusMessage({ text: `تم استخراج ${parsed.length} صنف من الفاتورة بنجاح!` });
      setRawText('');
    } else {
      setStatusMessage({ text: 'لم نتمكن من قراءة البيانات. تأكد من فصل الأعمدة بـ Tab أو فاصلة', isError: true });
    }
  };

  const handleImport = async () => {
    const validLines = lines.filter((l) => l.productName.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      setStatusMessage({ text: 'يرجى التأكد من وجود أصناف وكميات صحيحة في الفاتورة', isError: true });
      return;
    }

    setImporting(true);
    setStatusMessage(null);
    try {
      const res = await pharmacyApi.importDistributorInvoice({
        distributor,
        invoiceNumber,
        lines: validLines,
      });

      setStatusMessage({ text: res.message || 'تم استيراد الفاتورة وتحديث الأرصدة والتشغيلات بنجاح!' });
      if (onImportSuccess) onImportSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ text: 'فشل استيراد الفاتورة: ' + (err?.message || ''), isError: true });
    } finally {
      setImporting(false);
    }
  };

  const totalPublicSum = lines.reduce((acc, l) => acc + (Number(l.quantity) + Number(l.bonusQuantity || 0)) * Number(l.publicPrice || 0), 0);
  const totalCostSum = lines.reduce((acc, l) => acc + Number(l.quantity || 0) * Number(l.costPrice || 0), 0);

  return (
    <DialogShell open={open} onClose={onClose} width="min(1050px, 95vw)" ariaLabel="استيراد فواتير الموزعين">
      <div dir="rtl" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px', color: '#059669', display: 'flex' }}>
              <IconBox size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>استيراد فواتير الموزعين الإلكترونية (E-Invoice Importer)</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                دعم مباشر لفواتير (المتحدة للصيادلة UCP، ابن سينا Ibnsina، فارما أوفرسيز) وتحديث المخزون والتشغيلات فوراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        {statusMessage && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: statusMessage.isError ? '#fef2f2' : '#f0fdf4',
              color: statusMessage.isError ? '#b91c1c' : '#166534',
              border: `1px solid ${statusMessage.isError ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Distributor selection & Invoice metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>شركة التوزيع / المورد</label>
            <select
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              className="purchase-prototype-field-input"
              style={{ width: '100%', marginTop: '4px' }}
            >
              <option value="الشركة المتحدة للصيادلة (UCP)">الشركة المتحدة للصيادلة (UCP)</option>
              <option value="ابن سينا فارما (Ibnsina)">ابن سينا فارما (Ibnsina)</option>
              <option value="فارما أوفرسيز (PharmaOverseas)">فارما أوفرسيز (PharmaOverseas)</option>
              <option value="الشركة المصرية لتجارة الأدوية">الشركة المصرية لتجارة الأدوية</option>
              <option value="مالتي فارما (MultiPharma)">مالتي فارما (MultiPharma)</option>
              <option value="موزع / مخزن أدوية آخر">موزع / مخزن أدوية آخر</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>رقم الفاتورة الإلكترونية</label>
            <input
              type="text"
              placeholder="مثال: INV-2026-88192"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="purchase-prototype-field-input"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>إجمالي التكلفة:</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>{totalCostSum.toFixed(2)} ج.م</div>
            </div>
            <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>قيمة البيع للجمهور:</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>{totalPublicSum.toFixed(2)} ج.م</div>
            </div>
          </div>
        </div>

        {/* Quick Paste Raw Excel Area */}
        <details style={{ marginTop: '8px', fontSize: '12px', color: '#475569' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#2563eb' }}>
            📋 لصق بيانات مباشرة من ملف Excel / CSV الموزع
          </summary>
          <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
            <textarea
              rows={3}
              placeholder="انسخ صفوف جدول الفاتورة من ملف الاكسل والصقها هنا مباشرة (الاسم [Tab] الباركود [Tab] الكمية [Tab] البونص [Tab] سعر الشراء [Tab] سعر الجمهور [Tab] الصلاحية)..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="purchase-prototype-field-input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '11px' }}
            />
            <Button variant="secondary" onClick={handleParseRawText} style={{ whiteSpace: 'nowrap' }}>
              معالجة اللصق
            </Button>
          </div>
        </details>

        {/* Lines Table */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '12px', maxHeight: '360px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', zIndex: 2 }}>
              <tr>
                <th style={{ padding: '8px' }}>اسم الصنف</th>
                <th style={{ padding: '8px' }}>الباركود</th>
                <th style={{ padding: '8px', width: '70px' }}>الكمية</th>
                <th style={{ padding: '8px', width: '65px' }}>بونص</th>
                <th style={{ padding: '8px', width: '90px' }}>سعر الشراء</th>
                <th style={{ padding: '8px', width: '90px' }}>سعر الجمهور</th>
                <th style={{ padding: '8px', width: '90px' }}>الصلاحية</th>
                <th style={{ padding: '8px', width: '90px' }}>التشغيلة</th>
                <th style={{ padding: '8px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={line.productName}
                      onChange={(e) => handleUpdateLine(idx, 'productName', e.target.value)}
                      placeholder="اسم الدواء..."
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={line.barcode}
                      onChange={(e) => handleUpdateLine(idx, 'barcode', e.target.value)}
                      placeholder="622..."
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px', fontFamily: 'monospace' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => handleUpdateLine(idx, 'quantity', Number(e.target.value))}
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      value={line.bonusQuantity}
                      onChange={(e) => handleUpdateLine(idx, 'bonusQuantity', Number(e.target.value))}
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px', textAlign: 'center', color: '#16a34a' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      value={line.costPrice}
                      onChange={(e) => handleUpdateLine(idx, 'costPrice', Number(e.target.value))}
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number"
                      value={line.publicPrice}
                      onChange={(e) => handleUpdateLine(idx, 'publicPrice', Number(e.target.value))}
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={line.expiryDate}
                      onChange={(e) => handleUpdateLine(idx, 'expiryDate', e.target.value)}
                      placeholder="YYYY-MM"
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={line.batchNumber}
                      onChange={(e) => handleUpdateLine(idx, 'batchNumber', e.target.value)}
                      placeholder="Batch#"
                      className="purchase-prototype-field-input"
                      style={{ width: '100%', padding: '4px 8px' }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                    >
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <Button variant="secondary" onClick={handleAddLine} style={{ gap: '6px' }}>
            <IconPlus size={16} />
            + إضافة سطر صنف جديد
          </Button>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            عدد الأصناف بالفاتورة: <strong>{lines.length}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={importing || lines.length === 0}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none', gap: '6px' }}
          >
            <IconCheck size={16} />
            {importing ? 'جاري الاستيراد وتحديث الأرصدة...' : `استيراد الفاتورة وتحديث المخزون والتشغيلات (${lines.length} صنف)`}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
