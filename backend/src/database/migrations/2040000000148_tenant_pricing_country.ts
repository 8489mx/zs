import { Kysely, sql } from 'kysely';

/**
 * بلد التسعير للمنشأة — يُغلق البند C8 في `PRICING_AND_PACKAGING.md` §11.
 *
 * كانت شاشة الاشتراك تحدد العملة من `settings.currency` ومن **منتقي عملات يختاره
 * العميل نفسه** (`userSelectedCurrency`)، فمنشأة مصرية تختار USD وترى 99$ بدل
 * 3,500 ج.م — ثغنة مراجحة سعرية مباشرة، والعملة المختارة كانت تُمرَّر إلى طلب الترقية.
 *
 * البلد الآن حقل على المنشأة يضبطه **مسؤول المنصة**، لا إعداد يملكه مدير المنشأة
 * ولا اختيار في الواجهة. يُشتق مبدئياً من عملة المنشأة ثم يبقى ثابتاً.
 *
 * ملاحظة: هذه هجرة إضافة عمود غير مدمّرة، تعمل في السحابة والديسكتوب معاً.
 */
export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    await sql`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS country_code varchar(2)
    `.execute(db);

    // الاشتقاق المبدئي من عملة المنشأة. القيمة في `settings` مخزَّنة JSON
    // (`"EGP"`) أو نصاً خاماً، فتُنظَّف الأقواس قبل المطابقة.
    await sql`
      UPDATE tenants t
      SET country_code = CASE UPPER(TRIM(BOTH '"' FROM s.value))
        WHEN 'SAR' THEN 'SA'
        WHEN 'AED' THEN 'AE'
        WHEN 'QAR' THEN 'QA'
        WHEN 'KWD' THEN 'KW'
        WHEN 'BHD' THEN 'BH'
        WHEN 'OMR' THEN 'OM'
        ELSE 'EG'
      END
      FROM settings s
      WHERE s.tenant_id = t.id
        AND s.key = 'currency'
        AND (t.country_code IS NULL OR TRIM(t.country_code) = '')
    `.execute(db);

    // كل منشأة بلا عملة مسجَّلة تسقط على مصر — البلد الافتراضي المعتمد.
    await sql`
      UPDATE tenants
      SET country_code = 'EG'
      WHERE country_code IS NULL OR TRIM(country_code) = ''
    `.execute(db);
  },

  async down(db: Kysely<any>): Promise<void> {
    // غير مدمّرة: العمود يبقى. حذفه يفقد ضبطاً يدوياً قام به مسؤول المنصة.
    await Promise.resolve(db);
  },
};
