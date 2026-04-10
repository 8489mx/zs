# zsystems react frontend

واجهة React + TypeScript حديثة للنظام، مبنية على feature-based architecture مع React Router وTanStack Query وZustand.

## التشغيل
```bash
npm ci
npm run dev
```

## البناء
```bash
npm run build
```

## فحوص الواجهة
```bash
npm run qa
```

## النطاق الحالي
- تسجيل الدخول والجلسات
- لوحة التحكم
- الأصناف
- المبيعات ونقطة البيع
- المشتريات
- المخزون
- العملاء والموردون والحسابات
- المرتجعات
- التقارير
- الخزنة والخدمات والإعدادات
- حراسة الصلاحيات والمسارات

## ملاحظات
- الفحوص الوظيفية تم تحديثها لتطابق البنية الحالية تحت `src/shared` و`src/features`.
- الراوتر الفعلي يعتمد على `src/app/router/registry.ts`.
