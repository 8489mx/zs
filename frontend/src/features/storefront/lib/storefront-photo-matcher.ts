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
    keywords: ['مشروبات وعصائر ومياه', 'مشروبات', 'عصائر ومياه'],
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Pepsi_355_ml%2C_Canada_%28obverse%29%2C_2026-03-05.jpg/500px-Pepsi_355_ml%2C_Canada_%28obverse%29%2C_2026-03-05.jpg',
    weight: 30,
  },
  {
    id: 'cat_grocery_fallback',
    nameAr: 'قسم بقالة ومواد غذائية (عام)',
    keywords: ['بقالة ومواد غذائية', 'بقالة', 'غذائية', 'تموين'],
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=50&fm=webp',
    weight: 30,
  },
];

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

      // Check category name for secondary weighting
      if (cleanCat && cleanCat.includes(cleanKw)) {
        score = Math.max(score, 35);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestRule = rule;
    }
  }

  // Guaranteed fallback to clean organized supermarket display
  const result = bestRule 
    ? bestRule.imageUrl 
    : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=50&fm=webp';

  photoCache.set(cacheKey, result);
  return result;
}
