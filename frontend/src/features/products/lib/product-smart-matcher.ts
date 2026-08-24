/**
 * Smart Arabic & English Product Icon Matcher Engine
 * Automatically assigns accurate SVG icons based on product names & categories.
 */

function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[\u064B-\u065F\u0640]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ');
}

interface MatchRule {
  icon: string;
  keywords: string[];
}

const RULES: MatchRule[] = [
  // Spices, Herbs, Roastery & Grains
  { icon: 'tea-bag', keywords: ['شاي', 'شاى', 'شاي اخضر', 'شاي اسود', 'فتله', 'فتلة', 'باكت', 'tea'] },
  { icon: 'coffee-beans', keywords: ['بن', 'قهوه', 'قهوة', 'اسبريسو', 'كولومبي', 'برازيلي', 'ارابيكا', 'coffee', 'espresso'] },
  { icon: 'coffee-ground', keywords: ['محوج', 'بن محوج', 'بن مطحون', 'تركي', 'فرنساوي'] },
  { icon: 'cinnamon-roll', keywords: ['قرفه', 'قرفة', 'قرنفل', 'حبهان', 'هيل', 'مستكه', 'مستكة', 'cinnamon'] },
  { icon: 'ginger-root', keywords: ['زنجبيل', 'جنزبيل', 'كركم', 'عقدة صفراء', 'ginger', 'turmeric'] },
  { icon: 'hibiscus-flower', keywords: ['كركديه', 'كركاديه', 'زهورات', 'ورد بلدي', 'بابونج', 'كاموميل', 'hibiscus'] },
  { icon: 'herb-leaf', keywords: ['نعناع', 'ريحان', 'ميرمية', 'مرمرية', 'زعتر', 'روزماري', 'اكليل الجبل', 'ينسون', 'يانسون', 'شمر', 'بردقوش', 'اعشاب', 'أعشاب', 'mint', 'herbs'] },
  { icon: 'saffron-jar', keywords: ['زعفران', 'عصفر', 'saffron'] },
  { icon: 'cumin-seeds', keywords: ['كمون', 'كزبرة', 'كسبرة', 'فلفل اسود', 'فلفل ابيض', 'شطة', 'بابريكا', 'بهار', 'بهارات', 'كمون حصى', 'فلفل حصى', 'spices'] },
  { icon: 'anise-star', keywords: ['نجمة يانسون', 'ينسون نجمي', 'يانسون نجمي'] },
  { icon: 'nigella-seeds', keywords: ['حبه البركه', 'حبة البركة', 'سمسم', 'بذور الكتان', 'حب الرشاد', 'شيا', 'بذور شيا'] },
  { icon: 'lentils-beans', keywords: ['عدس', 'فول', 'لوبيا', 'فاصوليا', 'حمص', 'ترمس', 'بليلة', 'بقوليات', 'lentils', 'beans'] },
  { icon: 'dates-palms', keywords: ['تمر', 'بلح', 'عجوة', 'ياميش', 'قراصيا', 'مشمشية', 'مشمشيه', 'تين مجفف', 'زبيب', 'dates'] },
  { icon: 'nuts-almond', keywords: ['مكسرات', 'لوز', 'بندق', 'فستق', 'كاجو', 'عين جمل', 'سوداني', 'لب', 'فول سوداني', 'nuts', 'almond'] },
  { icon: 'honey-jar', keywords: ['عسل', 'عسل نحل', 'عسل اسود', 'غذاء ملكات', 'حبوب لقاح', 'honey'] },
  { icon: 'olive-oil', keywords: ['زيت زيتون', 'زيت حار', 'زيت سمسم', 'زيت حبة البركة', 'olive oil'] },
  { icon: 'herbal-oil', keywords: ['زيت لوز', 'زيت خروع', 'زيت جوجوبا', 'زيوت عطرية', 'زيت عطري'] },
  { icon: 'incense-burner', keywords: ['بخور', 'مبخرة', 'مبخره', 'عود', 'دقة بخور', 'لبان دكر', 'لبان ذكر', 'جاوي'] },
  { icon: 'charcoal-coals', keywords: ['فحم', 'فحم شيشة', 'فحم بخور', 'فحم سريع', 'charcoal'] },
  { icon: 'tahini-halawa', keywords: ['طحينة', 'طحينه', 'حلاوة', 'حلاوه', 'حلاوة طحينية', 'سمسمية', 'halawa'] },
  { icon: 'pickles-jar', keywords: ['مخلل', 'طرشي', 'زيتون مخلل', 'خيار مخلل', 'ليمون معصفر'] },

  // Supermarket & Groceries
  { icon: 'milk-carton', keywords: ['حليب', 'لبن', 'لبن رايب', 'حليب بودرة', 'نيدو', 'جهينة', 'المراعي', 'milk'] },
  { icon: 'cheese-wedge', keywords: ['جبنة', 'جبن', 'رومي', 'شيدر', 'موزاريلا', 'فيتا', 'براميلي', 'اسطنبولي', 'فلمنك', 'كيري', 'قريش', 'cheese'] },
  { icon: 'yogurt-cup', keywords: ['زبادي', 'زبادي لايت', 'دانيت', 'دانون', 'قشطة', 'قشطه', 'yogurt'] },
  { icon: 'egg-carton', keywords: ['بيض', 'بيض احمر', 'بيض ابيض', 'كرتونة بيض', 'طبق بيض', 'eggs'] },
  { icon: 'bread-loaf', keywords: ['خبز', 'عيش', 'فينو', 'توست', 'باتيه', 'كرواسون', 'مولتو', 'بقسماط', 'مخبوزات', 'bread'] },
  { icon: 'pasta-noodles', keywords: ['مكرونة', 'مكرونه', 'نودلز', 'اندومي', 'شعرية', 'لسان عصفور', 'سباغيتي', 'pasta', 'noodles', 'indomie'] },
  { icon: 'rice-bag', keywords: ['ارز', 'رز', 'سكر', 'دقيق', 'نشا', 'سميد', 'شيكارة', 'rice', 'sugar', 'flour'] },
  { icon: 'canned-tuna', keywords: ['تونة', 'تونه', 'سردين', 'ماكريل', 'سلمون', 'بلوبيف', 'معلبات', 'tuna'] },
  { icon: 'tomato-paste', keywords: ['صلصة', 'صلصه', 'كاتشب', 'مايونيز', 'مسطردة', 'خل', 'صويا صوص', 'ketchup'] },
  { icon: 'cooking-oil', keywords: ['زيت', 'زيت قلي', 'زيت ذرة', 'زيت عباد', 'سمنة', 'سمنه', 'سمن', 'زبدة', 'زبد', 'ghee', 'butter'] },
  { icon: 'chips-crisps', keywords: ['شيبسي', 'شيبس', 'دوريتوس', 'مقرمشات', 'سناكس', 'كرانشي', 'تايجر', 'بوزو', 'chips'] },
  { icon: 'biscuit-cookies', keywords: ['بسكويت', 'بسكوت', 'كوكيز', 'ويفر', 'كيك', 'براونيز', 'توداي', 'اوريو', 'بيمبو', 'biscuit', 'oreo'] },
  { icon: 'chocolate-bar', keywords: ['شوكولاتة', 'شوكولاته', 'شيكولاته', 'نوتيلا', 'جالكسي', 'كادبوري', 'كيت كات', 'سنيكرز', 'chocolate', 'nutella'] },
  { icon: 'candy-sweet', keywords: ['حلوى', 'مصاصة', 'مصاصه', 'بونبون', 'لبان', 'توفي', 'جيلي', 'مارشملو', 'candy'] },
  { icon: 'water-bottle', keywords: ['مياه', 'ماء', 'مياه معدنية', 'نستله', 'داساني', 'اكوافينا', 'بركة', 'جالون مياه', 'water'] },
  { icon: 'juice-carton', keywords: ['عصير', 'جهينة عصير', 'بيتي عصير', 'راني', 'تانج', 'سنتوب', 'juice'] },
  { icon: 'soda-can', keywords: ['بيبسي', 'كوكاكولا', 'سفن اب', 'ميرندا', 'سبرايت', 'شويبس', 'ريد بول', 'ستينج', 'فيروز', 'كانز', 'soda', 'pepsi', 'cola'] },
  { icon: 'detergent-powder', keywords: ['مسحوق', 'اريال', 'برسيل', 'تايد', 'اوكسي', 'داوني', 'كومفورت', 'detergent', 'ariel', 'persil'] },
  { icon: 'dish-soap', keywords: ['فيري', 'بريل', 'صابون سائل', 'فيبا', 'سائل مواعين', 'fairy', 'pril'] },
  { icon: 'bleach-cleaner', keywords: ['كلور', 'كلوركس', 'فنيك', 'مطهر', 'ديتول', 'ملمع زجاج', 'منظف ارضيات', 'فلاش', 'dettol', 'clorox'] },
  { icon: 'tissue-paper', keywords: ['مناديل', 'فاين', 'زيزينيا', 'وايت', 'مناديل تواليت', 'مناديل مطبخ', 'بكرة مناديل', 'tissues'] },
  { icon: 'trash-bags', keywords: ['اكياس', 'أكياس', 'كيس قمامة', 'اكياس قمامة', 'فويل', 'استرتش', 'سلوفان'] },
  { icon: 'frozen-food', keywords: ['مجمدات', 'بامية مجمدة', 'ملوخية مجمدة', 'بسلة مجمدة', 'بطاطس نصف مقلية', 'frozen'] },
  { icon: 'ice-cream', keywords: ['ايس كريم', 'آيس كريم', 'ميجا', 'كونو', 'ستيك', 'جيلاتي', 'بوريو استيك', 'ice cream'] },
  { icon: 'meat-steak', keywords: ['لحمة', 'لحم', 'مفروم', 'فراخ', 'دجاج', 'كبدة', 'سجق', 'سوسيس', 'بانيه', 'شيش', 'كفتة', 'meat', 'chicken'] },
  { icon: 'fish-seafood', keywords: ['سمك', 'جمبري', 'سبيط', 'فيليه', 'سي فود', 'رنجة', 'فسيخ', 'fish', 'shrimp'] },
  { icon: 'apple-fruit', keywords: ['تفاح', 'موز', 'برتقال', 'مانجو', 'فراولة', 'عنب', 'خوخ', 'بطيخ', 'كانتالوب', 'فاكهة', 'فواكه', 'apple', 'fruit'] },
  { icon: 'carrot-veggie', keywords: ['طماطم', 'بطاطس', 'بصل', 'خيار', 'جزر', 'كوسة', 'باذنجان', 'ليمون', 'ثوم', 'خضار', 'خضروات', 'vegetables'] },

  // Fashion & Apparel
  { icon: 'tshirt', keywords: ['تيشيرت', 'تي شيرت', 'تيشرت', 'تي شرت', 'توب', 'بولوشيرت', 'بولو', 'tshirt', 't-shirt', 'polo'] },
  { icon: 'shirt', keywords: ['قميص', 'شميز', 'قميص كاروهات', 'قميص جينز', 'shirt'] },
  { icon: 'pants-jeans', keywords: ['بنطلون', 'جينز', 'بنطلون جينز', 'جبردين', 'سروال', 'ترينج', 'ليجن', 'pants', 'jeans'] },
  { icon: 'shorts', keywords: ['شورت', 'برمودا', 'مايوه', 'shorts'] },
  { icon: 'dress', keywords: ['فستان', 'دريس', 'سواريه', 'فستان سهرة', 'dress'] },
  { icon: 'abaya-robe', keywords: ['عباية', 'عبايه', 'اسدال', 'إسدال', 'روب', 'بيجامة', 'بيجامه', 'جلابية', 'جلابيه', 'قاط', 'robe'] },
  { icon: 'skirt', keywords: ['جيبة', 'جيبه', 'جونلة', 'تنورة', 'skirt'] },
  { icon: 'jacket', keywords: ['جاكيت', 'جاكت', 'بليزر', 'معطف', 'بالطو', 'بامب', 'jacket', 'blazer', 'coat'] },
  { icon: 'hoodie-sweatshirt', keywords: ['هودي', 'سويت شيرت', 'سويتشرت', 'بلوفر', 'تريكو', 'hoodie', 'sweatshirt'] },
  { icon: 'suit-formal', keywords: ['بدلة', 'بدله', 'توكسيدو', 'فيست', 'بدلة رجالي', 'suit'] },
  { icon: 'underwear', keywords: ['داخلي', 'ملابس داخلية', 'بوكسر', 'فانلة', 'اندر وير', 'underwear', 'boxer'] },
  { icon: 'socks', keywords: ['شراب', 'شرابات', 'جورب', 'جوارب', 'كولون', 'socks'] },
  { icon: 'shoe-sneaker', keywords: ['كوتشي', 'حذاء رياضي', 'سنيكرز', 'نايكي', 'اديداس', 'sneakers', 'shoes'] },
  { icon: 'shoe-classic', keywords: ['جزمة', 'حذاء جلد', 'حذاء كلاسيك', 'هاف بوت', 'بوت', 'classic shoes', 'boots'] },
  { icon: 'high-heel', keywords: ['كعب', 'حذاء كعب', 'سواريه حريمي', 'صندل سواريه', 'high heel', 'heels'] },
  { icon: 'slippers-sandal', keywords: ['شبشب', 'صندل', 'سليبر', 'كروكس', 'سليبرز', 'slippers', 'sandals'] },
  { icon: 'bag-handbag', keywords: ['شنطة', 'شنطه', 'حقيبة', 'شنطة حريمي', 'كروس', 'handbag', 'bag'] },
  { icon: 'backpack', keywords: ['شنطة ظهر', 'شنطة مدرسة', 'حقيبة سفر', 'باك باك', 'backpack'] },
  { icon: 'wallet-leather', keywords: ['محفظة', 'محفظه', 'محفظة جلد', 'كارت هولدر', 'wallet'] },
  { icon: 'belt-leather', keywords: ['حزام', 'حزام جلد', 'توكة حزام', 'belt'] },
  { icon: 'cap-hat', keywords: ['كاب', 'قبعة', 'قبعة صوف', 'ايس كاب', 'طاقية', 'cap', 'hat'] },
  { icon: 'scarf-hijab', keywords: ['طرحة', 'طرحه', 'حجاب', 'ايشارب', 'إيشارب', 'سكارف', 'شال', 'كوفية', 'scarf', 'hijab'] },
  { icon: 'watch-wrist', keywords: ['ساعة', 'ساعه', 'ساعة يد', 'ساعة رجالي', 'ساعة حريمي', 'watch'] },
  { icon: 'sunglasses', keywords: ['نظارة', 'نظاره', 'نظارة شمس', 'نظارة نظر', 'فريم', 'sunglasses', 'glasses'] },
  { icon: 'tie', keywords: ['كرافتة', 'كرافته', 'بابيون', 'ربطة عنق', 'tie'] },
  { icon: 'jewelry-ring', keywords: ['خاتم', 'سلسلة', 'سلسله', 'اسورة', 'إسورة', 'حلق', 'عقد', 'بروش', 'مجوهرات', 'اكسسوارات', 'ring', 'jewelry'] },

  // Perfumes & Cosmetics
  { icon: 'perfume-spray', keywords: ['عطر', 'برفان', 'بارفان', 'او دي بارفان', 'تواليت', 'perfume', 'fragrance'] },
  { icon: 'perfume-oil', keywords: ['مسك', 'تولة', 'توله', 'زيت عطري', 'عود ملكي', 'عنبر', 'دهن عود', 'musk', 'oud'] },
  { icon: 'cream-lotion', keywords: ['كريم', 'لوشن', 'مرطب', 'نيفيا', 'جليسوليد', 'بودي لوشن', 'cream', 'lotion'] },
  { icon: 'lipstick', keywords: ['روج', 'محدد شفاه', 'زبدة كاكاو', 'ملمع شفاه', 'ليب جلوس', 'lipstick', 'lip balm'] },
  { icon: 'foundation-makeup', keywords: ['فونديشن', 'فاونديشن', 'كريم اساس', 'بودرة', 'كونسيلر', 'بي بي كريم', 'foundation'] },
  { icon: 'mascara-eyeliner', keywords: ['ماسكارا', 'ماسكرا', 'ايلاينر', 'آيلاينر', 'كحل', 'قلم حواجب', 'mascara', 'eyeliner'] },
  { icon: 'eyeshadow-palette', keywords: ['ايشادو', 'باليت', 'مكياج', 'بلاشر', 'هايلايتر', 'eyeshadow', 'makeup'] },
  { icon: 'makeup-brush', keywords: ['فرشاة مكياج', 'فرش مكياج', 'بيوتي بلندر', 'اسفنجة مكياج', 'brush'] },
  { icon: 'nail-polish', keywords: ['مانيكير', 'طلاء اظافر', 'اسيتون', 'مزيل طلاء', 'nail polish'] },
  { icon: 'shampoo-bottle', keywords: ['شامبو', 'صن سيلك', 'كلير', 'بانتين', 'هيد اند شولدرز', 'غسول', 'shampoo'] },
  { icon: 'conditioner-hair', keywords: ['بلسم', 'حمام كريم', 'ماسك شعر', 'conditioner'] },
  { icon: 'hair-oil', keywords: ['زيت شعر', 'سيروم', 'سيروم شعر', 'فاتيكا', 'دابر املا', 'hair oil', 'serum'] },
  { icon: 'hair-spray', keywords: ['سشوار', 'استشوار', 'مكواة شعر', 'سبراي شعر', 'جل شعر', 'واكس', 'hair spray', 'gel'] },
  { icon: 'soap-bar', keywords: ['صابون', 'صابونة', 'دوف', 'لوكس', 'لايف بوي', 'صابون طبيعي', 'صابون مغربي', 'soap'] },
  { icon: 'body-mist', keywords: ['بادي سبلاش', 'بادي ميست', 'معطر جسم', 'سبلاش', 'body mist', 'splash'] },
  { icon: 'deodorant-roll', keywords: ['مزيل عرق', 'رول اون', 'ستيك', 'ريكسونا', 'اكس', 'deodorant'] },
  { icon: 'skincare-serum', keywords: ['هيالورونيك', 'فيتامين سي', 'نياسيناميد', 'ريتينول', 'سيروم بشرة'] },
  { icon: 'face-mask', keywords: ['ماسك وجه', 'شيت ماسك', 'قناع وجه', 'سكراب', 'سنفرة', 'face mask'] },

  // Pharmacy & Medical
  { icon: 'pill-capsule', keywords: ['بنادول', 'بانادول', 'أقراص', 'اقراص', 'كبسولات', 'حبوب', 'شريط', 'مسكن', 'مضاد حيوي', 'فولتارين', 'كونجستال', 'panadol', 'capsules', 'tablets'] },
  { icon: 'effervescent-tablets', keywords: ['فوار', 'فوار راني', 'فيتامين سي فوار', 'اسبرين فوار', 'كاتافاست'] },
  { icon: 'syrup-bottle', keywords: ['شراب', 'دواء شرب', 'برونكوفين', 'اولفنت', 'كافوسيد', 'syrup'] },
  { icon: 'injection-syringe', keywords: ['حقنة', 'حقنه', 'سرنجة', 'سرنجه', 'امبول', 'أمبولات', 'فيلر', 'سيفوتاكس', 'injection'] },
  { icon: 'ointment-tube', keywords: ['مرهم', 'جل', 'جيل', 'كريم حساسية', 'فيوسيدين', 'كيناكومب', 'ميبو', 'ointment', 'gel'] },
  { icon: 'drops-eye', keywords: ['قطرة', 'قطره', 'قطرة عين', 'قطرة انف', 'بخاخ انف', 'اوترفين', 'تيرز', 'drops'] },
  { icon: 'inhaler-spray', keywords: ['بخاخ ربو', 'فنتولين', 'استنشاق', 'inhaler', 'ventolin'] },
  { icon: 'first-aid', keywords: ['شاش', 'قطن', 'قطن طبي', 'اسعافات', 'اسعافات اولية', 'first aid'] },
  { icon: 'bandage-strip', keywords: ['بلاستر', 'لزقة جروح', 'ضمادة', 'رباط ضاغط', 'bandage'] },
  { icon: 'medical-mask', keywords: ['كمامة', 'كمامه', 'ماسك طبي', 'جوانتي', 'قفازات', 'لاتكس', 'mask', 'gloves'] },
  { icon: 'thermometer', keywords: ['ترمومتر', 'مقياس حرارة', 'قياس حرارة', 'thermometer'] },
  { icon: 'blood-pressure', keywords: ['جهاز ضغط', 'ضغط دم', 'اومرون', 'سماعة ضغط', 'blood pressure'] },
  { icon: 'blood-glucose', keywords: ['جهاز سكر', 'شرائط سكر', 'اكيوتشيك', 'كونتور', 'glucometer'] },
  { icon: 'baby-diapers', keywords: ['بامبرز', 'حفاضات', 'حفاضه', 'بيبي جوي', 'فاين بيبي', 'مولفيكس', 'كبار سن', 'diapers', 'pampers'] },
  { icon: 'baby-formula', keywords: ['لبن اطفال', 'نان', 'بيبيلاك', 'سيريلاك', 'حليب رضع', 'baby formula'] },
  { icon: 'baby-bottle', keywords: ['ببرونة', 'ببرونه', 'تيتينة', 'عضاضة', 'شفاط ثدي', 'baby bottle'] },
  { icon: 'baby-wipes', keywords: ['وايبس', 'مناديل مبللة', 'مناديل اطفال', 'baby wipes'] },
  { icon: 'antiseptic-liquid', keywords: ['بيتادين', 'كحول', 'كحول طبي', 'ايثانول', 'مطهر جروح', 'alcohol', 'betadine'] },
  { icon: 'toothbrush-paste', keywords: ['معجون اسنان', 'سيجنال', 'كولجيت', 'سنسوداين', 'فرشاة اسنان', 'خيط اسنان', 'غسول فم', 'toothpaste'] },
  { icon: 'vitamins-bottle', keywords: ['فيتامين', 'فيتامينات', 'اوميجا 3', 'زنك', 'كالسيوم', 'حديد', 'سنتروم', 'vitamins', 'omega'] },

  // Electronics & Mobiles
  { icon: 'smartphone', keywords: ['ايفون', 'سامسونج', 'شاومي', 'هواوي', 'ريلمي', 'اوبو', 'فيفو', 'موبايل', 'هاتف', 'تليفون', 'iphone', 'samsung', 'xiaomi', 'oppo', 'smartphone'] },
  { icon: 'phone-case', keywords: ['جراب', 'كفر', 'بيت موبايل', 'حافظة', 'case', 'cover'] },
  { icon: 'screen-glass', keywords: ['سكرين', 'سكرينة', 'سكرينه', 'اسكرين', 'حماية شاشة', 'زجاج حماية', 'جيلاتين', 'screen protector'] },
  { icon: 'charger-head', keywords: ['راس شاحن', 'رأس شاحن', 'فيشة شاحن', 'شاحن سريع', 'ادابتور', 'charger', 'adapter'] },
  { icon: 'charger-cable', keywords: ['كابل', 'كبل', 'وصلة', 'وصله', 'سلك شاحن', 'تايب سي', 'لايتنينج', 'يو اس بي', 'cable', 'type-c', 'usb'] },
  { icon: 'powerbank', keywords: ['باور بانك', 'باوربانك', 'شاحن متنقل', 'powerbank'] },
  { icon: 'headphones', keywords: ['سماعة راس', 'هيدفون', 'جيمنج', 'سماعة سلك', 'headphones', 'headset'] },
  { icon: 'earbuds-case', keywords: ['ايربودز', 'ايربود', 'اير فون', 'سماعة بلوتوث', 'بوكس شحن', 'سماعات بلوتوث', 'airpods', 'earbuds'] },
  { icon: 'bluetooth-speaker', keywords: ['سبيكر', 'صب', 'مكبر صوت', 'جي بي ال', 'speaker', 'jbl'] },
  { icon: 'tablet', keywords: ['تابلت', 'ايباد', 'لوحي', 'جهاز لوحي', 'ipad', 'tablet'] },
  { icon: 'smartwatch', keywords: ['ساعة ذكية', 'سمارت ووتش', 'باند', 'ابل ووتش', 'smartwatch', 'smart band'] },
  { icon: 'memory-card', keywords: ['كارت ميموري', 'فلاشة', 'ميموري', 'فلاشه', 'سان ديسك', 'sd card', 'flash drive'] },
  { icon: 'hard-drive', keywords: ['هارد', 'هارد خارجي', 'ssd', 'nvme', 'hard drive'] },
  { icon: 'laptop', keywords: ['لابتوب', 'كمبيوتر', 'بي سي', 'ديل', 'اتش بي', 'لينوفو', 'ماك بوك', 'laptop', 'macbook', 'pc'] },
  { icon: 'keyboard-mouse', keywords: ['كيبورد', 'ماوس', 'لوحة مفاتيح', 'فارة', 'ماوس باد', 'keyboard', 'mouse'] },
  { icon: 'wifi-router', keywords: ['راوتر', 'واي فاي', 'مقوي شبكة', 'اكسس بوينت', 'router', 'wifi'] },
  { icon: 'tv-screen', keywords: ['شاشة', 'تلفزيون', 'رسيفر', 'ريسيفر', 'سمارت تي في', 'tv', 'receiver'] },
  { icon: 'remote-control', keywords: ['ريموت', 'ريموت كنترول', 'ريموت شاشة', 'ريموت تكييف', 'remote'] },
  { icon: 'car-holder', keywords: ['حامل سيارة', 'شاحن سيارة', 'ولاعة سيارة', 'ماج سيف سيارة', 'car holder'] },
  { icon: 'battery', keywords: ['بطارية', 'بطاريه', 'حجارة', 'حجارة ريموت', 'بطارية قلم', 'battery'] },
  { icon: 'sim-card', keywords: ['شريحة', 'شريحه', 'خط اتصالات', 'خط فودافون', 'خط اورنج', 'خط وي', 'sim card'] },
  { icon: 'camera', keywords: ['كاميرا', 'كاميرا مراقبة', 'كاميرا تصوير', 'عدسة', 'camera'] },
  { icon: 'printer', keywords: ['طابعة', 'طابعه', 'ورق طابعة', 'ورق حراري', 'ماكينة فوري', 'printer'] },
  { icon: 'screwdriver-tools', keywords: ['مفك', 'مفكات', 'عدة صيانة', 'كاوية لحام', 'فتاحة شاشات', 'tools'] },

  // Cafe & Restaurant
  { icon: 'coffee-cup', keywords: ['قهوة تركي', 'اسبريسو', 'كابتشينو', 'لاتيه', 'موكا', 'امريكانو', 'نسكافيه بلاك', 'مشروب ساخن', 'coffee'] },
  { icon: 'iced-coffee', keywords: ['ايس كوفي', 'آيس كوفي', 'فرابتشينو', 'فرابيه', 'سبانش لاتيه', 'iced coffee'] },
  { icon: 'fresh-juice', keywords: ['عصير برتقال', 'عصير مانجو', 'عصير فراولة', 'عصير ليمون', 'سموذي', 'كوكتيل فريش', 'juice'] },
  { icon: 'cocktail-drink', keywords: ['موهيتو', 'كوكتيل', 'ميلك شيك', 'شيك شوكولاتة', 'سموزي', 'mojito', 'milkshake'] },
  { icon: 'burger', keywords: ['برجر', 'همبرجر', 'تشيز برجر', 'سماش برجر', 'بيف برجر', 'برجر فراخ', 'burger'] },
  { icon: 'shawarma-wrap', keywords: ['شاورما', 'شاورما لحم', 'شاورما فراخ', 'ساندوتش سوري', 'رول شاورما', 'صاروخ شاورما', 'shawarma'] },
  { icon: 'crepe-wrap', keywords: ['كريب', 'كريب شاورما', 'كريب كرانشي', 'كريب نوتيلا', 'crepe'] },
  { icon: 'pizza-slice', keywords: ['بيتزا', 'بيتزا مارجريتا', 'بيتزا فراخ', 'بيتزا سجق', 'فطيرة', 'pizza'] },
  { icon: 'sandwich', keywords: ['ساندوتش', 'سندوتش', 'بانيني', 'حواوشي', 'كفتة عيش', 'sandwich'] },
  { icon: 'french-fries', keywords: ['بطاطس', 'باكيت بطاطس', 'حلقات بصل', 'بطاطس فارم', 'fries'] },
  { icon: 'fried-chicken', keywords: ['بروستد', 'فراخ مقلية', 'ستربس', 'زنجر', 'تندر', 'fried chicken', 'strips'] },
  { icon: 'grilled-meat', keywords: ['مشويات', 'كباب', 'كفتة مشوية', 'شيش طاووق', 'طاجن', 'ريش', 'kebab', 'grill'] },
  { icon: 'rice-meal', keywords: ['وجبة', 'كبسة', 'مندي', 'برياني', 'فتة', 'طبق ارز'] },
  { icon: 'pasta-meal', keywords: ['باستا', 'مكرونة بشاميل', 'وايت صوص', 'ريد صوص', 'نجرسكو', 'pasta'] },
  { icon: 'salad-bowl', keywords: ['سلطة', 'سلطة خضراء', 'سلطة سيزر', 'طحينة بيضاء', 'تومية', 'متبل', 'salad'] },
  { icon: 'soup-bowl', keywords: ['شوربة', 'شوربه', 'شوربة عدس', 'شوربة خضار', 'شوربة فراخ', 'شوربة كريمة', 'soup'] },
  { icon: 'cake-slice', keywords: ['تشيز كيك', 'تورتة', 'جاتوه', 'مولتن كيك', 'سينابون', 'كيكة', 'cake', 'cheesecake'] },
  { icon: 'waffle-pancake', keywords: ['وافل', 'بان كيك', 'وافل نوتيلا', 'waffle', 'pancake'] },
  { icon: 'donut', keywords: ['دونات', 'دوناتس', 'ميني دونات', 'donuts'] },
  { icon: 'shisha-hookah', keywords: ['شيشة', 'شيشه', 'معسل', 'قص', 'معسل تفاحتين', 'حجر شيشة', 'hookah'] },

  // General & Others
  { icon: 'gift-box', keywords: ['هدية', 'علبة هدايا', 'بوكس هدايا', 'تغليف هدايا', 'gift'] },
  { icon: 'tools-hardware', keywords: ['مسمار', 'شاكوش', 'زرادية', 'شنيور', 'عدة', 'مسامير', 'حبل', 'hardware'] },
  { icon: 'paint-roller', keywords: ['دهان', 'بويات', 'فرشاة دهان', 'رول دهان', 'معجون حوائط', 'paint'] },
  { icon: 'light-bulb', keywords: ['لمبة', 'لمبه', 'ليد', 'كشاف', 'فيشة', 'شريط ليد', 'لمبة ليد', 'lamp', 'bulb'] },
  { icon: 'office-supplies', keywords: ['قلم', 'كشكول', 'كراس', 'دفتر', 'استيكة', 'براية', 'مسطرة', 'ملف', 'دباسة', 'ورق تصوير', 'pen', 'notebook'] },
  { icon: 'sports-fitness', keywords: ['كرة', 'كورة', 'دمبل', 'حبل قفز', 'جيم', 'بروتين', 'كرياتين', 'sports'] },
  { icon: 'pet-food', keywords: ['دراي فود', 'طعام قطط', 'طعام كلاب', 'رمل قطط', 'عصافير', 'حبوب عصافير', 'pet food'] }
];

export function guessProductIcon(productName: string, categoryName?: string, _industry?: string): string | null {
  if (!productName && !categoryName) return null;

  const textToScan = normalizeText(`${productName || ''} ${categoryName || ''}`);
  const words = textToScan.split(/\s+/).filter(Boolean);

  // 1. Direct multi-word & exact keyword matching
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;

      if (normalizedKeyword.includes(' ')) {
        if (textToScan.includes(normalizedKeyword)) {
          return rule.icon;
        }
      } else {
        if (words.includes(normalizedKeyword) || words.some((w) => w.startsWith(normalizedKeyword) || w.endsWith(normalizedKeyword))) {
          return rule.icon;
        }
      }
    }
  }

  // 2. Substring matching for strong unique stems
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedKeyword.length >= 3 && textToScan.includes(normalizedKeyword)) {
        return rule.icon;
      }
    }
  }

  return null;
}
