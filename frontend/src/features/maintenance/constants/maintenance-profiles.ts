export type MaintenanceProfileKey = 
  | 'mobile'
  | 'computer'
  | 'console'
  | 'printer'
  | 'screens'
  | 'appliances'
  | 'cooling'
  | 'scooters'
  | 'general';

export interface MaintenanceProfileInfo {
  key: MaintenanceProfileKey;
  title: string;
  shortTitle: string;
  subtitle: string;
  iconType: string;
  badgeColor: string;
  sidebarTitle: string;
  sidebarSerialLabel: string;
  serialLabel: string;
  serialPlaceholder: string;
  secondarySerialLabel: string;
  passcodeLabel: string;
  passcodePlaceholder: string;
  passcodeType: 'mobile_lock' | 'password' | 'spec_text';
  defaultAccessories: string[];
  sampleBrands: string[];
  commonFaults: string[];
  tradeInModelPlaceholder: string;
  tradeInNotesLabel: string;
  tradeInNotesPlaceholder: string;
}

export const MAINTENANCE_PROFILES: Record<MaintenanceProfileKey, MaintenanceProfileInfo> = {
  mobile: {
    key: 'mobile',
    title: 'صيانة الموبايل والتابلت والأجهزة الذكية',
    shortTitle: 'موبايل وتابلت',
    subtitle: 'تتبع السيريال/IMEI، نمط القفل، فحص الشاشة، البطارية، وقطع غيار الهواتف',
    iconType: 'mobile',
    badgeColor: '#3b82f6',
    sidebarTitle: 'قسم الموبايل والتابلت',
    sidebarSerialLabel: 'سجل وتتبع IMEI والأجهزة',
    serialLabel: 'السيريال / IMEI 1',
    serialPlaceholder: 'أدخل رقم الـ IMEI أو السيريال...',
    secondarySerialLabel: 'IMEI 2 (شريحة 2 - اختياري)',
    passcodeLabel: 'رمز القفل أو النمط (Pattern / PIN)',
    passcodePlaceholder: 'أدخل الباسورد أو ارسم النمط بالأسفل...',
    passcodeType: 'mobile_lock',
    defaultAccessories: ['جراب / كفر', 'شاحن أصلي', 'شريحة SIM', 'كارت ميموري', 'قلم ذكي', 'بدون ملحقات'],
    sampleBrands: ['Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Realme', 'Huawei', 'Vivo', 'Infinix', 'Google Pixel'],
    commonFaults: ['تغيير شاشة / باغة', 'تغيير بطارية', 'سوكت شحن / لا يشحن', 'سماعة / مايك', 'عطل شبكة / سيم', 'سوفتوير / ريستارت', 'صيانة بوردة / IC باور'],
    tradeInModelPlaceholder: 'iPhone 15 Pro Max 256GB',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: نسبة البطارية 92%، كرتونة أصلية، شاحن سريع، بدون خدوش...'
  },
  computer: {
    key: 'computer',
    title: 'صيانة الكمبيوتر واللابتوب وأجهزة الماك',
    shortTitle: 'كمبيوتر ولابتوب',
    subtitle: 'تتبع السيريال والـ Service Tag، فحص الهارد والرام، شواحن، وباسورد الويندوز/الماك',
    iconType: 'computer',
    badgeColor: '#6366f1',
    sidebarTitle: 'قسم الكمبيوتر واللابتوب',
    sidebarSerialLabel: 'سجل وسيريالات الأجهزة',
    serialLabel: 'السيريال / Service Tag',
    serialPlaceholder: 'أدخل السيريال أو Service Tag الموجود أسفل الجهاز...',
    secondarySerialLabel: 'سيريال الشاحن / القطعة (اختياري)',
    passcodeLabel: 'باسورد الويندوز / Mac Password',
    passcodePlaceholder: 'أدخل كلمة مرور تسجيل دخول النظام...',
    passcodeType: 'password',
    defaultAccessories: ['شاحن لابتوب أصلي', 'شنطة لابتوب', 'ماوس', 'كابل باور', 'فلاشة / هارد خارجي', 'بدون ملحقات'],
    sampleBrands: ['Dell', 'HP', 'Lenovo', 'Apple MacBook', 'Asus', 'Acer', 'MSI', 'Toshiba', 'Custom PC'],
    commonFaults: ['تنزيل ويندوز / تعريفات', 'تغيير شاشة لابتوب', 'ترقية SSD ورامات', 'تنظيف مروحة وتغيير معجون حراري', 'عطل كيبورد / تاتش باد', 'عطل باور / قفلة شحن', 'صيانة كارت الشاشة GPU'],
    tradeInModelPlaceholder: 'Dell Latitude 5420 Core i7 16GB SSD 512GB',
    tradeInNotesLabel: 'ملاحظات الفحص والمواصفات:',
    tradeInNotesPlaceholder: 'مثال: الهارد SSD سليم 100%، بطارية 3 ساعات، شاحن أصلي 65W، شنطة...'
  },
  console: {
    key: 'console',
    title: 'صيانة البلايستيشن والكونسول وأجهزة الألعاب',
    shortTitle: 'بلايستيشن وألعاب',
    subtitle: 'تتبع أجهزة PS4/PS5 وXbox، دراعات التحكم، كابلات، ومشاكل HDMI والحرارة',
    iconType: 'console',
    badgeColor: '#8b5cf6',
    sidebarTitle: 'قسم أجهزة البلايستيشن',
    sidebarSerialLabel: 'سجل وسيريالات الكونسول',
    serialLabel: 'سيريال الكونسول (Serial No)',
    serialPlaceholder: 'أدخل السيريال المطبوع خلف الجهاز...',
    secondarySerialLabel: 'سيريال دراع التحكم (اختياري)',
    passcodeLabel: 'رمز الحساب / بدون قفل',
    passcodePlaceholder: 'رمز الدخول أو اتركها فارغة...',
    passcodeType: 'password',
    defaultAccessories: ['دراع تحكم أصلي', 'دراعين', 'كابل HDMI', 'كابل باور', 'قاعدة شحن', 'أسطوانة ألعاب', 'بدون ملحقات'],
    sampleBrands: ['Sony PlayStation 5', 'Sony PlayStation 4', 'Microsoft Xbox Series X/S', 'Microsoft Xbox One', 'Nintendo Switch'],
    commonFaults: ['تغيير منفذ HDMI', 'تنظيف صوت المروحة العالي وتغيير المعجون السائل', 'صيانة دراع التحكم (أنالوج درفت)', 'عطل الباور سبلاي', 'تغيير أو ترقية الهارد SSD', 'عدم قراءة الأسطوانات (عدسة)'],
    tradeInModelPlaceholder: 'PlayStation 5 Slim 1TB Disc Edition',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: 2 دراع DualSense أصلي، كابل HDMI، بحالة الزيرو، مع أسطوانة FIFA...'
  },
  printer: {
    key: 'printer',
    title: 'صيانة الطابعات وماكينات التصوير والباركود',
    shortTitle: 'طابعات وتصوير',
    subtitle: 'تتبع موديلات الطابعات الليزر والإنكجيت، فحص الدرام ورأس الطباعة وتعبئة الأحبار',
    iconType: 'printer',
    badgeColor: '#0ea5e9',
    sidebarTitle: 'قسم صيانة الطابعات',
    sidebarSerialLabel: 'سجل وسيريالات الطابعات',
    serialLabel: 'سيريال الطابعة (Serial Number)',
    serialPlaceholder: 'أدخل السيريال المطبوع على الطابعة...',
    secondarySerialLabel: 'سيريال الحبارة / الرأس (اختياري)',
    passcodeLabel: 'ملاحظات الاتصال بالشبكة (IP / WiFi)',
    passcodePlaceholder: 'أدخل IP الطابعة أو اتركها فارغة...',
    passcodeType: 'spec_text',
    defaultAccessories: ['كابل باور', 'كابل USB داتا', 'خرطوشة حبر / تانك', 'درج ورق', 'محول كهرباء خارجي', 'بدون ملحقات'],
    sampleBrands: ['HP', 'Canon', 'Epson', 'Xerox', 'Brother', 'Ricoh', 'Zebra Barcode', 'Xprinter'],
    commonFaults: ['حشر ورق متكرر', 'تغيير درام / رول سحب', 'تنظيف أو تغيير رأس الطباعة (Printhead)', 'خطوط بيضاء / بهتان في الطباعة', 'عطل الباور / اللوحة الرئيسية', 'تعبئة وصيانة خراطيش الحبر'],
    tradeInModelPlaceholder: 'HP LaserJet Pro M404dn Laser Printer',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: العداد 1500 ورقة، الحبارة ممتلئة، الدرام أصلي بدون خطوط...'
  },
  screens: {
    key: 'screens',
    title: 'صيانة الشاشات والتلفزيونات والساوند سيستم',
    shortTitle: 'شاشات وتلفزيون',
    subtitle: 'تتبع مقاسات الشاشات، موديل البانل، صيانة الليدات، كروت الباور، والريموت',
    iconType: 'screens',
    badgeColor: '#f59e0b',
    sidebarTitle: 'قسم صيانة الشاشات',
    sidebarSerialLabel: 'سجل وسيريالات الشاشات',
    serialLabel: 'سيريال وموديل الشاشة (S/N)',
    serialPlaceholder: 'أدخل موديل الشاشة المطبوع في الخلف...',
    secondarySerialLabel: 'كود البانل (اختياري)',
    passcodeLabel: 'مقاس الشاشة بالبوصة',
    passcodePlaceholder: 'مثال: 32 بوصة / 43 بوصة / 55 بوصة...',
    passcodeType: 'spec_text',
    defaultAccessories: ['ريموت كنترول أصلي', 'قاعدة / حامل الشاشة', 'كابل باور أصلي', 'أدابتور كهرباء خارجي', 'كابل HDMI', 'بدون ملحقات'],
    sampleBrands: ['Samsung', 'LG', 'Toshiba', 'Sony', 'TCL', 'Sharp', 'Hisense', 'Panasonic', 'Unionaire'],
    commonFaults: ['تغيير مساطر ليدات (صوت بدون صورة)', 'عطل كارت الباور / لا تعمل نهائياً', 'عطل المين بورد (Main Board)', 'عطل التيكون (T-Con) وخطوط البانل', 'تغيير كابل فلاتة البانل', 'مدخل HDMI / مكسور'],
    tradeInModelPlaceholder: 'Samsung 55 Crystal 4K Smart TV CU7000',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: ريموت أصلي، بدون أي خدوش في البانل، كابل باور، قاعدة...'
  },
  appliances: {
    key: 'appliances',
    title: 'صيانة الأجهزة المنزلية وماكينات القهوة والإسبريسو',
    shortTitle: 'أجهزة منزلية وماكينات قهوة',
    subtitle: 'صيانة ماكينات الإسبريسو المنزلية والتجارية، أجهزة المطبخ، البمب، والسخانات',
    iconType: 'appliances',
    badgeColor: '#d97706',
    sidebarTitle: 'قسم الأجهزة المنزلية',
    sidebarSerialLabel: 'سجل وسيريالات الأجهزة',
    serialLabel: 'سيريال / موديل الجهاز',
    serialPlaceholder: 'أدخل الموديل أو السيريال...',
    secondarySerialLabel: 'كود الملحق (اختياري)',
    passcodeLabel: 'سعة الجهاز أو ضغط البار (Bar / Watts)',
    passcodePlaceholder: 'مثال: 15 Bar / 2000W...',
    passcodeType: 'spec_text',
    defaultAccessories: ['بورتافلتر', 'باسكت القهوة', 'خزان المياه', 'كابل كهرباء', 'أدوات التنظيف', 'بدون ملحقات'],
    sampleBrands: ['DeLonghi', 'Breville', 'Philips', 'Black & Decker', 'Kenwood', 'Braun', 'La Marzocco', 'Nuova Simonelli'],
    commonFaults: ['عدم استخلاص القهوة / ضعف الضغط', 'تسريب مياه داخلي', 'عطل السخان / نزول مياه باردة', 'تراكم الأملاح والترسبات (Descaling)', 'صيانة مضخة المياه (Ulka Pump)', 'عطل لوحة التحكم الإلكترونية'],
    tradeInModelPlaceholder: 'DeLonghi Dedica EC685.M Espresso Machine',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: ضغط 15 بار سليم، بورتافلتر كامل مع 2 باسكت، خزان مياه نظيف...'
  },
  cooling: {
    key: 'cooling',
    title: 'صيانة التكييفات والتبريد والغسالات والأجهزة الكبرى',
    shortTitle: 'تكييفات وتبريد',
    subtitle: 'صيانة وحدات التكييف الاسبليت والمركزي، الثلاجات، الغسالات، وشحن الفريون',
    iconType: 'cooling',
    badgeColor: '#06b6d4',
    sidebarTitle: 'قسم التكييفات والتبريد',
    sidebarSerialLabel: 'سجل وسيريالات التكييف',
    serialLabel: 'سيريال الوحدة / الموديل',
    serialPlaceholder: 'أدخل السيريال أو قدرة الوحدة...',
    secondarySerialLabel: 'الوحدة الخارجية (اختياري)',
    passcodeLabel: 'القدرة بالحصان أو السعة (HP / Liters)',
    passcodePlaceholder: 'مثال: 1.5 حصان / 2.25 حصان / 18 قدم...',
    passcodeType: 'spec_text',
    defaultAccessories: ['ريموت التكييف', 'حامل تعليق', 'مواسير نحاس', 'كابلات توصيل', 'خرطوشة تصريف', 'بدون ملحقات'],
    sampleBrands: ['Carrier', 'Sharp', 'LG', 'Gree', 'Tornado', 'Unionaire', 'Samsung', 'Zanussi', 'Beko'],
    commonFaults: ['شحن فريون R410/R22 مع معالجة تسريب', 'عطل الكومبريسور / لا يبرد', 'تغيير كباستور تقويم', 'صيانة كارت الكنترول الانفرتر', 'تنظيف دورة الهواء والفلتر وغسيل كيميائي', 'صوت عالي في المروحة الخارجية'],
    tradeInModelPlaceholder: 'Carrier Optimax 1.5 HP Inverter Split AC',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: كباس أصلي سليم، ريموت تحكم، شحنة فريون ممتازة...'
  },
  scooters: {
    key: 'scooters',
    title: 'صيانة السكوتر والدراجات الكهربائية الذكية',
    shortTitle: 'سكوتر ودراجات ذكية',
    subtitle: 'فحص بطاريات الليثيوم، الكنترولر، الموتور، فرامل الإشعال، وكروت البلوتوث',
    iconType: 'scooters',
    badgeColor: '#10b981',
    sidebarTitle: 'قسم السكوتر والدراجات',
    sidebarSerialLabel: 'سجل وشاسيه السكوتر',
    serialLabel: 'رقم الشاسيه / السيريال',
    serialPlaceholder: 'أدخل رقم الشاسيه المطبوع أسفل السكوتر...',
    secondarySerialLabel: 'سيريال البطارية (اختياري)',
    passcodeLabel: 'رمز فتح التطبيق / بطاقة NFC',
    passcodePlaceholder: 'أدخل الباسورد أو اتركها فارغة...',
    passcodeType: 'password',
    defaultAccessories: ['شاحن سكوتر أصلي', 'مفتاح تشغيل / بطاقة NFC', 'خوذة', 'قفل أمان', 'أدوات ضبط الفرامل', 'بدون ملحقات'],
    sampleBrands: ['Xiaomi Mi Electric', 'Segway Ninebot', 'Dualtron', 'Kaabo Mantis', 'Inokim', 'Kugoo', 'Gotrax'],
    commonFaults: ['عطل بطارية الليثيوم / سرعة النفاد', 'عطل الكنترولر والموسفت (Controller)', 'تغيير كاوتش تيوبلس / داخلي', 'عطل موتور الهب (Hub Motor)', 'ضبط أو تغيير فحمات الفرامل والديسك', 'تلف شاشة العرض والداشبورد'],
    tradeInModelPlaceholder: 'Xiaomi Electric Scooter Pro 2 300W',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: بطارية 100%، شاحن أصلي، سرعة 25 كم/س، فرامل ديسك جديدة...'
  },
  general: {
    key: 'general',
    title: 'مركز صيانة متكامل (متعدد الأنشطة والأجهزة)',
    shortTitle: 'مركز صيانة متكامل',
    subtitle: 'نموذج شامل ومرن يتيح استقبال وصيانة كافة أنواع الأجهزة الإلكترونية والمعدات',
    iconType: 'general',
    badgeColor: '#4f46e5',
    sidebarTitle: 'مركز الصيانة المعتمد',
    sidebarSerialLabel: 'سجل وسيريالات الأجهزة',
    serialLabel: 'السيريال / كود الجهاز',
    serialPlaceholder: 'أدخل رقم السيريال أو كود الجهاز المرجعي...',
    secondarySerialLabel: 'السيريال الثانوي (اختياري)',
    passcodeLabel: 'رمز الحماية أو الباسورد (إن وجد)',
    passcodePlaceholder: 'أدخل رمز القفل أو اتركها فارغة...',
    passcodeType: 'password',
    defaultAccessories: ['شاحن أصلي', 'كابل باور', 'علبة الجهاز الأصلية', 'ريموت كنترول', 'وصلات وملحقات', 'بدون ملحقات'],
    sampleBrands: ['Apple', 'Samsung', 'Dell', 'Sony', 'LG', 'HP', 'DeLonghi', 'Xiaomi', 'ماركة أخرى'],
    commonFaults: ['فحص وصيانة عامة', 'عطل دائرة الباور والكهرباء', 'تغيير قطع غيار تالفة', 'صيانة وتنظيف داخلي', 'تحديث أو صيانة سوفتوير'],
    tradeInModelPlaceholder: 'موديل ومواصفات الجهاز المستلم...',
    tradeInNotesLabel: 'ملاحظات الفحص والملحقات:',
    tradeInNotesPlaceholder: 'مثال: الحالة العامة، الملحقات المرفقة، الملاحظات الفنية...'
  }
};

export function getMaintenanceProfile(key?: string | null): MaintenanceProfileInfo {
  if (key && key in MAINTENANCE_PROFILES) {
    return MAINTENANCE_PROFILES[key as MaintenanceProfileKey];
  }
  return MAINTENANCE_PROFILES.mobile;
}
