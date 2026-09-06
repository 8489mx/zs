import { DemoActivityDataset } from './types';

export const fashionDataset: DemoActivityDataset = {
  key: 'fashion',
  name: 'ملابس وأزياء وأحذية',
  icon: '👔',
  tagline: 'محلات الملابس، البراندات، الأحذية، العبايات، والإكسسوارات',
  description: 'يملأ النظام بتشكيلة أنيقة من الملابس الرجالي والحريمي، الجينزات، القمصان، الأحذية، مع تفعيل المقاسات والألوان.',
  categories: [
    'ملابس رجالي كاجوال ورسمي',
    'ملابس حريمي وعبايات',
    'أحذية وسنيكرز وشوزات',
    'ملابس أطفال ومواليد',
    'حقائب وإكسسوارات وأحزمة',
  ],
  products: [
    // ملابس رجالي
    { name: 'قميص أكسفورد قطن كلاسيك كحلي', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000018', costPrice: 280, retailPrice: 480, wholesalePrice: 400, stockQty: 35, minStockQty: 5, itemKind: 'fashion', color: 'كحلي', size: 'L' },
    { name: 'قميص أكسفورد قطن كلاسيك أبيض', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000025', costPrice: 280, retailPrice: 480, wholesalePrice: 400, stockQty: 40, minStockQty: 6, itemKind: 'fashion', color: 'أبيض', size: 'XL' },
    { name: 'تيشيرت بولو سادة قطن بي كيه أسود', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000032', costPrice: 190, retailPrice: 350, wholesalePrice: 290, stockQty: 50, minStockQty: 8, itemKind: 'fashion', color: 'أسود', size: 'M' },
    { name: 'تيشيرت بولو سادة قطن بي كيه زيتي', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000049', costPrice: 190, retailPrice: 350, wholesalePrice: 290, stockQty: 45, minStockQty: 8, itemKind: 'fashion', color: 'زيتي', size: 'L' },
    { name: 'بنطلون جينز سليم فيت أزرق غامق', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000056', costPrice: 320, retailPrice: 590, wholesalePrice: 490, stockQty: 40, minStockQty: 8, itemKind: 'fashion', color: 'أزرق', size: '34' },
    { name: 'بنطلون جابردين كلاسيك بيج مريح', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000063', costPrice: 310, retailPrice: 550, wholesalePrice: 460, stockQty: 30, minStockQty: 6, itemKind: 'fashion', color: 'بيج', size: '36' },
    { name: 'سويت شيرت هودي كابيشون أوفر سايز رمادي', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000070', costPrice: 350, retailPrice: 650, wholesalePrice: 530, stockQty: 25, minStockQty: 5, itemKind: 'fashion', color: 'رمادي', size: 'XL' },
    { name: 'جاكيت بليزر رجالي فورمال صوف كحلي', category: 'ملابس رجالي كاجوال ورسمي', barcode: '6222001000087', costPrice: 680, retailPrice: 1250, wholesalePrice: 990, stockQty: 15, minStockQty: 3, itemKind: 'fashion', color: 'كحلي', size: '52' },

    // ملابس حريمي وعبايات
    { name: 'فستان صيفي فلورال مشجر ناعم', category: 'ملابس حريمي وعبايات', barcode: '6222002000017', costPrice: 380, retailPrice: 690, wholesalePrice: 560, stockQty: 25, minStockQty: 4, itemKind: 'fashion', color: 'وردي', size: 'M' },
    { name: 'عباية خليجية حرير كريب ملكي سوداء', category: 'ملابس حريمي وعبايات', barcode: '6222002000024', costPrice: 520, retailPrice: 950, wholesalePrice: 780, stockQty: 20, minStockQty: 4, itemKind: 'fashion', color: 'أسود', size: '56' },
    { name: 'بلوزة شيفون أنيقة أكمام واسعة أبيض', category: 'ملابس حريمي وعبايات', barcode: '6222002000031', costPrice: 220, retailPrice: 420, wholesalePrice: 340, stockQty: 30, minStockQty: 6, itemKind: 'fashion', color: 'أبيض', size: 'L' },
    { name: 'بنطلون قماش وايد ليج حريمي بيج', category: 'ملابس حريمي وعبايات', barcode: '6222002000048', costPrice: 260, retailPrice: 490, wholesalePrice: 390, stockQty: 25, minStockQty: 5, itemKind: 'fashion', color: 'بيج', size: '38' },
    { name: 'كارديجان صوف تريكو طويل نبيتي', category: 'ملابس حريمي وعبايات', barcode: '6222002000055', costPrice: 290, retailPrice: 550, wholesalePrice: 440, stockQty: 20, minStockQty: 4, itemKind: 'fashion', color: 'نبيتي', size: 'Free' },
    { name: 'طرحة شيفون تركي ناعمة سادة كافيه', category: 'ملابس حريمي وعبايات', barcode: '6222002000062', costPrice: 60, retailPrice: 120, wholesalePrice: 90, stockQty: 60, minStockQty: 10, itemKind: 'fashion', color: 'كافيه', size: 'Standard' },

    // أحذية وسنيكرز وشوزات
    { name: 'سنيكرز رياضي مريح أبيض خفيف', category: 'أحذية وسنيكرز وشوزات', barcode: '6222003000016', costPrice: 390, retailPrice: 750, wholesalePrice: 600, stockQty: 25, minStockQty: 5, itemKind: 'fashion', color: 'أبيض', size: '42' },
    { name: 'سنيكرز رياضي كاجوال أسود نعل ميموري', category: 'أحذية وسنيكرز وشوزات', barcode: '6222003000023', costPrice: 410, retailPrice: 790, wholesalePrice: 630, stockQty: 22, minStockQty: 5, itemKind: 'fashion', color: 'أسود', size: '43' },
    { name: 'حذاء رسمي جلد طبيعي أوكسفورد هافان', category: 'أحذية وسنيكرز وشوزات', barcode: '6222003000030', costPrice: 550, retailPrice: 990, wholesalePrice: 820, stockQty: 18, minStockQty: 3, itemKind: 'fashion', color: 'هافان', size: '42' },
    { name: 'حذاء فلات حريمي مريح كلاسيك أسود', category: 'أحذية وسنيكرز وشوزات', barcode: '6222003000047', costPrice: 220, retailPrice: 420, wholesalePrice: 330, stockQty: 25, minStockQty: 5, itemKind: 'fashion', color: 'أسود', size: '38' },
    { name: 'سليبر طبي مريح نعل تشريحي كحلي', category: 'أحذية وسنيكرز وشوزات', barcode: '6222003000054', costPrice: 140, retailPrice: 280, wholesalePrice: 220, stockQty: 35, minStockQty: 7, itemKind: 'fashion', color: 'كحلي', size: '41' },

    // ملابس أطفال ومواليد
    { name: 'سالوبيت أطفال قطن بيبي ناعم مطبوع', category: 'ملابس أطفال ومواليد', barcode: '6222004000015', costPrice: 120, retailPrice: 230, wholesalePrice: 180, stockQty: 40, minStockQty: 8, itemKind: 'fashion', color: 'أزرق سماوي', size: '6-9M' },
    { name: 'ترنج أطفال ولادي شتوي ميلتون كحلي', category: 'ملابس أطفال ومواليد', barcode: '6222004000022', costPrice: 240, retailPrice: 450, wholesalePrice: 360, stockQty: 30, minStockQty: 6, itemKind: 'fashion', color: 'كحلي', size: '6Y' },
    { name: 'فستان أطفال بناتي كلوش تول وردي', category: 'ملابس أطفال ومواليد', barcode: '6222004000039', costPrice: 210, retailPrice: 390, wholesalePrice: 310, stockQty: 25, minStockQty: 5, itemKind: 'fashion', color: 'وردي', size: '4Y' },

    // حقائب وإكسسوارات وأحزمة
    { name: 'حقيبة يد حريمي كروس بودي جلد أنيقة بني', category: 'حقائب وإكسسوارات وأحزمة', barcode: '6222005000014', costPrice: 320, retailPrice: 620, wholesalePrice: 490, stockQty: 18, minStockQty: 3, itemKind: 'fashion', color: 'بني', size: 'Medium' },
    { name: 'محفظة رجالي جلد طبيعي مزدوجة أسود', category: 'حقائب وإكسسوارات وأحزمة', barcode: '6222005000021', costPrice: 130, retailPrice: 260, wholesalePrice: 200, stockQty: 30, minStockQty: 6, itemKind: 'fashion', color: 'أسود', size: 'Standard' },
    { name: 'حزام رجالي جلد طبيعي توكة معدنية هافان', category: 'حقائب وإكسسوارات وأحزمة', barcode: '6222005000038', costPrice: 110, retailPrice: 220, wholesalePrice: 170, stockQty: 35, minStockQty: 7, itemKind: 'fashion', color: 'هافان', size: '120cm' },
    { name: 'نظارة شمسية كلاسيك حماية UV400 أسود', category: 'حقائب وإكسسوارات وأحزمة', barcode: '6222005000045', costPrice: 150, retailPrice: 320, wholesalePrice: 240, stockQty: 25, minStockQty: 5, itemKind: 'fashion', color: 'أسود', size: 'Standard' },
  ],
  suppliers: [
    { name: 'مصنع الشرق للأزياء والملابس الجاهزة', phone: '01019998877', address: 'المحلة الكبرى - الغربية', balance: -24000 },
    { name: 'شركة رويال لتجارة وتوريد الأحذية والجلود', phone: '01128887766', address: 'باب الشعرية - القاهرة', balance: -15600 },
    { name: 'وكالة ستايل التركية للملابس والعبايات', phone: '01237776655', address: 'وسط البلد - القاهرة', balance: -32000 },
    { name: 'مؤسسة المنسوجات والقطنيات الحديثة', phone: '01556665544', address: 'مدينة العاشر من رمضان', balance: -18500 },
  ],
  customers: [
    { name: 'إسلام عصام الشريف', phone: '01091234567', address: 'شارع عباس العقاد، مدينة نصر', balance: 0, customerType: 'vip' },
    { name: 'دعاء مصطفى كمال', phone: '01142345678', address: 'المهندسين، الجيزة', balance: 280, customerType: 'cash' },
    { name: 'م. عمر طارق شلبي', phone: '01223456789', address: 'التجمع الخامس، القاهرة الجديدة', balance: 0, customerType: 'vip' },
    { name: 'رانيا نبيل حامد', phone: '01514567890', address: 'لوران، الإسكندرية', balance: 0, customerType: 'cash' },
    { name: 'ماجد عبد الحميد', phone: '01035678901', address: 'سموحة، الإسكندرية', balance: 450, customerType: 'cash' },
  ],
  sampleSales: [
    { daysAgo: 12, customerIndex: 0, paymentChannel: 'card', itemIndices: [{ index: 0, qty: 1 }, { index: 4, qty: 1 }, { index: 24, qty: 1 }] },
    { daysAgo: 10, customerIndex: 1, paymentChannel: 'cash', itemIndices: [{ index: 8, qty: 1 }, { index: 13, qty: 2 }] },
    { daysAgo: 9, customerIndex: 2, paymentChannel: 'instapay', itemIndices: [{ index: 7, qty: 1 }, { index: 16, qty: 1 }] },
    { daysAgo: 7, customerIndex: 3, paymentChannel: 'card', itemIndices: [{ index: 9, qty: 1 }, { index: 22, qty: 1 }] },
    { daysAgo: 6, customerIndex: 0, paymentChannel: 'cash', itemIndices: [{ index: 2, qty: 2 }, { index: 14, qty: 1 }] },
    { daysAgo: 4, customerIndex: 4, paymentChannel: 'cash', itemIndices: [{ index: 6, qty: 1 }, { index: 15, qty: 1 }] },
    { daysAgo: 3, customerIndex: 1, paymentChannel: 'instapay', itemIndices: [{ index: 10, qty: 1 }, { index: 11, qty: 1 }] },
    { daysAgo: 1, customerIndex: 2, paymentChannel: 'card', itemIndices: [{ index: 1, qty: 2 }, { index: 5, qty: 1 }] },
    { daysAgo: 0, customerIndex: 3, paymentChannel: 'cash', itemIndices: [{ index: 19, qty: 1 }, { index: 20, qty: 1 }] },
  ],
  sampleOnlineOrders: [
    { customerName: 'مي أحمد', customerPhone: '01099881122', customerAddress: 'فيلا 12 الحي المتميز، 6 أكتوبر', city: 'الجيزة', paymentMethod: 'online', status: 'shipped', itemIndices: [{ index: 8, qty: 1 }, { index: 22, qty: 1 }] },
    { customerName: 'طارق زين', customerPhone: '01122339900', customerAddress: 'شارع الميرغني، مصر الجديدة', city: 'القاهرة', paymentMethod: 'cod', status: 'processing', itemIndices: [{ index: 0, qty: 1 }, { index: 4, qty: 1 }] },
    { customerName: 'هدى سليم', customerPhone: '01288776655', customerAddress: 'كفر عبده، الإسكندرية', city: 'الإسكندرية', paymentMethod: 'online', status: 'delivered', itemIndices: [{ index: 9, qty: 1 }, { index: 13, qty: 1 }] },
  ],
};
