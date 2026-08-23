import { useState, useMemo } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import {
  PrinterIcon,
  ClipboardIcon,
  ShoppingCartIcon,
  SettingsIcon,
  PaletteIcon,
  BuildingIcon,
  UserIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  CheckCircleIcon,
  LightbulbIcon
} from '@/shared/components/icons/AppIcons';
import { buildQrSvg } from '@/lib/qrcode';
import { printSmallReceiptDocument, getSmallReceiptStyles } from '@/lib/small-receipt-printer';
import { escapeHtml } from '@/lib/browser/escape';

interface PresetData {
  name: string;
  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  headerCode: string;
  docTitle: string;
  docSubtitle: string;
  violationNo: string;
  offenderName: string;
  plateNo: string;
  licenseNo: string;
  licenseTypeAndDept: string;
  violations: string[];
  settlementNote: string;
  validityNote: string;
  date: string;
  time: string;
  officerName: string;
  officerDept: string;
  location: string;
  trafficDept: string;
  showSignature: boolean;
  signatureText: string;
  qrText: string;
  qrSize: number;
  widthMm: number;
  fontSizePx: number;
  marginMm: number;
  header1SizePx: number;
  headerSubSizePx: number;
  driverInfoSizePx: number;
  lineHeight: number;
  sectionGapPx: number;
  headerFontFamily: string;
  bodyFontFamily: string;
  makeHeaderSubBold: boolean;
}

const TRAFFIC_RECEIPT_PRESET: PresetData = {
  name: 'إيصال سحب رخصة مرور (مطابق للأصل 100%)',
  headerLine1: 'وزارة الداخلية',
  headerLine2: 'قطاع المرور والحماية المدنية',
  headerLine3: 'الإدارة العامه لنظم معلومات المرور',
  headerCode: 'T.I.T',
  docTitle: 'إيصال  سحب  رخصة',
  docSubtitle: '(تسيير)',
  violationNo: '691426070100059',
  offenderName: 'محمد احمد ابراهيم',
  plateNo: 'ص د ق - 5 9 5 8',
  licenseNo: '29202150300291',
  licenseTypeAndDept: 'خاصه - إدارة مرور بورسعيد',
  violations: ['ق 54: انتهاء رخصة التسيير'],
  settlementNote: 'لايجوز التصالح على المخالفة',
  validityNote: 'مدة صلاحية الإيصال: 7 أيام',
  date: '18-07-2026',
  time: '02:10',
  officerName: 'م. أ/ زياد محمد زغلول',
  officerDept: 'قطاع الشرق بمصر',
  location: 'قطاع الشرق بمصر الجديد',
  trafficDept: 'الإدارة العامه لمرور القاهرة',
  showSignature: true,
  signatureText: 'التوقيع: ............................',
  qrText: '691426070100059',
  qrSize: 68,
  widthMm: 58,
  fontSizePx: 10.5,
  marginMm: 0,
  header1SizePx: 12.5,
  headerSubSizePx: 10.5,
  driverInfoSizePx: 10.5,
  lineHeight: 1.4,
  sectionGapPx: 4,
  headerFontFamily: 'Tahoma',
  bodyFontFamily: 'Arial',
  makeHeaderSubBold: true,
};

