import { useState, useRef } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { downloadExcelFile, parseImportFile } from '@/lib/browser';
import { contractingApi } from '../api/contracting.api';

interface ImportBoqModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedBoqRow {
  index: number;
  itemCode: string;
  description: string;
  category: string;
  unit: string;
  contractQty: number;
  unitPrice: number;
  estimatedUnitCost: number;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

export function ImportBoqModal({
  open,
  projectId,
  projectName,
  onClose,
  onImported,
}: ImportBoqModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedBoqRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    const headers = [
      'كود البند (Item Code)',
      'بيان الأعمال والمواصفات (Description)',
      'التصنيف (Category)',
      'الوحدة (Unit)',
      'الكمية التعاقدية (Contract Qty)',
      'سعر الفئة التعاقدي (Unit Price)',
      'التكلفة التقديرية للوحدة (Estimated Cost)',
      'ملاحظات (Notes)',
    ];

    const sampleRows = [
      ['CIV-001', 'حفر وتطهير للموقع وتجهيز المناسيب طبقاً للمواصفات', 'earthwork', 'm3', 500, 45, 30, 'حسب المناسيب التصميمية'],
      ['CIV-002', 'خرسانة عادية للأساسات سمك 20 سم إجهاد 250 كجم/سم2', 'concrete', 'm3', 120, 1400, 1150, 'معالجة كيميائية'],
      ['CIV-003', 'خرسانة مسلحة للقواعد والأعمدة شاملة حديد التسليح والصب', 'concrete', 'm3', 85, 3400, 2750, 'حديد عز إجهاد 400'],
      ['ARC-001', 'مباني طوب أسمنتي مصمت سمك 25 سم لزوم الأساسات', 'masonry', 'm2', 350, 220, 175, 'بمونة أسمنتية 300 كجم'],
      ['FIN-001', 'بياض محارة أسمنتية للحوائط الداخلية مؤكد بالبؤج والأوتار', 'finishing', 'm2', 1200, 85, 65, 'سمك 2 سم'],
      ['MEP-001', 'تأسيس مواسير وتغذية مياه وصرف صحي معتمد', 'plumbing', 'ls', 1, 45000, 36000, 'شامل التركيب والاختبار'],
    ];

    const safeProjectName = projectName ? projectName.replace(/[/\\?%*:|"<>]/g, '_') : 'project';
    await downloadExcelFile(`BOQ_Template_${safeProjectName}.xlsx`, headers, sampleRows);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setGeneralError(null);

    try {
      const rawRows = await parseImportFile(file);
      if (!rawRows || rawRows.length === 0) {
        setGeneralError('الملف فارغ أو لا يحتوي على صفوف بيانات صالحة.');
        setParsedRows([]);
        return;
      }

      const rows: ParsedBoqRow[] = rawRows.map((raw, idx) => {
        const getVal = (aliases: string[]) => {
          for (const key of Object.keys(raw)) {
            const cleanKey = key.trim().toLowerCase().replace(/[\s_()-]/g, '');
            for (const alias of aliases) {
              const cleanAlias = alias.toLowerCase().replace(/[\s_()-]/g, '');
              if (cleanKey === cleanAlias || cleanKey.includes(cleanAlias)) {
                return raw[key]?.trim() || '';
              }
            }
          }
          return '';
        };

        const codeVal = getVal(['itemcode', 'كودالبند', 'رقمالبند', 'كود', 'code', 'بند']);
        const descVal = getVal(['description', 'بيانالأعمالوالمواصفات', 'بيانالأعمال', 'الوصف', 'المواصفات', 'بيان', 'name']);
        const catVal = getVal(['category', 'التصنيف', 'القسم', 'نوعالبند', 'cat']);
        const unitVal = getVal(['unit', 'الوحدة', 'وحدةالقياس', 'وحدة']);
        const qtyVal = getVal(['contractqty', 'الكميةالتعاقدية', 'الكمية', 'كمية', 'qty', 'quantity']);
        const priceVal = getVal(['unitprice', 'سعرالفئةالتعاقدي', 'سعرالفئة', 'السعر', 'فئة', 'price']);
        const costVal = getVal(['estimatedcost', 'estimatedunitcost', 'التكلفةالتقديريةللوحدة', 'التكلفةالتقديرية', 'التكلفة', 'cost']);
        const notesVal = getVal(['notes', 'ملاحظات', 'ملاحظة', 'note']);

        const contractQty = parseFloat(qtyVal.replace(/,/g, '')) || 0;
        const unitPrice = parseFloat(priceVal.replace(/,/g, '')) || 0;
        const estimatedUnitCost = parseFloat(costVal.replace(/,/g, '')) || 0;

        let isValid = true;
        let validationError = '';

        if (!descVal) {
          isValid = false;
          validationError = 'بيان ومواصفات البند مطلوبة';
        } else if (contractQty <= 0) {
          isValid = false;
          validationError = 'الكمية يجب أن تكون أكبر من صفر';
        } else if (unitPrice <= 0) {
          isValid = false;
          validationError = 'سعر الفئة يجب أن يكون أكبر من صفر';
        }

        const itemCode = codeVal || `BOQ-${String(idx + 1).padStart(3, '0')}`;

        return {
          index: idx + 1,
          itemCode,
          description: descVal,
          category: catVal || 'general',
          unit: unitVal || 'm3',
          contractQty,
          unitPrice,
          estimatedUnitCost,
          notes: notesVal || undefined,
          isValid,
          validationError,
        };
      });

      setParsedRows(rows);
    } catch (err: any) {
      setGeneralError(err?.message || 'تعذر قراءة محتويات الملف، يرجى التأكد من صيغة Excel أو CSV');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const totalContractVal = validRows.reduce((sum, r) => sum + r.contractQty * r.unitPrice, 0);
  const totalCostVal = validRows.reduce((sum, r) => sum + r.contractQty * r.estimatedUnitCost, 0);

  const handleImport = async () => {
    if (validRows.length === 0) {
      setGeneralError('لا توجد بنود صالحة للاستيراد في الملف');
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const itemsToCreate = validRows.map((r) => ({
        itemCode: r.itemCode,
        description: r.description,
        category: r.category,
        unit: r.unit,
        contractQty: r.contractQty,
        unitPrice: r.unitPrice,
        estimatedUnitCost: r.estimatedUnitCost,
        notes: r.notes,
      }));

      await contractingApi.batchCreateBoqItems(projectId, itemsToCreate);
      onImported();
      onClose();
    } catch (err: any) {
      setGeneralError(err?.message || 'حدث خطأ أثناء استيراد بنود المقايسة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="استيراد جدول الكميات والمقايسة من ملف Excel"
      subtitle={projectName ? `المشروع: ${projectName}` : 'رفع كميات وفئات الأسعار التقديرية والتعاقدية دفعة واحدة'}
      width="min(960px, 95vw)"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleImport}
          submitText={isSubmitting ? 'جاري الاستيراد...' : `تأكيد استيراد (${validRows.length}) بند تعاقدي`}
          cancelText="إلغاء"
          submitDisabled={isSubmitting || validRows.length === 0}
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* Banner with Template Download */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: '#1e293b' }}>
              هل تحتاج إلى نموذج Excel جاهز ومنسق؟
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', marginTop: '2px' }}>
              يمكنك تنزيل النموذج المعتمد وملء بنود المقايسة وأسعار الفئات لإعادة رفعها مباشرة.
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#170e5e',
              fontSize: 'var(--font-badge)',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <AppIcons.Download size={14} />
            تحميل النموذج الاسترشادي (XLSX)
          </button>
        </div>

        {/* File Input & Drop Area */}
        <div
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: '#170e5e' }}>
            <AppIcons.FileSpreadsheet size={36} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: '#0f172a' }}>
            {fileName ? `الملف المحدد: ${fileName}` : 'اضغط لاختيار ملف Excel أو CSV لجدول المقايسة'}
          </div>
          <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', marginTop: '4px' }}>
            يدعم الملفات بصيغة .xlsx و .xls و .csv مع التعرف التلقائي على الأعمدة باللغتين العربية والإنجليزية
          </div>
        </div>

