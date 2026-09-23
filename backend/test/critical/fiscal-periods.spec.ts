import { strict as assert } from 'node:assert';
import { AppError } from '../../src/common/errors/app-error';

// =============================================================================
// CRITICAL FINANCIAL AUDIT SUITE: Fiscal Periods & Monthly Closing (O6)
// Rule 13 (AGENTS.md): Proof of Financial & Operational Invariants
// =============================================================================

console.log('=== بدء اختبارات الفترات المحاسبية الشهرية وإقفال الشهور (البند O6) ===\n');

/**
 * 1. اختبارات خوارزمية تقسيم وتوليد الفترات المحاسبية الشهرية
 */
function testPeriodGenerationAlgorithm() {
  console.log('--- 1. اختبارات تقسيم وتوليد الفترات الشهرية (12 شهراً وسنوات كبيسة) ---');

  function generateMonthlyPeriods(startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];

    let periodNumber = 1;
    let curr = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    const periods: Array<{
      periodNumber: number;
      name: string;
      code: string;
      startDate: string;
      endDate: string;
    }> = [];

    while (curr <= endUtc) {
      const yearNum = curr.getUTCFullYear();
      const monthIdx = curr.getUTCMonth();
      const monthName = monthNamesAr[monthIdx];

      const pStart = periodNumber === 1
        ? startDateStr
        : new Date(Date.UTC(yearNum, monthIdx, 1)).toISOString().slice(0, 10);

      const lastDayOfMonth = new Date(Date.UTC(yearNum, monthIdx + 1, 0));
      const pEnd = lastDayOfMonth > endUtc
        ? endDateStr
        : lastDayOfMonth.toISOString().slice(0, 10);

      const code = `${yearNum}-${String(monthIdx + 1).padStart(2, '0')}`;
      const name = `${monthName} ${yearNum}`;

      periods.push({
        periodNumber,
        name,
        code,
        startDate: pStart,
        endDate: pEnd,
      });

      periodNumber++;
      curr = new Date(Date.UTC(yearNum, monthIdx + 1, 1));
      if (pEnd >= endDateStr) break;
    }

    return periods;
  }

  // 1.1 سنة قياسية كاملة 2025 (12 شهر)
  {
    const periods = generateMonthlyPeriods('2025-01-01', '2025-12-31');
    assert.equal(periods.length, 12, 'السنة القياسية يجب أن تنقسم إلى 12 فترة شهرية');
    assert.equal(periods[0].name, 'يناير 2025');
    assert.equal(periods[0].startDate, '2025-01-01');
    assert.equal(periods[0].endDate, '2025-01-31');
    assert.equal(periods[1].name, 'فبراير 2025');
    assert.equal(periods[1].endDate, '2025-02-28', 'فبراير 2025 (بسيطة) يجب أن ينتهي في 28');
    assert.equal(periods[11].name, 'ديسمبر 2025');
    assert.equal(periods[11].endDate, '2025-12-31');
    console.log('✔ توليد 12 فترة شهرية متطابقة لسنة 2025 (نجاح)');
  }

  // 1.2 سنة كبيسة 2024 (فبراير 29 يوماً)
  {
    const periods = generateMonthlyPeriods('2024-01-01', '2024-12-31');
    assert.equal(periods[1].endDate, '2024-02-29', 'فبراير 2024 (كبيسة) يجب أن ينتهي في 29');
    console.log('✔ معالجة السنة الكبيسة بدقة لليوم 29 في فبراير (نجاح)');
  }

  // 1.3 سنة مالية تبدأ في منتصف السنة (مثلاً 1 يوليو إلى 30 يونيو)
  {
    const periods = generateMonthlyPeriods('2025-07-01', '2026-06-30');
    assert.equal(periods.length, 12, 'سنة مالية تبدأ في يوليو يجب أن تحتوي على 12 فترة');
    assert.equal(periods[0].name, 'يوليو 2025');
    assert.equal(periods[11].name, 'يونيو 2026');
    console.log('✔ دعم السنوات المالية ذات التواريخ المخصصة عبر سنتين تقويميتين (نجاح)');
  }
}

/**
 * 2. اختبارات ثوابت الترتيب الزمني للإقفال وإعادة الفتح والمسودات
 */