const POS_MINI_RECEIPT_PRESET: PresetData = {
  name: 'إيصال كاشير تجاري مصغر (58 مم)',
  headerLine1: 'سوبر ماركت النور والتجارة',
  headerLine2: 'سجل تجاري: 48921 - بطاقة ضريبية: 92831',
  headerLine3: 'فرع مدينة نصر - هاتف: 01012345678',
  headerCode: 'POS-MINI-58',
  docTitle: 'فاتورة مبيعات مبسطة',
  docSubtitle: 'نقدي — كاشير: أحمد علي',
  violationNo: 'INV-2026-0941',
  offenderName: 'عميل نقدي سريع',
  plateNo: 'طاولة / كاونتر 3',
  licenseNo: 'الرقم الضريبي: 300921400',
  licenseTypeAndDept: 'طريقة الدفع: كاش (نقداً)',
  violations: [
    '1x عصير مانجو طازج — 35.00 ج.م',
    '2x كرواسون جبنة — 50.00 ج.م',
    '1x مياه معدنية 1.5 لتر — 10.00 ج.م',
    'الإجمالي: 95.00 ج.م (شامل الضريبة)',
  ],
  settlementNote: 'الأسعار شاملة ضريبة القيمة المضافة 14%',
  validityNote: 'الاستبدال والاسترجاع خلال 14 يوماً مع الفاتورة',
  date: '18-07-2026',
  time: '14:35',
  officerName: 'الكاشير: أحمد علي',
  officerDept: 'الوردية الصباحية - نقطة بيع 1',
  location: 'القاهرة - مدينة نصر',
  trafficDept: 'شكراً لزيارتكم — نتمنى لكم يوماً سعيداً',
  showSignature: false,
  signatureText: '',
  qrText: 'INV-2026-0941|95.00EGP|18-07-2026|سوبر ماركت النور',
  qrSize: 65,
  widthMm: 58,
  fontSizePx: 10.5,
  marginMm: 0,
  header1SizePx: 12.0,
  headerSubSizePx: 10.0,
  driverInfoSizePx: 10.5,
  lineHeight: 1.35,
  sectionGapPx: 4,
  headerFontFamily: 'Arial',
  bodyFontFamily: 'Arial',
  makeHeaderSubBold: false,
};

