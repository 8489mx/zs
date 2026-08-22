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
  icon: string;
  badgeColor: string;
  sidebarTitle: string;
  sidebarSerialLabel: string;
  serialLabel: string;
  serialPlaceholder: string;
  passcodeLabel: string;
  passcodePlaceholder: string;
  defaultAccessories: string[];
  sampleBrands: string[];
  commonFaults: string[];
}

export const MAINTENANCE_PROFILES: Record<MaintenanceProfileKey, MaintenanceProfileInfo> = {
  mobile: {
    key: 'mobile',
    title: 'صيانة الموبايل، التابلت، والساعات الذكية',
    shortTitle: 'موبايل وتابلت',
    subtitle: 'تتبع السيريال/IMEI، نمط القفل، فحص الشاشة، البطارية، وقطع غيار الهواتف',
    icon: '📱',
    badgeColor: '#3b82f6',
    sidebarTitle: 'قسم الموبايل والصيانة',
    sidebarSerialLabel: 'سجل وتتبع IMEI والأجهزة',
    serialLabel: 'رقم السيريال / IMEI',
    serialPlaceholder: 'أدخل رقم الـ IMEI المكون من 15 رقم أو السيريال...',
    passcodeLabel: 'رمز القفل أو النمط (Pattern / PIN)',
    passcodePlaceholder: 'أدخل الباسورد أو ارسم النمط بالأسفل...',
    defaultAccessories: ['جراب / كفر', 'شاحن أصلي', 'شريحة SIM', 'كارت ميموري', 'قلم ذكي', 'بدون ملحقات'],
    sampleBrands: ['Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Realme', 'Huawei', 'Vivo', 'Infinix', 'Google Pixel'],
    commonFaults: ['تغيير شاشة / باغة', 'تغيير بطارية', 'سوكت شحن / لا يشحن', 'سماعة / مايك', 'عطل شبكة / سيم', 'سوفتوير / ريستارت', 'صيانة بوردة / IC باور']
  },
  computer: {
    key: 'computer',
    title: 'صيانة الكمبيوتر، اللابتوب، والماك',
    shortTitle: 'كمبيوتر ولابتوب',
    subtitle: 'تتبع السيريال والـ Service Tag، فحص الهارد والرام، شواحن، وباسورد الويندوز/الماك',
    icon: '💻',
    badgeColor: '#6366f1',
    sidebarTitle: 'قسم الكمبيوتر واللابتوب',
    sidebarSerialLabel: 'سجل وسيريالات الأجهزة',
    serialLabel: 'سيريال الجهاز (Serial No / Service Tag)',
    serialPlaceholder: 'أدخل السيريال أو Service Tag الموجود أسفل الجهاز...',
    passcodeLabel: 'باسورد الويندوز / Mac Password',
    passcodePlaceholder: 'أدخل كلمة مرور تسجيل دخول النظام...',
    defaultAccessories: ['شاحن لابتوب أصلي', 'شنطة لابتوب', 'ماوس', 'كابل باور', 'فلاشة / هارد خارجي', 'بدون ملحقات'],
    sampleBrands: ['Dell', 'HP', 'Lenovo', 'Apple MacBook', 'Asus', 'Acer', 'MSI', 'Toshiba', 'Custom PC'],
    commonFaults: ['تنزيل ويندوز / تعريفات', 'تغيير شاشة لابتوب', 'ترقية SSD ورامات', 'تنظيف مروحة وتغيير معجون حراري', 'عطل كيبورد / تاتش باد', 'عطل باور / قفلة شحن', 'صيانة كارت الشاشة GPU']
  },
  console: {
    key: 'console',
    title: 'صيانة البلايستيشن والكونسول وأجهزة الألعاب',
    shortTitle: 'بلايستيشن وألعاب',
    subtitle: 'تتبع أجهزة PS4/PS5 وXbox، دراعات التحكم، كابلات، ومشاكل HDMI والحرارة',
    icon: '🎮',
    badgeColor: '#8b5cf6',
    sidebarTitle: 'قسم الكونسول والألعاب',
    sidebarSerialLabel: 'سجل أجهزة الكونسول',
    serialLabel: 'سيريال الكونسول (Serial No)',
    serialPlaceholder: 'أدخل السيريال المطبوع خلف الجهاز...',
    passcodeLabel: 'رمز الحساب / بدون قفل',
    passcodePlaceholder: 'رمز الدخول أو اتركها فارغة...',
    defaultAccessories: ['دراع تحكم أصلي', 'دراعين', 'كابل HDMI', 'كابل باور', 'قاعدة شحن', 'أسطوانة ألعاب', 'بدون ملحقات'],
    sampleBrands: ['Sony PlayStation 5', 'Sony PlayStation 4', 'Microsoft Xbox Series X/S', 'Microsoft Xbox One', 'Nintendo Switch'],
    commonFaults: ['تغيير منفذ HDMI', 'تنظيف صوت المروحة العالي وتغيير المعجون السائل', 'صيانة دراع التحكم (أنالوج درفت)', 'عطل الباور سبلاي', 'تغيير أو ترقية الهارد SSD', 'عدم قراءة الأسطوانات (عدسة)']
  },
  printer: {
    key: 'printer',
    title: 'صيانة الطابعات، ماكينات التصوير والباركود',
    shortTitle: 'طابعات وتصوير',
    subtitle: 'تتبع موديلات الطابعات الليزر والإنكجيت، فحص الدرام ورأس الطباعة وتعبئة الأحبار',
    icon: '🖨️',
    badgeColor: '#0ea5e9',
    sidebarTitle: 'قسم صيانة الطابعات والماكينات',
    sidebarSerialLabel: 'سجل وسيريالات الطابعات',
    serialLabel: 'سيريال الطابعة (Serial Number)',
    serialPlaceholder: 'أدخل السيريال المطبوع على الطابعة...',
    passcodeLabel: 'ملاحظات الاتصال بالشبكة (IP / WiFi)',
    passcodePlaceholder: 'أدخل IP الطابعة أو اتركها فارغة...',
    defaultAccessories: ['كابل باور', 'كابل USB داتا', 'خرطوشة حبر / تانك', 'درج ورق', 'محول كهرباء خارجي', 'بدون ملحقات'],
    sampleBrands: ['HP', 'Canon', 'Epson', 'Xerox', 'Brother', 'Ricoh', 'Zebra Barcode', 'Xprinter'],
    commonFaults: ['حشر ورق متكرر', 'تغيير درام / رول سحب', 'تنظيف أو تغيير رأس الطباعة (Printhead)', 'خطوط بيضاء / بهتان في الطباعة', 'عطل الباور / اللوحة الرئيسية', 'تعبئة وصيانة خراطيش الحبر']
  },
  screens: {
    key: 'screens',
    title: 'صيانة الشاشات، التلفزيونات، والساوند سيستم',
    shortTitle: 'شاشات وتلفزيون',
    subtitle: 'تتبع مقاسات الشاشات، موديل البانل، صيانة الليدات، كروت الباور، والريموت',
    icon: '📺',
    badgeColor: '#f59e0b',
    sidebarTitle: 'قسم صيانة الشاشات والتلفزيون',
    sidebarSerialLabel: 'سجل وسيريالات الشاشات',
    serialLabel: 'سيريال وموديل الشاشة (Model / S/N)',
    serialPlaceholder: 'أدخل موديل الشاشة المطبوع في الخلف...',
    passcodeLabel: 'مقاس الشاشة بالبوصة',
    passcodePlaceholder: 'مثال: 32 بوصة / 43 بوصة / 55 بوصة...',
    defaultAccessories: ['ريموت كنترول أصلي', 'قاعدة / حامل الشاشة', 'كابل باور أصلي', 'أدابتور كهرباء خارجي', 'كابل HDMI', 'بدون ملحقات'],
    sampleBrands: ['Samsung', 'LG', 'Toshiba', 'Sony', 'TCL', 'Sharp', 'Hisense', 'Panasonic', 'Unionaire'],
    commonFaults: ['تغيير مساطر ليدات (صوت بدون صورة)', 'عطل كارت الباور / لا تعمل نهائياً', 'عطل المين بورد (Main Board)', 'عطل التيكون (T-Con) وخطوط البانل', 'تغيير كابل فلاتة البانل', 'مدخل HDMI / مكسور']
  },
  appliances: {
    key: 'appliances',
    title: 'صيانة الأجهزة المنزلية، ماكينات القهوة والإسبريسو',
    shortTitle: 'أجهزة منزلية وماكينات قهوة',
    subtitle: 'صيانة ماكينات الإسبريسو المنزلية والتجارية، أجهزة المطبخ، البمب، والسخانات',
    icon: '☕',
    badgeColor: '#d97706',
    sidebarTitle: 'قسم الأجهزة المنزلية والقهوة',
    sidebarSerialLabel: 'سجل الأجهزة وماكينات القهوة',
    serialLabel: 'سيريال / موديل الجهاز',
    serialPlaceholder: 'أدخل الموديل أو السيريال...',
    passcodeLabel: 'سعة الجهاز أو ضغط البار (Bar / Watts)',
    passcodePlaceholder: 'مثال: 15 Bar / 2000W...',
    defaultAccessories: ['بورتافلتر', 'باسكت القهوة', 'خزان المياه', 'كابل كهرباء', 'أدوات التنظيف', 'بدون ملحقات'],
    sampleBrands: ['DeLonghi', 'Breville', 'Philips', 'Black & Decker', 'Kenwood', 'Braun', 'La Marzocco', 'Nuova Simonelli'],
    commonFaults: ['عدم استخلاص القهوة / ضعف الضغط', 'تسريب مياه داخلي', 'عطل السخان / نزول مياه باردة', 'تراكم الأملاح والترسبات (Descaling)', 'صيانة مضخة المياه (Ulka Pump)', 'عطل لوحة التحكم الإلكترونية']
  },
  cooling: {
    key: 'cooling',
    title: 'صيانة التكييفات، التبريد، والغسالات والأجهزة الكبرى',
    shortTitle: 'تكييفات وتبريد',
    subtitle: 'صيانة وحدات التكييف الاسبليت والمركزي، الثلاجات، الغسالات، وشحن الفريون',
    icon: '❄️',
    badgeColor: '#06b6d4',
    sidebarTitle: 'قسم التكييفات والتبريد',
    sidebarSerialLabel: 'سجل أجهزة التكييف والتبريد',
    serialLabel: 'سيريال الوحدة / الموديل',
    serialPlaceholder: 'أدخل السيريال أو قدرة الوحدة...',
    passcodeLabel: 'القدرة بالحصان أو السعة (HP / Liters)',
    passcodePlaceholder: 'مثال: 1.5 حصان / 2.25 حصان / 18 قدم...',
    defaultAccessories: ['ريموت التكييف', 'حامل تعليق', 'مواسير نحاس', 'كابلات توصيل', 'خرطوم تصريف', 'بدون ملحقات'],
    sampleBrands: ['Carrier', 'Sharp', 'LG', 'Gree', 'Tornado', 'Unionaire', 'Samsung', 'Zanussi', 'Beko'],
    commonFaults: ['شحن فريون R410/R22 مع معالجة تسريب', 'عطل الكومبريسور / لا يبرد', 'تغيير كباستور تقويم', 'صيانة كارت الكنترول الانفرتر', 'تنظيف دورة الهواء والفلتر وغسيل كيميائي', 'صوت عالي في المروحة الخارجية']
  },
  scooters: {
    key: 'scooters',
    title: 'صيانة السكوتر والدراجات الكهربائية الذكية',
    shortTitle: 'سكوتر ودراجات ذكية',
    subtitle: 'فحص بطاريات الليثيوم، الكنترولر، الموتور، فرامل الإشعال، وكروت البلوتوث',
    icon: '🛴',
    badgeColor: '#10b981',
    sidebarTitle: 'قسم السكوتر والدراجات الذكية',
    sidebarSerialLabel: 'سجل الشاسيه والمركبات',
    serialLabel: 'رقم الشاسيه / السيريال (Frame S/N)',
    serialPlaceholder: 'أدخل رقم الشاسيه المطبوع أسفل السكوتر...',
    passcodeLabel: 'رمز فتح التطبيق / بطاقة NFC',
    passcodePlaceholder: 'أدخل الباسورد أو اتركها فارغة...',
    defaultAccessories: ['شاحن سكوتر أصلي', 'مفتاح تشغيل / بطاقة NFC', 'خوذة', 'قفل أمان', 'أدوات ضبط الفرامل', 'بدون ملحقات'],
    sampleBrands: ['Xiaomi Mi Electric', 'Segway Ninebot', 'Dualtron', 'Kaabo Mantis', 'Inokim', 'Kugoo', 'Gotrax'],
    commonFaults: ['عطل بطارية الليثيوم / سرعة النفاد', 'عطل الكنترولر والموسفت (Controller)', 'تغيير كاوتش تيوبلس / داخلي', 'عطل موتور الهب (Hub Motor)', 'ضبط أو تغيير فحمات الفرامل والديسك', 'تلف شاشة العرض والداشبورد']
  },
  general: {
    key: 'general',
    title: 'مركز صيانة متكامل (متعدد الأنشطة والأجهزة)',
    shortTitle: 'مركز صيانة متكامل',
    subtitle: 'نموذج شامل ومرن يتيح استقبال وصيانة كافة أنواع الأجهزة الإلكترونية والمعدات',
    icon: '🏬',
    badgeColor: '#4f46e5',
    sidebarTitle: 'مركز الصيانة والأجهزة',
    sidebarSerialLabel: 'سجل وتتبع وسيريالات الأجهزة',
    serialLabel: 'سيريال / كود الجهاز (Serial / IMEI)',
    serialPlaceholder: 'أدخل رقم السيريال أو كود الجهاز المرجعي...',
    passcodeLabel: 'رمز الحماية أو الباسورد (إن وجد)',
    passcodePlaceholder: 'أدخل رمز القفل أو اتركها فارغة...',
    defaultAccessories: ['شاحن أصلي', 'كابل باور', 'علبة الجهاز الأصلية', 'ريموت كنترول', 'وصلات وملحقات', 'بدون ملحقات'],
    sampleBrands: ['Apple', 'Samsung', 'Dell', 'Sony', 'LG', 'HP', 'DeLonghi', 'Xiaomi', 'ماركة أخرى'],
    commonFaults: ['فحص وصيانة عامة', 'عطل دائرة الباور والكهرباء', 'تغيير قطع غيار تالفة', 'صيانة وتنظيف داخلي', 'تحديث أو صيانة سوفتوير']
  }
};

export function getMaintenanceProfile(key?: string | null): MaintenanceProfileInfo {
  if (key && key in MAINTENANCE_PROFILES) {
    return MAINTENANCE_PROFILES[key as MaintenanceProfileKey];
  }
  return MAINTENANCE_PROFILES.mobile;
}
