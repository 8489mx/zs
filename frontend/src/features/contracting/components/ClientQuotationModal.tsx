import { useState, useRef, useMemo, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { ContractingBoqItem } from '../contracting.types';
import { getTextDirection } from '@/lib/arabic-normalization';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { toast } from '@/shared/components/system-alert';
import { exportPricedBoqWorkbook } from '../utils/originalWorkbookPricer';
import { settingsApi } from '@/features/settings/api/settings.api';
import type { AppSettings } from '@/types/domain';

export interface ClientQuotationItem extends ContractingBoqItem {
  rawRowIdx?: number;
  sourceFileName?: string;
  sourceSheetName?: string;
}

interface ClientQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  clientName?: string;
  items: ClientQuotationItem[];
  currency?: string;
}

const TRADE_LABELS: Record<string, string> = {
  all: 'كافة البنود والمستندات',
  hvac: 'التكييف والتهوية',
  fire_fighting: 'شبكات مكافحة الحريق',
  electrical_power: 'الأعمال الكهربائية',
  low_current: 'التيار الخفيف والأنظمة الذكية',
  plumbing_sanitary: 'الأعمال الصحية والسباكة',
  civil_concrete: 'أعمال مدنية وخرسانات',
  architecture_finishes: 'تشطيبات ومعماري',
  masonry: 'أعمال المباني',
  concrete: 'أعمال الخرسانة',
  plastering: 'أعمال البياض والمحارة',
  flooring: 'أعمال الأرضيات',
  finishes: 'أعمال الدهانات والتشطيب',
  general: 'أعمال عامة ومتنوعة',
};

