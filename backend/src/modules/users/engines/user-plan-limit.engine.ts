/**
 * محرك احتساب وتدقيق حدود المستخدمين للباقات — مصدر واحد للحقيقة
 * Single Source of Truth for Plan User Limits
 *
 * الثوابت الحاكمة:
 * 1. الأرقام تُقرأ حصرياً من جدول `saas_plans` بالربط (tenants.plan_id ⇄ saas_plans.code / feature_plan_id).
 * 2. قيمة `max_users = NULL` في `saas_plans` تعني **بلا حد (غير محدود)** مثل باقة التجارة الشاملة.
 * 3. التفرقة الحاسمة بين `NULL` وبين «عدم وجود اشتراك أو باقة معروفة»:
 *    - `NULL` في باقة معتمدة = غير محدود (لا يُقفل الزر ولا يُمنع المستخدم).
 *    - عدم وجود باقة ولا اشتراك إطلاقاً = السقوط على الافتراضي (5 للتجربة، 3 للافتراضي).
 */

export type UserLimit = number | null;

export interface UserLimitInput {
  /** قيمة max_users من جدول saas_plans للاشتراك النشط (null تعني غير محدود) */
  subscriptionMaxUsers?: UserLimit | undefined;
  /** كود الباقة من الاشتراك النشط (مثل OMNICHANNEL, ULTIMATE, PRO, BASIC) */
  subscriptionPlanCode?: string | null;
  /** معرف خطة الميزات للاشتراك النشط (مثل plan_omnichannel, plan_ultimate) */
  subscriptionFeaturePlanId?: string | null;
  /** هل يوجد اشتراك نشط أو تحت فترة السماح للمنشأة */
  hasActiveSubscription: boolean;
  /** قيمة max_users المقروءة من saas_plans عبر الربط tenants.plan_id ⇄ saas_plans.code / feature_plan_id */
  planFromDbMaxUsers?: UserLimit | undefined;
  /** هل وُجدت الباقة في جدول saas_plans */
  planFoundInDb?: boolean;
  /** كود أو معرف الباقة المعلق على المنشأة (tenants.plan_id) */
  tenantPlanId?: string | null;
  /** هل المنشأة في فترة تجريبية (status === 'trial') */
  isTrial: boolean;
}

export const DEFAULT_TRIAL_USER_LIMIT = 5;
export const DEFAULT_USER_LIMIT = 3;

/**
 * تحديد الحد الأقصى للمستخدمين المسموح بهم للمنشأة:
 * null تعني غير محدود (Unlimited)
 */
export function resolveUserLimit(input: UserLimitInput): UserLimit {
  const rawSubCode = String(input.subscriptionPlanCode || '').toUpperCase();
  const rawSubFeature = String(input.subscriptionFeaturePlanId || '').toLowerCase();
  const rawTenantPlan = String(input.tenantPlanId || '').toLowerCase();

  // 1. إذا كان الاشتراك نشطاً: الأولوية لبيانات saas_plans المربوطة بالاشتراك
  if (input.hasActiveSubscription) {
    // إذا كانت القيمة مسجلة صراحة في saas_plans
    if (input.subscriptionMaxUsers === null) {
      return null; // غير محدود (مثل OMNICHANNEL)
    }
    if (typeof input.subscriptionMaxUsers === 'number' && input.subscriptionMaxUsers > 0) {
      return input.subscriptionMaxUsers;
    }
    // احتياط كود الباقة إذا لم يُربط جدول saas_plans
    if (
      rawSubCode === 'OMNICHANNEL' ||
      rawSubCode === 'ULTIMATE' ||
      rawSubCode === 'ENTERPRISE' ||
      rawSubFeature.includes('omnichannel') ||
      rawSubFeature.includes('ultimate') ||
      rawSubFeature.includes('enterprise') ||
      rawSubFeature.includes('commerce')
    ) {
      return null;
    }
  }

  // 2. إذا لم يكن هناك اشتراك نشط، نفحص الباقة المربوطة بالمنشأة مباشرة من saas_plans
  if (input.planFoundInDb) {
    if (input.planFromDbMaxUsers === null) {
      return null; // غير محدود
    }
    if (typeof input.planFromDbMaxUsers === 'number' && input.planFromDbMaxUsers > 0) {
      return input.planFromDbMaxUsers;
    }
  }

  // 3. مطابقة اسم/معرف الباقة المعلق على المنشأة (tenants.plan_id)
  if (
    rawTenantPlan.includes('omnichannel') ||
    rawTenantPlan.includes('ultimate') ||
    rawTenantPlan.includes('enterprise') ||
    rawTenantPlan.includes('commerce') ||
    rawTenantPlan.includes('تجارة')
  ) {
    return null; // غير محدود
  }

  if (rawTenantPlan.includes('pro') || rawSubCode === 'PRO') {
    return 6;
  }

  // 4. لا اشتراك ولا باقة معروفة في saas_plans: نسقط على الافتراضي
  return input.isTrial ? DEFAULT_TRIAL_USER_LIMIT : DEFAULT_USER_LIMIT;
}

/**
 * فحص هل تم الوصول للحد الأقصى للمستخدمين
 */
export function isUserLimitReached(limit: UserLimit, activeUsersCount: number): boolean {
  if (limit === null) return false; // غير محدود
  return activeUsersCount >= limit;
}

/**
 * الوصف النصي للحد لعرضه في الإشعارات والواجهات
 */
export function describeUserLimit(limit: UserLimit): string {
  return limit === null ? 'غير محدود' : String(limit);
}
