import { useTranslation } from 'react-i18next';
import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  MapPinIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckShieldIcon,
} from '@/shared/components/icons/AppIcons';

export interface VanGpsMandatoryModalProps {
  open: boolean;
  onClose: () => void;
  customerName?: string;
  errorMessage?: string;
  isChecking?: boolean;
  onRetry: () => void;
}

export const VanGpsMandatoryModal: React.FC<VanGpsMandatoryModalProps> = ({
  open,
  onClose,
  customerName,
  errorMessage,
  isChecking = false,
  onRetry,
}) => {
  const { t } = useTranslation();
  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('delivery_reps.van_gps_mandatory_modal.s0', "تفعيل خدمة تحديد المواقع (GPS) إلزامي")}
      subtitle={
        customerName
          ? `للتحقق من التواجد الميداني الفعلي أمام متجر "${customerName}"`
          : t('delivery_reps.van_gps_mandatory_modal.s1', "متطلب نظام إلزامي لبدء الزيارات الميدانية وعمليات البيع")
      }
      width="min(480px, 94vw)"
      compact
    >
      <div
        dir="rtl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '6px 2px 2px',
        }}
      >
        {/* Visual Header Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              borderRadius: '12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPinIcon size={22} color="#b45309" strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#92400e',
                margin: '0 0 3px',
                lineHeight: 1.3,
              }}
            >
              {t('delivery_reps.van_gps_mandatory_modal.s2', "خدمة تحديد المواقع (GPS) مقفولة أو يتعذر التقاط الإحداثيات")}
            </h4>
            <p
              style={{
                fontSize: '11.5px',
                color: '#78350f',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {t('delivery_reps.van_gps_mandatory_modal.s3', "لا يمكن بدء الزيارة الميدانية أو إصدار فواتير بيع أو تحصيلات للعميل دون تفعيل الـ GPS والتقاط إحداثيات المتجر بدقة.")}
            </p>
          </div>
        </div>

        {/* Detailed Reason If Available */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '11px',
              color: '#991b1b',
              fontWeight: 600,
            }}
          >
            <AlertTriangleIcon size={14} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ lineHeight: 1.3 }}>{errorMessage}</span>
          </div>
        )}

        {/* Institutional Policy Notice */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#170e5e',
              marginBottom: '6px',
            }}
          >
            <CheckShieldIcon size={13} color="#170e5e" />
            <span>{t('delivery_reps.van_gps_mandatory_modal.s4', "لماذا يفرض النظام تفعيل الـ GPS؟")}</span>
          </div>
          <p
            style={{
              fontSize: '11px',
              color: '#475569',
              margin: 0,
              lineHeight: 1.5,
              textAlign: 'justify',
            }}
          >
            {t('delivery_reps.van_gps_mandatory_modal.s5', "تطبق المنظومة سياسة النطاق الجغرافي الذكي لتوثيق الحضور الفعلي للمندوب أمام دكان العميل، ومنع الزيارات والفواتير الوهمية من خارج النطاق، وضمان دقة حساب معدل ضرب الزيارات (Strike Rate) وزمن المكوث في المتجر.")}
          </p>
        </div>

        {/* 3 Steps To Fix */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
            {t('delivery_reps.van_gps_mandatory_modal.s6', "خطوات التفعيل السريع للمتابعة:")}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#334155' }}>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#eef2ff',
                color: '#170e5e',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              1
            </span>
            <span>{t('delivery_reps.van_gps_mandatory_modal.s7', "اسحب شريط الإشعارات العلوي بهاتفك وقم بتشغيل أيقونة \"الموقع الجغرافي / Location\".")}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#334155' }}>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#eef2ff',
                color: '#170e5e',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              2
            </span>
            <span>{t('delivery_reps.van_gps_mandatory_modal.s8', "إذا طلب المتصفح الصلاحية، اختر \"السماح بالوصول للموقع\" (Allow).")}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#334155' }}>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#eef2ff',
                color: '#170e5e',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              3
            </span>
            <span>{t('delivery_reps.van_gps_mandatory_modal.s9', "اضغط على زر \"إعادة الفحص والتقاط الموقع الآن\" بالأسفل لبدء الزيارة.")}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <StandardDialogFooter style={{ marginTop: '4px', padding: 0 }}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isChecking}
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              height: '34px',
              padding: '0 14px',
            }}
          >
            {t('delivery_reps.van_gps_mandatory_modal.s10', "إلغاء الزيارة")}
          </Button>

          <Button
            variant="primary"
            onClick={onRetry}
            disabled={isChecking}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 800,
              height: '34px',
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCwIcon
              size={13}
              color="#ffffff"
              style={{
                animation: isChecking ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{isChecking ? t('delivery_reps.van_gps_mandatory_modal.s11', "جاري فحص الـ GPS...") : t('delivery_reps.van_gps_mandatory_modal.s12', "إعادة الفحص والتقاط الموقع الآن")}</span>
          </Button>
        </StandardDialogFooter>
      </div>
    </StandardDialog>
  );
};
