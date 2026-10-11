import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { toast } from '@/shared/components/system-alert';
import { formatDateTimeArabic } from '@/lib/format';
import {
  marketplaceSyncApi,
  AmazonConfig,
  NoonConfig,
  JumiaConfig,
  TrendyolConfig,
  SupportedMarketplace,
  MarketplaceSkuMapping,
  MarketplaceFeeCalculationInput,
  MarketplaceFeeCalculationResult,
  ListingStudioResult,
  BulkMappingImportRow,
  BulkMappingImportResult,
  MarketplaceSettlementInput,
  FbaInboundItem,
  FbaInboundShipment,
  FbaDiscrepancyClaimReport,
  MarketplaceOnboardingCheck,
  GtinExemptionApplication,
} from '@/features/storefront/api/marketplace-sync.api';
import { productsApi } from '@/features/products/api/products.api';
import {
  CheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PackageIcon,
  ShoppingCartIcon,
  RefreshCwIcon,
  ReceiptIcon,
  LinkIcon,
  XIcon,
  PlusIcon,
  CalculatorIcon,
  FileTextIcon,
  CopyIcon,
  DownloadIcon,
  GlobeIcon,
  LayersIcon,
  UploadIcon,
  SlidersIcon,
  TruckIcon,
  PrinterIcon,
  CheckShieldIcon,
  CameraIcon,
  SaveIcon,
} from '@/shared/components/icons/AppIcons';

type TabKey = 'onboarding' | 'calculator' | 'studio' | 'inventory' | 'inbound' | 'settlements' | 'orders' | 'analytics' | 'amazon' | 'noon' | 'jumia' | 'trendyol';

interface EditOnboardingProfileModalProps {
  open: boolean;
  initialData: Partial<MarketplaceOnboardingCheck>;
  targetSection?: string;
  onClose: () => void;
  onSave: (data: Partial<MarketplaceOnboardingCheck>) => void;
  isSaving: boolean;
}

const sectionTabs = [
  { id: 'all', label: 'كافة البيانات' },
  { id: 'commercial_register', label: 'السجل التجاري والكيان' },
  { id: 'tax_card', label: 'البطاقة الضريبية' },
  { id: 'bank_iban', label: 'الحساب البنكي والآيبان' },
  { id: 'national_id', label: 'هوية المالك' },
  { id: 'business_address', label: 'العنوان والتواصل' },
  { id: 'charge_method_card', label: 'طريقة الدفع' },
];

const sectionMeta: Record<string, { title: string; subtitle: string }> = {
  all: {
    title: 'استكمال وتعديل بيانات التاجر والمنشأة (Seller Legal & Bank Profile)',
    subtitle: 'يتم استخدام هذه البيانات للتحقق الآلي من تطابق أوراقك مع منصات أمازون ونون وتوليد خطابات التفويض.',
  },
  commercial_register: {
    title: 'تحديث بيانات السجل التجاري والكيان (Commercial Register & Entity)',
    subtitle: 'تحديد نوع الكيان واسم المنشأة بالسجل التجاري الرسمي واسم المتجر التجاري.',
  },
  tax_card: {
    title: 'تحديث بيانات البطاقة الضريبية (Tax Card & VAT)',
    subtitle: 'تسجيل رقم التسجيل الضريبي المعتمد (TIN) لتفادي تعليق الحساب على منصات البيع.',
  },
  bank_iban: {
    title: 'تحديث الحساب البنكي والآيبان الدولي (Bank Account & IBAN)',
    subtitle: 'يجب تطابق اسم صاحب الحساب بالحرف مع السجل التجاري أو هوية المالك لتفادي الرفض الفوري.',
  },
  national_id: {
    title: 'تحديث هوية المالك أو المفوض بالتوقيع (National ID / Passport)',
    subtitle: 'بيانات الهوية الوطنية أو جواز السفر للممثل القانوني للحساب.',
  },
  business_address: {
    title: 'تحديث العنوان الوطني وبيانات التواصل (Proof of Address & Phone)',
    subtitle: 'العنوان التجاري المسجل ورقم الهاتف المعتمد لاستلام إشعارات التحقق.',
  },
  charge_method_card: {
    title: 'تأكيد بطاقة الدفع والخصم الدولي (Credit / Debit Card)',
    subtitle: 'بطاقة فيزا أو ماستركارد دولية معتمدة للربط كطريقة دفع (Charge Method).',
  },
};

const EditOnboardingProfileModal: React.FC<EditOnboardingProfileModalProps> = React.memo(({
  open,
  initialData,
  targetSection,
  onClose,
  onSave,
  isSaving,
}) => {
  const [formData, setFormData] = useState<Partial<MarketplaceOnboardingCheck>>({});
  const [activeSection, setActiveSection] = useState<string>('all');

  useEffect(() => {
    if (open) {
      setActiveSection(targetSection || 'all');
      let draft: any = null;
      try {
        const raw = sessionStorage.getItem('marketplace_onboarding_draft');
        if (raw) draft = JSON.parse(raw);
      } catch {}
      if (draft && typeof draft === 'object' && Object.keys(draft).length > 0) {
        setFormData({ ...(initialData || {}), ...draft });
      } else {
        setFormData({ ...(initialData || {}) });
      }
    }
  }, [open, initialData, targetSection]);

  // Debounced auto-save to sessionStorage (500ms) to guarantee instant 0ms typing performance
  useEffect(() => {
    if (!open || Object.keys(formData).length === 0) return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem('marketplace_onboarding_draft', JSON.stringify(formData));
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [formData, open]);

  const isIndividualEntity = formData.legalEntityType === 'individual';
  const expectedOnboardingFields = isIndividualEntity
    ? [
        { key: 'tradeName', label: 'اسم المتجر التجاري' },
        { key: 'ownerName', label: 'اسم المالك أو المفوض' },
        { key: 'ownerNationalId', label: 'رقم بطاقة الرقم القومي أو الجواز' },
        { key: 'bankAccountName', label: 'اسم صاحب الحساب البنكي' },
        { key: 'bankIban', label: 'رقم الآيبان البنكي (IBAN)' },
        { key: 'bankSwift', label: 'كود السويفت (SWIFT)' },
        { key: 'bankName', label: 'اسم البنك المستلم' },
        { key: 'phone', label: 'رقم الهاتف' },
        { key: 'businessAddress', label: 'العنوان المسجل' },
        { key: 'hasCreditCard', label: 'بطاقة ائتمان / خصم دولي' },
      ]
    : [
        { key: 'companyLegalName', label: 'اسم الشركة بالسجل' },
        { key: 'tradeName', label: 'اسم المتجر التجاري' },
        { key: 'ownerName', label: 'اسم المفوض بالتوقيع' },
        { key: 'ownerNationalId', label: 'رقم بطاقة الرقم القومي أو الجواز' },
        { key: 'commercialRegister', label: 'رقم السجل التجاري' },
        { key: 'taxNumber', label: 'رقم التسجيل الضريبي (TIN)' },
        { key: 'bankAccountName', label: 'اسم صاحب الحساب البنكي' },
        { key: 'bankIban', label: 'رقم الآيبان البنكي (IBAN)' },
        { key: 'bankSwift', label: 'كود السويفت (SWIFT)' },
        { key: 'bankName', label: 'اسم البنك المستلم' },
        { key: 'phone', label: 'رقم الهاتف التجاري' },
        { key: 'businessAddress', label: 'العنوان التجاري المسجل' },
        { key: 'hasCreditCard', label: 'بطاقة ائتمان / خصم دولي' },
      ];

  const filledOnboardingFields = expectedOnboardingFields.filter((f) => {
    const val = (formData as any)[f.key];
    if (typeof val === 'boolean') return val === true;
    return Boolean(val && String(val).trim().length > 0);
  });
  const onboardingFilledCount = filledOnboardingFields.length;
  const onboardingTotalCount = expectedOnboardingFields.length;
  const onboardingPercent = Math.round((onboardingFilledCount / onboardingTotalCount) * 100);

  const currentMeta = sectionMeta[activeSection] || sectionMeta.all;

  const showCommercial = activeSection === 'all' || activeSection === 'commercial_register';
  const showTax = activeSection === 'all' || activeSection === 'tax_card';
  const showBank = activeSection === 'all' || activeSection === 'bank_iban';
  const showNationalId = activeSection === 'all' || activeSection === 'national_id';
  const showAddress = activeSection === 'all' || activeSection === 'business_address';
  const showCreditCard = activeSection === 'all' || activeSection === 'charge_method_card';

  // Section Renderers
  const renderSection1Commercial = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {activeSection === 'all' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
          <span style={{ width: '3px', height: '13px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
            بيانات الكيان القانوني والسجل التجاري
          </span>
        </div>
      ) : null}

      {/* Legal Entity Type Toggle */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
          نوع الكيان القانوني على أمازون ونون:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, legalEntityType: 'business' })}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '6px',
              border: (!formData.legalEntityType || formData.legalEntityType === 'business') ? '2px solid #170e5e' : '1px solid #cbd5e1',
              background: (!formData.legalEntityType || formData.legalEntityType === 'business') ? '#eef2ff' : '#ffffff',
              color: (!formData.legalEntityType || formData.legalEntityType === 'business') ? '#170e5e' : '#64748b',
              fontWeight: 700,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>شركة / منشأة (سجل وبطاقة ضريبية)</span>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, legalEntityType: 'individual' })}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '6px',
              border: formData.legalEntityType === 'individual' ? '2px solid #170e5e' : '1px solid #cbd5e1',
              background: formData.legalEntityType === 'individual' ? '#eef2ff' : '#ffffff',
              color: formData.legalEntityType === 'individual' ? '#170e5e' : '#64748b',
              fontWeight: 700,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>بائع فردي / شخصي (بدون سجل)</span>
          </button>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '10.5px', color: '#64748b', lineHeight: '1.4' }}>
          {(!formData.legalEntityType || formData.legalEntityType === 'business')
            ? 'حسابات الشركات تتطلب إلزامياً: السجل التجاري، البطاقة الضريبية، وحساباً بنكياً رسمياً باسم الشركة.'
            : 'حسابات الأفراد لا تتطلب سجلاً تجارياً، ولكن تتطلب حتماً بطاقة رقم قومي سارية وحساباً بنكياً شخصياً.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            اسم الشركة بالسجل {(!formData.legalEntityType || formData.legalEntityType === 'business') ? <span style={{ color: '#dc2626' }}>*</span> : null}
          </label>
          <input
            type="text"
            value={formData.companyLegalName || ''}
            onChange={(e) => setFormData({ ...formData, companyLegalName: e.target.value })}
            placeholder="اسم الكيان القانوني المسجل"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            اسم المتجر التجاري (Trade Name)
          </label>
          <input
            type="text"
            value={formData.tradeName || ''}
            onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
            placeholder="الاسم الذي يظهر للمشترين"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            رقم السجل التجاري {(!formData.legalEntityType || formData.legalEntityType === 'business') ? <span style={{ color: '#dc2626' }}>*</span> : null}
          </label>
          <input
            type="text"
            value={formData.commercialRegister || ''}
            onChange={(e) => setFormData({ ...formData, commercialRegister: e.target.value })}
            placeholder="مثال: 123456"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );

  const renderSection2Tax = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {activeSection === 'all' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
          <span style={{ width: '3px', height: '13px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
            البيانات الضريبية (Tax Card)
          </span>
        </div>
      ) : null}

      {formData.legalEntityType === 'individual' ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', color: '#64748b' }}>
          ملاحظة: حسابات الأفراد غير ملزمة بالبطاقة الضريبية على منصات أمازون ونون. إذا كانت متوفرة يمكنك تسجيلها اختيارياً:
        </div>
      ) : null}

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
          رقم التسجيل الضريبي (TIN) {(!formData.legalEntityType || formData.legalEntityType === 'business') ? <span style={{ color: '#dc2626' }}>*</span> : null}
        </label>
        <input
          type="text"
          value={formData.taxNumber || ''}
          onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
          placeholder="مثال: 100-200-300"
          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );

  const renderSection3NationalId = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {activeSection === 'all' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
          <span style={{ width: '3px', height: '13px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
            هوية المالك أو المفوض بالتوقيع
          </span>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            اسم المالك أو المفوض بالتوقيع <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.ownerName || ''}
            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            placeholder="الاسم الثلاثي أو الرباعي للمفوض"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            رقم بطاقة الرقم القومي أو جواز السفر <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.ownerNationalId || ''}
            onChange={(e) => setFormData({ ...formData, ownerNationalId: e.target.value })}
            placeholder="14 رقم للبطاقة أو رقم الجواز"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', direction: 'ltr', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );

  const renderSection4Bank = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {activeSection === 'all' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
          <span style={{ width: '3px', height: '13px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
            الحساب البنكي الرسمي ورقم الآيبان (IBAN)
          </span>
        </div>
      ) : null}

      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', color: '#475569', lineHeight: '1.45' }}>
        تنبيه التحقق البنكي: يجب أن يتطابق <strong>اسم صاحب الحساب</strong> بالحرف مع اسم الشركة المسجل أو اسم الهوية لتفادي الرفض التلقائي.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            اسم صاحب الحساب البنكي <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.bankAccountName || ''}
            onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
            placeholder="يجب تطابقه بالحرف مع اسم الشركة أو الفرد"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            اسم البنك المستلم <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.bankName || ''}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            placeholder="مثال: البنك الأهلي المصري / CIB"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            رقم الآيبان البنكي الدولي (IBAN) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.bankIban || ''}
            onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })}
            placeholder="EG123456789012345678901234567"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', direction: 'ltr', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            كود السويفت (SWIFT / BIC) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.bankSwift || ''}
            onChange={(e) => setFormData({ ...formData, bankSwift: e.target.value })}
            placeholder="مثال: NBEGEGCX"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', direction: 'ltr', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );

  const renderSection5Address = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {activeSection === 'all' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
          <span style={{ width: '3px', height: '13px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
            العنوان وبيانات التواصل
          </span>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            رقم الهاتف التجاري <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="01012345678"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', direction: 'ltr', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
            العنوان التجاري المسجل <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.businessAddress || ''}
            onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
            placeholder="اسم الشارع، رقم المبنى، المدينة"
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );

  const renderSection6CreditCard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {activeSection === 'all' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
          <span style={{ width: '3px', height: '13px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
            بطاقة الدفع والخصم الدولي (Charge Method)
          </span>
        </div>
      ) : null}

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
          <input
            type="checkbox"
            checked={Boolean(formData.hasCreditCard)}
            onChange={(e) => setFormData({ ...formData, hasCreditCard: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: '#170e5e', cursor: 'pointer' }}
          />
          <span>أؤكد توفر بطاقة ائتمان / خصم دولي (Visa أو Mastercard) صالحة للشراء والسحب الدولي *</span>
        </label>
        <p style={{ margin: 0, fontSize: '11px', color: '#b45309', lineHeight: '1.45' }}>
          تنبيه إلزامي لأمازون: لا يمكن إنهاء إنشاء الحساب أو تفعيله بدون إدخال بطاقة فيزا أو ماستركارد دولية لسداد رسوم التحقق (ولا يقبل كارت ميزة المحلي).
        </p>
      </div>
    </div>
  );

  const isAll = activeSection === 'all';
  const modalWidth = isAll ? 'min(960px, 95vw)' : 'min(620px, 95vw)';

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width={modalWidth}
      ariaLabel={currentMeta.title}
    >
      <div
        dir="rtl"
        style={{
          background: '#ffffff',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: 'calc(92vh - 20px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              {currentMeta.title}
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              {currentMeta.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Section Navigation Tabs (Pills) */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          {sectionTabs.map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                style={{
                  padding: '4px 11px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: isSelected ? '#170e5e' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Banner when viewing All */}
        {isAll ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ color: '#16a34a', flexShrink: 0 }}>
                <CheckShieldIcon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>
                    ميزة الحفظ المرحلي: احفظ ما يتوفر معك الآن واستكمل الباقي لاحقاً
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: onboardingFilledCount > 0 ? '#dcfce7' : '#f1f5f9',
                      color: onboardingFilledCount > 0 ? '#15803d' : '#64748b',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid ' + (onboardingFilledCount > 0 ? '#86efac' : '#cbd5e1'),
                    }}
                  >
                    تم تسجيل {onboardingFilledCount} من {onboardingTotalCount} ({onboardingPercent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#dcfce7', borderRadius: '2px', marginTop: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${onboardingPercent}%`,
                      height: '100%',
                      background: onboardingPercent >= 100 ? '#16a34a' : '#22c55e',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main Sections Body */}
        {isAll ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {/* Column 1: Legal Entity, Tax, Owner ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {renderSection1Commercial()}
              {renderSection2Tax()}
              {renderSection3NationalId()}
            </div>

            {/* Column 2: Bank Account, Address, Charge Method */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {renderSection4Bank()}
              {renderSection5Address()}
              {renderSection6CreditCard()}
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: '180px',
              justifyContent: 'center',
            }}
          >
            {showCommercial && renderSection1Commercial()}
            {showTax && renderSection2Tax()}
            {showNationalId && renderSection3NationalId()}
            {showBank && renderSection4Bank()}
            {showAddress && renderSection5Address()}
            {showCreditCard && renderSection6CreditCard()}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
            paddingTop: '10px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: onboardingFilledCount > 0 ? '#22c55e' : '#94a3b8',
              }}
            />
            <span>{onboardingFilledCount > 0 ? `المسودة تحتوي على ${onboardingFilledCount} بيان جاهز للحفظ` : 'لم يتم إدخال بيانات بعد'}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              إلغاء
            </Button>

            <Button
              variant="secondary"
              onClick={() => onSave(formData)}
              disabled={isSaving || onboardingFilledCount === 0}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                padding: '6px 14px',
                fontSize: '12px',
              }}
              title="حفظ ما تم إدخاله حتى الآن وإغلاق النافذة مع إمكانية المتابعة في أي وقت"
            >
              <SaveIcon size={15} />
              <span>حفظ ومتابعة لاحقاً</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => onSave(formData)}
              disabled={isSaving}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                padding: '6px 16px',
                fontSize: '12px',
              }}
            >
              <CheckCircleIcon size={15} />
              <span>{isSaving ? 'جاري الحفظ...' : (isAll ? 'حفظ وتحديث مؤشر الجاهزية' : 'حفظ هذا القسم وتحديث الجاهزية')}</span>
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
});

