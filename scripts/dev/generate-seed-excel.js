const fs = require('fs');
const path = require('path');
const xlsx = require('C:/zn/frontend/node_modules/xlsx');

const outputFilePath = path.join('C:/Users/Administrator/.gemini/antigravity/brain/db6aaaa9-462b-43fb-a546-ed04d10da8f6', 'seed-data-v2.xlsx');

const locations = [
    'مخزن 1',
    'مخزن 2',
    'مخزن 3',
    'مخزن 4',
    'مخزن 5',
    'مخزن 6',
    'مخزن 7'
];

const categories = {
    'بهارات صحيحة': [
        'فلفل أسود حصى', 'كمون حصى', 'كزبرة حصى', 'حبهان', 'قرنفل', 'قرفة عيدان'
    ],
    'بهارات مطحونة': [
        'فلفل أسود ناعم', 'كمون ناعم', 'كزبرة ناعمة', 'شطة مطحونة', 'قرفة مطحونة', 
        'كركم مطحون', 'كاري', 'بابريكا', 'بهارات لحمة', 'بهارات فراخ'
    ],
    'بقوليات': [
        'أرز بسمتي هندي', 'عدس أصفر', 'عدس بجبة', 'فول تدميس', 'فول مدشوش', 
        'لوبيا', 'فاصوليا بيضاء', 'حمص الشام'
    ],
    'ياميش': [
        'لوز مقشر', 'بندق مقشر', 'عين جمل', 'فستق', 'زبيب إيراني', 
        'جوز هند', 'قراصيا', 'مشمشية'
    ],
    'معلبات وبقالة': [
        'صلصة طماطم هاينز', 'تونة قطع صن شاين', 'سمن روابي 1.5 كجم', 
        'زيت عافية ذرة 1 لتر', 'مكرونة حوا 400 جم', 'سكر الأسرة 1 كجم', 
        'شاي العروسة 250 جم'
    ],
    'منظفات': [
        'مسحوق أوكسي 2.5 كجم', 'مسحوق إريال 2.5 كجم', 'بريل سائل غسيل أطباق', 
        'كلوركس ألوان', 'ديتول مطهر 500 مل'
    ]
};

const rows = [];
let barcodeCounter = 10000;

for (const [categoryName, items] of Object.entries(categories)) {
    for (const itemName of items) {
        
        // Distribute stock randomly among 2 to 4 locations
        const numLocations = Math.floor(Math.random() * 3) + 2; 
        const shuffledLocations = [...locations].sort(() => 0.5 - Math.random());
        const selectedLocations = shuffledLocations.slice(0, numLocations);

        for (const loc of selectedLocations) {
            const stockQty = Math.floor(Math.random() * 90) + 10; 
            const minStock = Math.floor(Math.random() * 5) + 5;
            
            rows.push({
                'اسم الصنف (إجباري)': itemName,
                'الباركود': (barcodeCounter++).toString(),
                'القسم': categoryName,
                'الحد الأدنى': minStock,
                'الكمية': stockQty,
                'المخزن': loc
            });
        }
    }
}

const worksheet = xlsx.utils.json_to_sheet(rows, { header: ['اسم الصنف (إجباري)', 'الباركود', 'القسم', 'الحد الأدنى', 'الكمية', 'المخزن'] });
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'البيانات');

xlsx.writeFile(workbook, outputFilePath);

console.log('Seed data generated successfully at:', outputFilePath);