        {/* Error Notification */}
        {generalError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AppIcons.AlertCircle size={16} />
            <span>{generalError}</span>
          </div>
        )}

        {/* Parsing Progress */}
        {isParsing && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            جاري قراءة وتحليل بيانات جدول الكميات...
          </div>
        )}

        {/* Summary KPIs for Parsed Data */}
        {parsedRows.length > 0 && !isParsing && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي البنود المقروءة</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {parsedRows.length} بند
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>البنود الصالحة للاستيراد</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                {validRows.length} بند
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي القيمة التعاقدية</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
                {totalContractVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي التكلفة التقديرية</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#475569', marginTop: '2px' }}>
                {totalCostVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {parsedRows.length > 0 && !isParsing && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-subtitle)' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>م</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>كود البند</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>بيان الأعمال والمواصفات</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>الوحدة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>الكمية</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>سعر الفئة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>إجمالي القيمة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: row.isValid ? 'transparent' : '#fff1f2',
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.index}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>{row.itemCode}</td>
                      <td style={{ padding: '8px 12px', maxWidth: '250px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.description}</div>
                        {row.validationError && (
                          <div style={{ color: '#b91c1c', fontSize: 'var(--font-micro)', marginTop: '2px' }}>
                            {row.validationError}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{row.unit}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                        {row.contractQty.toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                        {row.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#170e5e' }}>
                        {(row.contractQty * row.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {row.isValid ? (
                          <span style={{ color: '#15803d', fontSize: 'var(--font-micro)', fontWeight: 700 }}>جاهز</span>
                        ) : (
                          <span style={{ color: '#b91c1c', fontSize: 'var(--font-micro)', fontWeight: 700 }}>غير صالح</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