export function ReceiptTestPage() {
  const [headerLine1, setHeaderLine1] = useState(TRAFFIC_RECEIPT_PRESET.headerLine1);
  const [headerLine2, setHeaderLine2] = useState(TRAFFIC_RECEIPT_PRESET.headerLine2);
  const [headerLine3, setHeaderLine3] = useState(TRAFFIC_RECEIPT_PRESET.headerLine3);
  const [headerCode, setHeaderCode] = useState(TRAFFIC_RECEIPT_PRESET.headerCode);
  const [docTitle, setDocTitle] = useState(TRAFFIC_RECEIPT_PRESET.docTitle);
  const [docSubtitle, setDocSubtitle] = useState(TRAFFIC_RECEIPT_PRESET.docSubtitle);

  const [violationNo, setViolationNo] = useState(TRAFFIC_RECEIPT_PRESET.violationNo);
  const [offenderName, setOffenderName] = useState(TRAFFIC_RECEIPT_PRESET.offenderName);
  const [plateNo, setPlateNo] = useState(TRAFFIC_RECEIPT_PRESET.plateNo);
  const [licenseNo, setLicenseNo] = useState(TRAFFIC_RECEIPT_PRESET.licenseNo);
  const [licenseTypeAndDept, setLicenseTypeAndDept] = useState(TRAFFIC_RECEIPT_PRESET.licenseTypeAndDept);

  const [violations, setViolations] = useState<string[]>(TRAFFIC_RECEIPT_PRESET.violations);
  const [newViolationText, setNewViolationText] = useState('');

  const [settlementNote, setSettlementNote] = useState(TRAFFIC_RECEIPT_PRESET.settlementNote);
  const [validityNote, setValidityNote] = useState(TRAFFIC_RECEIPT_PRESET.validityNote);

  const [date, setDate] = useState(TRAFFIC_RECEIPT_PRESET.date);
  const [time, setTime] = useState(TRAFFIC_RECEIPT_PRESET.time);
  const [officerName, setOfficerName] = useState(TRAFFIC_RECEIPT_PRESET.officerName);
  const [officerDept, setOfficerDept] = useState(TRAFFIC_RECEIPT_PRESET.officerDept);
  const [location, setLocation] = useState(TRAFFIC_RECEIPT_PRESET.location);
  const [trafficDept, setTrafficDept] = useState(TRAFFIC_RECEIPT_PRESET.trafficDept);

  const [showSignature, setShowSignature] = useState(TRAFFIC_RECEIPT_PRESET.showSignature);
  const [signatureText, setSignatureText] = useState(TRAFFIC_RECEIPT_PRESET.signatureText);

  const [qrText, setQrText] = useState(TRAFFIC_RECEIPT_PRESET.qrText);
  const [qrSize, setQrSize] = useState(TRAFFIC_RECEIPT_PRESET.qrSize);

  const [widthMm, setWidthMm] = useState<number>(TRAFFIC_RECEIPT_PRESET.widthMm);
  const [fontSizePx, setFontSizePx] = useState<number>(TRAFFIC_RECEIPT_PRESET.fontSizePx);
  const [marginMm, setMarginMm] = useState<number>(TRAFFIC_RECEIPT_PRESET.marginMm);
  const [header1SizePx, setHeader1SizePx] = useState<number>(TRAFFIC_RECEIPT_PRESET.header1SizePx);
  const [headerSubSizePx, setHeaderSubSizePx] = useState<number>(TRAFFIC_RECEIPT_PRESET.headerSubSizePx);
  const [driverInfoSizePx, setDriverInfoSizePx] = useState<number>(TRAFFIC_RECEIPT_PRESET.driverInfoSizePx);
  const [lineHeight, setLineHeight] = useState<number>(TRAFFIC_RECEIPT_PRESET.lineHeight);
  const [sectionGapPx, setSectionGapPx] = useState<number>(TRAFFIC_RECEIPT_PRESET.sectionGapPx);
  const [headerFontFamily, setHeaderFontFamily] = useState<string>(TRAFFIC_RECEIPT_PRESET.headerFontFamily);
  const [bodyFontFamily, setBodyFontFamily] = useState<string>(TRAFFIC_RECEIPT_PRESET.bodyFontFamily);
  const [makeHeaderSubBold, setMakeHeaderSubBold] = useState<boolean>(TRAFFIC_RECEIPT_PRESET.makeHeaderSubBold);

  const [copied, setCopied] = useState(false);

  function applyPreset(preset: PresetData) {
    setHeaderLine1(preset.headerLine1);
    setHeaderLine2(preset.headerLine2);
    setHeaderLine3(preset.headerLine3);
    setHeaderCode(preset.headerCode);
    setDocTitle(preset.docTitle);
    setDocSubtitle(preset.docSubtitle);
    setViolationNo(preset.violationNo);
    setOffenderName(preset.offenderName);
    setPlateNo(preset.plateNo);
    setLicenseNo(preset.licenseNo);
    setLicenseTypeAndDept(preset.licenseTypeAndDept);
    setViolations([...preset.violations]);
    setSettlementNote(preset.settlementNote);
    setValidityNote(preset.validityNote);
    setDate(preset.date);
    setTime(preset.time);
    setOfficerName(preset.officerName);
    setOfficerDept(preset.officerDept);
    setLocation(preset.location);
    setTrafficDept(preset.trafficDept);
    setShowSignature(preset.showSignature);
    setSignatureText(preset.signatureText);
    setQrText(preset.qrText);
    setQrSize(preset.qrSize);
    setWidthMm(preset.widthMm);
    setFontSizePx(preset.fontSizePx);
    setMarginMm(preset.marginMm);
    setHeader1SizePx(preset.header1SizePx);
    setHeaderSubSizePx(preset.headerSubSizePx);
    setDriverInfoSizePx(preset.driverInfoSizePx);
    setLineHeight(preset.lineHeight);
    setSectionGapPx(preset.sectionGapPx);
    setHeaderFontFamily(preset.headerFontFamily);
    setBodyFontFamily(preset.bodyFontFamily);
    setMakeHeaderSubBold(preset.makeHeaderSubBold);
  }

  function handleSetCurrentDateTime() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hr = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setDate(`${d}-${m}-${y}`);
    setTime(`${hr}:${min}`);
  }

  function handleAddViolation() {
    if (!newViolationText.trim()) return;
    setViolations((prev) => [...prev, newViolationText.trim()]);
    setNewViolationText('');
  }

  function handleRemoveViolation(index: number) {
    setViolations((prev) => prev.filter((_, i) => i !== index));
  }

  // Generate SVG QR
  const qrSvg = useMemo(() => {
    return buildQrSvg(qrText || '691426070100059', { size: qrSize });
  }, [qrText, qrSize]);

  // ===== Pixel-perfect replica of the physical thermal receipt =====
  const receiptHtml = useMemo(() => {
    return `
      <div style="width: 100%; box-sizing: border-box; font-family: ${bodyFontFamily}, sans-serif; font-size: ${fontSizePx}px; line-height: ${lineHeight}; color: #000; direction: rtl; text-align: right; overflow: hidden;">

        <!-- ===== HEADER BLOCK ===== -->
        <div style="text-align: center; font-family: ${headerFontFamily}, sans-serif;">
          ${headerLine1 ? `<div style="font-size: ${header1SizePx}px; font-weight: bold;">${escapeHtml(headerLine1)}</div>` : ''}
          ${headerLine2 ? `<div style="font-size: ${headerSubSizePx}px; font-weight: ${makeHeaderSubBold ? 'bold' : 'normal'};">${escapeHtml(headerLine2)}</div>` : ''}
          ${headerLine3 ? `<div style="font-size: ${headerSubSizePx - 0.5}px; font-weight: ${makeHeaderSubBold ? 'bold' : 'normal'};">${escapeHtml(headerLine3)}</div>` : ''}
          ${headerCode ? `<div style="font-size: ${headerSubSizePx}px; font-weight: ${makeHeaderSubBold ? 'bold' : 'normal'}; margin-top: 2px;">${escapeHtml(headerCode)}</div>` : ''}
        </div>

        <div style="height: ${sectionGapPx}px;"></div>

        <!-- ===== DOCUMENT TITLE (centered) ===== -->
        <div style="text-align: center;">
          ${docTitle ? `<div style="font-size: ${fontSizePx}px;">${escapeHtml(docTitle)}</div>` : ''}
          ${docSubtitle ? `<div style="font-size: ${fontSizePx}px;">${escapeHtml(docSubtitle)}</div>` : ''}
        </div>

        <!-- ===== LINE 1: after (تسيير) ===== -->
        <div style="border-top: 1px solid #000; margin: 6px 0 4px 0;"></div>

        <!-- ===== VIOLATION NUMBER ROW (space-between) ===== -->
        ${violationNo ? `
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: ${fontSizePx}px;">
            <span>رقم المخالفة</span>
            <span style="direction: ltr;">${escapeHtml(violationNo)}</span>
          </div>
        ` : ''}

        <!-- ===== LINE 2: after رقم المخالفة ===== -->
        <div style="border-top: 1px solid #000; margin: 4px 0;"></div>

        <!-- ===== DRIVER & VEHICLE INFO (right-aligned, simple text) ===== -->
        <div style="font-size: ${driverInfoSizePx}px;">
          ${offenderName ? `<div style="margin-bottom: 1px;">إسم المخالف: ${escapeHtml(offenderName)}</div>` : ''}
          ${plateNo ? `<div style="margin-bottom: 0;">رقم المركبة: ${escapeHtml(plateNo)}</div>` : ''}
          ${plateNo ? `<div style="text-align: center; font-size: 8px; line-height: 8px; margin: 1px 0 3px 0;">-</div>` : ''}
        </div>

        <!-- ===== LICENSE ROW (space-between like violation number) ===== -->
        ${licenseNo ? `
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: ${driverInfoSizePx}px;">
            <span>رخصة القيادة:</span>
            <span style="direction: ltr;">${escapeHtml(licenseNo)}</span>
          </div>
        ` : ''}

        <!-- ===== LICENSE TYPE (right-aligned, overflow clips بورسعيد) ===== -->
        ${licenseTypeAndDept ? `<div style="font-size: ${driverInfoSizePx}px; white-space: nowrap; overflow: hidden;">${escapeHtml(licenseTypeAndDept)}</div>` : ''}

        <!-- ===== LINE 3: before المخالفات ===== -->
        <div style="border-top: 1px solid #000; margin: 4px 0;"></div>

        <!-- ===== VIOLATIONS SECTION ===== -->
        ${(violations.length > 0 || settlementNote || validityNote) ? `
          <div style="text-align: center; font-size: ${fontSizePx}px; letter-spacing: 2px; margin-bottom: 2px;">المـخـالـفـات</div>
          <div style="width: 48%; border-top: 1px solid #000; margin: 3px auto;"></div>

          ${violations.map((v) => `<div style="text-align: right; font-size: ${fontSizePx}px; padding: 2px 0;">${escapeHtml(v)}</div>`).join('')}

          <div style="border-top: 1px solid #000; margin: 4px 0;"></div>

          ${settlementNote ? `<div style="text-align: right; font-size: ${fontSizePx}px;">${escapeHtml(settlementNote)}</div>` : ''}
          <div style="height: 4px;"></div>
          ${validityNote ? `<div style="text-align: right; font-size: ${fontSizePx}px;">${escapeHtml(validityNote)}</div>` : ''}

          <div style="border-top: 1px solid #000; margin: 4px 0;"></div>
        ` : ''}

        <!-- ===== OFFICER & DATE SECTION (right-aligned) ===== -->
        <div style="font-size: ${fontSizePx}px;">
          ${date ? `<div>التاريخ: <span style="direction: ltr; display: inline-block;">${escapeHtml(date)}</span></div>` : ''}
          ${time ? `<div>الوقت: <span style="direction: ltr; display: inline-block;">${escapeHtml(time)}</span></div>` : ''}
          ${officerName ? `<div>محرر المخالفة: ${escapeHtml(officerName)}</div>` : ''}
          ${officerDept ? `<div>جهة محرر المخالفة: ${escapeHtml(officerDept)}</div>` : ''}
          ${location ? `<div>مكان المخالفة: ${escapeHtml(location)}</div>` : ''}
          ${trafficDept ? `<div>إدارة مرور: ${escapeHtml(trafficDept)}</div>` : ''}
          ${showSignature && signatureText ? `<div style="margin-top: 2px;">${escapeHtml(signatureText)}</div>` : ''}
        </div>

        <div style="height: 10px;"></div>

        <!-- ===== QR CODE (centered, small) ===== -->
        ${qrSvg ? `
          <div style="display: flex; justify-content: center; width: 100%; margin: 4px 0 2px 0;">
            ${qrSvg}
          </div>
        ` : ''}

      </div>
    `;
  }, [
    headerLine1, headerLine2, headerLine3, headerCode, docTitle, docSubtitle,
    violationNo, offenderName, plateNo, licenseNo, licenseTypeAndDept,
    violations, settlementNote, validityNote, date, time, officerName,
    officerDept, location, trafficDept, showSignature, signatureText, qrSvg, fontSizePx
  ]);

  function handlePrint() {
    printSmallReceiptDocument(receiptHtml, {
      title: docTitle || 'إيصال حراري',
      widthMm,
      fontSizePx,
      marginMm,
    });
  }

  function handleCopyHtml() {
    const fullHtml = `
      <style>${getSmallReceiptStyles({ widthMm, marginMm, fontSizePx })}</style>
      <div class="thermal-receipt-container">${receiptHtml}</div>
    `;
    navigator.clipboard.writeText(fullHtml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div dir="rtl" className="page-container stack gap-16" style={{ padding: '16px 20px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PrinterIcon size={24} color="#0f172a" />
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>مختبر الإيصالات الحرارية المصغرة (&lt; 8 سم)</h1>
            <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>
              المسار الخاص: /qz
            </span>
          </div>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
            تعديل الحقول والمقاسات واختبار مطابقة الإيصالات الحرارية الصغيرة (58mm / 50mm) للطباعة الفعلية.
          </p>
        </div>

        {/* Presets and Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={() => applyPreset(TRAFFIC_RECEIPT_PRESET)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ClipboardIcon size={16} /> نموذج إيصال المرور (مطابق للأصل 100%)
          </Button>
          <Button type="button" variant="secondary" onClick={() => applyPreset(POS_MINI_RECEIPT_PRESET)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCartIcon size={16} /> نموذج كاشير مصغر (58mm)
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint} style={{ fontWeight: 800, padding: '8px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <PrinterIcon size={16} color="#ffffff" /> طباعة فورية ({widthMm} مم)
          </Button>
        </div>
      </div>

      {/* Main Grid: Form on the Right / Left, Live Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.35fr) minmax(320px, 0.85fr)', gap: 20, alignItems: 'start' }}>
        
        {/* Form Controls Column */}
        <div className="stack gap-16">
          
          {/* Card 1: Thermal Paper & Size Settings */}
          <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><SettingsIcon size={18} /> إعدادات مقاس الورق والخط للطباعة</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 10 }}>
              <Field label="عرض الورق (Paper Width)">
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="input"
                    value={widthMm}
                    onChange={(e) => setWidthMm(Number(e.target.value))}
                    style={{ fontWeight: 700 }}
                  >
                    <option value={48}>48 مم (Micro POS)</option>
                    <option value={50}>50 مم (Mini)</option>
                    <option value={57}>57 مم (Mobile POS)</option>
                    <option value={58}>58 مم (قياسي كاشير صغير - الموصى به)</option>
                    <option value={72}>72 مم</option>
                    <option value={80}>80 مم (قياسي عادي)</option>
                  </select>
                </div>
              </Field>

              <Field label="حجم الخط الأساسي">
                <select
                  className="input"
                  value={fontSizePx}
                  onChange={(e) => setFontSizePx(Number(e.target.value))}
                  style={{ fontWeight: 700 }}
                >
                  <option value={9.5}>9.5px (مضغوط)</option>
                  <option value={10}>10px (صغير)</option>
                  <option value={10.5}>10.5px (القياسي المطابق للصورة بالملي)</option>
                  <option value={11.5}>11.5px (واضح)</option>
                  <option value={12.5}>12.5px (كبير)</option>
                </select>
              </Field>

              <Field label="الهامش الخارجي (Margins)">
                <select
                  className="input"
                  value={marginMm}
                  onChange={(e) => setMarginMm(Number(e.target.value))}
                  style={{ fontWeight: 700 }}
                >
                  <option value={0}>0 مم (بدون هوامش - مطابق للإيصال الأصلي)</option>
                  <option value={1}>1 مم (هوامش خفيفة)</option>
                  <option value={2}>2 مم</option>
                  <option value={4}>4 مم</option>
                </select>
              </Field>

              <Field label="حجم الـ QR Code">
                <select
                  className="input"
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  style={{ fontWeight: 700 }}
                >
                  <option value={48}>صغير جداً (48px)</option>
                  <option value={58}>مطابق للأصل بالملي (58px - الافتراضي)</option>
                  <option value={70}>متوسط (70px)</option>
                  <option value={85}>كبير (85px)</option>
                </select>
              </Field>
            </div>
          </Card>

          {/* NEW CARD: Advanced Styling */}
          <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><PaletteIcon size={18} /> التحكم المتقدم بالتصميم (مسافات وخطوط)</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 10 }}>
              <Field label="تباعد الأسطر (Line Height)">
                <input type="number" step="0.05" className="input" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} />
              </Field>
              <Field label="حجم خط العنوان (وزارة الداخلية)">
                <input type="number" step="0.5" className="input" value={header1SizePx} onChange={(e) => setHeader1SizePx(Number(e.target.value))} />
              </Field>
              <Field label="حجم خط العناوين الفرعية">
                <input type="number" step="0.5" className="input" value={headerSubSizePx} onChange={(e) => setHeaderSubSizePx(Number(e.target.value))} />
              </Field>
              <Field label="خط العناوين الفرعية عريض (Bold)؟">
                <select className="input" value={makeHeaderSubBold ? 'yes' : 'no'} onChange={(e) => setMakeHeaderSubBold(e.target.value === 'yes')}>
                  <option value="yes">نعم (Bold)</option>
                  <option value="no">لا (عادي)</option>
                </select>
              </Field>
              <Field label="عائلة خط العنوان">
                <select className="input" value={headerFontFamily} onChange={(e) => setHeaderFontFamily(e.target.value)}>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Arial">Arial</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </Field>
              <Field label="عائلة خط الإيصال (الأساسي)">
                <select className="input" value={bodyFontFamily} onChange={(e) => setBodyFontFamily(e.target.value)}>
                  <option value="Arial">Arial</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </Field>
              <Field label="المسافة بين الأقسام (Gap)">
                <input type="number" step="1" className="input" value={sectionGapPx} onChange={(e) => setSectionGapPx(Number(e.target.value))} />
              </Field>
            </div>
          </Card>

          {/* Card 2: Header Information */}
          <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><BuildingIcon size={18} /> بيانات الترويسة والعنوان</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <Field label="سطر الترويسة 1">
                <input className="input" value={headerLine1} onChange={(e) => setHeaderLine1(e.target.value)} />
              </Field>
              <Field label="سطر الترويسة 2">
                <input className="input" value={headerLine2} onChange={(e) => setHeaderLine2(e.target.value)} />
              </Field>
              <Field label="سطر الترويسة 3">
                <input className="input" value={headerLine3} onChange={(e) => setHeaderLine3(e.target.value)} />
              </Field>
              <Field label="رمز الجهة / الكود">
                <input className="input" value={headerCode} onChange={(e) => setHeaderCode(e.target.value)} />
              </Field>
              <Field label="عنوان المستند الرئيسي">
                <input className="input" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} style={{ fontWeight: 700 }} />
              </Field>
              <Field label="العنوان الفرعي / التصنيف">
                <input className="input" value={docSubtitle} onChange={(e) => setDocSubtitle(e.target.value)} />
              </Field>
            </div>
          </Card>

          {/* Card 3: Violation & Driver / Subject Info */}
          <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><UserIcon size={18} /> بيانات المخالفة / المركبة / العميل</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <Field label="رقم المخالفة / الإيصال">
                <input className="input" value={violationNo} onChange={(e) => setViolationNo(e.target.value)} style={{ fontFamily: 'Arial', fontWeight: 'bold' }} />
              </Field>
              <Field label="اسم المخالف / المستلم">
                <input className="input" value={offenderName} onChange={(e) => setOffenderName(e.target.value)} />
              </Field>
              <Field label="رقم المركبة / اللوحة">
                <input className="input" value={plateNo} onChange={(e) => setPlateNo(e.target.value)} />
              </Field>
              <Field label="رقم رخصة القيادة / القومي">
                <input className="input" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} style={{ fontFamily: 'Arial' }} />
              </Field>
              <div style={{ gridColumn: 'span 2' }}>
                <Field label="نوع الرخصة والإدارة المصدرة">
                  <input className="input" value={licenseTypeAndDept} onChange={(e) => setLicenseTypeAndDept(e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          {/* Card 4: Violations / Items list */}
          <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><FileTextIcon size={18} /> بنود المخالفات / التفاصيل المسجلة</span>}>
            <div style={{ marginTop: 10 }} className="stack gap-10">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="أدخل نص البند أو المخالفة (مثلاً: ق 54: انتهاء رخصة التسيير)"
                  value={newViolationText}
                  onChange={(e) => setNewViolationText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddViolation(); }}
                  style={{ flex: 1 }}
                />
                <Button type="button" variant="secondary" onClick={handleAddViolation}>
                  + إضافة بند
                </Button>
              </div>

              <div className="stack gap-6">
                {violations.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--color-surface, #f8fafc)',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.9rem'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveViolation(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 700,
                        padding: '2px 6px'
                      }}
                      title="حذف البند"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <Field label="تنبيه التصالح / الملاحظة 1">
                  <input className="input" value={settlementNote} onChange={(e) => setSettlementNote(e.target.value)} />
                </Field>
                <Field label="مدة الصلاحية / الملاحظة 2">
                  <input className="input" value={validityNote} onChange={(e) => setValidityNote(e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          {/* Card 5: Officer, Date & Location */}
          <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><ShieldCheckIcon size={18} /> بيانات المحرر والزمان والمكان</span>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <Field label="التاريخ">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                  <Button type="button" variant="secondary" onClick={handleSetCurrentDateTime} style={{ whiteSpace: 'nowrap' }}>
                    الآن
                  </Button>
                </div>
              </Field>
              <Field label="الوقت">
                <input className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <Field label="محرر المخالفة / الموظف">
                <input className="input" value={officerName} onChange={(e) => setOfficerName(e.target.value)} />
              </Field>
              <Field label="جهة محرر المخالفة">
                <input className="input" value={officerDept} onChange={(e) => setOfficerDept(e.target.value)} />
              </Field>
              <Field label="مكان المخالفة / الموقع">
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
              </Field>
              <Field label="إدارة المرور / الفرع">
                <input className="input" value={trafficDept} onChange={(e) => setTrafficDept(e.target.value)} />
              </Field>
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} />
                  إظهار خانة التوقيع
                </label>
                {showSignature && (
                  <input
                    className="input"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    style={{ flex: 1 }}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Card 6: QR Code */}
          <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><SmartphoneIcon size={18} /> رمز الاستجابة السريعة (QR Code)</span>}>
            <div style={{ marginTop: 10 }}>
              <Field label="محتوى / نص رمز الـ QR (الافتراضي مطابق لرقم المخالفة)">
                <textarea
                  className="input"
                  rows={2}
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="أدخل النص أو الرقم المراد تشفيره داخل الـ QR"
                  style={{ fontFamily: 'Arial', fontSize: '0.85rem' }}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* Live Thermal Preview Column */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            {/* Preview Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>المعاينة الحية:</span>
                <span style={{ background: '#1e293b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}>
                  {widthMm} مم
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <Button type="button" variant="secondary" onClick={handleCopyHtml} style={{ fontSize: '0.82rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {copied ? <><CheckCircleIcon size={14} color="#16a34a" /> تم النسخ!</> : <><ClipboardIcon size={14} /> نسخ HTML</>}
                </Button>
                <Button type="button" variant="primary" onClick={handlePrint} style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <PrinterIcon size={14} color="#ffffff" /> طباعة
                </Button>
              </div>
            </div>

            {/* Thermal Paper Roll Simulation */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                background: '#334155',
                borderRadius: 8,
                padding: '24px 12px',
                overflowX: 'auto',
                minHeight: 520,
              }}
            >
              {/* Paper Roll Effect */}
              <div
                style={{
                  width: `${widthMm}mm`,
                  maxWidth: '100%',
                  background: '#ffffff',
                  color: '#000000',
                  padding: '3mm 4mm',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.45), 0 0 2px rgba(0,0,0,0.2)',
                  fontFamily: "'Arial', 'Helvetica', 'Tahoma', sans-serif",
                  fontSize: `${fontSizePx}px`,
                  lineHeight: 1.25,
                  direction: 'rtl',
                  textAlign: 'right',
                  boxSizing: 'border-box',
                }}
              >
                {/* Rendered Content */}
                <div dangerouslySetInnerHTML={{ __html: receiptHtml }} />
              </div>
            </div>

            {/* Paper Info Note */}
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <LightbulbIcon size={16} color="#eab308" /> المعاينة والطباعة مطابقة بنسبة 100% بالمليمتر لشكل الإيصال الحقيقي وحجم الباركود.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