export function ClientQuotationModal({
  isOpen,
  onClose,
  projectName = 'مشروع مقاولات',
  clientName = 'العميل الموقر',
  items,
  currency: currencyProp,
}: ClientQuotationModalProps) {
  const { currencySymbol } = useSystemCurrency(currencyProp);
  const currency = currencyProp || currencySymbol;
  const printRef = useRef<HTMLDivElement>(null);

  // App & Company Settings from Settings Module
  const [companySettings, setCompanySettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let active = true;
    settingsApi
      .settings()
      .then((data) => {
        if (active && data) setCompanySettings(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const resolvedCompanyName =
    companySettings?.brandName || companySettings?.storeName || 'شركة المقاولات العامة والإنشاءات المتكاملة';
  const resolvedCompanyPhone = companySettings?.phone || '';
  const resolvedCompanyAddress = companySettings?.address || '';
  const resolvedCompanyTaxNumber = companySettings?.taxNumber || '';
  const resolvedCompanyLogo = companySettings?.logoData || '';

  // Scope Filter (All / By File / By Trade)
  const [selectedScope, setSelectedScope] = useState<string>('all');

  // Excel Branded Header Toggle (Default to false: Exports client's original workbook)
  const [includeCompanyHeaderInExcel, setIncludeCompanyHeaderInExcel] = useState(false);

  // Tax & Social Insurance controls
  const [includeVat, setIncludeVat] = useState(false);
  const [vatPercent, setVatPercent] = useState<number>(14);
  const [includeSocialInsurance, setIncludeSocialInsurance] = useState(true);
  const [socialInsurancePercent, setSocialInsurancePercent] = useState<number>(2.16); // 2.16% standard construction
  const [includeOfficeMargin, setIncludeOfficeMargin] = useState(true);
  const [officeMarginPercent, setOfficeMarginPercent] = useState<number>(5.0); // 5% contractor office & supervision

  // Available scopes (Files or Trades)
  const availableScopes = useMemo(() => {
    const scopes: { id: string; label: string; count: number; type: 'all' | 'file' | 'trade' }[] = [];
    
    // 1. All
    scopes.push({ id: 'all', label: 'كافة البنود (مجمع)', count: items.length, type: 'all' });

    // 2. Source Files / Sheets
    const fileMap = new Map<string, number>();
    items.forEach((it) => {
      const fileName = it.sourceFileName || it.sourceSheetName;
      if (fileName) {
        fileMap.set(fileName, (fileMap.get(fileName) || 0) + 1);
      }
    });

    if (fileMap.size > 1) {
      fileMap.forEach((count, fileName) => {
        scopes.push({
          id: `file:${fileName}`,
          label: `ملف: ${fileName}`,
          count,
          type: 'file',
        });
      });
    }

    // 3. Trades / Categories
    const tradeMap = new Map<string, number>();
    items.forEach((it) => {
      const tr = it.category || 'general';
      tradeMap.set(tr, (tradeMap.get(tr) || 0) + 1);
    });

    if (fileMap.size <= 1 && tradeMap.size > 1) {
      tradeMap.forEach((count, tr) => {
        scopes.push({
          id: `trade:${tr}`,
          label: TRADE_LABELS[tr] || tr,
          count,
          type: 'trade',
        });
      });
    }

    return scopes;
  }, [items]);

  // Filtered Items for active scope
  const displayedItems = useMemo(() => {
    if (selectedScope === 'all') return items;
    if (selectedScope.startsWith('file:')) {
      const fileName = selectedScope.replace('file:', '');
      return items.filter((it) => (it.sourceFileName || it.sourceSheetName) === fileName);
    }
    if (selectedScope.startsWith('trade:')) {
      const trade = selectedScope.replace('trade:', '');
      return items.filter((it) => (it.category || 'general') === trade);
    }
    return items;
  }, [items, selectedScope]);

  // Active Scope Label
  const activeScopeLabel = useMemo(() => {
    const found = availableScopes.find((s) => s.id === selectedScope);
    return found ? found.label : 'كافة البنود';
  }, [availableScopes, selectedScope]);

  // Financial Calculations for displayed items
  const baseContractValue = useMemo(() => {
    return displayedItems.reduce(
      (sum, item) => sum + Number(item.revisedQty || item.contractQty || 0) * Number(item.unitPrice || 0),
      0
    );
  }, [displayedItems]);

  const socialInsuranceAmount = includeSocialInsurance ? (baseContractValue * socialInsurancePercent) / 100 : 0;
  const officeMarginAmount = includeOfficeMargin ? (baseContractValue * officeMarginPercent) / 100 : 0;
  const subtotalBeforeVat = baseContractValue + socialInsuranceAmount + officeMarginAmount;
  const vatAmount = includeVat ? (subtotalBeforeVat * vatPercent) / 100 : 0;
  const finalTotalAmount = subtotalBeforeVat + vatAmount;

  // Printout & PDF Export
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = displayedItems.map((item, idx) => {
      const qty = Number(item.revisedQty || item.contractQty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const total = qty * unitPrice;
      const dir = getTextDirection(item.description);
      const isRtl = dir === 'rtl';

      return `
        <tr>
          <td style="text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="font-weight: 700; color: #170e5e; font-family: monospace; word-break: break-all;">${item.itemCode || '-'}</td>
          <td dir="${dir}" style="text-align: justify; text-justify: inter-word; text-align-last: ${isRtl ? 'right' : 'left'}; direction: ${dir}; line-height: 1.5; color: #1e293b; word-break: break-word; overflow-wrap: break-word; white-space: normal;">
            ${item.description}
            ${item.notes ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${item.notes}</div>` : ''}
          </td>
          <td style="text-align: center; white-space: nowrap;">${item.unit}</td>
          <td style="text-align: center; font-weight: 600; white-space: nowrap;">${qty.toLocaleString()}</td>
          <td style="text-align: right; font-weight: 600; white-space: nowrap;">${Math.round(unitPrice).toLocaleString('en-US')}</td>
          <td style="text-align: right; font-weight: 700; color: #170e5e; white-space: nowrap;">${Math.round(total).toLocaleString('en-US')}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>عرض سعر رسمي - ${projectName} (${activeScopeLabel})</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 14mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              padding: 0;
              margin: 0;
              color: #0f172a;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2.5px solid #170e5e;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .company-title {
              font-size: 18px;
              font-weight: 800;
              color: #170e5e;
              margin: 0;
            }
            .company-sub {
              font-size: 12px;
              color: #64748b;
              margin: 3px 0 0;
            }
            .doc-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 5px;
              background-color: #eef2ff;
              color: #170e5e;
              font-weight: 800;
              font-size: 12px;
              border: 1px solid #c7d2fe;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1.5fr 1.2fr 1fr;
              gap: 8px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 14px;
              font-size: 12px;
            }
            .meta-item span {
              color: #64748b;
              font-size: 11px;
              display: block;
            }
            .meta-item strong {
              color: #0f172a;
              font-size: 12.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
              page-break-inside: auto;
              table-layout: fixed;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            th {
              background-color: #170e5e !important;
              color: #ffffff !important;
              padding: 7px 8px;
              font-size: 11px;
              font-weight: 700;
              border: 1px solid #170e5e;
              text-align: right;
              -webkit-print-color-adjust: exact;
            }
            td {
              padding: 6px 8px;
              font-size: 11px;
              border: 1px solid #cbd5e1;
              vertical-align: middle;
            }
            .total-box {
              background-color: #f8fafc !important;
              border: 1.5px solid #cbd5e1;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 14px;
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #475569;
              padding: 3px 0;
            }
            .total-row strong {
              color: #0f172a;
            }
            .grand-total-row {
              display: flex;
              justify-content: space-between;
              border-top: 2px solid #170e5e;
              padding-top: 6px;
              margin-top: 4px;
              font-size: 14px;
              font-weight: 800;
              color: #170e5e;
            }
            .terms-box {
              background-color: #fafafa;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 18px;
              page-break-inside: avoid;
            }
            .terms-box h4 {
              margin: 0 0 4px;
              font-size: 11.5px;
              color: #1e293b;
            }
            .terms-box ul {
              margin: 0;
              padding-inline-start: 16px;
              font-size: 10.5px;
              color: #64748b;
              line-height: 1.5;
            }
            .signatures-box {
              display: flex;
              justify-content: space-between;
              padding-top: 14px;
              border-top: 1px solid #cbd5e1;
              page-break-inside: avoid;
            }
            .sig-col {
              text-align: center;
              min-width: 140px;
              font-size: 11px;
              color: #475569;
            }
            .sig-line {
              margin-top: 28px;
              border-bottom: 1px dashed #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${resolvedCompanyLogo ? `<img src="${resolvedCompanyLogo}" alt="Logo" style="max-height: 48px; max-width: 120px; object-fit: contain;" />` : ''}
              <div>
                <h1 class="company-title">${resolvedCompanyName}</h1>
                <p class="company-sub">${[resolvedCompanyPhone ? `هاتف: ${resolvedCompanyPhone}` : '', resolvedCompanyAddress ? `العنوان: ${resolvedCompanyAddress}` : '', resolvedCompanyTaxNumber ? `الرقم الضريبي: ${resolvedCompanyTaxNumber}` : ''].filter(Boolean).join('  |  ') || 'قسم العطاءات والمناقصات والمكتب الفني'}</p>
              </div>
            </div>
            <div style="text-align: left;">
              <div class="doc-badge">عرض سعر مالي رسمي</div>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span>اسم المشروع / العطاء:</span>
              <strong>${projectName}</strong>
            </div>
            <div class="meta-item">
              <span>الجهة المالكة / العميل:</span>
              <strong>${clientName}</strong>
            </div>
            <div class="meta-item">
              <span>الحزمة / النطاق:</span>
              <strong style="color: #170e5e;">${activeScopeLabel} (${displayedItems.length} بند)</strong>
            </div>
          </div>

          <table>
            <colgroup>
              <col style="width: 32px;" />
              <col style="width: 80px;" />
              <col style="width: auto;" />
              <col style="width: 50px;" />
              <col style="width: 65px;" />
              <col style="width: 85px;" />
              <col style="width: 95px;" />
            </colgroup>
            <thead>
              <tr>
                <th style="text-align: center;">م</th>
                <th style="text-align: center;">كود البند</th>
                <th>بيان الأعمال والمواصفات الفنية</th>
                <th style="text-align: center;">الوحدة</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: right;">سعر الفئة (${currency})</th>
                <th style="text-align: right;">الإجمالي (${currency})</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row">
              <span>إجمالي قيمة الأعمال التنفيذية الأساسية:</span>
              <strong>${Math.round(baseContractValue).toLocaleString('en-US')} ${currency}</strong>
            </div>
            ${includeSocialInsurance ? `
              <div class="total-row">
                <span>تأمينات اجتماعية على العملية (${socialInsurancePercent}%):</span>
                <strong>${Math.round(socialInsuranceAmount).toLocaleString('en-US')} ${currency}</strong>
              </div>
            ` : ''}
            ${includeOfficeMargin ? `
              <div class="total-row">
                <span>مصاريف مكتب المقاولات والإشراف الهندسي (${officeMarginPercent}%):</span>
                <strong>${Math.round(officeMarginAmount).toLocaleString('en-US')} ${currency}</strong>
              </div>
            ` : ''}
            ${includeVat ? `
              <div class="total-row">
                <span>ضريبة القيمة المضافة (${vatPercent}%):</span>
                <strong>${Math.round(vatAmount).toLocaleString('en-US')} ${currency}</strong>
              </div>
            ` : ''}
            <div class="grand-total-row">
              <span>إجمالي قيمة العرض المالي النهائي:</span>
              <span>${Math.round(finalTotalAmount).toLocaleString('en-US')} ${currency}</span>
            </div>
          </div>

          <div class="terms-box">
            <h4>الشروط والمحددات التعاقدية العامة:</h4>
            <ul>
              <li>الأسعار الموضحة أعلاه شاملة كافة مصاريف التوريد والمصنعيات والمعدات والإشراف الهندسي طبقاً لأصول الصناعة والمواصفات الفنية.</li>
              <li>الدفعة المقدمة المقترحة 10% تُخصم بنسب متساوية من المستخلصات الجارية.</li>
              <li>نسبة ضمان الأعمال (التأمين المحتجز) 5% تُصرف بعد مرور عام من تاريخ الاستلام الابتدائي للمشروع.</li>
              <li>مدة سريان هذا العرض 30 يوماً من تاريخ صدوره.</li>
            </ul>
          </div>

          <div class="signatures-box">
            <div class="sig-col">
              <span>إعداد المكتب الفني</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-col">
              <span>اعتماد المدير التنفيذي</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-col">
              <span>موافقة واعتماد المالك</span>
              <div class="sig-line"></div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Export Priced Excel (Branded Company Header or Original In-Place)
  const handleExportExcel = async () => {
    try {
      const distinctFiles = Array.from(
        new Set(displayedItems.map((i) => i.sourceFileName).filter(Boolean))
      ) as string[];

      const exportOptions = {
        projectName,
        clientName,
        scopeLabel: activeScopeLabel,
        includeCompanyHeader: includeCompanyHeaderInExcel,
        companyName: resolvedCompanyName,
        companyPhone: resolvedCompanyPhone,
        companyAddress: resolvedCompanyAddress,
        companyTaxNumber: resolvedCompanyTaxNumber,
        socialInsurancePercent: includeSocialInsurance ? socialInsurancePercent : 0,
        socialInsuranceAmount: includeSocialInsurance ? socialInsuranceAmount : 0,
        officeMarginPercent: includeOfficeMargin ? officeMarginPercent : 0,
        officeMarginAmount: includeOfficeMargin ? officeMarginAmount : 0,
        vatPercent: includeVat ? vatPercent : 0,
        vatAmount: includeVat ? vatAmount : 0,
        finalTotalAmount,
        currency,
      };

      if (!includeCompanyHeaderInExcel && distinctFiles.length > 1 && selectedScope === 'all') {
        let count = 0;
        for (const fileName of distinctFiles) {
          const fileItems = displayedItems.filter((it) => it.sourceFileName === fileName);
          await exportPricedBoqWorkbook(
            fileName,
            fileItems.map((it) => ({
              rawRowIdx: it.rawRowIdx,
              itemCode: it.itemCode,
              description: it.description,
              unit: it.unit,
              contractQty: Number(it.revisedQty || it.contractQty || 0),
              unitPrice: Number(it.unitPrice || 0),
              totalPrice: Number(it.revisedQty || it.contractQty || 0) * Number(it.unitPrice || 0),
              category: it.category,
              sourceFileName: it.sourceFileName,
              sourceSheetName: it.sourceSheetName,
            })),
            exportOptions
          );
          count++;
        }
        toast.success(`تم تصدير ${count} ملفات إكسيل مسعرة بنفس تنسيقات العملاء الأصلية بنجاح`);
      } else {
        let targetFileName = '';
        if (selectedScope.startsWith('file:')) {
          targetFileName = selectedScope.replace('file:', '');
        } else if (distinctFiles.length === 1) {
          targetFileName = distinctFiles[0];
        } else {
          const firstFile = displayedItems.find((i) => i.sourceFileName)?.sourceFileName;
          if (firstFile) targetFileName = firstFile;
        }

        await exportPricedBoqWorkbook(
          targetFileName || `${projectName}_مسعر`,
          displayedItems.map((it) => ({
            rawRowIdx: it.rawRowIdx,
            itemCode: it.itemCode,
            description: it.description,
            unit: it.unit,
            contractQty: Number(it.revisedQty || it.contractQty || 0),
            unitPrice: Number(it.unitPrice || 0),
            totalPrice: Number(it.revisedQty || it.contractQty || 0) * Number(it.unitPrice || 0),
            category: it.category,
            sourceFileName: it.sourceFileName,
            sourceSheetName: it.sourceSheetName,
          })),
          exportOptions
        );
        toast.success(
          includeCompanyHeaderInExcel
            ? 'تم تصدير عرض السعر الإكسيل الملون بهوية وترويسة الشركة بنجاح'
            : 'تم تصدير شيت العميل الأصلي المسعر بكامل تنسيقاته وديباجته بنجاح'
        );
      }
    } catch (err: any) {
      console.error('Failed to export priced excel:', err);
      toast.error('حدث خطأ أثناء تصدير ملف الإكسيل المسعر');
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const textLines = [
      `*عرض سعر رسمي للمقايسة والأعمال التنفيذية*`,
      `*المشروع:* ${projectName}`,
      `*العميل:* ${clientName}`,
      selectedScope !== 'all' ? `*الحزمة / النطاق:* ${activeScopeLabel}` : '',
      `*عدد البنود:* ${displayedItems.length} بند`,
      `---------------------------------`,
      `*قيمة الأعمال الأساسية:* ${baseContractValue.toLocaleString()} ${currency}`,
      includeSocialInsurance ? `*تأمينات اجتماعية على العملية (${socialInsurancePercent}%):* ${socialInsuranceAmount.toLocaleString()} ${currency}` : '',
      includeOfficeMargin ? `*مصاريف إشراف ومكتب المقاولات (${officeMarginPercent}%):* ${officeMarginAmount.toLocaleString()} ${currency}` : '',
      includeVat ? `*ضريبة القيمة المضافة (${vatPercent}%):* ${vatAmount.toLocaleString()} ${currency}` : `*الأسعار غير شاملة القيمة المضافة*`,
      `---------------------------------`,
      `*الإجمالي النهائي المطلوب:* ${finalTotalAmount.toLocaleString()} ${currency}`,
      `\nللاطلاع على تفاصيل البنود والمواصفات تم إرفاق نسخة العرض الرسمية.`,
    ].filter(Boolean);

    const fullMessage = encodeURIComponent(textLines.join('\n'));
    window.open(`https://wa.me/?text=${fullMessage}`, '_blank');
  };

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title="عرض سعر مالي رسمي للمالك والضرائب والتأمينات"
      subtitle="احتساب القيمة المضافة، وتأمينات المقاولة الاجتماعية، ومصاريف الإشراف مع تصدير إكسيل مسعر وطباعة PDF رسمية"
      width="min(1150px, 96vw)"
      minHeight="min(640px, 88vh)"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 'var(--font-body)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #10b981',
                backgroundColor: '#ecfdf5',
                color: '#047857',
                fontSize: 'var(--font-body)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <AppIcons.FileSpreadsheet size={16} />
              <span>تصدير إكسيل مسعر (Excel)</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#15803d',
                color: '#ffffff',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <AppIcons.Share2 size={16} />
              <span>واتساب (WhatsApp)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: 'var(--font-body)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <AppIcons.Printer size={16} />
              <span>طباعة وتصدير PDF رسمي</span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
        {/* Scope Selector Pills if multiple files or trades exist */}
        {availableScopes.length > 1 && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              اختر نطاق العرض للطباعة والتصدير:
            </span>
            {availableScopes.map((scope) => {
              const isSelected = selectedScope === scope.id;
              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setSelectedScope(scope.id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: isSelected ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#170e5e' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {scope.label} ({scope.count})
                </button>
              );
            })}
          </div>
        )}

        {/* Controls Card for VAT, Social Insurance, Office Margin & Excel Branding */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
          }}
        >
          {/* Social Insurance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={includeSocialInsurance}
                onChange={(e) => setIncludeSocialInsurance(e.target.checked)}
              />
              <span>تأمينات العملية الاجتماعية</span>
            </label>
            {includeSocialInsurance && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  step="0.01"
                  value={socialInsurancePercent}
                  onChange={(e) => setSocialInsurancePercent(parseFloat(e.target.value) || 0)}
                  style={{ width: '70px', height: '30px', padding: '0 6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                />
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>% (2.16% مباني / 3.6% تشطيب)</span>
              </div>
            )}
          </div>

          {/* Office Supervision Margin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={includeOfficeMargin}
                onChange={(e) => setIncludeOfficeMargin(e.target.checked)}
              />
              <span>مصاريف مكتب المقاولات والإشراف</span>
            </label>
            {includeOfficeMargin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  step="0.1"
                  value={officeMarginPercent}
                  onChange={(e) => setOfficeMarginPercent(parseFloat(e.target.value) || 0)}
                  style={{ width: '70px', height: '30px', padding: '0 6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                />
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>% أتعاب إشراف وضريبة أرباح</span>
              </div>
            )}
          </div>

          {/* VAT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
              />
              <span>إضافة ضريبة القيمة المضافة (VAT)</span>
            </label>
            {includeVat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  step="0.5"
                  value={vatPercent}
                  onChange={(e) => setVatPercent(parseFloat(e.target.value) || 0)}
                  style={{ width: '70px', height: '30px', padding: '0 6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                />
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>% القيمة المضافة (14%)</span>
              </div>
            )}
          </div>

          {/* Excel Company Branding Option */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={includeCompanyHeaderInExcel}
                onChange={(e) => setIncludeCompanyHeaderInExcel(e.target.checked)}
              />
              <span>تصدير كعرض سعر رسمي ملون بهوية الشركة</span>
            </label>
            <span style={{ fontSize: 'var(--font-micro)', color: includeCompanyHeaderInExcel ? '#170e5e' : '#15803d', fontWeight: 600 }}>
              {includeCompanyHeaderInExcel
                ? 'ملف إكسيل منسق وملون بترويسة الشركة وبنود العميل المنسقة'
                : 'شيت العميل الأصلي بكامل ألوانه وتنسيقاته وديباجته (المعتمد)'}
            </span>
          </div>
        </div>

        {/* Printable Quotation Document Container Preview */}
        <div
          ref={printRef}
          style={{
            padding: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
          dir="rtl"
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #170e5e',
              paddingBottom: '10px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {resolvedCompanyLogo && (
                <img
                  src={resolvedCompanyLogo}
                  alt="Company Logo"
                  style={{ maxHeight: '42px', maxWidth: '120px', objectFit: 'contain' }}
                />
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#170e5e' }}>
                  {resolvedCompanyName}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
                  {[resolvedCompanyPhone ? `هاتف: ${resolvedCompanyPhone}` : '', resolvedCompanyAddress ? `العنوان: ${resolvedCompanyAddress}` : '', resolvedCompanyTaxNumber ? `الرقم الضريبي: ${resolvedCompanyTaxNumber}` : ''].filter(Boolean).join('  |  ') || 'قسم العطاءات والمناقصات والمكتب الفني'}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#eef2ff',
                  color: '#170e5e',
                  fontWeight: 700,
                  fontSize: 'var(--font-badge)',
                }}
              >
                عرض سعر مالي رسمي
              </span>
              <p style={{ margin: '3px 0 0', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                التاريخ: {new Date().toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>

          {/* Project & Client Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1.2fr 1fr',
              gap: '10px',
              backgroundColor: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>اسم المشروع:</span>
              <strong style={{ display: 'block', fontSize: 'var(--font-body)', color: '#0f172a' }}>{projectName}</strong>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>الجهة المالكة / العميل:</span>
              <strong style={{ display: 'block', fontSize: 'var(--font-body)', color: '#0f172a' }}>{clientName}</strong>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>النطاق المعروض:</span>
              <strong style={{ display: 'block', fontSize: 'var(--font-body)', color: '#170e5e' }}>
                {activeScopeLabel} ({displayedItems.length} بند)
              </strong>
            </div>
          </div>

          {/* Items Table with Scrollable Modal View - Zero Horizontal Scroll Standard */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '280px', overflowY: 'auto', overflowX: 'hidden', marginBottom: '12px', backgroundColor: '#ffffff' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right' }}>
              <colgroup>
                <col style={{ width: '38px' }} />
                <col style={{ width: '85px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '50px' }} />
                <col style={{ width: '65px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '100px' }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ backgroundColor: '#170e5e', color: '#ffffff' }}>
                  <th style={{ padding: '6px 6px', fontSize: 'var(--font-table-head)', textAlign: 'center' }}>م</th>
                  <th style={{ padding: '6px 8px', fontSize: 'var(--font-table-head)' }}>كود البند</th>
                  <th style={{ padding: '6px 8px', fontSize: 'var(--font-table-head)' }}>بيان الأعمال والمواصفات</th>
                  <th style={{ padding: '6px 6px', fontSize: 'var(--font-table-head)', textAlign: 'center' }}>الوحدة</th>
                  <th style={{ padding: '6px 6px', fontSize: 'var(--font-table-head)', textAlign: 'center' }}>الكمية</th>
                  <th style={{ padding: '6px 8px', fontSize: 'var(--font-table-head)' }}>سعر الفئة</th>
                  <th style={{ padding: '6px 8px', fontSize: 'var(--font-table-head)' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item, idx) => {
                  const qty = Number(item.revisedQty || item.contractQty || 0);
                  const total = qty * Number(item.unitPrice || 0);
                  const dir = getTextDirection(item.description);
                  const isRtl = dir === 'rtl';

                  return (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 6px', fontSize: 'var(--font-body)', color: '#64748b', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontSize: '12px', fontWeight: 700, color: '#170e5e', wordBreak: 'break-all' }}>{item.itemCode || '-'}</td>
                      <td
                        dir={dir}
                        className="text-justify spec-description"
                        style={{
                          padding: '6px 8px',
                          fontSize: 'var(--font-body)',
                          color: '#1e293b',
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          textAlignLast: isRtl ? 'right' : 'left',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'normal',
                          direction: dir,
                        }}
                      >
                        {item.description}
                        {item.notes && (
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '6px 6px', fontSize: 'var(--font-body)', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.unit}</td>
                      <td style={{ padding: '6px 6px', fontSize: 'var(--font-body)', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>{qty.toLocaleString()}</td>
                      <td style={{ padding: '6px 8px', fontSize: 'var(--font-body)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {Math.round(Number(item.unitPrice)).toLocaleString('en-US')} {currency}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e', whiteSpace: 'nowrap' }}>
                        {Math.round(total).toLocaleString('en-US')} {currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Summary Box */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
              <span>إجمالي قيمة الأعمال التنفيذية الأساسية:</span>
              <strong style={{ color: '#0f172a' }}>{Math.round(baseContractValue).toLocaleString('en-US')} {currency}</strong>
            </div>

            {includeSocialInsurance && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
                <span>تأمينات اجتماعية على العملية ({socialInsurancePercent}%):</span>
                <strong style={{ color: '#0f172a' }}>{Math.round(socialInsuranceAmount).toLocaleString('en-US')} {currency}</strong>
              </div>
            )}

            {includeOfficeMargin && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
                <span>مصاريف مكتب المقاولات والإشراف الهندسي ({officeMarginPercent}%):</span>
                <strong style={{ color: '#0f172a' }}>{Math.round(officeMarginAmount).toLocaleString('en-US')} {currency}</strong>
              </div>
            )}

            {includeVat && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
                <span>ضريبة القيمة المضافة ({vatPercent}%):</span>
                <strong style={{ color: '#0f172a' }}>{Math.round(vatAmount).toLocaleString('en-US')} {currency}</strong>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #170e5e',
                paddingTop: '6px',
                marginTop: '2px',
                fontSize: 'var(--font-section-title)',
              }}
            >
              <strong style={{ color: '#170e5e' }}>إجمالي قيمة العرض المالي النهائي:</strong>
              <strong style={{ color: '#170e5e', fontSize: '1.15rem' }}>
                {Math.round(finalTotalAmount).toLocaleString('en-US')} {currency}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