export const SettingsMarketplacesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('onboarding');

  // Config States
  const [amazonCfg, setAmazonCfg] = useState<AmazonConfig>({
    enabled: false,
    sellerId: '',
    refreshToken: '',
    clientId: '',
    clientSecret: '',
    marketplaceId: 'eg',
    autoSyncStock: true,
    autoPullOrders: true,
    fulfillmentType: 'fbm',
  });

  const [noonCfg, setNoonCfg] = useState<NoonConfig>({
    enabled: false,
    merchantId: '',
    apiKey: '',
    appSecret: '',
    marketplace: 'eg',
    autoSyncStock: true,
    autoPullOrders: true,
    fulfillmentType: 'direct',
  });

  const [jumiaCfg, setJumiaCfg] = useState<JumiaConfig>({
    enabled: false,
    sellerEmail: '',
    apiKey: '',
    marketplace: 'eg',
    autoSyncStock: true,
    autoPullOrders: true,
    fulfillmentType: 'dropshipping',
  });

  const [trendyolCfg, setTrendyolCfg] = useState<TrendyolConfig>({
    enabled: false,
    supplierId: '',
    apiKey: '',
    apiSecret: '',
    autoSyncStock: true,
    autoPullOrders: true,
    fulfillmentType: 'merchant_cargo',
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string; pingMs?: number; accountName?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [simulatedOrderInfo, setSimulatedOrderInfo] = useState<string | null>(null);
  const [selectedInventoryPlatform, setSelectedInventoryPlatform] = useState<'all' | SupportedMarketplace>('all');

  // Competitor Price Modal
  const [editPriceModal, setEditPriceModal] = useState<MarketplaceSkuMapping | null>(null);
  const [editCompetitorPrice, setEditCompetitorPrice] = useState<string>('');
  const [editBuyBoxPrice, setEditBuyBoxPrice] = useState<string>('');

  // New mapping form
  const [newMapping, setNewMapping] = useState<{
    productId: number;
    marketplace: SupportedMarketplace;
    marketplaceSku: string;
    marketplaceTitle: string;
    customPrice: string;
    competitorPrice: string;
    buyBoxPrice: string;
    syncStock: boolean;
  }>({
    productId: 0,
    marketplace: 'amazon',
    marketplaceSku: '',
    marketplaceTitle: '',
    customPrice: '',
    competitorPrice: '',
    buyBoxPrice: '',
    syncStock: true,
  });

  // Calculator Form State (حاسبة وهوامش الأرباح والرسوم)
  const [calcInput, setCalcInput] = useState<MarketplaceFeeCalculationInput>({
    marketplace: 'amazon',
    region: 'eg',
    category: 'electronics',
    fulfillmentType: 'fba',
    weightTier: 'standard',
    sellingPrice: 350,
    itemCost: 200,
    inboundShippingCost: 10,
    packagingCost: 5,
  });
  const [calcResult, setCalcResult] = useState<MarketplaceFeeCalculationResult | null>(null);

  // Listing Studio Form State ("ستوديو / ليو")
  const [studioProductId, setStudioProductId] = useState<number>(0);
  const [studioResult, setStudioResult] = useState<ListingStudioResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Settlement Reconciliation Form State
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [selectedSettlementPlatform, setSelectedSettlementPlatform] = useState<'all' | SupportedMarketplace>('all');
  const [settlementForm, setSettlementForm] = useState<MarketplaceSettlementInput>({
    marketplace: 'amazon',
    settlementId: '',
    periodStart: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    currency: 'EGP',
    grossSales: 0,
    referralFees: 0,
    fulfillmentFees: 0,
    refunds: 0,
    storageOrOtherFees: 0,
    netPayout: 0,
    bankAccountId: undefined,
    referralFeesAccountId: undefined,
    fulfillmentFeesAccountId: undefined,
    salesAccountId: undefined,
    notes: '',
  });

  // Bulk Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  // bulkImportMarketplace removed (unused)
  const [bulkImportText, setBulkImportText] = useState<string>('');
  const [bulkImportResult, setBulkImportResult] = useState<BulkMappingImportResult | null>(null);

  // Inbound Shipments State (FBA / FBN)
  const [showInboundModal, setShowInboundModal] = useState<boolean>(false);
  const [inboundForm, setInboundForm] = useState<{
    marketplace: 'amazon' | 'noon';
    fulfillmentCenterId: string;
    trackingNumber: string;
    notes: string;
    selectedProductId: number;
    quantity: string;
    boxNumber: string;
    items: FbaInboundItem[];
  }>({
    marketplace: 'amazon',
    fulfillmentCenterId: 'CAI1',
    trackingNumber: '',
    notes: '',
    selectedProductId: 0,
    quantity: '10',
    boxNumber: '1',
    items: [],
  });

  // Repricing Settings Modal State
  const [editRepricingModal, setEditRepricingModal] = useState<MarketplaceSkuMapping | null>(null);
  const [repricingForm, setRepricingForm] = useState<{
    repricingEnabled: boolean;
    minPrice: string;
    maxPrice: string;
    repricingRule: 'match_buy_box' | 'undercut_buy_box' | 'match_lowest' | 'undercut_lowest';
    repricingDelta: string;
  }>({
    repricingEnabled: true,
    minPrice: '',
    maxPrice: '',
    repricingRule: 'undercut_buy_box',
    repricingDelta: '1',
  });

  // Queries
  const configQuery = useQuery({
    queryKey: ['marketplace-all-config'],
    queryFn: marketplaceSyncApi.getConfig,
  });

  const mappingsQuery = useQuery({
    queryKey: ['marketplace-mappings'],
    queryFn: () => marketplaceSyncApi.listMappings(),
  });

  const settlementsQuery = useQuery({
    queryKey: ['marketplace-settlements'],
    queryFn: () => marketplaceSyncApi.getSettlements(),
  });

  const settlementAccountsQuery = useQuery({
    queryKey: ['marketplace-settlement-accounts'],
    queryFn: () => marketplaceSyncApi.getSettlementAccounts(),
  });

  const inboundShipmentsQuery = useQuery({
    queryKey: ['marketplace-inbound-shipments'],
    queryFn: () => marketplaceSyncApi.getInboundShipments(),
  });

  const productsQuery = useQuery({
    queryKey: ['marketplace-products-selector'],
    queryFn: () => productsApi.listPage({ pageSize: 150 }),
  });

  // Analytics State & Query
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'30d' | '7d' | 'all'>('30d');
  const analyticsQuery = useQuery({
    queryKey: ['marketplace-analytics', analyticsPeriod],
    queryFn: () => marketplaceSyncApi.getMarketplaceAnalytics(analyticsPeriod),
    enabled: activeTab === 'analytics',
  });

  // Receiving Modal State
  const [receiveShipmentModal, setReceiveShipmentModal] = useState<FbaInboundShipment | null>(null);
  const [receiveFormItems, setReceiveFormItems] = useState<{ [sku: string]: string }>({});

  // Discrepancy Claim Report State
  const [claimReportModal, setClaimReportModal] = useState<FbaDiscrepancyClaimReport | null>(null);
  const [claimLanguage, setClaimLanguage] = useState<'ar' | 'en'>('en');

  // FNSKU Label Printing State
  const [printFnskuModal, setPrintFnskuModal] = useState<{
    productName: string;
    marketplaceSku: string;
    barcode?: string;
    condition: string;
    marketplace: string;
    format: 'thermal_50x30' | 'thermal_40x25' | 'a4_44up';
    copies: number;
  } | null>(null);

  // Onboarding & Verification State & Query
  const onboardingQuery = useQuery({
    queryKey: ['marketplace-onboarding-check'],
    queryFn: marketplaceSyncApi.getSellerOnboardingCheck,
    enabled: activeTab === 'onboarding',
  });

  const [showEditOnboardingModal, setShowEditOnboardingModal] = useState<boolean>(false);
  const [onboardingTargetSection, setOnboardingTargetSection] = useState<string>('all');
  const [showLoaModal, setShowLoaModal] = useState<boolean>(false);
  const [loaLanguage, setLoaLanguage] = useState<'ar' | 'en'>('ar');
  const [activePlatformGuide, setActivePlatformGuide] = useState<SupportedMarketplace>('amazon');

  // GTIN / Barcode Exemption State
  const [showGtinModal, setShowGtinModal] = useState<boolean>(false);
  const [gtinForm, setGtinForm] = useState<{
    productId?: number;
    brandName: string;
    category: string;
    marketplace: SupportedMarketplace;
    reason: 'unbranded' | 'private_label' | 'custom_manufacturing' | 'parts_accessories';
  }>({
    brandName: '',
    category: 'Home & Kitchen / الأدوات المنزلية',
    marketplace: 'amazon',
    reason: 'unbranded',
  });
  const [gtinResult, setGtinResult] = useState<GtinExemptionApplication | null>(null);
  const [gtinLanguage, setGtinLanguage] = useState<'en' | 'ar'>('en');

  // Marketplace Photo Optimizer State
  const [showPhotoOptimizerModal, setShowPhotoOptimizerModal] = useState<boolean>(false);
  const [optimizerImageSrc, setOptimizerImageSrc] = useState<string | null>(null);
  const [optimizedImageResult, setOptimizedImageResult] = useState<string | null>(null);
  const [imageMetrics, setImageMetrics] = useState<{
    width: number;
    height: number;
    isSquare: boolean;
    isZoomable: boolean;
  } | null>(null);

  useEffect(() => {
    if (configQuery.data) {
      if (configQuery.data.amazon) setAmazonCfg(configQuery.data.amazon);
      if (configQuery.data.noon) setNoonCfg(configQuery.data.noon);
      if (configQuery.data.jumia) setJumiaCfg(configQuery.data.jumia);
      if (configQuery.data.trendyol) setTrendyolCfg(configQuery.data.trendyol);
    }
  }, [configQuery.data]);

  // Initial calculation on mount
  useEffect(() => {
    marketplaceSyncApi.calculateFees(calcInput).then((res) => setCalcResult(res)).catch(() => {});
  }, []);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: {
      amazon?: Partial<AmazonConfig>;
      noon?: Partial<NoonConfig>;
      jumia?: Partial<JumiaConfig>;
      trendyol?: Partial<TrendyolConfig>;
    }) => marketplaceSyncApi.saveConfig(data),
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      configQuery.refetch();
      toast.success('تم حفظ إعدادات منصات الماركت بليس بنجاح');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل حفظ الإعدادات'),
  });

  const testMutation = useMutation({
    mutationFn: (marketplace: SupportedMarketplace) => marketplaceSyncApi.testConnection(marketplace),
    onSuccess: (res) => setTestResult(res),
    onError: (err: any) => setTestResult({ success: false, message: err?.message || 'تعذر الاتصال بالمنصة' }),
  });

  // Stock sync is handled directly via mappings table actions

  const simulateOrderMutation = useMutation({
    mutationFn: (marketplace: 'amazon' | 'noon') => marketplaceSyncApi.simulateIncomingOrder(marketplace),
    onSuccess: (res: any) => {
      setSimulatedOrderInfo(`تم استلام وحجز طلب ${res.marketplace.toUpperCase()} برقم ${res.marketplaceOrderId} للعميل ${res.customerName}! الرصيد المحجوز: ${res.quantity} قطعة.`);
      mappingsQuery.refetch();
      toast.success('تمت محاكاة سحب الطلب وحجز الرصيد من المخزن بنجاح');
    },
    onError: (err: any) => toast.error(err?.message || 'فشلت محاكاة الطلب'),
  });

  const addMappingMutation = useMutation({
    mutationFn: (payload: any) => marketplaceSyncApi.addMapping(payload),
    onSuccess: () => {
      setShowAddModal(false);
      setNewMapping({
        productId: 0,
        marketplace: 'amazon',
        marketplaceSku: '',
        marketplaceTitle: '',
        customPrice: '',
        competitorPrice: '',
        buyBoxPrice: '',
        syncStock: true,
      });
      mappingsQuery.refetch();
      toast.success('تم ربط الصنف مع المنصة بنجاح');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل حفظ الربط'),
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (id: number | string) => marketplaceSyncApi.deleteMapping(id),
    onSuccess: () => {
      mappingsQuery.refetch();
      toast.success('تم إلغاء ربط الصنف');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل الحذف'),
  });

  const updateCompetitorPriceMutation = useMutation({
    mutationFn: (data: { id: string; competitorPrice?: number; buyBoxPrice?: number }) =>
      marketplaceSyncApi.updateCompetitorPrice(data.id, { competitorPrice: data.competitorPrice, buyBoxPrice: data.buyBoxPrice }),
    onSuccess: () => {
      setEditPriceModal(null);
      mappingsQuery.refetch();
      toast.success('تم تحديث سعر المنافس وصندوق الشراء بنجاح');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل تحديث أسعار المنافسة'),
  });

  const calcMutation = useMutation({
    mutationFn: (input: MarketplaceFeeCalculationInput) => marketplaceSyncApi.calculateFees(input),
    onSuccess: (res) => setCalcResult(res),
    onError: (err: any) => toast.error(err?.message || 'فشل حساب الرسوم'),
  });

  const studioMutation = useMutation({
    mutationFn: (pId: number) => marketplaceSyncApi.getListingStudio(pId),
    onSuccess: (res) => {
      setStudioResult(res);
      toast.success('تم توليد محتوى وسيو القوائم للمنصة بنجاح');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل توليد المحتوى'),
  });

  const reconcileMutation = useMutation({
    mutationFn: (input: MarketplaceSettlementInput) => marketplaceSyncApi.reconcileSettlement(input),
    onSuccess: (res) => {
      toast.success(`تمت تسوية كشف الحساب بنجاح وإنشاء القيد اليومي رقم ${res.journalEntryNo}`);
      setShowReconcileModal(false);
      settlementsQuery.refetch();
    },
    onError: (err: any) => toast.error(err?.message || 'فشلت تسوية كشف الحساب'),
  });

  const bulkImportMutation = useMutation({
    mutationFn: (rows: BulkMappingImportRow[]) => marketplaceSyncApi.importMappings(rows),
    onSuccess: (res) => {
      setBulkImportResult(res);
      toast.success(`تم استيراد ${res.importedCount} صنفاً جديداً وتحديث ${res.updatedCount} صنفاً`);
      mappingsQuery.refetch();
    },
    onError: (err: any) => toast.error(err?.message || 'فشل استيراد الشيت'),
  });

  const liveSyncMutation = useMutation({
    mutationFn: (productId?: number) => marketplaceSyncApi.syncStockLive(productId),
    onSuccess: (res) => {
      toast.success(res.message);
      mappingsQuery.refetch();
    },
    onError: (err: any) => toast.error(err?.message || 'فشل البث اللحظي للمخزون'),
  });

  const runRepricingMutation = useMutation({
    mutationFn: (marketplace?: SupportedMarketplace) => marketplaceSyncApi.runRepricingBot(marketplace),
    onSuccess: (res) => {
      toast.success(`قام الروبوت بفحص ${res.totalEvaluated} صنفاً وتعديل أسعار ${res.totalRepriced} صنفاً بنجاح`);
      mappingsQuery.refetch();
    },
    onError: (err: any) => toast.error(err?.message || 'فشل تشغيل روبوت إعادة التسعير'),
  });

  const saveRepricingMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) =>
      marketplaceSyncApi.saveRepricingSettings(data.id, data.payload),
    onSuccess: () => {
      setEditRepricingModal(null);
      mappingsQuery.refetch();
      toast.success('تم حفظ إعدادات وقواعد التسعير الذكي بنجاح');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل حفظ إعدادات التسعير'),
  });

  const createInboundMutation = useMutation({
    mutationFn: (data: any) => marketplaceSyncApi.createInboundShipment(data),
    onSuccess: (res) => {
      toast.success(`تم إنشاء إذن توريد ${res.marketplace.toUpperCase()} بنجاح برقم ${res.shipmentNumber}`);
      setShowInboundModal(false);
      inboundShipmentsQuery.refetch();
    },
    onError: (err: any) => toast.error(err?.message || 'فشل إنشاء إذن التوريد'),
  });

  const receiveShipmentMutation = useMutation({
    mutationFn: (data: { id: string; receivedItems: { productId: number; marketplaceSku: string; quantityReceived: number }[] }) =>
      marketplaceSyncApi.recordShipmentReceiving(data.id, data.receivedItems),
    onSuccess: (res) => {
      toast.success(`تم تسجيل فحص واستلام الشحنة ${res.shipmentNumber}. الفاقد المرصود: ${res.totalDiscrepancyUnits || 0} قطعة`);
      setReceiveShipmentModal(null);
      inboundShipmentsQuery.refetch();
    },
    onError: (err: any) => toast.error(err?.message || 'فشل تسجيل فحص واستلام الشحنة'),
  });

  const loadClaimReportMutation = useMutation({
    mutationFn: (shipmentId: string) => marketplaceSyncApi.getDiscrepancyClaim(shipmentId),
    onSuccess: (res) => {
      setClaimReportModal(res);
    },
    onError: (err: any) => toast.error(err?.message || 'فشل استخراج تقرير المطالبة'),
  });

  const saveOnboardingMutation = useMutation({
    mutationFn: (data: Partial<MarketplaceOnboardingCheck>) => marketplaceSyncApi.saveOnboardingProfile(data),
    onSuccess: () => {
      toast.success('تم حفظ البيانات المدخلة بنجاح، يمكنك استكمال باقي البيانات في أي وقت');
      try {
        sessionStorage.removeItem('marketplace_onboarding_draft');
      } catch {}
      onboardingQuery.refetch();
      setShowEditOnboardingModal(false);
    },
    onError: (err: any) => toast.error(err?.message || 'فشل حفظ بيانات التاجر'),
  });

  const gtinMutation = useMutation({
    mutationFn: (data: any) => marketplaceSyncApi.generateGtinExemption(data),
    onSuccess: (res) => {
      setGtinResult(res);
      toast.success('تم توليد ملف وخطاب طلب إعفاء الباركود الدولي بنجاح');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل توليد طلب الإعفاء'),
  });

  const handleOptimizeProductImage = (dataUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const isSquare = Math.abs(img.naturalWidth - img.naturalHeight) < 5;
      const isZoomable = img.naturalWidth >= 1000 && img.naturalHeight >= 1000;
      setImageMetrics({
        width: img.naturalWidth,
        height: img.naturalHeight,
        isSquare,
        isZoomable,
      });

      const targetSize = 1500;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill pure white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Scale to fit 85% of canvas (~1275px)
      const maxDim = targetSize * 0.85;
      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
      const scaledW = img.naturalWidth * scale;
      const scaledH = img.naturalHeight * scale;
      const posX = (targetSize - scaledW) / 2;
      const posY = (targetSize - scaledH) / 2;

      ctx.drawImage(img, posX, posY, scaledW, scaledH);

      try {
        const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 235 && g > 235 && b > 235) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {
        // Fallback without pixel manipulation if tainted
      }

      const resultUrl = canvas.toDataURL('image/jpeg', 0.94);
      setOptimizedImageResult(resultUrl);
    };
    img.src = dataUrl;
  };

  const handlePrintFnskuLabels = () => {
    if (!printFnskuModal) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const { productName, marketplaceSku, format, copies, condition } = printFnskuModal;
    const isA4 = format === 'a4_44up';
    const is50x30 = format === 'thermal_50x30';

    const labelHtml = `
      <div class="label-box">
        <div class="sku-code">${marketplaceSku}</div>
        <div class="barcode-svg">
          <svg viewBox="0 0 160 45" style="width: 100%; height: 34px;">
            <rect x="0" y="0" width="4" height="40" fill="#000"/>
            <rect x="7" y="0" width="2" height="40" fill="#000"/>
            <rect x="12" y="0" width="5" height="40" fill="#000"/>
            <rect x="20" y="0" width="2" height="40" fill="#000"/>
            <rect x="25" y="0" width="3" height="40" fill="#000"/>
            <rect x="31" y="0" width="6" height="40" fill="#000"/>
            <rect x="40" y="0" width="2" height="40" fill="#000"/>
            <rect x="45" y="0" width="4" height="40" fill="#000"/>
            <rect x="52" y="0" width="2" height="40" fill="#000"/>
            <rect x="57" y="0" width="5" height="40" fill="#000"/>
            <rect x="65" y="0" width="3" height="40" fill="#000"/>
            <rect x="71" y="0" width="2" height="40" fill="#000"/>
            <rect x="76" y="0" width="4" height="40" fill="#000"/>
            <rect x="83" y="0" width="2" height="40" fill="#000"/>
            <rect x="88" y="0" width="6" height="40" fill="#000"/>
            <rect x="97" y="0" width="3" height="40" fill="#000"/>
            <rect x="103" y="0" width="2" height="40" fill="#000"/>
            <rect x="108" y="0" width="5" height="40" fill="#000"/>
            <rect x="116" y="0" width="2" height="40" fill="#000"/>
            <rect x="121" y="0" width="4" height="40" fill="#000"/>
            <rect x="128" y="0" width="2" height="40" fill="#000"/>
            <rect x="133" y="0" width="6" height="40" fill="#000"/>
            <rect x="142" y="0" width="2" height="40" fill="#000"/>
            <rect x="147" y="0" width="4" height="40" fill="#000"/>
            <rect x="154" y="0" width="4" height="40" fill="#000"/>
          </svg>
        </div>
        <div class="prod-title">${productName}</div>
        <div class="condition-tag">${condition}</div>
      </div>
    `;

    const labels = Array.from({ length: copies }, () => labelHtml).join('');

    const pageSize = isA4 ? 'A4 portrait' : is50x30 ? '50mm 30mm' : '40mm 25mm';
    const pageMargin = isA4 ? '8mm' : '0';

    const layoutCss = isA4
      ? `
        .grid-container {
          display: grid;
          grid-template-columns: repeat(4, 48.5mm);
          grid-auto-rows: 25.4mm;
          gap: 0;
          justify-content: center;
        }
        .label-box {
          box-sizing: border-box;
          width: 48.5mm;
          height: 25.4mm;
          padding: 1.5mm;
          text-align: center;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `
      : `
        .grid-container {
          display: block;
        }
        .label-box {
          box-sizing: border-box;
          width: ${is50x30 ? '50mm' : '40mm'};
          height: ${is50x30 ? '30mm' : '25mm'};
          padding: 1.5mm;
          text-align: center;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FNSKU Labels - ${marketplaceSku}</title>
          <style>
            @page {
              size: ${pageSize};
              margin: ${pageMargin};
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
            }
            ${layoutCss}
            .sku-code {
              font-size: 8pt;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .barcode-svg {
              margin: 1px 0;
            }
            .prod-title {
              font-size: 6pt;
              line-height: 1.1;
              max-height: 13px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .condition-tag {
              font-size: 5.5pt;
              font-weight: bold;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${labels}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('تم النسخ إلى الحافظة');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportFlatFile = async (marketplace: SupportedMarketplace) => {
    try {
      const res = await marketplaceSyncApi.exportFlatFile(marketplace);
      const blob = new Blob([res.data], { type: res.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`تم تحميل شيت الرفع ${res.filename} (${res.rowCount} صنفاً)`);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تصدير ملف الإدراج');
    }
  };

  const handleDownloadSampleMappingTemplate = () => {
    const headers = 'barcode,marketplace,marketplaceSku,marketplaceTitle,customPrice,competitorPrice';
    const sampleRows = [
      '622123456789,amazon,B08N5WRWNW,كابل شحن سريع أصلي تايب سي,199,189',
      '622987654321,noon,N45678901A,سماعة رأس بلوتوث محيطية,450,420',
      '622112233445,jumia,JM987654,ماوس ألعاب لاسلكي مريح,290,275',
    ].join('\n');
    const csvContent = '\uFEFF' + [headers, sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Marketplace_SKU_Mapping_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('تم تحميل نموذج شيت الربط التجريبي بنجاح');
  };

  const handleExportPackingSlip = async (shipmentId: string) => {
    try {
      const res = await marketplaceSyncApi.exportPackingSlip(shipmentId);
      const blob = new Blob([res.data], { type: res.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('تم تحميل كشف التعبئة (Packing Slip) بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل كشف التعبئة');
    }
  };

  const mappings: MarketplaceSkuMapping[] = mappingsQuery.data || [];
  const availableProducts = productsQuery.data?.products || [];

  const winningCount = mappings.filter((m) => m.buyBoxStatus === 'winning').length;
  const atRiskCount = mappings.filter((m) => m.buyBoxStatus === 'at_risk').length;
  const losingCount = mappings.filter((m) => m.buyBoxStatus === 'losing').length;

  const filteredMappings = selectedInventoryPlatform === 'all'
    ? mappings
    : mappings.filter((m) => m.marketplace === selectedInventoryPlatform);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', width: 'min(100%, 1280px)', margin: '0 auto' }} dir="rtl">
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
            بوابة إدارة ومزامنة التجارة الإلكترونية والماركت بليس (Marketplaces Suite)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            الربط السحابي ومزامنة المخزون، وحساب هوامش الأرباح ورسوم المنصات، واستوديو السيو وتتبع الـ Buy Box.
          </p>
        </div>

        {saveSuccess ? (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckIcon size={14} color="#15803d" strokeWidth={2.5} />
            <span>تم حفظ الإعدادات بنجاح!</span>
          </span>
        ) : null}
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '10px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab('onboarding'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'onboarding' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'onboarding' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckShieldIcon size={15} />
          <span>معالج فتح وتفعيل الحساب (Onboarding)</span>
          {onboardingQuery.data ? (
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: onboardingQuery.data.overallReadinessScore >= 80 ? '#16a34a' : '#ea580c',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              {onboardingQuery.data.overallReadinessScore}%
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('calculator'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'calculator' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'calculator' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <CalculatorIcon size={15} />
          <span>حاسبة وهوامش الأرباح والرسوم</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('studio'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'studio' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'studio' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <FileTextIcon size={15} />
          <span>استوديو الكتالوج والمحتوى والسيو</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('inventory'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'inventory' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'inventory' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <RefreshCwIcon size={15} />
          <span>مطابقة الأكواد وروبوت الأسعار</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: activeTab === 'inventory' ? '#ffffff' : '#e2e8f0',
              color: activeTab === 'inventory' ? '#170e5e' : '#475569',
              fontWeight: 700,
            }}
          >
            {mappings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('inbound'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'inbound' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'inbound' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <TruckIcon size={15} />
          <span>توريد مستودعات FBA/FBN</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: activeTab === 'inbound' ? '#ffffff' : '#e2e8f0',
              color: activeTab === 'inbound' ? '#170e5e' : '#475569',
              fontWeight: 700,
            }}
          >
            {inboundShipmentsQuery.data?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('settlements'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'settlements' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'settlements' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <ReceiptIcon size={15} />
          <span>تسوية كشوف الحسابات والقيود</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '9999px',
              background: activeTab === 'settlements' ? '#ffffff' : '#e2e8f0',
              color: activeTab === 'settlements' ? '#170e5e' : '#475569',
              fontWeight: 700,
            }}
          >
            {settlementsQuery.data?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('orders'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'orders' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'orders' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <ReceiptIcon size={15} />
          <span>سحب وحجز الطلبات</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('analytics'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'analytics' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'analytics' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <SlidersIcon size={15} />
          <span>تحليلات ومؤشرات الأداء</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('amazon'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'amazon' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'amazon' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <PackageIcon size={15} />
          <span>أمازون (SP-API)</span>
          {amazonCfg.enabled ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} /> : null}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('noon'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'noon' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'noon' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <ShoppingCartIcon size={15} />
          <span>نون (Noon)</span>
          {noonCfg.enabled ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} /> : null}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('jumia'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'jumia' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'jumia' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <GlobeIcon size={15} />
          <span>جوميا (Jumia)</span>
          {jumiaCfg.enabled ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} /> : null}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('trendyol'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'trendyol' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'trendyol' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <LayersIcon size={15} />
          <span>ترينديول (Trendyol)</span>
          {trendyolCfg.enabled ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} /> : null}
        </button>
      </div>

      {/* Test Result Banner */}
      {testResult ? (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            background: testResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
            color: testResult.success ? '#15803d' : '#b91c1c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {testResult.success ? <CheckIcon size={16} color="#15803d" strokeWidth={2.5} /> : <AlertTriangleIcon size={16} color="#b91c1c" />}
            <span>{testResult.message}</span>
            {testResult.accountName ? <span style={{ marginRight: '8px', opacity: 0.85 }}>({testResult.accountName})</span> : null}
          </div>
          {testResult.pingMs ? <span style={{ fontSize: '11.5px', opacity: 0.8 }}>زمن الاستجابة: {testResult.pingMs}ms</span> : null}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 0: SELLER ONBOARDING & VERIFICATION ENGINE ("معالج فتح وتأهيل الحساب") */}
      {/* ========================================================================= */}
      {activeTab === 'onboarding' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#eef2ff',
                    color: '#170e5e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckShieldIcon size={18} />
                </span>
                <h4 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>
                  معالج فتح وتأهيل حساب التاجر وفحص الاعتماد (Seller Onboarding & Verification)
                </h4>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                دليلك الذكي لإعداد الأوراق الرسمية والتحقق المسبق من جاهزية ملفك لفتح حساب بائع على أمازون، نون، جوميا، وترينديول وتفادي الرفض الآلي.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOnboardingTargetSection('all');
                  setShowEditOnboardingModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <SlidersIcon size={14} />
                تعديل واستكمال بيانات التاجر
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowLoaModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileTextIcon size={14} />
                خطاب التفويض الرسمي (LOA)
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowGtinModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusIcon size={14} />
                طلب إعفاء الباركود (GTIN)
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPhotoOptimizerModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CameraIcon size={14} />
                فاحص ومحسن صور المنتجات
              </Button>
            </div>
          </div>

          {onboardingQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              جاري فحص وتدقيق بيانات المنشأة ومطابقة السجلات مع معايير المنصات...
            </div>
          ) : onboardingQuery.data ? (
            <>
              {/* Readiness Banner & Name Match Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {/* Readiness Score Card */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                  }}
                >
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: onboardingQuery.data.overallReadinessScore >= 80 ? '#f0fdf4' : '#fff7ed',
                      border: `3px solid ${onboardingQuery.data.overallReadinessScore >= 80 ? '#16a34a' : '#ea580c'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px', fontWeight: 800, color: onboardingQuery.data.overallReadinessScore >= 80 ? '#16a34a' : '#ea580c' }}>
                      {onboardingQuery.data.overallReadinessScore}%
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', marginTop: '-2px' }}>جاهزية</span>
                  </div>

                  <div>
                    <h5 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                      {onboardingQuery.data.overallReadinessScore >= 80 ? 'الملف جاهز بنسبة ممتازة للاعتماد' : 'يرجى استكمال النواقص لتفادي الرفض'}
                    </h5>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                      {onboardingQuery.data.overallReadinessScore >= 80
                        ? 'أوراقك ومستنداتك القانونية مستوفية لأهم شروط الاعتماد الآلي لدى أمازون ونون وجوميا.'
                        : 'هناك حقول ومستندات هامة غير مكتملة، استكمالها يحميك من الرفض الفوري لحسابك الجديد.'}
                    </p>
                  </div>
                </div>

                {/* Name Match Check Alert */}
                <div
                  style={{
                    background: onboardingQuery.data.nameMatchStatus === 'perfect_match' ? '#f0fdf4' : onboardingQuery.data.nameMatchStatus === 'name_mismatch' ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${onboardingQuery.data.nameMatchStatus === 'perfect_match' ? '#bbf7d0' : onboardingQuery.data.nameMatchStatus === 'name_mismatch' ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {onboardingQuery.data.nameMatchStatus === 'perfect_match' ? (
                      <CheckCircleIcon size={18} color="#16a34a" />
                    ) : (
                      <AlertTriangleIcon size={18} color={onboardingQuery.data.nameMatchStatus === 'name_mismatch' ? '#dc2626' : '#ea580c'} />
                    )}
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: onboardingQuery.data.nameMatchStatus === 'perfect_match' ? '#166534' : onboardingQuery.data.nameMatchStatus === 'name_mismatch' ? '#991b1b' : '#334155',
                      }}
                    >
                      فحص تطابق الاسم بالسجل مع الحساب البنكي (Name Match)
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: onboardingQuery.data.nameMatchStatus === 'perfect_match' ? '#15803d' : onboardingQuery.data.nameMatchStatus === 'name_mismatch' ? '#b91c1c' : '#64748b',
                      lineHeight: '1.5',
                    }}
                  >
                    {onboardingQuery.data.nameMatchDetails}
                  </p>
                </div>
              </div>

              {/* 6 Verification Checklist Cards */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    قائمة التحقق المسبق للمستندات والبيانات القانونية (Pre-Flight Document Checklist)
                  </h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    مكتمل: {onboardingQuery.data.checklist.filter((c) => c.status === 'ready').length} من {onboardingQuery.data.checklist.length}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {onboardingQuery.data.checklist.map((item) => {
                    const isReady = item.status === 'ready';
                    const isWarning = item.status === 'warning';

                    return (
                      <div
                        key={item.key}
                        style={{
                          background: '#f8fafc',
                          border: `1px solid ${isReady ? '#bbf7d0' : isWarning ? '#fed7aa' : '#e2e8f0'}`,
                          borderRadius: '10px',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          {(() => {
                            const [arLabel, enLabel] = item.label.includes('(')
                              ? [item.label.split('(')[0].trim(), item.label.split('(')[1].replace(')', '').trim()]
                              : [item.label, ''];

                            return (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                    {arLabel}
                                  </span>
                                  {enLabel ? (
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                      {enLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: isReady ? '#dcfce7' : isWarning ? '#fef3c7' : '#fee2e2',
                                    color: isReady ? '#15803d' : isWarning ? '#b45309' : '#b91c1c',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                >
                                  {isReady ? 'مكتمل' : isWarning ? 'تنبيه' : 'ناقص'}
                                </span>
                              </div>
                            );
                          })()}
                          <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: '1.45' }}>
                            {item.notes}
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.key === 'letter_of_auth') {
                                setShowLoaModal(true);
                              } else {
                                setOnboardingTargetSection(item.key);
                                setShowEditOnboardingModal(true);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#170e5e',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '2px 6px',
                            }}
                          >
                            {item.key === 'letter_of_auth' ? 'استعراض وطباعة الخطاب ➔' : 'تحديث البيان ➔'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step-by-Step Platform Registration Guides */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      دليل التسجيل والاعتماد خطوة بخطوة لكل منصة (Platform Walkthrough)
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                      إرشادات مصممة خصيصاً لمساعدتك على إتمام التسجيل دون تعليق أو أخطاء.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {onboardingQuery.data.platformGuides.map((guide) => (
                      <button
                        key={guide.marketplace}
                        type="button"
                        onClick={() => setActivePlatformGuide(guide.marketplace)}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: 'none',
                          background: activePlatformGuide === guide.marketplace ? '#ffffff' : 'transparent',
                          color: activePlatformGuide === guide.marketplace ? '#170e5e' : '#64748b',
                          boxShadow: activePlatformGuide === guide.marketplace ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {guide.nameAr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Guide Steps */}
                {(() => {
                  const currentGuide = onboardingQuery.data.platformGuides.find((g) => g.marketplace === activePlatformGuide) || onboardingQuery.data.platformGuides[0];
                  if (!currentGuide) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '12.5px', color: '#334155' }}>
                          بوابة التسجيل الرسمية: <strong style={{ color: '#0f172a', direction: 'ltr', display: 'inline-block' }}>{currentGuide.portalUrl}</strong>
                        </span>
                        <a
                          href={currentGuide.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#170e5e',
                            color: '#ffffff',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          فتح بوابة التاجر الرسمية ↗
                        </a>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        {currentGuide.steps.map((st) => (
                          <div
                            key={st.stepNumber}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: '#170e5e',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {st.stepNumber}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                {st.title}
                              </span>
                            </div>

                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                              {st.instruction}
                            </p>

                            {st.tip ? (
                              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', color: '#854d0e', marginTop: '4px' }}>
                                <strong>تلميحة ذهبية:</strong> {st.tip}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 1: PROFIT & FEE CALCULATOR (محرك حساب هوامش الأرباح ورسوم المنصات) */}
      {/* ========================================================================= */}
      {activeTab === 'calculator' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                محرك حساب هوامش الأرباح ورسوم المنصات (Profit & Fee Engine)
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                احسب صافي أرباحك وعمولات أمازون، نون، وجوميا، ومصاريف الشحن والتجهيز والضريبة ونقطة التعادل بدقة من واقع تكلفة الصنف بالـ ERP.
              </p>
            </div>

            {/* Product Quick-Picker */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                اختيار صنف مسجل في الـ ERP لجلب تكلفته وسعر بيعه تلقائياً:
              </label>
              <select
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  const p = availableProducts.find((item) => Number(item.id) === id);
                  if (p) {
                    const updated = {
                      ...calcInput,
                      itemCost: Number((p as any).cost_price ?? (p as any).costPrice ?? 0),
                      sellingPrice: Number((p as any).retail_price ?? (p as any).retailPrice ?? 0),
                    };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
              >
                <option value="">-- اضغط لاختيار صنف من المخزن --</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (التكلفة: {(p as any).costPrice ?? (p as any).cost_price ?? 0} ج.م | سعر البيع: {(p as any).retailPrice ?? (p as any).retail_price ?? 0} ج.م)
                  </option>
                ))}
              </select>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  منصة البيع
                </label>
                <select
                  value={calcInput.marketplace}
                  onChange={(e) => {
                    const updated = { ...calcInput, marketplace: e.target.value as any };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="amazon">أمازون (Amazon SP-API)</option>
                  <option value="noon">نون (Noon Marketplace)</option>
                  <option value="jumia">جوميا (Jumia Seller Center)</option>
                  <option value="trendyol">ترينديول (Trendyol)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  دولة وسوق البيع
                </label>
                <select
                  value={calcInput.region}
                  onChange={(e) => {
                    const updated = { ...calcInput, region: e.target.value as any };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="eg">مصر (EGP - ج.م)</option>
                  <option value="sa">السعودية (SAR - ر.س)</option>
                  <option value="ae">الإمارات (AED - د.إ)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  فئة وتصنيف المنتج
                </label>
                <select
                  value={calcInput.category}
                  onChange={(e) => {
                    const updated = { ...calcInput, category: e.target.value };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="electronics">إلكترونيات وكمبيوتر (عمولة ~7-8%)</option>
                  <option value="mobile_accessories">إكسسوارات موبايل (عمولة ~12-14%)</option>
                  <option value="apparel">ملابس وأزياء وأحذية (عمولة ~15%)</option>
                  <option value="home_kitchen">أدوات منزلية ومطبخ (عمولة ~11-12%)</option>
                  <option value="beauty_health">عطور وصحة وتجميل (عمولة ~12%)</option>
                  <option value="grocery">سوبرماركت وأغذية (عمولة ~9%)</option>
                  <option value="baby_toys">ألعاب ومستلزمات أطفال (عمولة ~12%)</option>
                  <option value="sports_outdoors">رياضة ولياقة بدنية (عمولة ~13%)</option>
                  <option value="general">فئات عامة وأخرى (عمولة ~12%)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  نمط الشحن والتجهيز
                </label>
                <select
                  value={calcInput.fulfillmentType}
                  onChange={(e) => {
                    const updated = { ...calcInput, fulfillmentType: e.target.value };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="fba">FBA / FBN / Express (مستودعات المنصة الرسمية)</option>
                  <option value="fbm">FBM / Direct (شحن مباشر من مستودعك الخاص)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  وزن وحجم الطرد
                </label>
                <select
                  value={calcInput.weightTier}
                  onChange={(e) => {
                    const updated = { ...calcInput, weightTier: e.target.value as any };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="small">طرد صغير وخفيف (أقل من 250 جرام)</option>
                  <option value="standard">طرد قياسي (250 جرام إلى 1 كجم)</option>
                  <option value="medium">طرد متوسط (1 كجم إلى 2 كجم)</option>
                  <option value="large">طرد كبير (2 كجم إلى 5 كجم)</option>
                  <option value="heavy">طرد ثقيل (أكثر من 5 كجم)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سعر البيع المستهدف للمستهلك *
                </label>
                <input
                  type="number"
                  value={calcInput.sellingPrice || ''}
                  onChange={(e) => {
                    const updated = { ...calcInput, sellingPrice: parseFloat(e.target.value) || 0 };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, color: '#170e5e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  تكلفة شراء الصنف (ERP Cost) *
                </label>
                <input
                  type="number"
                  value={calcInput.itemCost || ''}
                  onChange={(e) => {
                    const updated = { ...calcInput, itemCost: parseFloat(e.target.value) || 0 };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  شحن لمستودع المنصة + تغليف
                </label>
                <input
                  type="number"
                  value={(calcInput.inboundShippingCost || 0) + (calcInput.packagingCost || 0)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = { ...calcInput, inboundShippingCost: val, packagingCost: 0 };
                    setCalcInput(updated);
                    calcMutation.mutate(updated);
                  }}
                  placeholder="0"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Real-time Results Dashboard */}
            {calcResult ? (
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                    تقرير الربحية الصافية والتحليل المالي للقطعة:
                  </span>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      background:
                        calcResult.ratingStatus === 'exceptional'
                          ? '#f0fdf4'
                          : calcResult.ratingStatus === 'healthy'
                          ? '#eff6ff'
                          : calcResult.ratingStatus === 'tight'
                          ? '#fefce8'
                          : '#fef2f2',
                      color:
                        calcResult.ratingStatus === 'exceptional'
                          ? '#15803d'
                          : calcResult.ratingStatus === 'healthy'
                          ? '#1d4ed8'
                          : calcResult.ratingStatus === 'tight'
                          ? '#a16207'
                          : '#b91c1c',
                      border: `1px solid ${
                        calcResult.ratingStatus === 'exceptional'
                          ? '#bbf7d0'
                          : calcResult.ratingStatus === 'healthy'
                          ? '#bfdbfe'
                          : calcResult.ratingStatus === 'tight'
                          ? '#fef08a'
                          : '#fecaca'
                      }`,
                    }}
                  >
                    {calcResult.ratingStatus === 'exceptional'
                      ? 'ربحية استثنائية (25%+)'
                      : calcResult.ratingStatus === 'healthy'
                      ? 'ربحية صحية وممتازة (12% - 24%)'
                      : calcResult.ratingStatus === 'tight'
                      ? 'هامش ربح ضيق (أقل من 12%)'
                      : 'خسارة محققة على المنصة!'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>سعر البيع للمستهلك</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                      {calcResult.sellingPrice} {calcResult.currency}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>
                      عمولة البيع ({calcResult.referralRatePercent}%)
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                      -{calcResult.referralFee} {calcResult.currency}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>الشحن والتجهيز + الإغلاق</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                      -{(calcResult.fulfillmentFee + calcResult.closingFee).toFixed(1)} {calcResult.currency}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>ضريبة القيمة المضافة ({calcResult.vatRatePercent}%)</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                      -{calcResult.vatOnFees} {calcResult.currency}
                    </div>
                  </div>

                  <div style={{ background: '#f0f9ff', padding: '14px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: 700 }}>صافي المحول لحساب البنك</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#0369a1', marginTop: '4px' }}>
                      {calcResult.netPayoutToMerchant} {calcResult.currency}
                    </div>
                  </div>

                  <div
                    style={{
                      background: calcResult.netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                      padding: '14px',
                      borderRadius: '10px',
                      border: `1px solid ${calcResult.netProfit >= 0 ? '#bbf7d0' : '#fecaca'}`,
                    }}
                  >
                    <div style={{ fontSize: '11.5px', color: calcResult.netProfit >= 0 ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                      صافي الربح الحقيقي
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: calcResult.netProfit >= 0 ? '#15803d' : '#b91c1c', marginTop: '4px' }}>
                      {calcResult.netProfit} {calcResult.currency}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      هامش الربح: <strong style={{ color: calcResult.netProfit >= 0 ? '#15803d' : '#b91c1c' }}>{calcResult.netMarginPercent}%</strong>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>أدنى سعر للتعادل (Break-Even)</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                      {calcResult.breakEvenPrice} {calcResult.currency}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>أقل من هذا السعر يسبب خسارة</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 2: LISTING STUDIO ("ستوديو / ليو") */}
      {/* ========================================================================= */}
      {activeTab === 'studio' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                استوديو تجهيز المنتجات وسيو المنصات (Content & Listing Studio)
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                توليد عناوين احترافية متوافقة مع خوارزميات أمازون ونون، و5 نقاط بيعية رئيسية (Bullet Points)، والكلمات المفتاحية الخلفية (Backend Keywords).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <select
                  value={studioProductId}
                  onChange={(e) => setStudioProductId(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value={0}>-- اختر صنفاً لتوليد صفحات البيع والسيو له --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.barcode ? `(${p.barcode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  if (!studioProductId) {
                    toast.error('يرجى اختيار صنف أولاً');
                    return;
                  }
                  studioMutation.mutate(studioProductId);
                }}
                disabled={studioMutation.isPending || !studioProductId}
                style={{ background: '#170e5e', color: '#ffffff', minWidth: '150px' }}
              >
                {studioMutation.isPending ? 'جاري التوليد والتحليل...' : 'توليد محتوى وسيو القائمة'}
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  if (studioProductId) {
                    setGtinForm({
                      productId: studioProductId,
                      brandName: '',
                      category: 'Home & Kitchen / الأدوات المنزلية',
                      marketplace: 'amazon',
                      reason: 'unbranded',
                    });
                  }
                  setShowGtinModal(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <PlusIcon size={14} />
                <span>طلب إعفاء الباركود (GTIN)</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowPhotoOptimizerModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <CameraIcon size={14} />
                <span>فاحص ومحسن صور المنصات</span>
              </Button>
            </div>

            {studioResult ? (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    تم تجهيز محتوى الإدراج والسيو بنجاح للصنف: {studioResult.productName}
                  </span>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const fullListing = `[العنوان العربي]\n${studioResult.optimizedTitleAr}\n\n[English Title]\n${studioResult.optimizedTitleEn}\n\n[النقاط البيعية الـ 5]\n• ${studioResult.bulletPointsAr.join('\n• ')}\n\n[Backend Keywords]\n${studioResult.backendKeywordsAr}`;
                      handleCopy(fullListing, 'fullListing');
                    }}
                    style={{ background: '#170e5e', color: '#ffffff', fontSize: '11.5px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CopyIcon size={13} />
                    <span>{copiedKey === 'fullListing' ? 'تم نسخ كامل المحتوى!' : 'نسخ كامل محتوى القائمة'}</span>
                  </Button>
                </div>

                {/* Titles Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                      عنوان المنتج المحسّن لمحركات بحث أمازون ونون (Arabic Title):
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => handleCopy(studioResult.optimizedTitleAr, 'titleAr')}
                      style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CopyIcon size={12} />
                      <span>{copiedKey === 'titleAr' ? 'تم النسخ!' : 'نسخ العنوان'}</span>
                    </Button>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                    {studioResult.optimizedTitleAr}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                      عنوان المنتج بالإنجليزية (English Title):
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => handleCopy(studioResult.optimizedTitleEn, 'titleEn')}
                      style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CopyIcon size={12} />
                      <span>{copiedKey === 'titleEn' ? 'تم النسخ!' : 'Copy English'}</span>
                    </Button>
                  </div>
                  <div dir="ltr" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#0f172a', fontWeight: 600, textAlign: 'left' }}>
                    {studioResult.optimizedTitleEn}
                  </div>
                </div>

                {/* 5 Bullet Points */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                      النقاط البيعية الـ 5 الرئيسية (5 Key Product Features / Bullets):
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => handleCopy(studioResult.bulletPointsAr.join('\n• '), 'bulletsAr')}
                      style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CopyIcon size={12} />
                      <span>{copiedKey === 'bulletsAr' ? 'تم النسخ!' : 'نسخ كافة النقاط'}</span>
                    </Button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {studioResult.bulletPointsAr.map((bp, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                        <span style={{ background: '#170e5e', color: '#ffffff', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                          {idx + 1}
                        </span>
                        <span style={{ color: '#334155', lineHeight: 1.5 }}>{bp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Backend Keywords */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                      الكلمات المفتاحية الخلفية (Amazon Backend Search Terms):
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => handleCopy(studioResult.backendKeywordsAr, 'keywordsAr')}
                      style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CopyIcon size={12} />
                      <span>{copiedKey === 'keywordsAr' ? 'تم النسخ!' : 'نسخ الكلمات'}</span>
                    </Button>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12.5px', color: '#475569', fontFamily: 'monospace' }}>
                    {studioResult.backendKeywordsAr}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {studioProductId > 0 ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    {(() => {
                      const p = availableProducts.find((item) => Number(item.id) === studioProductId);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                            الصنف المختار: {p?.name || '—'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            الباركود: <strong style={{ color: '#0f172a' }}>{p?.barcode || 'غير مسجل'}</strong> | سعر البيع: <strong style={{ color: '#15803d' }}>{(p as any)?.retailPrice ?? (p as any)?.retail_price ?? 0} ج.م</strong> | تكلفة الشراء: <strong style={{ color: '#0369a1' }}>{(p as any)?.costPrice ?? (p as any)?.cost_price ?? 0} ج.م</strong>
                          </div>
                        </div>
                      );
                    })()}
                    <Button
                      variant="primary"
                      onClick={() => studioMutation.mutate(studioProductId)}
                      disabled={studioMutation.isPending}
                      style={{ background: '#170e5e', color: '#ffffff', minWidth: '160px' }}
                    >
                      {studioMutation.isPending ? 'جاري التوليد والتحليل...' : 'بدء التوليد الذكي للقائمة'}
                    </Button>
                  </div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e', marginBottom: '4px' }}>
                      صياغة العناوين التنافسية (SEO Titles)
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                      توليد عناوين عربية وإنجليزية تجمع اسم الماركة، الموديل، اللون، والحجم لرفع نسبة النقر (CTR) مع الالتزام بحد الـ 200 حرف.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d', marginBottom: '4px' }}>
                      النقاط البيعية الـ 5 المقنعة (Bullet Points)
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                      صياغة 5 مميزات تفصيلية تركز على جودة الخامات وسهولة الاستخدام لحث المشتري على إتمام الطلب وزيادة التحويل.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>
                      الكلمات المفتاحية الخلفية (Backend Keywords)
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                      استخراج الكلمات البحثية الأكثر صلة دون تكرار أو علامات ترقيم لتغذية خوارزمية محرك البحث A9 في أمازون ونون.
                    </p>
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e40af', marginBottom: '4px' }}>
                    شروط وقواعد إدراج المنتجات الرسمية لتفادي حظر القوائم (Listing Guidelines):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px', fontSize: '11.5px', color: '#1e3a8a', lineHeight: 1.5 }}>
                    <div>• <strong>العناوين:</strong> يُمنع كتابة عبارات تسويقية مثل (Best Seller أو 100% Free Shipping أو تخفيض).</div>
                    <div>• <strong>الصور الأساسية:</strong> خلفية بيضاء نقية تماماً (RGB: 255, 255, 255) بنسبة تغطية للمنتج لا تقل عن 85%.</div>
                    <div>• <strong>أبعاد الصورة:</strong> دقة لا تقل عن 1000 × 1000 بكسل لتفعيل خاصية التكبير التفاعلي (Zoom-in).</div>
                    <div>• <strong>الكلمات الخلفية:</strong> لا تكرر الكلمات الموجودة في العنوان، ولا تستخدم علامات ترقيم أو فواصل.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 3: INVENTORY SYNC, SKU MAPPING & REPRICER (مطابقة الأكواد وروبوت الأسعار) */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي الأصناف المربوطة</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {mappings.length}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>رابح لصندوق الشراء (Buy Box)</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                {winningCount}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>في خطر فقدان المبيعات</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                {atRiskCount}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>خاسر لصندوق الشراء</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>
                {losingCount}
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  جدول مطابقة الأكواد (SKU Mapping) وتتبع أسعار المنافسين والـ Buy Box
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  مزامنة الأرصدة الحية، مراقبة أسعار المنافسين لنفس الـ ASIN، وتصدير شيتات الإكسيل الرسمية للرفع المباشر.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowBulkImportModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                >
                  <UploadIcon size={14} />
                  <span>استيراد شيت (CSV / Excel)</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleExportFlatFile('amazon')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                >
                  <DownloadIcon size={14} />
                  <span>تصدير أمازون (TSV)</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleExportFlatFile('noon')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                >
                  <DownloadIcon size={14} />
                  <span>تصدير نون (CSV)</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => liveSyncMutation.mutate(undefined)}
                  disabled={liveSyncMutation.isPending || !mappings.length}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                >
                  <RefreshCwIcon size={14} />
                  <span>{liveSyncMutation.isPending ? 'جاري البث...' : 'بث لحظي للمخزون'}</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => runRepricingMutation.mutate(selectedInventoryPlatform === 'all' ? undefined : selectedInventoryPlatform)}
                  disabled={runRepricingMutation.isPending || !mappings.length}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', borderColor: '#cbd5e1' }}
                  title="تشغيل روبوت إعادة التسعير الآلي لمطابقة أو النزول عن الـ Buy Box"
                >
                  <SlidersIcon size={14} />
                  <span>{runRepricingMutation.isPending ? 'جاري الرصد والتسعير...' : 'تشغيل روبوت التسعير'}</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={() => setShowAddModal(true)}
                  style={{ background: '#170e5e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <PlusIcon size={14} />
                  <span>ربط صنف جديد</span>
                </Button>
              </div>
            </div>

            {/* Platform Filter Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              {(['all', 'amazon', 'noon', 'jumia', 'trendyol'] as const).map((plt) => (
                <button
                  key={plt}
                  type="button"
                  onClick={() => setSelectedInventoryPlatform(plt)}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: selectedInventoryPlatform === plt ? '#170e5e' : '#f1f5f9',
                    color: selectedInventoryPlatform === plt ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {plt === 'all'
                    ? 'الكل'
                    : plt === 'amazon'
                    ? 'أمازون'
                    : plt === 'noon'
                    ? 'نون'
                    : plt === 'jumia'
                    ? 'جوميا'
                    : 'ترينديول'}
                </button>
              ))}
            </div>

            {mappingsQuery.isLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                جاري تحميل جدول مطابقة الأكواد...
              </div>
            ) : !filteredMappings.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <LinkIcon size={32} color="#94a3b8" />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                    لا توجد أصناف مربوطة حالياً في قسم {selectedInventoryPlatform === 'all' ? 'المنصات' : selectedInventoryPlatform === 'amazon' ? 'أمازون' : selectedInventoryPlatform === 'noon' ? 'نون' : selectedInventoryPlatform === 'jumia' ? 'جوميا' : 'ترينديول'}
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#64748b', maxWidth: '520px', margin: '6px auto 16px', lineHeight: 1.5 }}>
                    ابدأ بربط أصناف الـ ERP مع أكواد ASIN أو Partner SKU لمزامنة الأرصدة وتفعيل روبوت تتبع أسعار المنافسين والـ Buy Box تلقائياً.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      onClick={() => setShowAddModal(true)}
                      style={{ background: '#170e5e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                    >
                      <PlusIcon size={14} />
                      <span>ربط صنف جديد الآن</span>
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => setShowBulkImportModal(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                    >
                      <UploadIcon size={14} />
                      <span>استيراد شيت مجمع (CSV / Excel)</span>
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={handleDownloadSampleMappingTemplate}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                    >
                      <DownloadIcon size={14} />
                      <span>تحميل نموذج الشيت التجريبي (.CSV)</span>
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e', marginBottom: '4px' }}>
                      1. مزامنة الأرصدة الحية
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                      تحديث المخزون على المنصات فور حدوث أي بيع محلي في الكاشير أو المناديب لتجنب غرامات إلغاء الطلبات (Cancellation Rate).
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d', marginBottom: '4px' }}>
                      2. روبوت تتبع الـ Buy Box
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                      مراقبة عروض المنافسين لحظياً وإعادة التسعير الذكي بإنقاص جنيه أو نسبة محددة مع الالتزام بالحد الأدنى لحماية أرباحك.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>
                      3. تصدير ملفات الرفع الرسمية
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                      تصدير شيتات Inventory Loader لأمازون (TSV) ونون (CSV) معدة مسبقاً بالأعمدة الرسمية لرفع آلاف الأصناف بضغطة زر.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>اسم الصنف والتكلفة بالـ ERP</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>المنصة</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>كود المنصة (ASIN / SKU)</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>رصيد المخزن</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>سعرنا على المنصة</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>سعر المنافس / Buy Box</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>حالة صندوق الشراء</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.productName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            تكلفة: {m.costPrice || 0} ج.م | بيع محلي: {m.retailPrice || 0} ج.م
                          </div>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              background:
                                m.marketplace === 'amazon'
                                  ? '#fef3c7'
                                  : m.marketplace === 'noon'
                                  ? '#fef9c3'
                                  : m.marketplace === 'jumia'
                                  ? '#ffedd5'
                                  : '#e0e7ff',
                              color:
                                m.marketplace === 'amazon'
                                  ? '#92400e'
                                  : m.marketplace === 'noon'
                                  ? '#854d0e'
                                  : m.marketplace === 'jumia'
                                  ? '#9a3412'
                                  : '#3730a3',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            {m.marketplace.toUpperCase()}
                          </span>
                        </td>

                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>
                          {m.marketplaceSku}
                        </td>

                        <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>
                          {m.currentLocalStock ?? 0} قطعة
                        </td>

                        <td style={{ padding: '12px', fontWeight: 800, color: '#170e5e' }}>
                          {m.customPrice ? `${m.customPrice} ج.م (مخصص)` : `${m.retailPrice || 0} ج.م`}
                        </td>

                        <td style={{ padding: '12px' }}>
                          {m.buyBoxPrice ? (
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {m.buyBoxPrice} ج.م
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>غير مسجل</span>
                          )}
                          {m.competitorPrice ? (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              المنافس: {m.competitorPrice} ج.م
                            </div>
                          ) : null}
                        </td>

                        <td style={{ padding: '12px' }}>
                          {m.buyBoxStatus === 'winning' ? (
                            <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckIcon size={11} color="#15803d" strokeWidth={2.5} />
                              <span>رابح للـ Buy Box</span>
                            </span>
                          ) : m.buyBoxStatus === 'at_risk' ? (
                            <span style={{ background: '#fefce8', color: '#a16207', border: '1px solid #fef08a', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                              في خطر (+5%)
                            </span>
                          ) : m.buyBoxStatus === 'losing' ? (
                            <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                              خاسر لصندوق الشراء
                            </span>
                          ) : (
                            <span style={{ background: '#f8fafc', color: '#64748b', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                              متزامن
                            </span>
                          )}
                          {m.repricingEnabled ? (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <span>روبوت: {m.minPrice ? `${m.minPrice}` : '0'}-{m.maxPrice ? `${m.maxPrice}` : '∞'} ج.م</span>
                              </span>
                            </div>
                          ) : null}
                        </td>

                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setEditPriceModal(m);
                                setEditCompetitorPrice(m.competitorPrice ? String(m.competitorPrice) : '');
                                setEditBuyBoxPrice(m.buyBoxPrice ? String(m.buyBoxPrice) : '');
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              تعديل المنافسة
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() => {
                                setEditRepricingModal(m);
                                setRepricingForm({
                                  repricingEnabled: m.repricingEnabled ?? false,
                                  minPrice: m.minPrice ? String(m.minPrice) : '',
                                  maxPrice: m.maxPrice ? String(m.maxPrice) : '',
                                  repricingRule: (m.repricingRule as any) ?? 'undercut_buy_box',
                                  repricingDelta: m.repricingDelta ? String(m.repricingDelta) : '1',
                                });
                              }}
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: m.repricingEnabled ? '#f0fdf4' : undefined,
                                borderColor: m.repricingEnabled ? '#86efac' : undefined,
                                color: m.repricingEnabled ? '#15803d' : undefined,
                              }}
                              title="إعدادات وقواعد روبوت إعادة التسعير الآلي للـ Buy Box"
                            >
                              <SlidersIcon size={12} />
                              <span>{m.repricingEnabled ? 'الروبوت نشط' : 'قواعد الروبوت'}</span>
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() => {
                                setPrintFnskuModal({
                                  productName: m.productName || 'صنف ماركت بليس',
                                  marketplaceSku: m.marketplaceSku,
                                  barcode: m.barcode,
                                  condition: 'NEW',
                                  marketplace: m.marketplace,
                                  format: 'thermal_50x30',
                                  copies: 1,
                                });
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="طباعة ملصق وباركود FNSKU الحراري للصنف"
                            >
                              <PrinterIcon size={12} />
                              <span>طباعة FNSKU</span>
                            </Button>

                            <Button
                              variant="danger"
                              onClick={() => deleteMappingMutation.mutate(m.id)}
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              إلغاء الربط
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB: FBA / FBN INBOUND SHIPMENTS WORKFLOW */}
      {/* ========================================================================= */}
      {activeTab === 'inbound' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary KPI Cards */}
          {(() => {
            const list = inboundShipmentsQuery.data || [];
            const totalShipments = list.length;
            const amazonCount = list.filter((s) => s.marketplace === 'amazon').length;
            const noonCount = list.filter((s) => s.marketplace === 'noon').length;
            const totalUnits = list.reduce((sum, s) => sum + (s.totalUnits || 0), 0);
            const totalBoxes = list.reduce((sum, s) => sum + (s.totalBoxes || 0), 0);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي أذونات التوريد للمستودعات</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {totalShipments} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>شحنة</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>شحنات أمازون FBA</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
                    {amazonCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>إذن شحن</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#854d0e', fontWeight: 600 }}>شحنات نون FBN</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#854d0e', marginTop: '4px' }}>
                    {noonCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>إذن شحن</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>إجمالي القطع المشحونة للمراكز</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    {totalUnits.toLocaleString('en-US')} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>قطعة ({totalBoxes} كرتونة)</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Main Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TruckIcon size={18} color="#170e5e" />
                  <span>أذونات الشحن والتوريد لمستودعات FBA و FBN</span>
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  إدارة وتجهيز الشحنات المرسلة لمراكز Fulfillment By Amazon و Fulfillment By Noon، حجز المخزون، وتصدير كشوف التعبئة للكراتين (Packing Slips).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="primary"
                  onClick={() => setShowInboundModal(true)}
                  style={{ background: '#170e5e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                >
                  <PlusIcon size={14} />
                  <span>إنشاء إذن توريد جديد (FBA/FBN)</span>
                </Button>
              </div>
            </div>

            {/* Inbound Shipments Table */}
            {inboundShipmentsQuery.isLoading ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>جاري تحميل أذونات التوريد...</div>
            ) : !inboundShipmentsQuery.data || inboundShipmentsQuery.data.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  <TruckIcon size={32} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>لا توجد أذونات شحن أو توريد مسجلة حتى الآن</div>
                  <p style={{ fontSize: '12.5px', color: '#64748b', maxWidth: '540px', margin: '6px auto 16px', lineHeight: 1.5 }}>
                    يمكنك إنشاء إذن توريد جديد لحجز المخزون من مستودعك المحلي وتصدير ملصقات الكراتين المتوافقة مع مراكز توزيع أمازون FBA ونون FBN.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowInboundModal(true)}
                    style={{ background: '#170e5e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                  >
                    <PlusIcon size={14} />
                    <span>إنشاء أول إذن توريد الآن (FBA/FBN)</span>
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>1</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>حجز المخزون المحلي</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                      إنشاء الإذن يحجز الكميات المحددة فوراً داخل الـ ERP لحمايتها من البيع في الفروع أو الكاشير.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>2</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>توزيع الكراتين والوجهة</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                      تحديد مركز الشحن (مثل مستودع أمازون العاشر من رمضان CAI1 أو نون EG01) وتوزيع القطع بالكرتونة.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>3</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>كشف التعبئة وبوليصة الكرتونة</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                      طباعة كشف المحتويات الرسمي (Packing Slip) وملصقات الكراتين الخارجية للتحقق عند الاستلام.
                    </p>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>4</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>طباعة باركود القطع FNSKU</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                      توليد باركودات القطع الحرارية بمقاس 50x30 أو 40x25 ولصقها على كل وحدة قبل الإغلاق.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px' }}>رقم الإذن</th>
                      <th style={{ padding: '10px 12px' }}>المنصة والوجهة</th>
                      <th style={{ padding: '10px 12px' }}>مركز التوزيع (FC)</th>
                      <th style={{ padding: '10px 12px' }}>الكراتين / القطع</th>
                      <th style={{ padding: '10px 12px' }}>رقم التتبع / البوليصة</th>
                      <th style={{ padding: '10px 12px' }}>الحالة</th>
                      <th style={{ padding: '10px 12px' }}>تاريخ الإنشاء</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>كشف التعبئة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboundShipmentsQuery.data.map((shipment) => (
                      <tr key={shipment.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>
                          {shipment.shipmentNumber}
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              background: shipment.marketplace === 'amazon' ? '#fef3c7' : '#fef9c3',
                              color: shipment.marketplace === 'amazon' ? '#92400e' : '#854d0e',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            {shipment.marketplace === 'amazon' ? 'أمازون FBA' : 'نون FBN'}
                          </span>
                        </td>

                        <td style={{ padding: '12px', fontWeight: 600, color: '#334155' }}>
                          {shipment.fulfillmentCenterId}
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{shipment.totalUnits} قطعة</span>
                          <span style={{ color: '#64748b', fontSize: '11.5px', marginRight: '6px' }}>({shipment.totalBoxes} كرتونة)</span>
                        </td>

                        <td style={{ padding: '12px', fontFamily: 'monospace', color: shipment.trackingNumber ? '#0f172a' : '#94a3b8' }}>
                          {shipment.trackingNumber || '—'}
                        </td>

                        <td style={{ padding: '12px' }}>
                          {shipment.status === 'draft' ? (
                            <span style={{ background: '#f8fafc', color: '#64748b', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                              مسودة وتجهيز
                            </span>
                          ) : shipment.status === 'shipped' ? (
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                              تم الشحن في الطريق
                            </span>
                          ) : (shipment.totalDiscrepancyUnits || 0) > 0 ? (
                            <div>
                              <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-block' }}>
                                عجز: {shipment.totalDiscrepancyUnits} قطعة ({shipment.discrepancyLossAmount || 0} ج.م)
                              </span>
                              <div style={{ marginTop: '3px' }}>
                                <button
                                  type="button"
                                  onClick={() => loadClaimReportMutation.mutate(shipment.id)}
                                  style={{ border: 'none', background: 'transparent', color: '#b91c1c', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                                >
                                  تقرير المطالبة بالتعويض
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                              تم الاستلام بالكامل
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px', color: '#64748b', fontSize: '11.5px' }}>
                          {formatDateTimeArabic(shipment.createdAt)}
                        </td>

                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                const initItems: { [sku: string]: string } = {};
                                shipment.items.forEach((it) => {
                                  initItems[it.marketplaceSku] = String(it.quantityReceived ?? it.quantityShipped);
                                });
                                setReceiveFormItems(initItems);
                                setReceiveShipmentModal(shipment);
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="تسجيل الفحص ومطابقة الكميات المستلمة في مستودع المنصة"
                            >
                              <CheckIcon size={12} />
                              <span>{shipment.status === 'received' ? 'تعديل الفحص' : 'فحص واستلام'}</span>
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() => {
                                const firstItem = shipment.items[0];
                                setPrintFnskuModal({
                                  productName: firstItem?.productName || shipment.shipmentNumber,
                                  marketplaceSku: firstItem?.marketplaceSku || shipment.shipmentNumber,
                                  barcode: firstItem?.barcode,
                                  condition: 'NEW',
                                  marketplace: shipment.marketplace,
                                  format: 'thermal_50x30',
                                  copies: firstItem?.quantityShipped || 10,
                                });
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="طباعة ملصقات وباركودات FNSKU للقطع المشحونة"
                            >
                              <PrinterIcon size={12} />
                              <span>طباعة FNSKU</span>
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() => handleExportPackingSlip(shipment.id)}
                              style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="تحميل كشف التعبئة المخصص لكراتين المنصة"
                            >
                              <DownloadIcon size={12} />
                              <span>كشف التعبئة</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB: SETTLEMENT RECONCILIATION & DOUBLE-ENTRY GL POSTING */}
      {/* ========================================================================= */}
      {activeTab === 'settlements' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Strip */}
          {(() => {
            const list = settlementsQuery.data || [];
            const gross = list.reduce((sum, s) => sum + Number(s.grossSales || 0), 0);
            const referral = list.reduce((sum, s) => sum + Number(s.referralFees || 0), 0);
            const fulfillment = list.reduce((sum, s) => sum + Number(s.fulfillmentFees || 0), 0);
            const net = list.reduce((sum, s) => sum + Number(s.netPayout || 0), 0);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي مبيعات المنصات المسواة</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {gross.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>إجمالي عمولات ورسوم البيع</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                    {referral.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>مصاريف الشحن والتخزين (FBA/FBN)</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>
                    {fulfillment.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>صافي الإيداعات البنكية المسجلة</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    {net.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Table Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  كشوف حسابات الماركت بليس والتسوية المحاسبية والقيود اليومية
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  تسوية مبالغ إيداعات البنك الدورية، فك تشابك الخصومات والعمولات، وتوليد قيود محاسبية مزدوجة متزنة برقم رسمي.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => setShowReconcileModal(true)}
                style={{ background: '#170e5e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
              >
                <PlusIcon size={14} />
                <span>تسوية كشف حساب جديد وإنشاء القيد</span>
              </Button>
            </div>

            {/* Platform Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              {(['all', 'amazon', 'noon', 'jumia', 'trendyol'] as const).map((plt) => (
                <button
                  key={plt}
                  type="button"
                  onClick={() => setSelectedSettlementPlatform(plt)}
                  style={{
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: selectedSettlementPlatform === plt ? 700 : 500,
                    background: selectedSettlementPlatform === plt ? '#170e5e' : '#f8fafc',
                    color: selectedSettlementPlatform === plt ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {plt === 'all' && 'الكل'}
                  {plt === 'amazon' && 'أمازون (Amazon)'}
                  {plt === 'noon' && 'نون (Noon)'}
                  {plt === 'jumia' && 'جوميا (Jumia)'}
                  {plt === 'trendyol' && 'ترينديول (Trendyol)'}
                </button>
              ))}
            </div>

            {/* Settlements Table */}
            {(() => {
              const allList = settlementsQuery.data || [];
              const filtered = selectedSettlementPlatform === 'all'
                ? allList
                : allList.filter((s) => s.marketplace === selectedSettlementPlatform);

              if (settlementsQuery.isLoading) {
                return (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    جاري تحميل سجل كشوف الحسابات...
                  </div>
                );
              }

              if (!filtered.length) {
                return (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                    <ReceiptIcon size={36} color="#94a3b8" />
                    <div style={{ marginTop: '10px', fontWeight: 700, fontSize: '14px', color: '#334155' }}>
                      لا توجد كشوف حسابات مسواة حتى الآن
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '12.5px', color: '#64748b', maxWidth: '420px', marginInline: 'auto' }}>
                      عند استلام كشف الحساب البنكي من أمازون أو نون، اضغط على «تسوية كشف حساب جديد» لتوليد القيد المالي المزدوج آلياً وربط المبيعات بالحساب البنكي.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                        <th style={{ padding: '10px 12px' }}>المنصة</th>
                        <th style={{ padding: '10px 12px' }}>رقم كشف الحساب</th>
                        <th style={{ padding: '10px 12px' }}>الفترة الزمنية</th>
                        <th style={{ padding: '10px 12px' }}>إجمالي المبيعات</th>
                        <th style={{ padding: '10px 12px' }}>عمولة البيع</th>
                        <th style={{ padding: '10px 12px' }}>الشحن والتخزين</th>
                        <th style={{ padding: '10px 12px' }}>المرتجعات والتسويات</th>
                        <th style={{ padding: '10px 12px' }}>صافي المستلم بالبنك</th>
                        <th style={{ padding: '10px 12px' }}>رقم القيد اليومي</th>
                        <th style={{ padding: '10px 12px' }}>تاريخ التسوية</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background:
                                  s.marketplace === 'amazon'
                                    ? '#fef3c7'
                                    : s.marketplace === 'noon'
                                    ? '#fef9c3'
                                    : s.marketplace === 'jumia'
                                    ? '#fed7aa'
                                    : '#e0e7ff',
                                color:
                                  s.marketplace === 'amazon'
                                    ? '#92400e'
                                    : s.marketplace === 'noon'
                                    ? '#854d0e'
                                    : s.marketplace === 'jumia'
                                    ? '#c2410c'
                                    : '#3730a3',
                              }}
                            >
                              {s.marketplace.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>
                            {s.settlementId}
                          </td>
                          <td style={{ padding: '12px', color: '#64748b' }}>
                            {s.periodStart} إلى {s.periodEnd}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>
                            {Number(s.grossSales).toLocaleString('en-US', { minimumFractionDigits: 2 })} {s.currency || 'ج.م'}
                          </td>
                          <td style={{ padding: '12px', color: '#b45309', fontWeight: 600 }}>
                            -{Number(s.referralFees).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px', color: '#6366f1', fontWeight: 600 }}>
                            -{Number(s.fulfillmentFees).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px', color: '#b91c1c' }}>
                            -{(Number(s.refunds || 0) + Number(s.storageOrOtherFees || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#15803d', fontSize: '13px' }}>
                            {Number(s.netPayout).toLocaleString('en-US', { minimumFractionDigits: 2 })} {s.currency || 'ج.م'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {s.journalEntryNo ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#ecfdf5',
                                  color: '#065f46',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '11.5px',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                <CheckIcon size={12} />
                                <span>{s.journalEntryNo}</span>
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#64748b', fontSize: '11.5px' }}>
                            {s.reconciledAt ? formatDateTimeArabic(s.reconciledAt) : '—'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: '#dcfce7',
                                color: '#166534',
                              }}
                            >
                              مسوى رسمياً
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 4: ORDERS PULL & SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'orders' ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              سحب ومحاكاة الطلبات الخارجية وحماية المخزون (Stock Shield & Notifications)
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              عند ورود طلب من أمازون أو نون، يقوم النظام تلقائياً بخصم وحجز الكمية من المخزن المحلي لمنع بيعها محلياً، وإرسال تنبيه فوري بالواتساب.
            </p>
          </div>

          {simulatedOrderInfo ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', color: '#15803d', fontSize: '13.5px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>{simulatedOrderInfo}</div>
              <Button variant="secondary" onClick={() => setSimulatedOrderInfo(null)} style={{ fontSize: '11px', padding: '2px 8px' }}>
                إغلاق
              </Button>
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackageIcon size={20} color="#170e5e" />
                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                  اختبار سحب طلب من أمازون (Amazon Order Simulation)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                محاكاة وصول طلب جديد من سوق أمازون؛ ينشئ طلباً إلكترونياً، ويحجز الصنف، ويخصم رصيد المخزن فورياً عبر ledger.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <Button
                  variant="primary"
                  onClick={() => simulateOrderMutation.mutate('amazon')}
                  disabled={simulateOrderMutation.isPending}
                  style={{ background: '#170e5e', color: '#ffffff', width: '100%' }}
                >
                  {simulateOrderMutation.isPending ? 'جاري المحاكاة والحجز...' : 'اختبار سحب طلب أمازون'}
                </Button>
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCartIcon size={20} color="#b45309" />
                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                  اختبار سحب طلب من نون (Noon Order Simulation)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                محاكاة استلام طلب من منصة نون ديركت؛ يسحب بيانات العميل، ويثبت الدفع المسبق، ويطلق إشعاراً لمالك المتجر على الواتساب.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <Button
                  variant="primary"
                  onClick={() => simulateOrderMutation.mutate('noon')}
                  disabled={simulateOrderMutation.isPending}
                  style={{ background: '#170e5e', color: '#ffffff', width: '100%' }}
                >
                  {simulateOrderMutation.isPending ? 'جاري المحاكاة والحجز...' : 'اختبار سحب طلب نون'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 5: AMAZON CONFIG */}
      {/* ========================================================================= */}
      {activeTab === 'amazon' ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                إعدادات الربط مع متجر أمازون (Amazon Selling Partner API)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                اربط حساب البائع الخاص بك على أمازون لمزامنة الكميات وسحب الطلبات تلقائياً.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={amazonCfg.enabled}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
              />
              تفعيل قناة أمازون
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                معرّف البائع (Seller ID / Merchant ID) *
              </label>
              <input
                type="text"
                value={amazonCfg.sellerId}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, sellerId: e.target.value })}
                placeholder="مثال: A2XXXXXX5678"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                سوق أمازون المستهدف
              </label>
              <select
                value={amazonCfg.marketplaceId}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, marketplaceId: e.target.value as any })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#ffffff' }}
              >
                <option value="eg">أمازون مصر (Amazon.eg - EGP)</option>
                <option value="sa">أمازون السعودية (Amazon.sa - SAR)</option>
                <option value="ae">أمازون الإمارات (Amazon.ae - AED)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رمز التحديث السحابي (LWA Refresh Token)
              </label>
              <input
                type="password"
                value={amazonCfg.refreshToken}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, refreshToken: e.target.value })}
                placeholder="Atzr|IQEBLz4k6..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نمط الشحن والتجهيز
              </label>
              <select
                value={amazonCfg.fulfillmentType}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, fulfillmentType: e.target.value as any })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#ffffff' }}
              >
                <option value="fbm">FBM (شحن وتجهيز من مخزن التاجر الخاص)</option>
                <option value="fba">FBA (الشحن عبر مستودعات أمازون الرسمية)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={amazonCfg.autoSyncStock}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, autoSyncStock: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              تحديث المخزون فورياً على أمازون عند حدوث بيع محلي
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={amazonCfg.autoPullOrders}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, autoPullOrders: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              سحب الطلبات تلقائياً وحجز الأصناف من المخزن
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => testMutation.mutate('amazon')} disabled={testMutation.isPending}>
              {testMutation.isPending ? 'جاري الفحص...' : 'فحص واختبار الاتصال'}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate({ amazon: amazonCfg })}
              disabled={saveMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات أمازون'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 6: NOON CONFIG */}
      {/* ========================================================================= */}
      {activeTab === 'noon' ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                إعدادات الربط مع متجر نون (Noon Marketplace API)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                اربط حساب شريك نون (Noon Partner) لمزامنة الكميات والأسعار وسحب طلبيات نون ديركت.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={noonCfg.enabled}
                onChange={(e) => setNoonCfg({ ...noonCfg, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
              />
              تفعيل قناة نون
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                معرّف التاجر (Noon Partner Identifier) *
              </label>
              <input
                type="text"
                value={noonCfg.merchantId}
                onChange={(e) => setNoonCfg({ ...noonCfg, merchantId: e.target.value })}
                placeholder="مثال: noon_partner_1234"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                دولة متجر نون
              </label>
              <select
                value={noonCfg.marketplace}
                onChange={(e) => setNoonCfg({ ...noonCfg, marketplace: e.target.value as any })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#ffffff' }}
              >
                <option value="eg">نون مصر (Noon Egypt - EGP)</option>
                <option value="sa">نون السعودية (Noon KSA - SAR)</option>
                <option value="ae">نون الإمارات (Noon UAE - AED)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مفتاح الواجهة (API Key)
              </label>
              <input
                type="password"
                value={noonCfg.apiKey}
                onChange={(e) => setNoonCfg({ ...noonCfg, apiKey: e.target.value })}
                placeholder="key_live_noon_..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نمط البيع (Fulfillment Model)
              </label>
              <select
                value={noonCfg.fulfillmentType}
                onChange={(e) => setNoonCfg({ ...noonCfg, fulfillmentType: e.target.value as any })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#ffffff' }}
              >
                <option value="direct">Noon Direct / Cross-dock (الشحن من مستودعك الخاص)</option>
                <option value="fbn">FBN (الشحن عبر مستودعات Fulfilled by Noon)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={noonCfg.autoSyncStock}
                onChange={(e) => setNoonCfg({ ...noonCfg, autoSyncStock: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              تحديث المخزون فورياً على نون عند أي حركة بيع
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={noonCfg.autoPullOrders}
                onChange={(e) => setNoonCfg({ ...noonCfg, autoPullOrders: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              سحب وتأكيد طلبيات نون وحجزها في النظام آلياً
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => testMutation.mutate('noon')} disabled={testMutation.isPending}>
              {testMutation.isPending ? 'جاري الفحص...' : 'فحص واختبار الاتصال'}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate({ noon: noonCfg })}
              disabled={saveMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات نون'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 7: JUMIA CONFIG */}
      {/* ========================================================================= */}
      {activeTab === 'jumia' ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                إعدادات الربط مع متجر جوميا (Jumia Seller Center API)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                ربط حساب البائع في جوميا لمزامنة كميات المستودع وتأكيد الشحنات وسحب الطلبات.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={jumiaCfg.enabled}
                onChange={(e) => setJumiaCfg({ ...jumiaCfg, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
              />
              تفعيل قناة جوميا
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                البريد الإلكتروني لحساب البائع (Seller Email) *
              </label>
              <input
                type="email"
                value={jumiaCfg.sellerEmail}
                onChange={(e) => setJumiaCfg({ ...jumiaCfg, sellerEmail: e.target.value })}
                placeholder="vendor@company.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                سوق جوميا
              </label>
              <select
                value={jumiaCfg.marketplace}
                onChange={(e) => setJumiaCfg({ ...jumiaCfg, marketplace: e.target.value as any })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#ffffff' }}
              >
                <option value="eg">جوميا مصر (Jumia Egypt - EGP)</option>
                <option value="ng">جوميا نيجيريا (Jumia Nigeria - NGN)</option>
                <option value="ke">جوميا كينيا (Jumia Kenya - KES)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مفتاح API الخاص بجوميا
              </label>
              <input
                type="password"
                value={jumiaCfg.apiKey}
                onChange={(e) => setJumiaCfg({ ...jumiaCfg, apiKey: e.target.value })}
                placeholder="jumia_api_key_..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نمط الشحن
              </label>
              <select
                value={jumiaCfg.fulfillmentType}
                onChange={(e) => setJumiaCfg({ ...jumiaCfg, fulfillmentType: e.target.value as any })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#ffffff' }}
              >
                <option value="dropshipping">Drop-shipping (الشحن من مستودعك الخاص)</option>
                <option value="express">Jumia Express (مستودعات جوميا الرسمية)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => testMutation.mutate('jumia')} disabled={testMutation.isPending}>
              {testMutation.isPending ? 'جاري الفحص...' : 'فحص واختبار الاتصال'}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate({ jumia: jumiaCfg })}
              disabled={saveMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات جوميا'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 8: TRENDYOL CONFIG */}
      {/* ========================================================================= */}
      {activeTab === 'trendyol' ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                إعدادات الربط مع ترينديول (Trendyol Marketplace API)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                ربط حساب المورّد الخاص بك على ترينديول لمزامنة الأسعار والأرصدة والتوسع في الأسواق الإقليمية.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={trendyolCfg.enabled}
                onChange={(e) => setTrendyolCfg({ ...trendyolCfg, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
              />
              تفعيل قناة ترينديول
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                معرّف المورّد (Supplier ID) *
              </label>
              <input
                type="text"
                value={trendyolCfg.supplierId}
                onChange={(e) => setTrendyolCfg({ ...trendyolCfg, supplierId: e.target.value })}
                placeholder="مثال: 123456"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مفتاح الواجهة (API Key)
              </label>
              <input
                type="password"
                value={trendyolCfg.apiKey}
                onChange={(e) => setTrendyolCfg({ ...trendyolCfg, apiKey: e.target.value })}
                placeholder="trendyol_api_key_..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                سر الواجهة (API Secret)
              </label>
              <input
                type="password"
                value={trendyolCfg.apiSecret}
                onChange={(e) => setTrendyolCfg({ ...trendyolCfg, apiSecret: e.target.value })}
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                خدمة الشحن (Cargo Provider)
              </label>
              <select
                value={trendyolCfg.fulfillmentType}
                onChange={(e) => setTrendyolCfg({ ...trendyolCfg, fulfillmentType: e.target.value as any })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#ffffff' }}
              >
                <option value="merchant_cargo">شحن التاجر المباشر (Merchant Cargo)</option>
                <option value="trendyol_cargo">شحن ترينديول الرسمي (Trendyol Cargo)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={() => testMutation.mutate('trendyol')} disabled={testMutation.isPending}>
              {testMutation.isPending ? 'جاري الفحص...' : 'فحص واختبار الاتصال'}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate({ trendyol: trendyolCfg })}
              disabled={saveMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات ترينديول'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 9: MARKETPLACE BI & ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & Period Selectors */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                تحليلات ومؤشرات أداء الماركت بليس (Marketplace BI & Performance Analytics)
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                لوحة ذكاء أعمال حية تقارن حجم المبيعات، العمولات، صافي التحصيلات، ونسب المرتجعات عبر كافة المنصات.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setAnalyticsPeriod('7d')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: analyticsPeriod === '7d' ? '#ffffff' : 'transparent',
                    color: analyticsPeriod === '7d' ? '#170e5e' : '#64748b',
                    boxShadow: analyticsPeriod === '7d' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  آخر 7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsPeriod('30d')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: analyticsPeriod === '30d' ? '#ffffff' : 'transparent',
                    color: analyticsPeriod === '30d' ? '#170e5e' : '#64748b',
                    boxShadow: analyticsPeriod === '30d' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  آخر 30 يوماً
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsPeriod('all')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: analyticsPeriod === 'all' ? '#ffffff' : 'transparent',
                    color: analyticsPeriod === 'all' ? '#170e5e' : '#64748b',
                    boxShadow: analyticsPeriod === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  كامل الفترة
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => analyticsQuery.refetch()}
                disabled={analyticsQuery.isFetching}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCwIcon size={14} />
                تحديث
              </Button>
            </div>
          </div>

          {analyticsQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              جاري تجميع مؤشرات الأداء من قنوات البيع وقواعد البيانات...
            </div>
          ) : analyticsQuery.data ? (
            <>
              {/* Summary 4-KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    إجمالي المبيعات الإجمالية (Gross Sales)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                    {analyticsQuery.data.totalGrossSales.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500 }}>ج.م</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>
                    عبر {analyticsQuery.data.totalOrders} طلباً مكتمل
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    صافي التحصيلات البنكية (Net Payout)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>
                    {analyticsQuery.data.totalNetPayout.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500 }}>ج.م</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                    المبالغ المستحقة للتحويل إلى الحسابات البنكية
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    رسوم وعمولات المنصات (Fees & Comm.)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ea580c' }}>
                    {analyticsQuery.data.totalFees.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500 }}>ج.م</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                    تمثل {analyticsQuery.data.totalGrossSales > 0 ? ((analyticsQuery.data.totalFees / analyticsQuery.data.totalGrossSales) * 100).toFixed(1) : 0}% من إجمالي المبيعات
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    معدل المرتجعات العام (Blended RTO %)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: (analyticsQuery.data.marketplaceBreakdown?.[0]?.returnRatePercent ?? 0) > 15 ? '#dc2626' : '#2563eb' }}>
                    {(analyticsQuery.data.marketplaceBreakdown?.[0]?.returnRatePercent ?? 0).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                    متوسط نسبة الطلبات الملغاة أو المرتجعة
                  </div>
                </div>
              </div>

              {/* Channels Breakdown Section */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  مقارنة الأداء والحصص السوقية بين المنصات (Marketplace Share & P&L)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  {analyticsQuery.data.marketplaceBreakdown.map((m: any) => {
                    const brandColor =
                      m.marketplace === 'amazon' ? '#f97316' :
                      m.marketplace === 'noon' ? '#eab308' :
                      m.marketplace === 'jumia' ? '#0d9488' : '#8b5cf6';
                    const brandBg =
                      m.marketplace === 'amazon' ? '#fff7ed' :
                      m.marketplace === 'noon' ? '#fefce8' :
                      m.marketplace === 'jumia' ? '#f0fdfa' : '#f5f3ff';
                    const brandName =
                      m.marketplace === 'amazon' ? 'أمازون (Amazon)' :
                      m.marketplace === 'noon' ? 'نون (Noon)' :
                      m.marketplace === 'jumia' ? 'جوميا (Jumia)' : 'ترينديول (Trendyol)';

                    return (
                      <div
                        key={m.marketplace}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                            {brandName}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: brandBg,
                              color: brandColor,
                              border: `1px solid ${brandColor}40`,
                            }}
                          >
                            حصة {m.sharePercentage.toFixed(1)}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, m.sharePercentage)}%`,
                              height: '100%',
                              background: brandColor,
                              borderRadius: '3px',
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '4px' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>المبيعات الإجمالية</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.grossSales.toLocaleString()} ج.م</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>صافي المستحق</span>
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>{m.netPayout.toLocaleString()} ج.م</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>رسوم المنصة</span>
                            <span style={{ fontWeight: 700, color: '#ea580c' }}>{m.marketplaceFees.toLocaleString()} ج.م</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>نسبة المرتجع (RTO)</span>
                            <span style={{ fontWeight: 700, color: m.returnRate > 15 ? '#dc2626' : '#2563eb' }}>
                              {m.returnRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                          <span>عدد الطلبات:</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.ordersCount} طلب</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Selling Products */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  الأصناف الأكثر طلباً ومبيعاً عبر المنصات (Top Velocity Products)
                </h4>

                {analyticsQuery.data.topSellingProducts.length > 0 ? (
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>الصنف / المنتج</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>كود المنصة (SKU)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>المنصة</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>الوحدات المباعة</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>إجمالي الإيراد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsQuery.data.topSellingProducts.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{p.productName}</td>
                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748b' }}>{p.sku}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', fontWeight: 700, textTransform: 'uppercase' }}>
                                {p.marketplace}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                              {p.unitsSold} قطعة
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                              {p.totalRevenue.toLocaleString()} ج.م
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                    لم يتم تسجيل طلبات بيع عبر المنصات خلال هذه الفترة حتى الآن.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD SKU MAPPING */}
      {/* ========================================================================= */}
      <DialogShell open={showAddModal} onClose={() => setShowAddModal(false)} width="min(560px, 95vw)" ariaLabel="ربط صنف بالمنصات">
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              ربط صنف مع منصات الماركت بليس (Add Marketplace SKU)
            </h4>
            <button type="button" onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
              <XIcon size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اختيار الصنف من الـ ERP *
              </label>
              <select
                value={newMapping.productId}
                onChange={(e) => setNewMapping({ ...newMapping, productId: parseInt(e.target.value, 10) || 0 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
              >
                <option value={0}>-- اختر صنفاً --</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.barcode ? `(${p.barcode})` : ''} - سعر: {(p as any).retailPrice ?? (p as any).retail_price ?? 0} ج.م
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                المنصة المستهدفة *
              </label>
              <select
                value={newMapping.marketplace}
                onChange={(e) => setNewMapping({ ...newMapping, marketplace: e.target.value as any })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
              >
                <option value="amazon">أمازون (Amazon ASIN)</option>
                <option value="noon">نون (Noon Partner SKU)</option>
                <option value="jumia">جوميا (Jumia Seller SKU)</option>
                <option value="trendyol">ترينديول (Trendyol Barcode/SKU)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                كود الصنف على المنصة (ASIN / Partner SKU) *
              </label>
              <input
                type="text"
                value={newMapping.marketplaceSku}
                onChange={(e) => setNewMapping({ ...newMapping, marketplaceSku: e.target.value })}
                placeholder={newMapping.marketplace === 'amazon' ? 'مثال: B08N5WRWNW' : 'مثال: NOON-SKU-9921'}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سعر مخصص على المنصة (اختياري)
                </label>
                <input
                  type="number"
                  value={newMapping.customPrice}
                  onChange={(e) => setNewMapping({ ...newMapping, customPrice: e.target.value })}
                  placeholder="سعر البيع الافتراضي بالـ ERP"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سعر صندوق الشراء (Buy Box Price)
                </label>
                <input
                  type="number"
                  value={newMapping.buyBoxPrice}
                  onChange={(e) => setNewMapping({ ...newMapping, buyBoxPrice: e.target.value })}
                  placeholder="سعر الـ Buy Box الحالي"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!newMapping.productId || !newMapping.marketplaceSku) {
                  toast.error('يرجى اختيار الصنف وإدخال كود المنصة');
                  return;
                }
                addMappingMutation.mutate({
                  productId: newMapping.productId,
                  marketplace: newMapping.marketplace,
                  marketplaceSku: newMapping.marketplaceSku,
                  customPrice: newMapping.customPrice ? parseFloat(newMapping.customPrice) : undefined,
                  buyBoxPrice: newMapping.buyBoxPrice ? parseFloat(newMapping.buyBoxPrice) : undefined,
                  competitorPrice: newMapping.competitorPrice ? parseFloat(newMapping.competitorPrice) : undefined,
                  syncStock: newMapping.syncStock,
                  status: 'synced',
                });
              }}
              disabled={addMappingMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {addMappingMutation.isPending ? 'جاري الحفظ...' : 'حفظ وتفعيل الربط'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT COMPETITOR & BUY BOX PRICE (تحديث أسعار المنافسين وصندوق الشراء) */}
      {/* ========================================================================= */}
      <DialogShell open={Boolean(editPriceModal)} onClose={() => setEditPriceModal(null)} width="min(460px, 95vw)" ariaLabel="تعديل أسعار المنافسة">
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              تحديث أسعار المنافسين وصندوق الشراء (Buy Box & Competitor Pricing)
            </h4>
            <button type="button" onClick={() => setEditPriceModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
              <XIcon size={18} />
            </button>
          </div>

          {editPriceModal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{editPriceModal.productName}</div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>
                  كود المنصة: <strong style={{ color: '#170e5e' }}>{editPriceModal.marketplaceSku}</strong> ({editPriceModal.marketplace.toUpperCase()})
                </div>
                <div style={{ color: '#64748b' }}>
                  سعرنا الحالي: <strong>{editPriceModal.customPrice || editPriceModal.retailPrice || 0} ج.م</strong>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سعر صندوق الشراء الحائز على المبيعات (Buy Box Price)
                </label>
                <input
                  type="number"
                  value={editBuyBoxPrice}
                  onChange={(e) => setEditBuyBoxPrice(e.target.value)}
                  placeholder="مثال: 340"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سعر أدنى منافس (Lowest Competitor Price)
                </label>
                <input
                  type="number"
                  value={editCompetitorPrice}
                  onChange={(e) => setEditCompetitorPrice(e.target.value)}
                  placeholder="مثال: 335"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setEditPriceModal(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!editPriceModal) return;
                updateCompetitorPriceMutation.mutate({
                  id: editPriceModal.id,
                  competitorPrice: editCompetitorPrice ? parseFloat(editCompetitorPrice) : undefined,
                  buyBoxPrice: editBuyBoxPrice ? parseFloat(editBuyBoxPrice) : undefined,
                });
              }}
              disabled={updateCompetitorPriceMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {updateCompetitorPriceMutation.isPending ? 'جاري التحديث...' : 'تحديث أسعار المنافسة'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 3: BULK SKU MAPPING IMPORT (CSV / EXCEL) */}
      {/* ========================================================================= */}
      <DialogShell
        open={showBulkImportModal}
        onClose={() => {
          setShowBulkImportModal(false);
          setBulkImportResult(null);
        }}
        width="min(820px, 95vw)"
        ariaLabel="استيراد شيت الأكواد"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                استيراد شيت مطابقة الأكواد الجماعي (Bulk SKU Mapping Import)
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                رفع ملف CSV أو لصق محتوى جدول الإكسيل لربط وتحديث مئات الأصناف دفعة واحدة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowBulkImportModal(false);
                setBulkImportResult(null);
              }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Instructions & Template Download Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
              الأعمدة المدعومة: <strong>الباركود (barcode)</strong> أو <strong>كود الصنف (sku)</strong>، <strong>المنصة (marketplace)</strong>، <strong>كود الصنف بالمنصة (marketplace_sku)</strong>، <strong>سعر البيع (custom_price)</strong>، <strong>سعر المنافس (competitor_price)</strong>.
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const sample = `barcode,marketplace,marketplace_sku,marketplace_title,custom_price,competitor_price\n622123456789,amazon,B08N5WRWNW,كابل شحن فائق السرعة,299,285\n622987654321,noon,N45678901A,سماعة بلوتوث لاسلكية,450,420\n622555666777,jumia,JM-99120,ساعة يد رياضية,380,360`;
                const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'marketplace_sku_mapping_template.csv';
                link.click();
                URL.revokeObjectURL(url);
              }}
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <DownloadIcon size={14} />
              <span>تحميل نموذج CSV تجريبي</span>
            </Button>
          </div>

          {/* File Picker or Paste Area */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                لصق بيانات الشيت أو رفع ملف CSV:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleDownloadSampleMappingTemplate}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '11.5px',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                  }}
                >
                  <DownloadIcon size={12} />
                  <span>تحميل نموذج الشيت (.CSV)</span>
                </button>

                <label
                  style={{
                    fontSize: '11.5px',
                    color: '#170e5e',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#f1f5f9',
                    padding: '3px 10px',
                    borderRadius: '6px',
                  }}
                >
                  <UploadIcon size={12} />
                  <span>اختر ملف من جهازك</span>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = String(ev.target?.result || '');
                        setBulkImportText(content);
                        setBulkImportResult(null);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={8}
              value={bulkImportText}
              onChange={(e) => {
                setBulkImportText(e.target.value);
                setBulkImportResult(null);
              }}
              placeholder={`انسخ والصق الأعمدة هنا من الإكسيل مباشرة، أو بصيغة CSV:\n622123456789,amazon,B08N5WRWNW,كابل شحن,299,285\n622987654321,noon,N45678901A,سماعة بلوتوث,450,420`}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontFamily: 'monospace',
                direction: 'ltr',
                textAlign: 'left',
              }}
            />
          </div>

          {/* Bulk Import Result Banner */}
          {bulkImportResult ? (
            <div
              style={{
                background: bulkImportResult.importedCount > 0 || bulkImportResult.updatedCount > 0 ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${bulkImportResult.importedCount > 0 || bulkImportResult.updatedCount > 0 ? '#86efac' : '#fde68a'}`,
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '12.5px',
              }}
            >
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                نتيجة المعالجة:
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#334155' }}>
                <span>إجمالي الصفوف: <strong>{bulkImportResult.totalRows}</strong></span>
                <span style={{ color: '#15803d' }}>تم استيراد جديد: <strong>{bulkImportResult.importedCount}</strong></span>
                <span style={{ color: '#0369a1' }}>تم تحديث قائم: <strong>{bulkImportResult.updatedCount}</strong></span>
                <span style={{ color: '#b45309' }}>تم التخطي / أخطاء: <strong>{bulkImportResult.skippedCount}</strong></span>
              </div>
              {bulkImportResult.errors && bulkImportResult.errors.length > 0 ? (
                <div style={{ marginTop: '8px', maxHeight: '100px', overflowY: 'auto', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '11.5px', color: '#b91c1c' }}>
                  {bulkImportResult.errors.map((err, idx) => (
                    <div key={idx}>صف {err.row}: {err.reason}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowBulkImportModal(false);
                setBulkImportResult(null);
              }}
            >
              إغلاق
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!bulkImportText.trim()) {
                  toast.error('برجاء إدخال أو لصق بيانات الشيت أولاً');
                  return;
                }
                const lines = bulkImportText.trim().split('\n');
                const parsedRows: BulkMappingImportRow[] = [];

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (!line) continue;
                  const parts = line.includes('\t') ? line.split('\t') : line.split(',');
                  if (i === 0 && (parts[0].toLowerCase().includes('barcode') || parts[0].toLowerCase().includes('sku') || parts[1]?.toLowerCase().includes('market'))) {
                    continue;
                  }
                  if (parts.length < 3) continue;

                  const col0 = parts[0]?.replace(/"/g, '').trim();
                  const col1 = parts[1]?.replace(/"/g, '').trim().toLowerCase() as SupportedMarketplace;
                  const col2 = parts[2]?.replace(/"/g, '').trim();
                  const col3 = parts[3]?.replace(/"/g, '').trim();
                  const col4 = parts[4]?.replace(/"/g, '').trim();
                  const col5 = parts[5]?.replace(/"/g, '').trim();

                  parsedRows.push({
                    barcode: col0,
                    sku: col0,
                    marketplace: (col1 as any) || 'amazon',
                    marketplaceSku: col2,
                    marketplaceTitle: isNaN(Number(col3)) && col3 ? col3 : undefined,
                    customPrice: !isNaN(Number(col3)) ? parseFloat(col3) : (!isNaN(Number(col4)) ? parseFloat(col4) : undefined),
                    competitorPrice: !isNaN(Number(col4)) && isNaN(Number(col3)) ? parseFloat(col4) : (!isNaN(Number(col5)) ? parseFloat(col5) : undefined),
                    syncStock: true,
                  });
                }

                if (!parsedRows.length) {
                  toast.error('لم يتم التعرف على أي صفوف صالحة من البيانات المدخلة');
                  return;
                }

                bulkImportMutation.mutate(parsedRows);
              }}
              disabled={bulkImportMutation.isPending || !bulkImportText.trim()}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {bulkImportMutation.isPending ? 'جاري الاستيراد والمعالجة...' : 'بدء معالجة واستيراد الشيت'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 4: RECONCILE MARKETPLACE SETTLEMENT & GL POSTING */}
      {/* ========================================================================= */}
      <DialogShell
        open={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        width="min(880px, 95vw)"
        ariaLabel="تسوية كشف حساب"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                تسوية كشف حساب منصة وإنشاء القيد المحاسبي المزدوج (GL Posting)
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                إدخال بيانات الكشف الدوري من البائع، فك تشابك العمولات ومصاريف الشحن، وتوليد قيد يومية متزن آلياً.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReconcileModal(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Form Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                المنصة الإلكترونية:
              </label>
              <select
                value={settlementForm.marketplace}
                onChange={(e) => setSettlementForm({ ...settlementForm, marketplace: e.target.value as SupportedMarketplace })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="amazon">أمازون (Amazon)</option>
                <option value="noon">نون (Noon)</option>
                <option value="jumia">جوميا (Jumia)</option>
                <option value="trendyol">ترينديول (Trendyol)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                رقم كشف الحساب / الكود المرجعي:
              </label>
              <input
                type="text"
                value={settlementForm.settlementId}
                onChange={(e) => setSettlementForm({ ...settlementForm, settlementId: e.target.value })}
                placeholder="مثال: AMZ-DISBURSE-1928374"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                تاريخ بداية الفترة:
              </label>
              <input
                type="date"
                value={settlementForm.periodStart}
                onChange={(e) => setSettlementForm({ ...settlementForm, periodStart: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                تاريخ نهاية الفترة (تاريخ القيد):
              </label>
              <input
                type="date"
                value={settlementForm.periodEnd}
                onChange={(e) => setSettlementForm({ ...settlementForm, periodEnd: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                إجمالي مبيعات البضاعة (Gross Product Sales):
              </label>
              <input
                type="number"
                step="0.01"
                value={settlementForm.grossSales || ''}
                onChange={(e) => {
                  const gross = parseFloat(e.target.value) || 0;
                  const net = gross - (settlementForm.referralFees || 0) - (settlementForm.fulfillmentFees || 0) - (settlementForm.refunds || 0) - (settlementForm.storageOrOtherFees || 0);
                  setSettlementForm({ ...settlementForm, grossSales: gross, netPayout: Math.max(0, parseFloat(net.toFixed(2))) });
                }}
                placeholder="0.00"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                عمولات البيع ورسوم الإحالة (Referral Fees):
              </label>
              <input
                type="number"
                step="0.01"
                value={settlementForm.referralFees || ''}
                onChange={(e) => {
                  const ref = parseFloat(e.target.value) || 0;
                  const net = (settlementForm.grossSales || 0) - ref - (settlementForm.fulfillmentFees || 0) - (settlementForm.refunds || 0) - (settlementForm.storageOrOtherFees || 0);
                  setSettlementForm({ ...settlementForm, referralFees: ref, netPayout: Math.max(0, parseFloat(net.toFixed(2))) });
                }}
                placeholder="0.00"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                مصاريف الشحن والتخزين FBA / FBN:
              </label>
              <input
                type="number"
                step="0.01"
                value={settlementForm.fulfillmentFees || ''}
                onChange={(e) => {
                  const ful = parseFloat(e.target.value) || 0;
                  const net = (settlementForm.grossSales || 0) - (settlementForm.referralFees || 0) - ful - (settlementForm.refunds || 0) - (settlementForm.storageOrOtherFees || 0);
                  setSettlementForm({ ...settlementForm, fulfillmentFees: ful, netPayout: Math.max(0, parseFloat(net.toFixed(2))) });
                }}
                placeholder="0.00"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                المرتجعات والمردودات (Customer Refunds):
              </label>
              <input
                type="number"
                step="0.01"
                value={settlementForm.refunds || ''}
                onChange={(e) => {
                  const ref = parseFloat(e.target.value) || 0;
                  const net = (settlementForm.grossSales || 0) - (settlementForm.referralFees || 0) - (settlementForm.fulfillmentFees || 0) - ref - (settlementForm.storageOrOtherFees || 0);
                  setSettlementForm({ ...settlementForm, refunds: ref, netPayout: Math.max(0, parseFloat(net.toFixed(2))) });
                }}
                placeholder="0.00"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                مصاريف تخزين شهري / إعلانات أخرى:
              </label>
              <input
                type="number"
                step="0.01"
                value={settlementForm.storageOrOtherFees || ''}
                onChange={(e) => {
                  const oth = parseFloat(e.target.value) || 0;
                  const net = (settlementForm.grossSales || 0) - (settlementForm.referralFees || 0) - (settlementForm.fulfillmentFees || 0) - (settlementForm.refunds || 0) - oth;
                  setSettlementForm({ ...settlementForm, storageOrOtherFees: oth, netPayout: Math.max(0, parseFloat(net.toFixed(2))) });
                }}
                placeholder="0.00"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                صافي التحويل المودع في حساب البنك (Net Payout):
              </label>
              <input
                type="number"
                step="0.01"
                value={settlementForm.netPayout || ''}
                onChange={(e) => setSettlementForm({ ...settlementForm, netPayout: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '2px solid #86efac', fontSize: '13px', fontWeight: 700, color: '#15803d' }}
              />
            </div>
          </div>

          {/* Chart of Accounts Routing */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              توجيه حسابات دفتر الأستاذ (Chart of Accounts):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  حساب البنك / الخزينة المستلم:
                </label>
                <select
                  value={settlementForm.bankAccountId || ''}
                  onChange={(e) => setSettlementForm({ ...settlementForm, bankAccountId: e.target.value ? Number(e.target.value) : undefined })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                >
                  <option value="">تلقائي (حساب البنك / النقدية الرئيسي)</option>
                  {(settlementAccountsQuery.data?.bankAccounts || []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  حساب عمولات البيع (مصاريف):
                </label>
                <select
                  value={settlementForm.referralFeesAccountId || ''}
                  onChange={(e) => setSettlementForm({ ...settlementForm, referralFeesAccountId: e.target.value ? Number(e.target.value) : undefined })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                >
                  <option value="">تلقائي (مصاريف عمولات البيع والتسويق)</option>
                  {(settlementAccountsQuery.data?.expenseAccounts || []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  حساب مصاريف الشحن والتسليم (مصاريف):
                </label>
                <select
                  value={settlementForm.fulfillmentFeesAccountId || ''}
                  onChange={(e) => setSettlementForm({ ...settlementForm, fulfillmentFeesAccountId: e.target.value ? Number(e.target.value) : undefined })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                >
                  <option value="">تلقائي (مصاريف شحن ونقل المبيعات)</option>
                  {(settlementAccountsQuery.data?.expenseAccounts || []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  حساب إيرادات مبيعات المنصات (إيراد):
                </label>
                <select
                  value={settlementForm.salesAccountId || ''}
                  onChange={(e) => setSettlementForm({ ...settlementForm, salesAccountId: e.target.value ? Number(e.target.value) : undefined })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                >
                  <option value="">تلقائي (مبيعات المتجر الإلكتروني / المنصات)</option>
                  {(settlementAccountsQuery.data?.revenueAccounts || []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Double-Entry Balance Check Card */}
          {(() => {
            const net = Number(settlementForm.netPayout || 0);
            const ref = Number(settlementForm.referralFees || 0);
            const ful = Number(settlementForm.fulfillmentFees || 0);
            const rfd = Number(settlementForm.refunds || 0);
            const oth = Number(settlementForm.storageOrOtherFees || 0);
            const totalDebit = Number((net + ref + ful + rfd + oth).toFixed(2));
            const totalCredit = Number(Number(settlementForm.grossSales || 0).toFixed(2));
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.05;

            return (
              <div
                style={{
                  background: isBalanced ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${isBalanced ? '#86efac' : '#fde68a'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>التحقق المحاسبي المزدوج للقيد:</span>
                    <span style={{ marginRight: '8px', color: '#475569' }}>
                      المدين [البنك + العمولات + الشحن] = <strong>{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> | الدائن [المبيعات] = <strong>{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: isBalanced ? '#dcfce7' : '#fef3c7',
                        color: isBalanced ? '#166534' : '#92400e',
                      }}
                    >
                      {isBalanced ? 'متزن محاسبياً 100%' : `فارق غير متزن: ${(totalDebit - totalCredit).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <Button variant="secondary" onClick={() => setShowReconcileModal(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!settlementForm.settlementId.trim()) {
                  toast.error('برجاء إدخال رقم كشف الحساب من المنصة');
                  return;
                }
                if (!settlementForm.grossSales || settlementForm.grossSales <= 0) {
                  toast.error('إجمالي مبيعات الكشف يجب أن يكون أكبر من الصفر');
                  return;
                }
                reconcileMutation.mutate(settlementForm);
              }}
              disabled={reconcileMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {reconcileMutation.isPending ? 'جاري ترحيل القيد...' : 'تسوية الكشف وترحيل القيد اليومي الآن'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 5: REPRICING BOT SETTINGS MODAL */}
      {/* ========================================================================= */}
      <DialogShell
        open={Boolean(editRepricingModal)}
        onClose={() => setEditRepricingModal(null)}
        width="min(560px, 95vw)"
        ariaLabel="إعداد روبوت إعادة التسعير الآلي"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersIcon size={18} color="#170e5e" />
              <span>إعداد روبوت إعادة التسعير الآلي (Buy Box Repricer)</span>
            </h4>
            <button
              type="button"
              onClick={() => setEditRepricingModal(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {editRepricingModal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Product Info Card */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>{editRepricingModal.productName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '8px', color: '#475569' }}>
                  <div>
                    المنصة: <strong style={{ color: '#170e5e' }}>{editRepricingModal.marketplace.toUpperCase()}</strong>
                  </div>
                  <div>
                    كود SKU: <strong style={{ fontFamily: 'monospace' }}>{editRepricingModal.marketplaceSku}</strong>
                  </div>
                  <div>
                    سعر البيع: <strong>{editRepricingModal.customPrice || editRepricingModal.retailPrice || 0} ج.م</strong>
                  </div>
                  <div>
                    سعر التكلفة: <strong style={{ color: '#059669' }}>{editRepricingModal.costPrice || 0} ج.م</strong>
                  </div>
                  <div>
                    سعر المنافس: <strong>{editRepricingModal.competitorPrice ? `${editRepricingModal.competitorPrice} ج.م` : 'غير مسجل'}</strong>
                  </div>
                  <div>
                    سعر Buy Box: <strong>{editRepricingModal.buyBoxPrice ? `${editRepricingModal.buyBoxPrice} ج.م` : 'غير مسجل'}</strong>
                  </div>
                </div>
              </div>

              {/* Bot Toggle Switch */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: repricingForm.repricingEnabled ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${repricingForm.repricingEnabled ? '#86efac' : '#cbd5e1'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={repricingForm.repricingEnabled}
                  onChange={(e) => setRepricingForm({ ...repricingForm, repricingEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 800, color: repricingForm.repricingEnabled ? '#15803d' : '#334155', fontSize: '13px' }}>
                    تفعيل روبوت إعادة التسعير الآلي التلقائي
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    يقوم النظام برصد أسعار المنافسين وإعادة تعديل سعر الصنف تلقائياً للفوز بصندوق الشراء.
                  </div>
                </div>
              </label>

              {/* Repricing Rule */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  استراتيجية وقاعدة التسعير (Repricing Strategy)
                </label>
                <select
                  value={repricingForm.repricingRule}
                  onChange={(e) => setRepricingForm({ ...repricingForm, repricingRule: e.target.value as any })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="undercut_buy_box">النزول عن سعر صندوق الشراء (Buy Box) بقيمة فارق — للفوز الفوري</option>
                  <option value="match_buy_box">مطابقة سعر صندوق الشراء (Buy Box) بدقة</option>
                  <option value="undercut_lowest">النزول عن أقل منافس في السوق بقيمة فارق</option>
                  <option value="match_lowest">مطابقة أقل سعر منافس في السوق</option>
                </select>
              </div>

              {/* Delta & Floor/Ceiling Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    الفارق السعري (Delta - ج.م)
                  </label>
                  <input
                    type="number"
                    min="0.25"
                    step="0.5"
                    value={repricingForm.repricingDelta}
                    onChange={(e) => setRepricingForm({ ...repricingForm, repricingDelta: e.target.value })}
                    placeholder="1"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    الحد الأدنى (Floor - ج.م)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={repricingForm.minPrice}
                    onChange={(e) => setRepricingForm({ ...repricingForm, minPrice: e.target.value })}
                    placeholder={String(Math.ceil((editRepricingModal.costPrice || 0) * 1.05))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    الحد الأقصى (Ceiling - ج.م)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={repricingForm.maxPrice}
                    onChange={(e) => setRepricingForm({ ...repricingForm, maxPrice: e.target.value })}
                    placeholder={String(Math.ceil((editRepricingModal.retailPrice || 100) * 1.5))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Safety Margin Alert */}
              {Number(repricingForm.minPrice) > 0 && Number(repricingForm.minPrice) < (editRepricingModal.costPrice || 0) ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#b91c1c' }}>
                  تنبيه: الحد الأدنى الذي أدخلته ({repricingForm.minPrice} ج.م) أقل من سعر التكلفة ({editRepricingModal.costPrice} ج.م). سيمنع النظام الروبوت من البيع بخسارة!
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                  قاعدة الأمان: لن يقوم الروبوت بتخفيض السعر إطلاقاً تحت الحد الأدنى، وسيرفع السعر تلقائياً إلى الحد الأقصى إذا نفد مخزون المنافسين.
                </div>
              )}
            </div>
          ) : null}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button variant="secondary" onClick={() => setEditRepricingModal(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!editRepricingModal) return;
                const min = Number(repricingForm.minPrice) || undefined;
                const max = Number(repricingForm.maxPrice) || undefined;
                const delta = Number(repricingForm.repricingDelta) || 1;

                if (min && max && min >= max) {
                  toast.error('الحد الأدنى يجب أن يكون أقل من الحد الأقصى للسعر');
                  return;
                }

                saveRepricingMutation.mutate({
                  id: editRepricingModal.id,
                  payload: {
                    repricingEnabled: repricingForm.repricingEnabled,
                    minPrice: min,
                    maxPrice: max,
                    repricingRule: repricingForm.repricingRule,
                    repricingDelta: delta,
                  },
                });
              }}
              disabled={saveRepricingMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {saveRepricingMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الروبوت'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 6: CREATE FBA / FBN INBOUND SHIPMENT MODAL */}
      {/* ========================================================================= */}
      <DialogShell
        open={showInboundModal}
        onClose={() => setShowInboundModal(false)}
        width="min(760px, 95vw)"
        ariaLabel="إنشاء إذن توريد جديد FBA / FBN"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TruckIcon size={18} color="#170e5e" />
              <span>إنشاء إذن توريد وشحن لمستودعات FBA و FBN</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowInboundModal(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Form Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  المنصة الوجهة
                </label>
                <select
                  value={inboundForm.marketplace}
                  onChange={(e) => {
                    const mp = e.target.value as 'amazon' | 'noon';
                    setInboundForm({
                      ...inboundForm,
                      marketplace: mp,
                      fulfillmentCenterId: mp === 'amazon' ? 'CAI1' : 'EGP1',
                    });
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="amazon">أمازون (FBA - Fulfillment By Amazon)</option>
                  <option value="noon">نون (FBN - Fulfillment By Noon)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  مركز التوزيع المستلم (FC)
                </label>
                <input
                  type="text"
                  value={inboundForm.fulfillmentCenterId}
                  onChange={(e) => setInboundForm({ ...inboundForm, fulfillmentCenterId: e.target.value })}
                  placeholder={inboundForm.marketplace === 'amazon' ? 'مثال: CAI1 أو CAI2' : 'مثال: EGP1 أو EGP2'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  رقم الشحنة الخارجي / التتبع
                </label>
                <input
                  type="text"
                  value={inboundForm.trackingNumber}
                  onChange={(e) => setInboundForm({ ...inboundForm, trackingNumber: e.target.value })}
                  placeholder="مثال: FBA17XXXXXX أو PO-89231"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Add Items Box */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>إضافة الأصناف المشحونة إلى الكراتين:</div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 240px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '3px' }}>اختيار الصنف</label>
                  <select
                    value={inboundForm.selectedProductId}
                    onChange={(e) => setInboundForm({ ...inboundForm, selectedProductId: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
                  >
                    <option value={0}>-- اختر صنفاً للشحن --</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.barcode || (p as any).style_code || (p as any).styleCode || `#${p.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '3px' }}>رقم الكرتونة</label>
                  <input
                    type="number"
                    min="1"
                    value={inboundForm.boxNumber}
                    onChange={(e) => setInboundForm({ ...inboundForm, boxNumber: e.target.value })}
                    style={{ width: '80px', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>

                {/* Strict RTL Stepper: Plus on RIGHT, Minus on LEFT! */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '3px' }}>الكمية المشحونة</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Math.max(1, Number(inboundForm.quantity) || 1);
                        setInboundForm({ ...inboundForm, quantity: String(cur + 1) });
                      }}
                      style={{ width: '30px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}
                      title="زيادة الكمية"
                    >
                      +
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={inboundForm.quantity}
                      onChange={(e) => setInboundForm({ ...inboundForm, quantity: e.target.value })}
                      style={{ width: '60px', height: '32px', textAlign: 'center', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 800 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Math.max(1, Number(inboundForm.quantity) || 1);
                        setInboundForm({ ...inboundForm, quantity: String(Math.max(1, cur - 1)) });
                      }}
                      style={{ width: '30px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '14px', color: '#0f172a' }}
                      title="إنقاص الكمية"
                    >
                      −
                    </button>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    if (!inboundForm.selectedProductId) {
                      toast.error('يرجى اختيار صنف أولاً');
                      return;
                    }
                    const prod = availableProducts.find((p) => Number(p.id) === Number(inboundForm.selectedProductId));
                    if (!prod) return;
                    const qty = Number(inboundForm.quantity) || 1;
                    const box = Number(inboundForm.boxNumber) || 1;

                    const mapping = mappings.find((m) => Number(m.productId) === Number(prod.id) && m.marketplace === inboundForm.marketplace);
                    const sku = mapping ? mapping.marketplaceSku : prod.barcode || (prod as any).style_code || `SKU-${prod.id}`;

                    const newItem: FbaInboundItem = {
                      productId: Number(prod.id),
                      marketplaceSku: sku,
                      productName: prod.name,
                      barcode: prod.barcode || undefined,
                      quantityShipped: qty,
                      boxNumber: box,
                    };

                    setInboundForm({
                      ...inboundForm,
                      items: [...inboundForm.items, newItem],
                      selectedProductId: 0,
                      quantity: '10',
                    });
                    toast.success(`تمت إضافة ${qty} قطعة من ${prod.name}`);
                  }}
                  style={{ background: '#170e5e', color: '#ffffff', height: '32px', fontSize: '12px' }}
                >
                  + إضافة للشحنة
                </Button>
              </div>

              {/* Items List Table */}
              {inboundForm.items.length > 0 ? (
                <div style={{ marginTop: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '6px 10px' }}>الصنف</th>
                        <th style={{ padding: '6px 10px' }}>كود المنصة (SKU / FNSKU)</th>
                        <th style={{ padding: '6px 10px' }}>رقم الكرتونة</th>
                        <th style={{ padding: '6px 10px' }}>الكمية</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inboundForm.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>{it.productName}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#170e5e' }}>{it.marketplaceSku}</td>
                          <td style={{ padding: '6px 10px' }}>كرتونة #{it.boxNumber || 1}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 800, color: '#15803d' }}>{it.quantityShipped} قطعة</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...inboundForm.items];
                                newItems.splice(idx, 1);
                                setInboundForm({ ...inboundForm, items: newItems });
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', fontSize: '12px' }}
                            >
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                    <span>إجمالي الأصناف: {inboundForm.items.length}</span>
                    <span style={{ color: '#15803d' }}>
                      إجمالي القطع المشحونة: {inboundForm.items.reduce((s, it) => s + it.quantityShipped, 0)} قطعة
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                  لم يتم إضافة أصناف للشحنة بعد. اختر صنفاً وحدد الكمية ثم اضغط "+ إضافة للشحنة".
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                ملاحظات إذن التوريد
              </label>
              <textarea
                rows={2}
                value={inboundForm.notes}
                onChange={(e) => setInboundForm({ ...inboundForm, notes: e.target.value })}
                placeholder="ملاحظات لفرق التجهيز أو مستلمي المستودع..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <Button variant="secondary" onClick={() => setShowInboundModal(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!inboundForm.fulfillmentCenterId.trim()) {
                  toast.error('يرجى إدخال كود مركز التوزيع المستلم');
                  return;
                }
                if (inboundForm.items.length === 0) {
                  toast.error('يرجى إضافة صنف واحد على الأقل للشحنة');
                  return;
                }

                const totalUnits = inboundForm.items.reduce((s, it) => s + it.quantityShipped, 0);
                const boxSet = new Set(inboundForm.items.map((it) => it.boxNumber || 1));

                createInboundMutation.mutate({
                  marketplace: inboundForm.marketplace,
                  fulfillmentCenterId: inboundForm.fulfillmentCenterId,
                  items: inboundForm.items,
                  totalUnits,
                  totalBoxes: boxSet.size || 1,
                  trackingNumber: inboundForm.trackingNumber.trim() || undefined,
                  notes: inboundForm.notes.trim() || undefined,
                  status: 'draft',
                });
              }}
              disabled={createInboundMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {createInboundMutation.isPending ? 'جاري إنشاء إذن التوريد...' : 'تأكيد إنشاء إذن التوريد وحجز الكميات'}
            </Button>
          </div>
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 7: FNSKU BARCODE THERMAL PRINTING MODAL */}
      {/* ========================================================================= */}
      <DialogShell
        open={!!printFnskuModal}
        onClose={() => setPrintFnskuModal(null)}
        width="min(540px, 95vw)"
        ariaLabel="طباعة ملصقات الباركود FNSKU"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                طباعة ملصقات الباركود FNSKU / FBN للوحدات
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                طباعة باركودات التتبع للوحدات الفردية قبل شحنها لمستودعات أمازون ونون
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPrintFnskuModal(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {printFnskuModal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Product Info Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '12.5px' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{printFnskuModal.productName}</div>
                <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '12px' }}>
                  <span>كود المنصة: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{printFnskuModal.marketplaceSku}</strong></span>
                  <span>المنصة: <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>{printFnskuModal.marketplace}</strong></span>
                  <span>الحالة: <strong style={{ color: '#16a34a' }}>{printFnskuModal.condition}</strong></span>
                </div>
              </div>

              {/* Print Configuration Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    مقاس ونوع الملصق
                  </label>
                  <select
                    value={printFnskuModal.format}
                    onChange={(e) => setPrintFnskuModal({ ...printFnskuModal, format: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
                  >
                    <option value="thermal_50x30">رول حراري 50 × 30 مم (أمازون / Xprinter)</option>
                    <option value="thermal_40x25">رول حراري 40 × 25 مم (نون / Zebra)</option>
                    <option value="a4_44up">ورقة A4 ملصقات جاهزة (44 ملصق بالورقة)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    عدد النسخ (الملصقات)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setPrintFnskuModal({ ...printFnskuModal, copies: printFnskuModal.copies + 1 })}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
                      title="زيادة"
                    >
                      +
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={printFnskuModal.copies}
                      onChange={(e) => setPrintFnskuModal({ ...printFnskuModal, copies: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      style={{ width: '60px', height: '32px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setPrintFnskuModal({ ...printFnskuModal, copies: Math.max(1, printFnskuModal.copies - 1) })}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
                      title="إنقاص"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              {/* Label Visual Live Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  معاينة الملصق على الطبيعة (Live Label Preview)
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #000000',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      width: '210px',
                      textAlign: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px' }}>
                      {printFnskuModal.marketplaceSku}
                    </div>
                    {/* SVG Barcode Graphic */}
                    <div style={{ margin: '4px 0' }}>
                      <svg viewBox="0 0 160 38" style={{ width: '100%', height: '30px' }}>
                        <rect x="0" y="0" width="3" height="38" fill="#000" />
                        <rect x="5" y="0" width="2" height="38" fill="#000" />
                        <rect x="9" y="0" width="4" height="38" fill="#000" />
                        <rect x="15" y="0" width="2" height="38" fill="#000" />
                        <rect x="19" y="0" width="5" height="38" fill="#000" />
                        <rect x="26" y="0" width="2" height="38" fill="#000" />
                        <rect x="30" y="0" width="4" height="38" fill="#000" />
                        <rect x="36" y="0" width="2" height="38" fill="#000" />
                        <rect x="40" y="0" width="5" height="38" fill="#000" />
                        <rect x="47" y="0" width="3" height="38" fill="#000" />
                        <rect x="52" y="0" width="2" height="38" fill="#000" />
                        <rect x="56" y="0" width="4" height="38" fill="#000" />
                        <rect x="62" y="0" width="2" height="38" fill="#000" />
                        <rect x="66" y="0" width="5" height="38" fill="#000" />
                        <rect x="73" y="0" width="3" height="38" fill="#000" />
                        <rect x="78" y="0" width="2" height="38" fill="#000" />
                        <rect x="82" y="0" width="4" height="38" fill="#000" />
                        <rect x="88" y="0" width="2" height="38" fill="#000" />
                        <rect x="92" y="0" width="6" height="38" fill="#000" />
                        <rect x="100" y="0" width="2" height="38" fill="#000" />
                        <rect x="104" y="0" width="4" height="38" fill="#000" />
                        <rect x="110" y="0" width="2" height="38" fill="#000" />
                        <rect x="114" y="0" width="5" height="38" fill="#000" />
                        <rect x="121" y="0" width="3" height="38" fill="#000" />
                        <rect x="126" y="0" width="2" height="38" fill="#000" />
                        <rect x="130" y="0" width="4" height="38" fill="#000" />
                        <rect x="136" y="0" width="2" height="38" fill="#000" />
                        <rect x="140" y="0" width="5" height="38" fill="#000" />
                        <rect x="147" y="0" width="3" height="38" fill="#000" />
                        <rect x="152" y="0" width="4" height="38" fill="#000" />
                      </svg>
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {printFnskuModal.productName}
                    </div>
                    <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
                      {printFnskuModal.condition}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <Button variant="secondary" onClick={() => setPrintFnskuModal(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePrintFnskuLabels}
                  style={{ background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PrinterIcon size={16} />
                  طباعة {printFnskuModal.copies} ملصق الآن
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 8: RECEIVING & DISCREPANCIES CHECK-IN MODAL */}
      {/* ========================================================================= */}
      <DialogShell
        open={!!receiveShipmentModal}
        onClose={() => setReceiveShipmentModal(null)}
        width="min(760px, 95vw)"
        ariaLabel="تسجيل استلام الشحنة وفحص الفروقات"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                تسجيل استلام الشحنة وفحص عجز المستودع (Receiving & Discrepancies)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                إذن توريد رقم: <strong style={{ color: '#0f172a' }}>{receiveShipmentModal?.shipmentNumber}</strong> | المستودع المستلم:{' '}
                <strong style={{ color: '#0f172a' }}>{receiveShipmentModal?.fulfillmentCenterId}</strong> ({receiveShipmentModal?.marketplace.toUpperCase()})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReceiveShipmentModal(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {receiveShipmentModal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>الصنف / كود المنصة</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>الكمية المشحونة</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>الكمية المستلمة فعلياً</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>الفارق / العجز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiveShipmentModal.items.map((it) => {
                      const receivedVal = parseInt(receiveFormItems[it.marketplaceSku] ?? String(it.quantityReceived ?? it.quantityShipped), 10) || 0;
                      const diff = receivedVal - it.quantityShipped;

                      return (
                        <tr key={it.marketplaceSku} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.productName}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{it.marketplaceSku}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                            {it.quantityShipped}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setReceiveFormItems({
                                    ...receiveFormItems,
                                    [it.marketplaceSku]: String(receivedVal + 1),
                                  })
                                }
                                style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                              >
                                +
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={receivedVal}
                                onChange={(e) =>
                                  setReceiveFormItems({
                                    ...receiveFormItems,
                                    [it.marketplaceSku]: e.target.value,
                                  })
                                }
                                style={{ width: '55px', height: '26px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '12px' }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setReceiveFormItems({
                                    ...receiveFormItems,
                                    [it.marketplaceSku]: String(Math.max(0, receivedVal - 1)),
                                  })
                                }
                                style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                              >
                                -
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {diff < 0 ? (
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                                عجز {Math.abs(diff)} قطعة
                              </span>
                            ) : diff === 0 ? (
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
                                مطابق 100%
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#dbeafe', color: '#2563eb', fontWeight: 700 }}>
                                زيادة +{diff} قطعة
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Calculation */}
              {(() => {
                const totalShipped = receiveShipmentModal.items.reduce((s, it) => s + it.quantityShipped, 0);
                const totalReceived = receiveShipmentModal.items.reduce((s, it) => {
                  const val = parseInt(receiveFormItems[it.marketplaceSku] ?? String(it.quantityReceived ?? it.quantityShipped), 10) || 0;
                  return s + val;
                }, 0);
                const totalDiscrepancy = Math.max(0, totalShipped - totalReceived);

                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <div>
                      <span>إجمالي المشحون: <strong>{totalShipped}</strong> قطعة</span>
                      <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                      <span>المستلم الفعلي: <strong style={{ color: '#16a34a' }}>{totalReceived}</strong> قطعة</span>
                    </div>
                    <div>
                      {totalDiscrepancy > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 800 }}>
                          إجمالي الفاقد والعجز: {totalDiscrepancy} قطعة مفقودة
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 800 }}>
                          الشحنة مطابقة بالكامل دون أي عجز
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <Button variant="secondary" onClick={() => setReceiveShipmentModal(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const receivedItems = receiveShipmentModal.items.map((it) => ({
                      productId: it.productId,
                      marketplaceSku: it.marketplaceSku,
                      quantityReceived: parseInt(receiveFormItems[it.marketplaceSku] ?? String(it.quantityReceived ?? it.quantityShipped), 10) || 0,
                    }));
                    receiveShipmentMutation.mutate({
                      id: receiveShipmentModal.id,
                      receivedItems,
                    });
                  }}
                  disabled={receiveShipmentMutation.isPending}
                  style={{ background: '#170e5e', color: '#ffffff' }}
                >
                  {receiveShipmentMutation.isPending ? 'جاري تسجيل الاستلام...' : 'تأكيد الاستلام وحفظ تقرير الفروقات'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 9: DISCREPANCY & SAFE-T CLAIM REPORT MODAL */}
      {/* ========================================================================= */}
      <DialogShell
        open={!!claimReportModal}
        onClose={() => setClaimReportModal(null)}
        width="min(800px, 95vw)"
        ariaLabel="تقرير ومطالبة التعويض Safe-T / Dispute"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                تقرير المطالبة المالية وفروقات الشحنة (Safe-T / Dispute Claim)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                مطالبة رسمية جاهزة للتقديم لفريق دعم البائعين لدى {claimReportModal?.marketplace.toUpperCase()} للشحنة {claimReportModal?.shipmentNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setClaimReportModal(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {claimReportModal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Claim Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11.5px', color: '#991b1b', fontWeight: 600 }}>إجمالي القطع المفقودة (العجز)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                    {claimReportModal.missingUnits} قطعة
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 600 }}>إجمالي قيمة التعويض المطالب به</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    {claimReportModal.estimatedReimbursementAmount.toLocaleString()} ج.م
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>المستودع المستلم</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {claimReportModal.fulfillmentCenterId}
                  </div>
                </div>
              </div>

              {/* Language Switcher & Claim Template Text */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setClaimLanguage('en')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: claimLanguage === 'en' ? '#ffffff' : 'transparent',
                      color: claimLanguage === 'en' ? '#170e5e' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    English (Amazon / Noon Support)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimLanguage('ar')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: claimLanguage === 'ar' ? '#ffffff' : 'transparent',
                      color: claimLanguage === 'ar' ? '#170e5e' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    العربية (صيغة محلية)
                  </button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const textToCopy = claimLanguage === 'en' ? claimReportModal.generatedClaimTemplateEn : claimReportModal.generatedClaimTemplateAr;
                    navigator.clipboard.writeText(textToCopy);
                    toast.success('تم نسخ نص المطالبة بالكامل إلى الحافظة بنجاح');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CopyIcon size={14} />
                  نسخ نص التقرير والمطالبة
                </Button>
              </div>

              {/* Claim Body Box */}
              <div
                dir={claimLanguage === 'en' ? 'ltr' : 'rtl'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '16px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b',
                }}
              >
                {claimLanguage === 'en' ? claimReportModal.generatedClaimTemplateEn : claimReportModal.generatedClaimTemplateAr}
              </div>

              {/* Items Breakdown Table */}
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  تفاصيل الأصناف التي بها عجز:
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>الصنف</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>كود المنصة (SKU)</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>مشحون</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>مستلم</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>العجز</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>سعر التكلفة</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>مبلغ التعويض</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimReportModal.items.map((it: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>{it.productName}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#64748b' }}>{it.marketplaceSku}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>{it.shipped}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', color: '#16a34a' }}>{it.received}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>
                            {it.missing}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>{it.costPrice} ج.م</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            {it.claimAmount.toLocaleString()} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <Button variant="secondary" onClick={() => setClaimReportModal(null)}>
                  إغلاق
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const textToCopy = claimLanguage === 'en' ? claimReportModal.generatedClaimTemplateEn : claimReportModal.generatedClaimTemplateAr;
                    navigator.clipboard.writeText(textToCopy);
                    toast.success('تم نسخ نص المطالبة إلى الحافظة');
                  }}
                  style={{ background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CopyIcon size={16} />
                  نسخ نص المطالبة لتقديمه للدعم
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 10: EDIT ONBOARDING PROFILE */}
      <EditOnboardingProfileModal
        open={showEditOnboardingModal}
        initialData={onboardingQuery.data || {}}
        targetSection={onboardingTargetSection}
        onClose={() => setShowEditOnboardingModal(false)}
        onSave={(data) => saveOnboardingMutation.mutate(data)}
        isSaving={saveOnboardingMutation.isPending}
      />

      {/* ========================================================================= */}
      {/* MODAL 11: LETTER OF AUTHORIZATION (LOA) */}
      {/* ========================================================================= */}
      <DialogShell
        open={showLoaModal}
        onClose={() => setShowLoaModal(false)}
        width="min(760px, 95vw)"
        ariaLabel="خطاب التفويض الرسمي"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                خطاب التفويض الرسمي المعتمد (Letter of Authorization - LOA)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                خطاب قانوني معتمد جاهز للطباعة والختم لتقديمه لفرق التحقق لدى أمازون ونون.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLoaModal(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {onboardingQuery.data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setLoaLanguage('ar')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: loaLanguage === 'ar' ? '#ffffff' : 'transparent',
                      color: loaLanguage === 'ar' ? '#170e5e' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    العربية (صيغة محلية معتمدة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoaLanguage('en')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: loaLanguage === 'en' ? '#ffffff' : 'transparent',
                      color: loaLanguage === 'en' ? '#170e5e' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    English (Amazon & Noon Compliance)
                  </button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const text = loaLanguage === 'ar' ? onboardingQuery.data.letterOfAuthorizationAr : onboardingQuery.data.letterOfAuthorizationEn;
                    navigator.clipboard.writeText(text);
                    toast.success('تم نسخ نص الخطاب بنجاح');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CopyIcon size={13} />
                  نسخ النص
                </Button>
              </div>

              <div
                dir={loaLanguage === 'en' ? 'ltr' : 'rtl'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '16px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b',
                }}
              >
                {loaLanguage === 'ar' ? onboardingQuery.data.letterOfAuthorizationAr : onboardingQuery.data.letterOfAuthorizationEn}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setShowLoaModal(false)}>
                  إغلاق
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const text = loaLanguage === 'ar' ? onboardingQuery.data.letterOfAuthorizationAr : onboardingQuery.data.letterOfAuthorizationEn;
                    const printWin = window.open('', '_blank', 'width=800,height=900');
                    if (!printWin) {
                      toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
                      return;
                    }
                    printWin.document.write(`
                      <!DOCTYPE html>
                      <html dir="${loaLanguage === 'ar' ? 'rtl' : 'ltr'}">
                        <head>
                          <title>Letter of Authorization</title>
                          <style>
                            @page { size: A4; margin: 25mm 20mm; }
                            body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.7; color: #000; padding: 20px; }
                            pre { font-family: inherit; white-space: pre-wrap; font-size: 11pt; }
                            .stamp-box { border: 2px dashed #999; width: 140px; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #666; margin-top: 10px; }
                          </style>
                        </head>
                        <body>
                          <pre>${text}</pre>
                          <script>
                            window.onload = function() { window.print(); };
                          </script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }}
                  style={{ background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PrinterIcon size={16} />
                  طباعة الخطاب الرسمي A4 للختم
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 12: GTIN / BARCODE EXEMPTION ASSISTANT */}
      {/* ========================================================================= */}
      <DialogShell
        open={showGtinModal}
        onClose={() => { setShowGtinModal(false); setGtinResult(null); }}
        width="min(760px, 95vw)"
        ariaLabel="طلب إعفاء الباركود الدولي"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                طلب إعفاء رسمي من الباركود الدولي (GTIN / EAN Exemption Assistant)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                توليد ملف طلب رسمي موجه لأمازون أو نون لإدراج منتجاتك المحلية أو الخاصة دون شراء باركود دولي GS1.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowGtinModal(false); setGtinResult(null); }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اختيار الصنف من الـ ERP
              </label>
              <select
                value={gtinForm.productId || 0}
                onChange={(e) => setGtinForm({ ...gtinForm, productId: parseInt(e.target.value, 10) || undefined })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
              >
                <option value={0}>-- طلب إعفاء عام / صنف محدد --</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اسم البراند / العلامة التجارية *
              </label>
              <input
                type="text"
                value={gtinForm.brandName}
                onChange={(e) => setGtinForm({ ...gtinForm, brandName: e.target.value })}
                placeholder="مثال: Generic أو اسم علامتك"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                فئة المنتج (Category) *
              </label>
              <input
                type="text"
                value={gtinForm.category}
                onChange={(e) => setGtinForm({ ...gtinForm, category: e.target.value })}
                placeholder="مثال: Fashion, Home & Kitchen"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                المنصة المستهدفة
              </label>
              <select
                value={gtinForm.marketplace}
                onChange={(e) => setGtinForm({ ...gtinForm, marketplace: e.target.value as any })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
              >
                <option value="amazon">أمازون (Amazon SP-API)</option>
                <option value="noon">نون (Noon Marketplace)</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                سبب طلب الإعفاء (Exemption Reason)
              </label>
              <select
                value={gtinForm.reason}
                onChange={(e) => setGtinForm({ ...gtinForm, reason: e.target.value as any })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
              >
                <option value="unbranded">منتج عام بدون علامة تجارية (Generic / Unbranded item)</option>
                <option value="private_label">منتج علامة خاصة مصنع خصيصاً لنا (Private Label Product)</option>
                <option value="custom_manufacturing">منتجات يدوية أو تفصيلية لا تخضع للترقيم الدولي (Handmade / Custom)</option>
                <option value="parts_accessories">قطع غيار أو إكسسوارات تكميلية غير معبأة بباركود (Parts & Accessories)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              variant="primary"
              onClick={() => {
                if (!gtinForm.brandName.trim()) {
                  toast.error('يرجى كتابة اسم البراند أو كتابة Generic');
                  return;
                }
                gtinMutation.mutate(gtinForm);
              }}
              disabled={gtinMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {gtinMutation.isPending ? 'جاري توليد ملف الإعفاء...' : 'توليد خطاب وطلب الإعفاء الرسمي'}
            </Button>
          </div>

          {gtinResult ? (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setGtinLanguage('en')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: gtinLanguage === 'en' ? '#ffffff' : 'transparent',
                      color: gtinLanguage === 'en' ? '#170e5e' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    English (Amazon / Noon Support)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGtinLanguage('ar')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: gtinLanguage === 'ar' ? '#ffffff' : 'transparent',
                      color: gtinLanguage === 'ar' ? '#170e5e' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    العربية
                  </button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const text = gtinLanguage === 'en' ? gtinResult.letterEn : gtinResult.letterAr;
                    navigator.clipboard.writeText(text);
                    toast.success('تم نسخ خطاب الإعفاء بنجاح');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CopyIcon size={13} />
                  نسخ نص الخطاب
                </Button>
              </div>

              <div
                dir={gtinLanguage === 'en' ? 'ltr' : 'rtl'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b',
                }}
              >
                {gtinLanguage === 'en' ? gtinResult.letterEn : gtinResult.letterAr}
              </div>

              {/* Instructions */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
                  خطوات تقديم الطلب لدى المنصة للحصول على الموافقة الفورية:
                </div>
                <ul style={{ margin: 0, paddingRight: '20px', fontSize: '12px', color: '#15803d', lineHeight: '1.6' }}>
                  {gtinResult.submissionInstructions.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </DialogShell>

      {/* ========================================================================= */}
      {/* MODAL 13: MARKETPLACE PHOTO READINESS & OPTIMIZER */}
      {/* ========================================================================= */}
      <DialogShell
        open={showPhotoOptimizerModal}
        onClose={() => { setShowPhotoOptimizerModal(false); setOptimizerImageSrc(null); setOptimizedImageResult(null); setImageMetrics(null); }}
        width="min(760px, 95vw)"
        ariaLabel="فاحص ومحسن صور المنتجات"
      >
        <div dir="rtl" style={{ background: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                فاحص ومحسن صور المنتجات للمنصات (Marketplace Photo Studio)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                فحص وضبط صور المنتجات تلقائياً لتوافق معايير أمازون ونون (خلفية بيضاء نقية 100%، مقاس 1500x1500px، ومطابقة التكبير Zoom).
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowPhotoOptimizerModal(false); setOptimizerImageSrc(null); setOptimizedImageResult(null); setImageMetrics(null); }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Upload Area */}
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '24px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
            }}
            onClick={() => {
              const fileInput = document.getElementById('marketplace-photo-file-input') as HTMLInputElement;
              fileInput?.click();
            }}
          >
            <input
              id="marketplace-photo-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  const url = event.target?.result as string;
                  setOptimizerImageSrc(url);
                  handleOptimizeProductImage(url);
                };
                reader.readAsDataURL(file);
              }}
            />
            <div style={{ color: '#170e5e', marginBottom: '8px' }}>
              <CameraIcon size={32} />
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              انقر لاختيار صورة المنتج من جهازك أو اسحبها هنا
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              يدعم صور الهاتف والكاميرا بصيغ (JPEG, PNG, WebP)
            </div>
          </div>

          {/* Analysis & Split Comparison View */}
          {optimizerImageSrc && imageMetrics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Metrics Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#334155' }}>
                  الأبعاد الأصلية: <strong>{imageMetrics.width} × {imageMetrics.height} px</strong>
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: imageMetrics.isZoomable ? '#dcfce7' : '#fee2e2',
                    color: imageMetrics.isZoomable ? '#166534' : '#991b1b',
                    fontWeight: 700,
                  }}
                >
                  {imageMetrics.isZoomable ? '✓ دقة فائقة تفعل التكبير (Zoom Ready)' : '⚠ أقل من 1000px (ستتم مضاعفة الدقة)'}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    fontWeight: 700,
                  }}
                >
                  الناتج المحسن: 1500 × 1500 px (مربع 1:1)
                </span>
              </div>

              {/* Split Preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Original */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>الصورة الأصلية المرفوعة</div>
                  <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={optimizerImageSrc} alt="Original" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                </div>

                {/* Optimized */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px', textAlign: 'center', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a', marginBottom: '8px' }}>النتيجة المحسنة بخلفية بيضاء 100%</div>
                  <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff', border: '1px solid #00000010' }}>
                    {optimizedImageResult ? (
                      <img src={optimizedImageResult} alt="Optimized" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" onClick={() => { setOptimizerImageSrc(null); setOptimizedImageResult(null); }}>
                  إعادة اختيار صورة أخرى
                </Button>
                {optimizedImageResult ? (
                  <a
                    href={optimizedImageResult}
                    download="marketplace-optimized-product.jpg"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#170e5e',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <DownloadIcon size={14} />
                    تحميل الصورة المجهزة (1500x1500px JPEG)
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </DialogShell>
    </div>
  );
};