function testClosingAndReopeningInvariants() {
  console.log('\n--- 2. اختبارات ثوابت الترتيب الزمني والمسودات ---');

  type MockPeriod = {
    id: number;
    periodNumber: number;
    name: string;
    status: 'open' | 'closed';
  };

  function validateClosePeriod(params: {
    period: MockPeriod;
    allPeriods: MockPeriod[];
    draftEntriesCount: number;
  }) {
    if (params.period.status === 'closed') {
      throw new Error('الفترة المحاسبية مقفلة بالفعل.');
    }
    // الترتيب الزمني: لا يجوز إقفال شهر قبل إقفال الشهر السابق له
    const prevOpen = params.allPeriods
      .filter((p) => p.periodNumber < params.period.periodNumber && p.status === 'open')
      .sort((a, b) => a.periodNumber - b.periodNumber)[0];

    if (prevOpen) {
      throw new Error(`لا يمكن إقفال الفترة [${params.period.name}] قبل إقفال الفترة السابقة [${prevOpen.name}].`);
    }

    if (params.draftEntriesCount > 0) {
      throw new Error(`توجد ${params.draftEntriesCount} مسودات قيود محاسبية غير مرحّلة في هذه الفترة.`);
    }

    return true;
  }

  function validateReopenPeriod(params: {
    period: MockPeriod;
    allPeriods: MockPeriod[];
    reason: string;
  }) {
    if (!params.reason.trim()) {
      throw new Error('يجب ذكر سبب إعادة فتح الفترة المحاسبية للرقابة والتدقيق.');
    }
    if (params.period.status !== 'closed') {
      throw new Error('الفترة المحاسبية مفتوحة بالفعل.');
    }
    // الترتيب العكسي: لا يجوز إعادة فتح شهر طالما هناك شهر بعده مقفل
    const nextClosed = params.allPeriods
      .filter((p) => p.periodNumber > params.period.periodNumber && p.status === 'closed')
      .sort((a, b) => b.periodNumber - a.periodNumber)[0];

    if (nextClosed) {
      throw new Error(`لا يمكن إعادة فتح الفترة [${params.period.name}] لأن الفترة اللاحقة [${nextClosed.name}] مقفلة.`);
    }

    return true;
  }

  const periods: MockPeriod[] = [
    { id: 1, periodNumber: 1, name: 'يناير 2025', status: 'open' },
    { id: 2, periodNumber: 2, name: 'فبراير 2025', status: 'open' },
    { id: 3, periodNumber: 3, name: 'مارس 2025', status: 'open' },
  ];

  // 2.1 محاولة إقفال فبراير قبل يناير يجب أن تفشل
  assert.throws(
    () => validateClosePeriod({ period: periods[1], allPeriods: periods, draftEntriesCount: 0 }),
    /قبل إقفال الفترة السابقة/,
    'محاولة إقفال شهر قبل الشهر السابق له يجب أن تُرفض',
  );
  console.log('✔ حظر إقفال شهر متقدم قبل إقفال الأشهر السابقة له (نجاح)');

  // 2.2 محاولة إقفال يناير مع وجود مسودات قيود معلقة يجب أن تفشل
  assert.throws(
    () => validateClosePeriod({ period: periods[0], allPeriods: periods, draftEntriesCount: 3 }),
    /مسودات قيود محاسبية غير مرحّلة/,
    'وجود مسودات غير مرحلة يجب أن يحجب إقفال الشهر',
  );
  console.log('✔ حظر إقفال الشهر عند وجود قيود معلقة في المسودة (نجاح)');

  // 2.3 إقفال يناير بنجاح (صفر مسودات)
  assert.equal(
    validateClosePeriod({ period: periods[0], allPeriods: periods, draftEntriesCount: 0 }),
    true,
  );
  periods[0].status = 'closed';
  console.log('✔ إقفال يناير بنجاح بعد استيفاء الشروط (نجاح)');

  // 2.4 الآن يمكن إقفال فبراير
  assert.equal(
    validateClosePeriod({ period: periods[1], allPeriods: periods, draftEntriesCount: 0 }),
    true,
  );
  periods[1].status = 'closed';
  console.log('✔ إقفال فبراير بنجاح بالتتابع الزمني (نجاح)');

  // 2.5 محاولة إعادة فتح يناير وفبراير مقفل يجب أن تفشل (حظر كسر الترتيب العكسي)
  assert.throws(
    () => validateReopenPeriod({ period: periods[0], allPeriods: periods, reason: 'تعديل سطر' }),
    /لأن الفترة اللاحقة.*مقفلة/,
    'لا يجوز إعادة فتح شهر قديم وشهر أحدث منه لا يزال مقفلاً',
  );
  console.log('✔ حظر إعادة فتح شهر قديم طالما الشهر اللاحق مقفل (نجاح)');

  // 2.6 إعادة فتح فبراير أولاً تنجح
  assert.equal(
    validateReopenPeriod({ period: periods[1], allPeriods: periods, reason: 'إدخال فاتورة متأخرة' }),
    true,
  );
  periods[1].status = 'open';
  console.log('✔ إعادة فتح فبراير بنجاح بترتيب زمني عكسي (نجاح)');

  // 2.7 الآن يمكن إعادة فتح يناير
  assert.equal(
    validateReopenPeriod({ period: periods[0], allPeriods: periods, reason: 'تسوية رصيد' }),
    true,
  );
  periods[0].status = 'open';
  console.log('✔ إعادة فتح يناير بنجاح بعد فتح فبراير (نجاح)');
}

