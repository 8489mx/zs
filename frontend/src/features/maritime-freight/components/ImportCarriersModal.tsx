import { useState, useRef, useId } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { downloadExcelFile } from '@/lib/browser';
import { maritimeApi } from '../api/maritime-freight.api';

interface ImportCarriersModalProps {
  open: boolean;
  defaultType?: 'shipping_line' | 'overseas_agent';
  onClose: () => void;
  onSuccess: () => void;
}

interface ColumnMappingState {
  codeCol: string;
  nameArCol: string;
  nameEnCol: string;
  countryNameCol: string;
  cityNameCol: string;
  contactPersonCol: string;
  emailCol: string;
  rfqEmailCol: string;
  bookingEmailCol: string;
  phoneCol: string;
  whatsappCol: string;
  wechatCol: string;
  tradeLanesCol: string;
  servicesOfferedCol: string;
  trackingUrlCol: string;
}

export function ImportCarriersModal({
  open,
  defaultType = 'shipping_line',
  onClose,
  onSuccess,
}: ImportCarriersModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const [carrierType, setCarrierType] = useState<'shipping_line' | 'overseas_agent'>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingState>({
    codeCol: '',
    nameArCol: '',
    nameEnCol: '',
    countryNameCol: '',
    cityNameCol: '',
    contactPersonCol: '',
    emailCol: '',
    rfqEmailCol: '',
    bookingEmailCol: '',
    phoneCol: '',
    whatsappCol: '',
    wechatCol: '',
    tradeLanesCol: '',
    servicesOfferedCol: '',
    trackingUrlCol: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    insertedCount: number;
    updatedCount: number;
    totalProcessed: number;
    summary: string;
  } | null>(null);

  // Auto-detect columns based on header strings
  const autoMapHeaders = (detectedHeaders: string[], _type: 'shipping_line' | 'overseas_agent'): ColumnMappingState => {
    const findMatch = (patterns: string[]): string => {
      for (const pattern of patterns) {
        const found = detectedHeaders.find(
          (h) =>
            h.trim().toLowerCase() === pattern.toLowerCase() ||
            h.trim().toLowerCase().includes(pattern.toLowerCase())
        );
        if (found) return found;
      }
      return '';
    };

    return {
      codeCol: findMatch(['رمز', 'كود', 'code', 'carrier_code', 'line_code', 'agent_code', 'scac', 'iata']),
      nameArCol: findMatch(['اسم الخط', 'اسم الوكيل', 'الاسم بالعربي', 'اسم الشركة', 'name_ar', 'name', 'company_name']),
      nameEnCol: findMatch(['الاسم بالانجليزي', 'english_name', 'name_en', 'company_en', 'line_en']),
      countryNameCol: findMatch(['الدولة', 'البلد', 'country', 'country_name', 'nation']),
      cityNameCol: findMatch(['المدينة', 'city', 'city_name', 'location']),
      contactPersonCol: findMatch(['المسؤول', 'جهة الاتصال', 'الشخص المسؤول', 'contact', 'contact_person', 'pic']),
      emailCol: findMatch(['البريد', 'إيميل', 'ايميل', 'email', 'mail']),
      rfqEmailCol: findMatch(['إيميل الأسعار', 'ايميل التسعير', 'rfq_email', 'rate_email', 'quote_email']),
      bookingEmailCol: findMatch(['إيميل الحجز', 'ايميل الحجوزات', 'booking_email', 'booking']),
      phoneCol: findMatch(['الهاتف', 'الموبايل', 'تليفون', 'phone', 'tel', 'mobile']),
      whatsappCol: findMatch(['واتساب', 'واتس', 'whatsapp', 'wa']),
      wechatCol: findMatch(['ويشات', 'وي شات', 'wechat', 'wx']),
      tradeLanesCol: findMatch(['الخطوط الملاحية', 'المسارات', 'trade_lanes', 'lanes', 'routes']),
      servicesOfferedCol: findMatch(['الخدمات', 'التخصص', 'services', 'services_offered', 'activities']),
      trackingUrlCol: findMatch(['تتبع', 'رابط التتبع', 'tracking_url', 'tracking', 'trace']),
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const processFile = async (selectedFile: File) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setImportResult(null);
      setFile(selectedFile);

      const XLSX = await import('xlsx');
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على أي صفحات بيانات');
      }

      setSheetNames(workbook.SheetNames);
      const firstSheet = workbook.SheetNames[0];
      setSelectedSheet(firstSheet);

      parseSheet(XLSX, workbook, firstSheet);
    } catch (err: any) {
      console.error('File parsing failed:', err);
      setErrorMessage(err?.message || 'فشل قراءة الملف. يرجى التأكد من سلامة صيغة Excel أو CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSheet = (XLSX: any, workbook: any, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const json = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    }) as Record<string, any>[];

    if (json.length === 0) {
      setHeaders([]);
      setRawRows([]);
      return;
    }

    const detectedHeaders = Object.keys(json[0] || {});
    setHeaders(detectedHeaders);
    setRawRows(json);

    const newMapping = autoMapHeaders(detectedHeaders, carrierType);
    setColumnMapping(newMapping);
  };

  const handleSheetChange = async (newSheet: string) => {
    if (!file) return;
    setSelectedSheet(newSheet);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      parseSheet(XLSX, workbook, newSheet);
    } catch (err: any) {
      setErrorMessage('فشل قراءة الصفحة المحددة');
    }
  };

  const handleDownloadSampleTemplate = async () => {
    if (carrierType === 'shipping_line') {
      const templateHeaders = [
        'رمز الخط (Code)',
        'اسم الخط بالعربي (Name Ar)',
        'الاسم بالإنجليزي (Name En)',
        'إيميل عروض الأسعار (RFQ Email)',
        'إيميل الحجز (Booking Email)',
        'الهاتف (Phone)',
        'جهة الاتصال (Contact Person)',
        'الخطوط والمسارات (Trade Lanes)',
        'رابط التتبع (Tracking URL)',
      ];
      const sampleRows = [
        [
          'MSC',
          'شركة إم إس سي للشحن البحري',
          'Mediterranean Shipping Company',
          'egy-rates@msc.com',
          'egy-bookings@msc.com',
          '+20 3 488 4000',
          'فريق تسعير الحاويات',
          'far_east,europe_med,americas',
          'https://www.msc.com/en/track-a-shipment?query={booking_or_bl}',
        ],
        [
          'MAERSK',
          'ميرسك لاين',
          'Maersk Line A/S',
          'egypt.quotes@maersk.com',
          'egypt.bookings@maersk.com',
          '+20 2 2461 3000',
          'مكتب خدمة العملاء والأسعار',
          'far_east,europe_med,arabian_gulf',
          'https://www.maersk.com/tracking/{booking_or_bl}',
        ],
      ];
      await downloadExcelFile('قالب_استيراد_خطوط_الشحن_البحري.xlsx', templateHeaders, sampleRows);
    } else {
      const templateHeaders = [
        'كود الوكيل (Code)',
        'اسم الوكيل بالعربي (Name Ar)',
        'الاسم بالإنجليزي (Name En)',
        'الدولة (Country)',
        'المدينة (City)',
        'جهة الاتصال (Contact Person)',
        'البريد الإلكتروني (Email)',
        'الهاتف (Phone)',
        'واتساب (WhatsApp)',
        'وي شات (WeChat)',
        'الخدمات (Services)',
      ];
      const sampleRows = [
        [
          'SINOTRANS-SH',
          'سينوترانس شنغهاي - شريك WCA',
          'Sinotrans Logistics Shanghai',
          'الصين',
          'Shanghai',
          'Mr. Zhang Wei',
          'sha-forwarding@sinotrans.com',
          '+86 21 6329 8888',
          '+86 138 0000 1111',
          'sinotrans_sha_ops',
          'شحن بحري FCL/LCL وتخليص جمركي وتجميع شحنات',
        ],
        [
          'EKOL-IST',
          'إيكول لوجستيك إسطنبول',
          'Ekol Logistics Turkey',
          'تركيا',
          'Istanbul',
          'Murat Yilmaz',
          'turkey.ocean@ekol.com',
          '+90 216 564 3000',
          '+90 532 111 2233',
          '',
          'شحن بحري وجوي وتخزين ترانزيت ونقل بري دولي',
        ],
      ];
      await downloadExcelFile('قالب_استيراد_وكلاء_الشحن_الدوليين.xlsx', templateHeaders, sampleRows);
    }
  };

  const getMappedItems = () => {
    return rawRows.map((row, idx) => {
      const code = String(row[columnMapping.codeCol] || '').trim().toUpperCase() || `AUTO_${idx + 1}`;
      const nameAr = String(row[columnMapping.nameArCol] || '').trim();
      const nameEn = String(row[columnMapping.nameEnCol] || '').trim() || nameAr;
      const countryName = String(row[columnMapping.countryNameCol] || '').trim();
      const cityName = String(row[columnMapping.cityNameCol] || '').trim();
      const contactPerson = String(row[columnMapping.contactPersonCol] || '').trim();
      const email = String(row[columnMapping.emailCol] || '').trim();
      const rfqEmail = String(row[columnMapping.rfqEmailCol] || '').trim() || email;
      const bookingEmail = String(row[columnMapping.bookingEmailCol] || '').trim();
      const phone = String(row[columnMapping.phoneCol] || '').trim();
      const whatsapp = String(row[columnMapping.whatsappCol] || '').trim();
      const wechat = String(row[columnMapping.wechatCol] || '').trim();
      const tradeLanes = String(row[columnMapping.tradeLanesCol] || '').trim();
      const servicesOffered = String(row[columnMapping.servicesOfferedCol] || '').trim();
      const trackingUrl = String(row[columnMapping.trackingUrlCol] || '').trim();

      const isValid = Boolean(nameAr && (code || nameEn));

      return {
        code,
        nameAr,
        nameEn,
        carrierType,
        countryName: countryName || null,
        cityName: cityName || null,
        contactPerson: contactPerson || null,
        email: email || null,
        rfqEmail: rfqEmail || null,
        bookingEmail: bookingEmail || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        wechat: wechat || null,
        tradeLanes: tradeLanes || null,
        servicesOffered: servicesOffered || null,
        trackingUrl: trackingUrl || null,
        isValid,
      };
    });
  };

  const mappedItems = getMappedItems();
  const validItems = mappedItems.filter((i) => i.isValid);

  const handleExecuteImport = async () => {
    if (validItems.length === 0) {
      setErrorMessage('لا توجد سجلات صالحة للاستيراد. تأكد من مطابقة عمود الاسم بالعربي والرمز.');
      return;
    }

    try {
      setImporting(true);
      setErrorMessage(null);
      const result = await maritimeApi.importCarriersBulk(validItems);
      setImportResult(result);
      onSuccess();
    } catch (err: any) {
      console.error('Bulk import failed:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء معالجة الاستيراد في قاعدة البيانات');
    } finally {
      setImporting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="استيراد البيانات المرجعية من ملف Excel أو CSV"
      subtitle="سحب واستيراد خطوط الملاحة والوكلاء المعتمدين عالمياً (WCA / Directories) بضغطة زر واحدة"
      maxWidth="850px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* شريط اختيار نوع البيانات + تحميل النموذج الاسترشادي */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
              البيانات المستهدفة:
            </span>
            <button
              type="button"
              onClick={() => {
                setCarrierType('shipping_line');
                if (headers.length > 0) setColumnMapping(autoMapHeaders(headers, 'shipping_line'));
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: carrierType === 'shipping_line' ? 700 : 500,
                background: carrierType === 'shipping_line' ? '#170e5e' : '#ffffff',
                color: carrierType === 'shipping_line' ? '#ffffff' : '#475569',
                border: `1px solid ${carrierType === 'shipping_line' ? '#170e5e' : '#cbd5e1'}`,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.Ship size={14} />
              <span>خطوط ملاحة بحرية (Shipping Lines)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCarrierType('overseas_agent');
                if (headers.length > 0) setColumnMapping(autoMapHeaders(headers, 'overseas_agent'));
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: carrierType === 'overseas_agent' ? 700 : 500,
                background: carrierType === 'overseas_agent' ? '#170e5e' : '#ffffff',
                color: carrierType === 'overseas_agent' ? '#ffffff' : '#475569',
                border: `1px solid ${carrierType === 'overseas_agent' ? '#170e5e' : '#cbd5e1'}`,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.Globe size={14} />
              <span>وكلاء شحن دوليون (Overseas Forwarders / WCA)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSampleTemplate}
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcons.Download size={13} />
            <span>تحميل نموذج Excel استرشادي</span>
          </button>
        </div>

        {/* مساحة رفع الملف (Dropzone) */}
        {!rawRows.length ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                processFile(e.dataTransfer.files[0]);
              }
            }}
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '36px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              aria-label="تحميل ملف إكسيل أو CSV لاستيراد البيانات المرجعية"
            />
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#e0e7ff',
                color: '#170e5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcons.Upload size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                اضغط هنا لاختيار ملف أو اسحب الملف إلى هذه المساحة
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                يدعم صيغ Excel (.xlsx, .xls) والملفات النصية المفصولة بفواصل (.csv)
              </div>
            </div>
            {isProcessing && (
              <div style={{ fontSize: '0.78rem', color: '#170e5e', fontWeight: 600 }}>
                جاري قراءة وتحليل بيانات الملف...
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: '#15803d' }}>
                <AppIcons.FileSpreadsheet size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#166534' }}>
                  {file?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                  تم استخراج {rawRows.length} صف من الملف بنجاح
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sheetNames.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#1e293b' }}>الصفحة:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      background: '#ffffff',
                    }}
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setRawRows([]);
                  setHeaders([]);
                  setImportResult(null);
                }}
                style={{
                  padding: '4px 10px',
                  background: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                تغيير الملف
              </button>
            </div>
          </div>
        )}

        {/* رسائل التنبيه والخطأ */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AppIcons.AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* رسالة نجاح الاستيراد */}
        {importResult && (
          <div
            style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              color: '#166534',
              fontSize: '0.84rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <AppIcons.CheckCircle size={18} />
              <span>{importResult.summary}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
              تم إدراج {importResult.insertedCount} جهة جديدة وتحديث {importResult.updatedCount} جهة موجودة مسبقاً.
            </div>
          </div>
        )}

        {/* مطابقة الأعمدة (Column Mapping) في حال وجود ملف */}
        {rawRows.length > 0 && (
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                مطابقة الأعمدة (Column Mapping)
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                تم التعرف تلقائياً على الأعمدة ويمكنك تعديلها يدوياً
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '10px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  الرمز أو الكود <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={columnMapping.codeCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, codeCol: e.target.value })}
                  style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                >
                  <option value="">-- اختر عمود الكود --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  الاسم بالعربي <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={columnMapping.nameArCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, nameArCol: e.target.value })}
                  style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                >
                  <option value="">-- اختر عمود الاسم بالعربي --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  الاسم بالإنجليزي
                </label>
                <select
                  value={columnMapping.nameEnCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, nameEnCol: e.target.value })}
                  style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                >
                  <option value="">-- اختياري (مطابق للاسم) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {carrierType === 'overseas_agent' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                      الدولة
                    </label>
                    <select
                      value={columnMapping.countryNameCol}
                      onChange={(e) => setColumnMapping({ ...columnMapping, countryNameCol: e.target.value })}
                      style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                    >
                      <option value="">-- اختياري --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                      المدينة
                    </label>
                    <select
                      value={columnMapping.cityNameCol}
                      onChange={(e) => setColumnMapping({ ...columnMapping, cityNameCol: e.target.value })}
                      style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                    >
                      <option value="">-- اختياري --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  جهة الاتصال / المسؤول
                </label>
                <select
                  value={columnMapping.contactPersonCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, contactPersonCol: e.target.value })}
                  style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                >
                  <option value="">-- اختياري --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  البريد الإلكتروني / RFQ Email
                </label>
                <select
                  value={carrierType === 'shipping_line' ? columnMapping.rfqEmailCol : columnMapping.emailCol}
                  onChange={(e) => {
                    if (carrierType === 'shipping_line') {
                      setColumnMapping({ ...columnMapping, rfqEmailCol: e.target.value });
                    } else {
                      setColumnMapping({ ...columnMapping, emailCol: e.target.value });
                    }
                  }}
                  style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                >
                  <option value="">-- اختياري --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  الهاتف
                </label>
                <select
                  value={columnMapping.phoneCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, phoneCol: e.target.value })}
                  style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                >
                  <option value="">-- اختياري --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {carrierType === 'overseas_agent' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                      واتساب (WhatsApp)
                    </label>
                    <select
                      value={columnMapping.whatsappCol}
                      onChange={(e) => setColumnMapping({ ...columnMapping, whatsappCol: e.target.value })}
                      style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                    >
                      <option value="">-- اختياري --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                      وي شات (WeChat ID)
                    </label>
                    <select
                      value={columnMapping.wechatCol}
                      onChange={(e) => setColumnMapping({ ...columnMapping, wechatCol: e.target.value })}
                      style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                    >
                      <option value="">-- اختياري --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    رابط التتبع (Tracking URL)
                  </label>
                  <select
                    value={columnMapping.trackingUrlCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, trackingUrlCol: e.target.value })}
                    style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                  >
                    <option value="">-- اختياري --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* جدول المعاينة السريعة (Preview Table) */}
        {mappedItems.length > 0 && (
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                padding: '8px 14px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                معاينة أولية للصفوف المستوردة ({validItems.length} من أصل {mappedItems.length} صف صالح)
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: validItems.length > 0 ? '#15803d' : '#dc2626',
                  background: validItems.length > 0 ? '#f0fdf4' : '#fef2f2',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: `1px solid ${validItems.length > 0 ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                {validItems.length} صالح للاستيراد
              </span>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '6px 10px' }}>#</th>
                    <th style={{ padding: '6px 10px' }}>الكود</th>
                    <th style={{ padding: '6px 10px' }}>الاسم بالعربي</th>
                    <th style={{ padding: '6px 10px' }}>الاسم بالإنجليزي</th>
                    <th style={{ padding: '6px 10px' }}>{carrierType === 'shipping_line' ? 'إيميل RFQ' : 'الدولة / المدينة'}</th>
                    <th style={{ padding: '6px 10px' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedItems.slice(0, 5).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>{item.code}</td>
                      <td style={{ padding: '6px 10px', color: '#1e293b' }}>{item.nameAr || '—'}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{item.nameEn || '—'}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {carrierType === 'shipping_line' ? item.rfqEmail || '—' : `${item.countryName || '—'} / ${item.cityName || '—'}`}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        {item.isValid ? (
                          <span style={{ color: '#15803d', fontWeight: 600 }}>جاهز</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>الاسم مطلوب</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={validItems.length === 0 || importing}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: validItems.length === 0 || importing ? '#94a3b8' : '#170e5e',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: validItems.length === 0 || importing ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: validItems.length > 0 ? '0 2px 4px rgba(23, 14, 94, 0.2)' : 'none',
            }}
          >
            <AppIcons.Check size={15} />
            <span>
              {importing
                ? 'جاري الاستيراد...'
                : `تأكيد واستيراد (${validItems.length}) سجل`}
            </span>
          </button>
        </div>
      </div>
    </StandardDialog>
  );
}
