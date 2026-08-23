export const DOSAGE_FORMS = [
  'أقراص (Tablets)',
  'كبسولات (Capsules)',
  'شراب (Syrup)',
  'معلق (Suspension)',
  'حقن عضل / وريد (Injections)',
  'مرهم / كريم (Ointment / Cream)',
  'نقط للعين / الأذن (Eye / Ear Drops)',
  'نقط للأنف / بخاخ (Nasal Drops / Spray)',
  'فوار وأكياس (Effervescent / Sachets)',
  'لبوس / تحاميل (Suppositories)',
  'جل موضعي (Topical Gel)',
  'لوشن ومحلول (Lotion / Solution)',
  'مستلزمات طبية (Medical Supplies)',
  'ألبان وأغذية أطفال (Baby Milk / Food)',
  'مستحضرات تجميل وعناية (Cosmetics / Skin Care)',
];

export const MAJOR_DISTRIBUTORS = [
  'شركة المتحدة للصيادلة (United Pharma)',
  'شركة ابن سينا فارما (Ibnsina Pharma)',
  'شركة فارما أوفرسيز (Pharma Overseas)',
  'الشركة المصرية لتجارة الأدوية (Egyptian Company)',
  'شركة سوفيكو فارما (Soficopharm)',
  'شركة تكنوفارما (Techno Pharma)',
  'شراء مباشر من مصنع / وكيل',
];

export const MAJOR_PHARMA_COMPANIES = [
  'فاركو للأدوية (Pharco)',
  'إيبيكو (EIPICO)',
  'آمون للأدوية (Amoun)',
  'إيفا فارما (Eva Pharma)',
  'نوفارتس (Novartis)',
  'سانوفي (Sanofi)',
  'فايزر (Pfizer)',
  'جلوبال نابي (Global Napi)',
  'جلينمارك (Glenmark)',
  'حكمة فارما (Hikma)',
  'سيد للأدوية (CID)',
  'النيل للأدوية (Nile Pharma)',
  'أسترازينيكا (AstraZeneca)',
  'جلاكسو سميث كلاين (GSK)',
  'أندلسية / ماركيرل (Marcyrl)',
  'أبيكس فارما (Apex Pharma)',
];

export const DRUG_CLASSES = [
  'مسكنات وخافض حرارة ومضادات التهاب (NSAIDs & Analgesics)',
  'مضادات حيوية ومضادات ميكروبات (Antibiotics)',
  'أدوية ضغط ودم وقلب وأوعية دموية (Cardiovascular)',
  'أدوية سكر وغدد صماء (Diabetes & Endocrine)',
  'أدوية جهاز هضمي ومعدة وقولون (Gastrointestinal)',
  'أدوية جهاز تنفسي وحساسية وكحة (Respiratory & Allergy)',
  'فيتامينات ومكملات غذائية ومعادن (Vitamins & Minerals)',
  'أدوية جلدية وشعر ومستحضرات موضعية (Dermatology)',
  'أدوية مسالك بولية وتناسلية (Urology)',
  'أدوية عيون وأنف وأذن (Ophthalmology & ENT)',
  'أدوية مخ وأعصاب وحالة نفسية (CNS & Neurology)',
  'أدوية نساء وتوليد وهرمونات (Gynecology)',
];

export const INSURANCE_PROVIDERS = [
  'بدون تأمين (كاش)',
  'ميدنت مصر (MedNet Egypt)',
  'بوبا للتأمين (Bupa Global / Egypt)',
  'كير بلس (Care Plus)',
  'أكسا للتأمين (AXA Insurance)',
  'نكست كير (NextCare)',
  'مصر للتأمين التكافلي (Misr Takaful)',
  'نقابة المهندسين',
  'نقابة المعلمين',
  'نقابة المحامين',
  'نقابة الأطباء',
  'نقابة التجاريين',
  'تأمين صحي حكومي شامل',
  'شركة خاصة / تعاقد مباشر',
];

export const CLINICAL_SERVICE_LABELS: Record<string, { title: string; unit: string; icon: string }> = {
  blood_pressure: { title: 'قياس ضغط الدم', unit: 'mmHg', icon: 'stethoscope' },
  blood_glucose: { title: 'قياس السكر بالدم', unit: 'mg/dL', icon: 'droplet' },
  weight_bmi: { title: 'قياس الوزن وكتلة الجسم', unit: 'kg', icon: 'scale' },
  injection: { title: 'إعطاء حقنة عضل / وريد', unit: 'حقنة', icon: 'syringe' },
  wound_dressing: { title: 'غيار وتطهير جروح', unit: 'جلسة', icon: 'bandage' },
};