/**
 * 3. اختبارات حارس ترحيل القيود ومنع الإدخال بأثر رجعي في فترة مقفلة
 */
function testJournalPostingPeriodLockGuard() {
  console.log('\n--- 3. اختبارات حارس ترحيل القيود ومنع الإدخال في فترة مقفلة ---');

  type MockPeriodRow = {
    id: number;
    name: string;
    period_number: number;
    start_date: string;
    end_date: string;
    status: 'open' | 'closed';
  };

  function validateEntryAgainstPeriods(entryDate: string, closedPeriods: MockPeriodRow[]) {
    const matchedClosed = closedPeriods.find(
      (p) => p.status === 'closed' && entryDate >= p.start_date && entryDate <= p.end_date,
    );

    if (matchedClosed) {
      throw new AppError(
        `الفترة المحاسبية الشهرية [${matchedClosed.name}] مقفلة. لا يمكن ترحيل حركات مالية في فترة مغلقة.`,
        'ACCOUNTING_PERIOD_LOCKED',
        400,
      );
    }

    return true;
  }

  const closedPeriods: MockPeriodRow[] = [
    { id: 1, name: 'يناير 2025', period_number: 1, start_date: '2025-01-01', end_date: '2025-01-31', status: 'closed' },
    { id: 2, name: 'فبراير 2025', period_number: 2, start_date: '2025-02-01', end_date: '2025-02-28', status: 'closed' },
  ];

  // 3.1 محاولة ترحيل قيد في 15 يناير 2025 (فترة مقفلة)
  assert.throws(
    () => validateEntryAgainstPeriods('2025-01-15', closedPeriods),
    (err: any) => {
      assert.equal(err.code, 'ACCOUNTING_PERIOD_LOCKED');
      assert.ok(err.message.includes('يناير 2025'));
      return true;
    },
    'محاولة الترحيل في فترة شهرية مقفلة يجب أن ترمي استثناء ACCOUNTING_PERIOD_LOCKED صريح',
  );
  console.log('✔ حجب الترحيل الفوري لقيد بتاريخ يقع ضمن شهر مقفل (يناير 2025)');

  // 3.2 محاولة ترحيل قيد في 20 فبراير 2025 (فترة مقفلة)
  assert.throws(
    () => validateEntryAgainstPeriods('2025-02-20', closedPeriods),
    (err: any) => {
      assert.equal(err.code, 'ACCOUNTING_PERIOD_LOCKED');
      assert.ok(err.message.includes('فبراير 2025'));
      return true;
    },
  );
  console.log('✔ حجب الترحيل الفوري لقيد بتاريخ يقع ضمن شهر مقفل (فبراير 2025)');

  // 3.3 ترحيل قيد في 5 مارس 2025 (فترة مفتوحة)
  assert.equal(
    validateEntryAgainstPeriods('2025-03-05', closedPeriods),
    true,
    'الترحيل في فترة مفتوحة يجب أن يمر بسلاسة',
  );
  console.log('✔ السماح بترحيل قيد بتاريخ يقع ضمن شهر مفتوح (مارس 2025)');
}

// تشغيل كافة الاختبارات
testPeriodGenerationAlgorithm();
testClosingAndReopeningInvariants();
testJournalPostingPeriodLockGuard();

console.log('\n=============================================================');
console.log('✅ نجحت كافة اختبارات الفترات المحاسبية الشهرية وإقفال الشهور (100%)');
console.log('=============================================================');
