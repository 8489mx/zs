/**
 * Enterprise Semantic Photographic Engine for Retail & Supermarket
 * Automatically and intelligently matches product names and categories to 
 * exact, authentic, verified product photography with weighted scoring.
 */

export function cleanArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[\u064B-\u065F\u0640]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export interface SemanticPhotoRule {
  id: string;
  nameAr: string;
  keywords: string[];
  imageUrl: string;
  weight: number; // Higher weight = higher specificity precedence
}

export const SEMANTIC_PHOTO_RULES: SemanticPhotoRule[] = [
  // -------------------------------------------------------------
  // 1. CLEANING & PERSONAL CARE (SPECIFIC SUB-TYPES)
  // -------------------------------------------------------------
  {
    id: 'dishwashing_liquid',
    nameAr: 'سائل غسيل الأطباق والصحون وفيري',
    keywords: [
      'فيري', 'بريل', 'سائل اطباق', 'غسيل اطباق', 'مواعين', 'سائل صحون', 
      'اطباق فيري', 'اقراص غساله', 'اقراص غسالة', 'غسالة اطباق', 'غساله اطباق'
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Tesco_and_Sainsburys_own_dishwashing_liquid.jpg/500px-Tesco_and_Sainsburys_own_dishwashing_liquid.jpg',
    weight: 98,
  },
  {
    id: 'toothpaste',
    nameAr: 'معجون وفراشي الأسنان',
    keywords: ['معجون', 'اسنان', 'سيجنال', 'كولجيت', 'سنسوداين', 'فرشاه اسنان', 'مكافح التسوس'],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Toothbrush_with_Toothpaste_%2811693757123%29.jpg/500px-Toothbrush_with_Toothpaste_%2811693757123%29.jpg',
    weight: 98,
  },
  {
    id: 'laundry_detergent',
    nameAr: 'مساحيق غسيل الملابس',
    keywords: [
      'اوكسي', 'اريال', 'برسيل', 'تايد', 'بونكس', 'مسحوق غسيل', 'غسيل اتوماتيك', 
      'غسيل اوتوماتيك', 'غسيل يدوي', 'مسحوق ملابس', 'معطر ملابس', 'داوني'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'bleach_disinfectant',
    nameAr: 'كلور ومطهرات ومنظفات أرضيات',
    keywords: [
      'كلور', 'كلوركس', 'مبيض', 'فلاش', 'منظف ارضيات', 'مطهر ارضيات', 
      'ديتول سائل', 'مطهر', 'معقم اسطح', 'جل ارضيات'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'bar_soap',
    nameAr: 'صابون يد واستحمام وشاور',
    keywords: [
      'صابون ديتول', 'صابون لوكس', 'صابون دوف', 'صابون كاماي', 'صابون وجه', 
      'صابون تواليت', 'شاور جيل', 'غسول يد', 'صابون استحمام', 'صابون', 'صابونه'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 75,
  },
  {
    id: 'tissues_paper',
    nameAr: 'مناديل ورقية وبكر مطبخ وتواليت',
    keywords: [
      'مناديل', 'منديل', 'فاين', 'زينة', 'زينه', 'بكر تواليت', 'ماكسي رول', 
      'مناديل مطبخ', 'مناديل سحب', 'وايبس', 'مناديل مبللة', 'بابيا'
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Roll_of_paper_towels_standing_on_toilet-paper_holder.jpg/500px-Roll_of_paper_towels_standing_on_toilet-paper_holder.jpg',
    weight: 95,
  },

  // -------------------------------------------------------------
  // 2. MEAT, POULTRY & FROZEN FOODS
  // -------------------------------------------------------------
  {
    id: 'burger',
    nameAr: 'برجر لحم مشوي',
    keywords: ['برجر', 'همبرجر', 'برجر بقري', 'برجر حلواني', 'برجر جامبو', 'بيف برجر'],
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 98,
  },
  {
    id: 'crispy_chicken_strips',
    nameAr: 'ستربس ودجاج مقرمش وبانيه',
    keywords: [
      'ستربس', 'بانية', 'بانيه', 'ناجتس', 'دجاج مقرمش', 'كوكي مقرمش', 
      'تشيكن ستربس', 'اصابع دجاج', 'فراخ بانيه', 'كرانشي تشيكن'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 98,
  },
  {
    id: 'fresh_poultry_meat',
    nameAr: 'دواجن ولحوم طازجة',
    keywords: [
      'دجاج', 'فراخ', 'دواجن', 'فروج', 'بفروج', 'لحوم', 'لحمة', 'لحم مفروم', 
      'كفتة', 'سجق', 'شاورما', 'ريش', 'كندوز', 'بتلو'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 75,
  },
  {
    id: 'canned_tuna_fish',
    nameAr: 'تونة وأسماك معلبة وبحرية',
    keywords: [
      'تونة', 'تونه', 'صن شاين', 'دولفين', 'سردين', 'ماكريل', 'سلمون', 
      'سمك', 'رنجة', 'رنجه', 'فسيخ', 'جمبري', 'سي فود'
    ],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Tuna_assortment.png',
    weight: 98,
  },
  {
    id: 'frozen_vegetables',
    nameAr: 'بامية وقرون بامية خضراء طازجة',
    keywords: [
      'بامية', 'باميا', 'بامية ممتازة', 'ملوخية', 'ملوخيه', 'ملوخية خضراء', 
      'بسمة', 'بسلة', 'خضار مشكل', 'سبانخ', 'قلقاس', 'خرشوف'
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Okra_or_lady_finger.jpg/500px-Okra_or_lady_finger.jpg',
    weight: 95,
  },

  // -------------------------------------------------------------
  // 3. SNACKS, SWEETS & BAKERY
  // -------------------------------------------------------------
  {
    id: 'biscuits_cookies_oreo',
    nameAr: 'بسكويت وكوكيز وأوريو وويفر',
    keywords: [
      'اوريو', 'بسكويت', 'بسكوت', 'كوكيز', 'ويفر', 'لوتس', 'كراكرز', 
      'توداي', 'اولكر', 'بوريو', 'بيمبو', 'ماري', 'نواعم'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'pastries_croissant',
    nameAr: 'كرواسون ومخبوزات وباتيه ومولتو',
    keywords: ['مولتو', 'كرواسون', 'باتيه', 'دونتس', 'كيك', 'كب كيك', 'سينامون', 'تودو'],
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'chocolate_nutella',
    nameAr: 'شوكولاتة ونوتيلا وقوالب كاكاو',
    keywords: [
      'نوتيلا', 'كادبوري', 'جلاكسي', 'شوكولاتة', 'شوكولاته', 'شيكولاتة', 
      'شيكولاته', 'ديري ميلك', 'كيت كات', 'مارس', 'سنيكرز', 'تويكس', 'فريرو'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 94,
  },
  {
    id: 'chips_crisps_popcorn',
    nameAr: 'شيبسي ودوريتوس ومقرمشات وفشار',
    keywords: [
      'دوريتوس', 'شيبسي', 'شيبس', 'كرانشي', 'شيتوس', 'تايجر', 'مقرمشات', 
      'سناكس', 'فشار', 'لايز', 'بيج شيبس', 'بفك'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'nuts_roastery',
    nameAr: 'مكسرات ومسليات ومقرمشات محمصة',
    keywords: [
      'مكسرات', 'كاجو', 'فستق', 'لوز', 'بندق', 'عين جمل', 'فول سوداني', 
      'سوداني', 'لب اسمر', 'لب ابيض', 'لب سوري', 'ياميش'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1536599428105-9784189843c8?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 90,
  },

  // -------------------------------------------------------------
  // 4. GROCERY & PANTRY ESSENTIALS
  // -------------------------------------------------------------
  {
    id: 'pasta_dry',
    nameAr: 'مكرونة واسباجيتي وشعرية جافة',
    keywords: [
      'مكرونة', 'مكرونه', 'سباجيتي', 'سباغيتي', 'روجينا', 'الملكة', 'الملكه', 
      'شعرية', 'شعريه', 'لسان عصفور', 'فرن', 'قلم', 'ايطاليانو', 'نودلز', 'اندومي'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 98,
  },
  {
    id: 'rice_grains',
    nameAr: 'أرز فاخر أبيض وبسمتي',
    keywords: ['ارز', 'رز', 'بسمتي', 'ارز مصري', 'ارز فاخر', 'شيكاره ارز', 'ارز الضحى'],
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 90,
  },
  {
    id: 'sugar_granulated',
    nameAr: 'سكر أبيض نقي في وعاء',
    keywords: ['الاسرة', 'سكر', 'سكر نقي', 'سكر ابيض', 'سكر خشن', 'سكر بودرة', 'سكر بودره', 'سكر سويتنر'],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/A_Bowl_of_Sugar.jpg/500px-A_Bowl_of_Sugar.jpg',
    weight: 95,
  },
  {
    id: 'flour_starch_baking',
    nameAr: 'دقيق فاخر ونشا ومستلزمات خبز',
    keywords: [
      'دقيق', 'نشا', 'بيكنج بودر', 'بيكنج', 'فانيليا', 'خميرة', 'خميره', 
      'سميد', 'دقيق فاخر', 'دريم', 'تاج الملوك', 'كريم شانتيه'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 94,
  },
  {
    id: 'ghee_natural_butter',
    nameAr: 'سمنة وزبدة ومسلى بلدي',
    keywords: [
      'سمن', 'سمنه', 'سمنة', 'روابي', 'جنة', 'جنه', 'زبدة', 'زبده', 
      'مسلى', 'فيرن', 'سمن بلدي', 'فلاحي', 'الهانم'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'olive_oil_extra',
    nameAr: 'زيت زيتون بكر ممتاز',
    keywords: ['زيت زيتون', 'زيتون بكر', 'زيت زيتون وادي فود', 'زيتون ممتاز'],
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 98,
  },
  {
    id: 'cooking_oil_vegetable',
    nameAr: 'زيوت طعام ذرة وعباد الشمس',
    keywords: [
      'زيت ذره', 'زيت ذرة', 'زيت عباد', 'زيت طعام', 'عافية', 'عافيه', 
      'كريستال', 'سلايت', 'قلية', 'قليه', 'زيت حلوة', 'زيت'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 75,
  },
  {
    id: 'tomato_paste_ketchup',
    nameAr: 'كاتشب وصلصة طماطم ومعجون',
    keywords: [
      'كاتشب', 'صلصة طماطم', 'صلصه طماطم', 'صلصة', 'صلصه', 'معجون طماطم', 
      'كاتشب هاينز', 'مايونيز', 'مستردة', 'مسترده', 'باربيكيو'
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Tomato_paste_can.jpg/500px-Tomato_paste_can.jpg',
    weight: 92,
  },
  {
    id: 'vinegar_condiments',
    nameAr: 'خل طبيعي ومتبلات طعام',
    keywords: ['خل', 'خل قصب', 'خل ابيض', 'خل تفاح', 'دبس رمان', 'صويا صوص'],
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 90,
  },
  {
    id: 'fava_beans_legumes',
    nameAr: 'فول مدمس وبقوليات وحبوب',
    keywords: ['فول مدمس', 'فول', 'هارفست', 'عدس', 'حمص', 'لوبيا', 'فاصوليا بيضاء', 'ترمس'],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Cooked_Fava_beans.jpg/500px-Cooked_Fava_beans.jpg',
    weight: 92,
  },
  {
    id: 'honey_tahini_halawa',
    nameAr: 'عسل نحل وطحينة وحلاوة طحينية',
    keywords: ['عسل', 'عسل نحل', 'عسل اسود', 'طحينة', 'طحينه', 'حلاوة', 'حلاوه', 'الرشيدي', 'البوادي', 'امتنان'],
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 94,
  },

  // -------------------------------------------------------------
  // 5. BEVERAGES, COFFEE & TEA
  // -------------------------------------------------------------
  {
    id: 'coca_cola_can',
    nameAr: 'كوكاكولا كانز أصلية',
    keywords: ['كوكاكولا', 'كولا كانز', 'coca cola', 'كوكا كولا'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Lata_de_Coca_Cola_zero.jpg',
    weight: 99,
  },
  {
    id: 'pepsi_soda_can',
    nameAr: 'بيبسي كانز وسفن أب ومشروبات غازية',
    keywords: [
      'بيبسي', 'pepsi', 'سفن اب', 'سبرايت', 'ميرندا', 'شويبس', 
      'كانز', 'ريد بول', 'ستينج', 'مشروب طاقة', 'صودا', 'كانز ليمون'
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Pepsi_355_ml%2C_Canada_%28obverse%29%2C_2026-03-05.jpg/500px-Pepsi_355_ml%2C_Canada_%28obverse%29%2C_2026-03-05.jpg',
    weight: 97,
  },
  {
    id: 'green_tea',
    nameAr: 'شاي أخضر ونعناع وأعشاب طبيعية',
    keywords: [
      'شاي اخضر', 'شاى اخضر', 'اخضر نعناع', 'احمد تي نعناع', 'احمد تي اخضر', 
      'شاي بالنعناع', 'ينسون', 'كركديه', 'بابونج', 'اعشاب'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 98,
  },
  {
    id: 'red_tea',
    nameAr: 'شاي أحمر وليبتون وشاي العروسة',
    keywords: [
      'شاي العروسة', 'شاي العروسه', 'ليبتون', 'شاي احمر', 'شاي خرز', 
      'شاي فتله', 'شاي ناعم', 'شاي كشري', 'شاي', 'شاى'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 80,
  },
  {
    id: 'instant_coffee_roastery',
    nameAr: 'نسكافيه وقهوة وبن وسريع التحضير',
    keywords: [
      'نسكافيه', 'كابتشينو', 'سريع التحضير', 'بونجورنو', 'قهوة', 'قهوه', 
      'اسبريسو', 'بن تركي', 'بن محوج', 'بن سادة', 'بن'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 94,
  },
  {
    id: 'pure_mineral_water',
    nameAr: 'مياه معدنية نقية وطبيعية',
    keywords: [
      'مياه معدنية', 'مياه معدنيه', 'داساني', 'دساني', 'نستله مياه', 'مياه نستله', 
      'بركة مياه', 'اكوافينا', 'صافي', 'مياه', 'ميه'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 92,
  },
  {
    id: 'natural_fruit_juice',
    nameAr: 'عصائر فواكه طبيعية وتتراباك',
    keywords: [
      'عصير', 'عصائر', 'بيتي برتقال', 'بيتي تفاح', 'جهينة عصير', 'بيور مانجو', 
      'راني', 'لمار', 'عصير مانجو', 'عصير برتقال', 'عصير جوافة'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 88,
  },

  // -------------------------------------------------------------
  // 6. DAIRY, CHEESE & EGGS
  // -------------------------------------------------------------
  {
    id: 'mozzarella_yellow_cheeses',
    nameAr: 'جبنة موزاريلا مبشورة وشيدر ورومي',
    keywords: [
      'موزاريلا', 'موتزاريلا', 'شيدر', 'رومي', 'جبن رومي', 'جبنة مبشورة', 
      'مبشورة', 'فلمنك', 'جودا', 'جبنة مثلثات', 'لافاش كيري'
    ],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/2021-01-02_20_52_08_A_bag_of_Kraft_Finely_Shredded_Mozzarella_Cheese_in_the_Franklin_Farm_section_of_Oak_Hill%2C_Fairfax_County%2C_Virginia.jpg/500px-2021-01-02_20_52_08_A_bag_of_Kraft_Finely_Shredded_Mozzarella_Cheese_in_the_Franklin_Farm_section_of_Oak_Hill%2C_Fairfax_County%2C_Virginia.jpg',
    weight: 98,
  },
  {
    id: 'white_brined_cheese',
    nameAr: 'جبنة بيضاء وفيتا وإسطنبولي وبراميلي',
    keywords: [
      'جبنة بيضاء', 'جبنه بيضاء', 'فيتا', 'اسطنبولي', 'براميلي', 'دومتي', 
      'عبور لاند', 'قريش', 'جبنة فيتا', 'جبن ابيض', 'جبنة ملح خفيف'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'natural_yogurt',
    nameAr: 'زبادي طبيعي ورايب',
    keywords: ['زبادي', 'زبادي طبيعي', 'زبادي لايت', 'دانون', 'زبادي بلدي', 'لبن رايب', 'رايب'],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Yogurt_vainilla_soja.jpg/500px-Yogurt_vainilla_soja.jpg',
    weight: 98,
  },
  {
    id: 'fresh_farm_eggs',
    nameAr: 'بيض مزارع طازج كرتونة وطبق',
    keywords: ['بيض', 'كرتونة بيض', 'كرتونه بيض', 'بيض احمر', 'بيض ابيض', 'بيض بلدي', 'طبق بيض'],
    imageUrl: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 98,
  },
  {
    id: 'fresh_packaged_milk',
    nameAr: 'حليب ولبن طازج وبودرة',
    keywords: [
      'لبن جهينة', 'لبن المراعي', 'لبن نيدو', 'حليب كامل الدسم', 'خالي الدسم', 
      'نصف دسم', 'لبن مجفف', 'حليب بودرة', 'لبن', 'حليب'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 80,
  },

  // -------------------------------------------------------------
  // 7. BROAD CATEGORY FALLBACKS (WHEN NEW PRODUCTS DON'T MATCH SPECIFICS)
  // -------------------------------------------------------------
  {
    id: 'cat_cleaning_fallback',
    nameAr: 'قسم منظفات وعناية منزلية (عام)',
    keywords: ['منظفات وعناية منزلية', 'منظفات', 'عناية منزلية', 'مطهرات'],
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 30,
  },
  {
    id: 'cat_dairy_fallback',
    nameAr: 'قسم ألبان وجبن وبيض (عام)',
    keywords: ['ألبان وجبن وبيض', 'البان', 'اجبان', 'اجبان وبيض'],
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 30,
  },
  {
    id: 'cat_sweets_fallback',
    nameAr: 'قسم حلويات وبسكويت ومسليات (عام)',
    keywords: ['حلويات وبسكويت ومسليات', 'حلويات', 'مسليات', 'تسالي'],
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 30,
  },
  {
    id: 'cat_frozen_fallback',
    nameAr: 'قسم مجمدات ولحوم ودواجن (عام)',
    keywords: ['مجمدات ولحوم ودواجن', 'مجمدات', 'لحوم ودواجن'],
    imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 30,
  },
  {
    id: 'cat_drinks_fallback',
    nameAr: 'قسم مشروبات وعصائر ومياه (عام)',
    keywords: ['مشروبات وعصائر ومياه', 'مشروبات وعصائر', 'عصائر ومياه'],
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 30,
  },

  // =========================================================================
  // 5. TECH, COMPUTERS & ELECTRONICS (REFINED SPECIFIC DOMAIN)
  // =========================================================================
  {
    id: 'ink_toner_printers',
    nameAr: 'أحبار وطابعات وتونر وحبارات',
    keywords: [
      'احبار بطاريات', 'احبار', 'المتميز للاحبار', 'المتميز للأحبار', 'حبر', 'احبار طابعات', 
      'حبارات', 'حباره', 'حبارة', 'تونر', 'طابعه', 'طابعات', 'طابعة', 'طابعة ليزر', 'طابعة الوان', 'cartridge', 'toner'
    ],
    imageUrl: '/catalog/computer/toner_cartridges.jpg',
    weight: 98,
  },
  {
    id: 'printer_drums',
    nameAr: 'درامات وسخانات وقطع غيار طابعات',
    keywords: ['درامات', 'درام', 'درام طابعه', 'درام طابعة', 'drum unit', 'opc drum'],
    imageUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'receipt_pos_printers',
    nameAr: 'طابعات فواتير وريسيت حرارية وكاشير',
    keywords: [
      'برنتر ريسيت', 'طابعه ريسيت', 'طابعات ريسيت', 'طابعه فواتير', 'طابعات فواتير', 
      'طابعه كاشير', 'طابعه حراريه', 'طابعة ريسيت', 'receipt printer', 'pos printer'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 98,
  },
  {
    id: 'barcode_scanners',
    nameAr: 'سكانر وقارئ باركود ليزر',
    keywords: ['سكانر باركود', 'سكانر', 'قارئ باركود', 'قارئ بار كود', 'قارئ باركود ليزر', 'barcode scanner', 'سكانر ليزر'],
    imageUrl: '/catalog/computer/barcode_scanner.jpg',
    weight: 98,
  },
  {
    id: 'pos_cashier_supplies',
    nameAr: 'مستلزمات سيستم كاشير وأدراج نقدية',
    keywords: [
      'مستلزمات سيستم كاشير', 'سيستم كاشير', 'درج كاشير', 'درج نقديه', 'درج نقدية', 
      'بكر فواتير', 'ورق حراري', 'ورق كاشير', 'شاشه كاشير', 'كاشير'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'graphics_cards_gpu',
    nameAr: 'كروت فيجا وكروت شاشة للألعاب والتصميم',
    keywords: [
      'كروت فيجا', 'كرت فيجا', 'كارت فيجا', 'كروت شاشه', 'كرت شاشه', 'كارت شاشه', 
      'فيجا', 'gpu', 'rtx', 'gtx', 'rx', 'كارت شاشة', 'graphics card'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'motherboards',
    nameAr: 'مازر بورد ولوحات أم',
    keywords: ['مازر بورد', 'ماذربورد', 'لوحه ام', 'لوحة ام', 'motherboard', 'لوحه رئيسيه', 'بوردة'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'processors_cpu',
    nameAr: 'بروسيسورات ومعالجات كمبيوتر',
    keywords: [
      'بروسيسورات', 'بروسيسور', 'معالج', 'معالجات', 'cpu', 'intel', 'amd', 
      'core i3', 'core i5', 'core i7', 'core i9', 'ryzen', 'رايزن'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'ram_memory',
    nameAr: 'رامات حديثة وذاكرة عشوائية DDR4 وDDR5',
    keywords: ['رامات', 'رام', 'رامة', 'ddr4', 'ddr3', 'ddr5', 'ذاكره عشوائيه', 'رام لابتوب', 'ram', 'ذاكرة رام', '3200hz'],
    imageUrl: '/catalog/computer/ram_modern.jpg',
    weight: 98,
  },
  {
    id: 'hard_drives_ssd',
    nameAr: 'هاردات وذاكرة تخزين داخلية وخارجية وSSD',
    keywords: ['هاردات', 'هارد', 'ssd', 'hdd', 'هارد ديسك', 'm2 nvme', 'nvme', 'قرص صلب', 'تخزين'],
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'pc_cases_gaming',
    nameAr: 'كيسات كمبيوتر وشاسيهات جيمنج RGB',
    keywords: [
      'كيسات جيمنج', 'كيسات كمبيوتر', 'كيسات', 'كيسه كمبيوتر', 'كيسة كمبيوتر', 
      'كيسه جيمنج', 'كيسة جيمنج', 'case pc', 'pc case', 'كيسه', 'كيسة'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'computer_fans_cooling',
    nameAr: 'مراوح تبريد وفانات بروسيسور وكيسة',
    keywords: [
      'مراوح', 'مروحه', 'مروحة', 'فانات', 'فانة', 'تبريد', 'تبريد مائي', 
      'مروحه كيسه', 'مروحة كيسة', 'فانة بروسيسور', 'rgb fan', 'cooler'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 94,
  },
  {
    id: 'computer_mice',
    nameAr: 'ماوسات وفأرة كمبيوتر سلكية ولاسلكية وجيمنج',
    keywords: [
      'ماوسات', 'ماوس', 'فاره', 'فأرة', 'mouse', 'ماوس وايرلس', 
      'ماوس لاسلكي', 'ماوس سلكي', 'ماوس جيمنج', 'optical mouse'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'keyboards',
    nameAr: 'كيبوردات ولوحات مفاتيح كمبيوتر ميكانيكية ومكتبية',
    keywords: ['كيبوردات', 'كيبورد', 'لوحه مفاتيح', 'لوحة مفاتيح', 'keyboard', 'كيبورد جيمنج', 'كيبورد وايرلس'],
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'mousepads_desk_mats',
    nameAr: 'بادات وماوس باد وسجادات مكتبية',
    keywords: ['بادات', 'باد', 'ماوس باد', 'باد ماوس', 'mousepad', 'desk mat', 'بادات جيمنج'],
    imageUrl: 'https://images.unsplash.com/photo-1616763355548-1b606f43848c?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'monitors_screens',
    nameAr: 'شاشات كمبيوتر ومونيتور',
    keywords: ['شاشات كمبيوتر', 'شاشات', 'شاشه كمبيوتر', 'شاشه', 'شاشة كمبيوتر', 'شاشة', 'monitor', 'led monitor'],
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'headphones_audio',
    nameAr: 'سماعات وهيدفون وايربودز ومكبرات صوت',
    keywords: [
      'سماعات هيدفون كمبيوتر', 'سماعات', 'هيدفون', 'ايربودز', 'سماعه', 
      'سماعة', 'headphone', 'earbuds', 'headset', 'صب', 'مكبر صوت'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 93,
  },
  {
    id: 'laptop_chargers',
    nameAr: 'شواحن لابتوب وادابتورات وباور سبلاي',
    keywords: [
      'شواحن لابتوب', 'شاحن لابتوب', 'شواحن', 'شاحن ديل', 'شاحن hp', 
      'شاحن لينوفو', 'ادابتور لابتوب', 'باور سبلاي', 'شاحن لاب'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'laptop_stands',
    nameAr: 'حوامل لابات وقواعد تبريد لابتوب',
    keywords: ['حوامل لابات', 'حوامل', 'حامل لابتوب', 'ستاند لابتوب', 'قاعده لابتوب', 'laptop stand', 'كولر لاب', 'حامل لاب', 'ستاند لاب'],
    imageUrl: '/catalog/computer/laptop_stand.jpg',
    weight: 98,
  },
  {
    id: 'cables_hdmi_display',
    nameAr: 'كابلات شاشات وHDMI وVGA وDisplayPort وتوصيلات',
    keywords: [
      'كابلات hd', 'كابلات', 'كابل', 'hdmi', 'vga', 'displayport', 
      'كابل display to hd', 'كابل display', 'aux', 'كابل aux', 'كابل شاشه', 
      'كابل باور', 'كابل شاشة', 'وصله شاشه', 'dvi', '1*3', '1*1'
    ],
    imageUrl: '/catalog/computer/cables_hdmi.jpg',
    weight: 98,
  },
  {
    id: 'cables_mobile_charging',
    nameAr: 'كابلات شحن موبايل وUSB Type-C وLightning',
    keywords: [
      'كابلات شحن موبايل', 'كابلات شحن', 'كابل شحن', 'سلك شاحن', 
      'سلك شحن', 'شاحن تايب سي', 'type c cable', 'lightning cable', 'micro usb', 'كابل شحن سريع'
    ],
    imageUrl: '/catalog/computer/charging_cable.jpg',
    weight: 98,
  },
  {
    id: 'adapters_converters',
    nameAr: 'كونفرتات ومحولات OTG وHDMI to VGA وType-C',
    keywords: [
      'كونفرتات', 'كونفرت', 'محولات', 'محول', 'تحويله', 'تحويلة', 
      'converter', 'dongle', 'otg', 'او تي جي', 'joyroom', 'كارت صوت', 
      'كارت صوت usb', 'hdmi to vga', 'vga to hdmi', 'type c to hdmi', 'type c to usb',
      'كونفرت display', 'كونفرت display to hd'
    ],
    imageUrl: '/catalog/computer/usb_otg.jpg',
    weight: 99,
  },
  {
    id: 'portable_speakers',
    nameAr: 'سبيكرات وسماعات بلوتوث محمولة للأغاني',
    keywords: [
      'سبيكرات', 'سبيكر', 'سبيكر بلوتوث', 'سماعات بلوتوث', 'صب بلوتوث', 
      'سبيكر راديو', 'سبيكر مستطيل', 'سبيكر محمول', 'bluetooth speaker', 
      'portable speaker', 'مكبر صوت محمول', 'سبيكر مضيء'
    ],
    imageUrl: '/catalog/computer/bluetooth_speaker.webp',
    weight: 99,
  },
  {
    id: 'usb_hubs',
    nameAr: 'هب USB وموزعات مداخل',
    keywords: ['هب usb', 'usb hub', 'هب', 'موزع usb', 'مشترك usb', 'hub'],
    imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'wifi_routers',
    nameAr: 'روترات ومودم وأكسس بوينت وواي فاي',
    keywords: ['روترات', 'روتر', 'راوتر', 'راوترات', 'واي فاي', 'wifi router', 'access point', 'مودم', 'مقوي شبكه'],
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'network_switches',
    nameAr: 'سويتشات شبكات وموزعات إيثرنت',
    keywords: ['سويتشات', 'سويتش', 'سويتش شبكات', 'network switch', 'ethernet switch', 'switch 8 port', 'switch 16 port'],
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'network_racks',
    nameAr: 'راكات وكبائن سيرفرات وشبكات',
    keywords: ['راكات', 'راك', 'راك شبكات', 'كابينة راك', 'server rack', 'network rack', 'كابينه راك'],
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'rj45_connectors',
    nameAr: 'اوجيهات وبنسات شبكات وكونكتورات RJ45',
    keywords: ['اوجيهات', 'ارجيهات', 'ار جيه', 'rj45', 'كونكتور نت', 'بنسه ارجيهات', 'سوكت نت', 'ار جي'],
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'network_cables_wires',
    nameAr: 'اسلاك شبكات ودش وكابلات نت Cat6 وCat5',
    keywords: ['اسلاك', 'سلك شبكه', 'سلك شبكة', 'كابل نت', 'cat6', 'cat5', 'سلك دش', 'اسلاك شبكات', 'لفة سلك'],
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'cctv_dvr',
    nameAr: 'كاميرات مراقبة وأجهزة تسجيل DVR',
    keywords: [
      'dvr', 'كاميرات', 'كاميرا مراقبه', 'مراقبه', 'كاميرات مراقبة', 
      'كاميرا مراقبة', 'dvr 4ch', 'dvr 8ch', 'dvr 16ch', 'cctv'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'cctv_cables_accessories',
    nameAr: 'سلك كاميرات ومستلزمات كاميرات المراقبة RG59 وBNC',
    keywords: [
      'سلك كاميرات', 'كابل كاميرات', 'مستلزمات سيسيم كاميرات', 'مستلزمات سيستم كاميرات', 
      'rg59', 'سلك باور كاميرات', 'bnc', 'كونكتور bnc'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'batteries_cells',
    nameAr: 'حجر بطارية وبطاريات أقلام ومازربورد CR2032',
    keywords: [
      'حجر بطارية', 'حجر بطاريه', 'حجاره', 'بطاريات', 'بطاريه', 'بطارية', 
      'بطاريه قلم', 'بطارية قلم', 'حجارة قلم', 'cr2032', 'بطارية مازر بورد'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'power_strips_extensions',
    nameAr: 'مشتركات كهرباء ووصلات حماية متعددة المنافذ',
    keywords: ['مشتركات', 'مشترك', 'مشترك كهرباء', 'مشترك فيش', 'مشترك باور', 'power strip', 'وصلة كهرباء'],
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'optical_discs_cd_dvd',
    nameAr: 'اسطوانات وسيديهات ودي في دي فارغة',
    keywords: ['اسطوانات', 'اسطوانه', 'اسطوانة', 'سيدي', 'دي في دي', 'cd', 'dvd', 'بلوراي', 'اسطوانات فارغه'],
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'keyboard_stickers_labels',
    nameAr: 'استيكرات ولواصق وحروف كيبورد عربي',
    keywords: ['استيكرات', 'استيكر', 'ستيكر', 'ملصقات', 'لواصق', 'ستيكر كيبورد', 'حروف كيبورد', 'استيكر كيبورد'],
    imageUrl: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'stationery_staplers',
    nameAr: 'دباسات ودبابيس ومستلزمات مكتبية',
    keywords: ['دباسات', 'ديباسات', 'دباسه', 'دباسة', 'دبابيس', 'خارمه', 'خارمة', 'ادوات مكتبيه', 'مستلزمات مكتبيه', 'stapler'],
    imageUrl: '/catalog/computer/stapler.jpg',
    weight: 98,
  },
  {
    id: 'network_accessories_rack',
    nameAr: 'ملحقات شبكات وبنسات وراكات',
    keywords: ['ملحقات شبكات', 'ملحقات شبكه', 'ملحقات شبكة', 'مستلزمات شبكات'],
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 96,
  },
  {
    id: 'screen_cleaners_blowers',
    nameAr: 'منظفات شاشات وكمبيوتر واسبراي وبلاور',
    keywords: [
      'منظفات', 'منظف شاشات', 'اسبراي شاشه', 'اسبراي شاشة', 'بلاور', 
      'بلور', 'هواء مضغوط', 'منظف كمبيوتر', 'screen cleaner'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
  {
    id: 'flash_memory_sd',
    nameAr: 'فلاشات وكروت ميموري USB وSD Cards',
    keywords: ['فلاشات', 'فلاشه', 'فلاشة', 'كارت ميموري', 'usb flash', 'ميموري', 'sd card', 'فلاش ميموري'],
    imageUrl: 'https://images.unsplash.com/photo-1618410320928-25228d811631?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 95,
  },
];

/**
 * Generates an ultra-premium, lightweight vector SVG data URI placeholder
 * for products and categories without dedicated photographs.
 */
export function generatePremiumProductSvg(productName: string, categoryName?: string): string {
  const cleanTitle = (productName || '').trim();
  const cleanCat = (categoryName || '').trim();
  const combined = `${cleanTitle} ${cleanCat}`.toLowerCase();

  let accentColor = '#170e5e'; // Deep Royal Navy
  let badgeText = cleanCat || 'منتج أصلي معتمد';
  let iconMarkup = '';

  const isTech = /رام|ram|كابل|cable|كونفرت|وصل|صوت|usb|كمبيوتر|لابتوب|هارد|ماوس|كيبورد|شاش|الكترون|موبايل|شاحن|dvr|كامير|هيدفون|سماع|audio|hdmi|vga|otg/.test(combined);
  const isSupermarket = /جبن|لبن|حليب|زبادي|شاي|سكر|تون|فول|زيت|ارز|مكرون|بسكويت|شوكولات|منظف|صابون|عصير|مياه/.test(combined);
  const isFashion = /قميص|بنطلون|فستان|تيشيرت|حذاء|شنط|ملابس|كوتشي|جاكيت/.test(combined);

  if (isTech) {
    accentColor = '#0284c7';
    if (!cleanCat) badgeText = 'إلكترونيات وكمبيوتر';
    iconMarkup = `
      <rect x="42" y="30" width="116" height="74" rx="12" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
      <circle cx="100" cy="67" r="16" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="4 3" />
      <circle cx="100" cy="67" r="6" fill="#38bdf8" />
      <path d="M65 30V20M85 30V20M115 30V20M135 30V20" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
      <path d="M65 104v10M85 104v10M115 104v10M135 104v10" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
      <path d="M42 52H32M42 82H32M158 52h10M158 82h10" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
    `;
  } else if (isSupermarket) {
    accentColor = '#047857';
    if (!cleanCat) badgeText = 'أغذية ومواد تموينية';
    iconMarkup = `
      <rect x="45" y="32" width="110" height="72" rx="14" fill="#064e3b" stroke="#34d399" stroke-width="2.5" />
      <path d="M65 50h70l-8 36H73l-8-36z" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="82" cy="96" r="5" fill="#34d399" />
      <circle cx="118" cy="96" r="5" fill="#34d399" />
      <path d="M85 50c0-8 6-14 15-14s15 6 15 14" fill="none" stroke="#a7f3d0" stroke-width="2.5" stroke-linecap="round" />
    `;
  } else if (isFashion) {
    accentColor = '#7c3aed';
    if (!cleanCat) badgeText = 'أزياء وملابس';
    iconMarkup = `
      <rect x="45" y="32" width="110" height="72" rx="14" fill="#3b0764" stroke="#c084fc" stroke-width="2.5" />
      <path d="M80 42l20 10 20-10 14 12-8 10-6-4v36H80V60l-6 4-8-10 14-12z" fill="none" stroke="#c084fc" stroke-width="2.5" stroke-linejoin="round" />
    `;
  } else {
    accentColor = '#170e5e';
    if (!cleanCat) badgeText = 'منتج معتمد';
    iconMarkup = `
      <rect x="45" y="32" width="110" height="72" rx="14" fill="#170e5e" stroke="#818cf8" stroke-width="2.5" />
      <path d="M45 58h110" stroke="#818cf8" stroke-width="2" stroke-dasharray="4 3" />
      <path d="M100 32v72" stroke="#818cf8" stroke-width="2" />
      <circle cx="100" cy="32" r="12" fill="#3730a3" stroke="#c7d2fe" stroke-width="2" />
      <path d="M96 32l3 3 6-6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    `;
  }

  if (badgeText.length > 20) badgeText = badgeText.slice(0, 19) + '...';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 155" width="100%" height="100%">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#f1f5f9" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.08" />
        </filter>
      </defs>
      
      <!-- Backdrop Card -->
      <rect width="200" height="155" fill="url(#bg)" />
      
      <!-- Subtle Decorative Grid Elements -->
      <circle cx="20" cy="20" r="2" fill="#cbd5e1" />
      <circle cx="180" cy="20" r="2" fill="#cbd5e1" />
      <circle cx="20" cy="135" r="2" fill="#cbd5e1" />
      <circle cx="180" cy="135" r="2" fill="#cbd5e1" />

      <!-- Center Icon Group -->
      <g filter="url(#glow)">
        ${iconMarkup}
      </g>
      
      <!-- Bottom Badge -->
      <rect x="25" y="122" width="150" height="22" rx="11" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <circle cx="40" cy="133" r="3.5" fill="${accentColor}" />
      <text x="100" y="137" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="${accentColor}" text-anchor="middle" direction="rtl">
        ${badgeText}
      </text>
    </svg>
  `.trim().replace(/\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const photoCache = new Map<string, string>();

/**
 * Intelligent Weighted Photographic Matcher
 * Analyzes product name & category, normalizes Arabic text, and calculates
 * the highest specificity confidence score to guarantee accurate photos.
 */
export function getAutoProductPhoto(productName: string, categoryName?: string): string {
  const cacheKey = `${productName}:::${categoryName || ''}`;
  const cached = photoCache.get(cacheKey);
  if (cached) return cached;

  const cleanName = cleanArabic(productName);
  const cleanCat = cleanArabic(categoryName || '');
  const words = cleanName.split(/\s+/).filter(Boolean);

  let bestRule: SemanticPhotoRule | null = null;
  let highestScore = 0;

  for (const rule of SEMANTIC_PHOTO_RULES) {
    let score = 0;

    for (const kw of rule.keywords) {
      const cleanKw = cleanArabic(kw);
      if (!cleanKw) continue;

      if (cleanKw.includes(' ')) {
        // Multi-word phrase exact match in name (Highest precision: +25 bonus!)
        if (cleanName.includes(cleanKw)) {
          score = Math.max(score, rule.weight + 25);
        }
      } else {
        // Single word exact match
        if (words.some((w) => w === cleanKw)) {
          score = Math.max(score, rule.weight);
        } else if (cleanName.includes(cleanKw) && cleanKw.length >= 4) {
          // Substring match for longer words
          score = Math.max(score, rule.weight - 10);
        }
      }

      // Check category name for solid contextual fallback (e.g., product in known category or category tile itself)
      if (cleanCat && cleanCat.includes(cleanKw)) {
        // High confidence contextual score: 70
        // Allows items like "1*3" in "كابلات" to inherit authentic cable photo,
        // while direct product-name matches (weight 95+) still take priority.
        score = Math.max(score, 70);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestRule = rule;
    }
  }

  // Only accept a photo match if confidence score is solid (>= 40).
  // Otherwise, fall back to the clean, enterprise SVG vector placeholder (NEVER vegetables!).
  const result = (bestRule && highestScore >= 40)
    ? bestRule.imageUrl 
    : generatePremiumProductSvg(productName, categoryName);

  photoCache.set(cacheKey, result);
  return result;
}
