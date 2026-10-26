import openpyxl

file_path = r"C:\Users\Mahmoud\Downloads\products-template (2).xlsx"
wb = openpyxl.load_workbook(file_path)
ws = wb.active

# Clear existing sample rows beyond row 1
while ws.max_row > 1:
    ws.delete_rows(2)

# Products from the video:
# (Name, Barcode, Category, Cost, SalePrice, WholesalePrice, MinQty, Qty, Warehouse, Unit, Notes)
products_data = [
    {
        "name": "Cherry Pop All Over Spray",
        "barcode": "260001",
        "category": "معطرات الجسم / All-Over Spray",
        "cost": 7.500,
        "price": 15.000,
        "wholesale": 13.000,
        "min_qty": 5,
        "qty": 20,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عبوة سبراي للجسم 15 د.ك"
    },
    {
        "name": "Leather Touch All Over Spray",
        "barcode": "260002",
        "category": "معطرات الجسم / All-Over Spray",
        "cost": 7.500,
        "price": 15.000,
        "wholesale": 13.000,
        "min_qty": 5,
        "qty": 20,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عبوة سبراي للجسم 15 د.ك"
    },
    {
        "name": "Morning Pages All Over Spray",
        "barcode": "260003",
        "category": "معطرات الجسم / All-Over Spray",
        "cost": 7.500,
        "price": 15.000,
        "wholesale": 13.000,
        "min_qty": 5,
        "qty": 20,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عبوة سبراي للجسم 15 د.ك"
    },
    {
        "name": "Musk Hour All Over Spray",
        "barcode": "260004",
        "category": "معطرات الجسم / All-Over Spray",
        "cost": 7.500,
        "price": 15.000,
        "wholesale": 13.000,
        "min_qty": 5,
        "qty": 20,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عبوة سبراي للجسم 15 د.ك"
    },
    {
        "name": "Morning Light Home Spray",
        "barcode": "260005",
        "category": "معطرات المنزل / Home Spray",
        "cost": 5.000,
        "price": 10.000,
        "wholesale": 8.500,
        "min_qty": 5,
        "qty": 20,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "معطر منزلي بمضخة بخاخ زنادية 10 د.ك"
    },
    {
        "name": "Open Doors Home Spray",
        "barcode": "260006",
        "category": "معطرات المنزل / Home Spray",
        "cost": 5.000,
        "price": 10.000,
        "wholesale": 8.500,
        "min_qty": 5,
        "qty": 20,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "معطر منزلي بمضخة بخاخ زنادية 10 د.ك"
    },
    {
        "name": "Baby Bloom Perfume 50 ml",
        "barcode": "260007",
        "category": "عطور أطفال / Kids Perfume",
        "cost": 6.000,
        "price": 12.000,
        "wholesale": 10.000,
        "min_qty": 5,
        "qty": 15,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عطر أطفال 50 مل 12 د.ك"
    },
    {
        "name": "First Cuddle Perfume 50 ml",
        "barcode": "260008",
        "category": "عطور أطفال / Kids Perfume",
        "cost": 6.000,
        "price": 12.000,
        "wholesale": 10.000,
        "min_qty": 5,
        "qty": 15,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عطر أطفال 50 مل 12 د.ك"
    },
    {
        "name": "After Rain Perfume 100 ml",
        "barcode": "260009",
        "category": "عطور / Perfumes",
        "cost": 12.500,
        "price": 25.000,
        "wholesale": 21.000,
        "min_qty": 5,
        "qty": 15,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عطر فاخر 100 مل 25 د.ك"
    },
    {
        "name": "Desert Light Perfume 100 ml",
        "barcode": "260010",
        "category": "عطور / Perfumes",
        "cost": 12.500,
        "price": 25.000,
        "wholesale": 21.000,
        "min_qty": 5,
        "qty": 15,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عطر فاخر 100 مل 25 د.ك"
    },
    {
        "name": "Gentle Skin Perfume 100 ml",
        "barcode": "260011",
        "category": "عطور / Perfumes",
        "cost": 12.500,
        "price": 25.000,
        "wholesale": 21.000,
        "min_qty": 5,
        "qty": 15,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عطر فاخر 100 مل 25 د.ك (ملاحظة: في الفيديو 100ml بسعر 25 د.ك)"
    },
    {
        "name": "Open Air Perfume 100 ml",
        "barcode": "260012",
        "category": "عطور / Perfumes",
        "cost": 12.500,
        "price": 25.000,
        "wholesale": 21.000,
        "min_qty": 5,
        "qty": 15,
        "warehouse": "المخزن الرئيسي",
        "unit": "قطعة",
        "notes": "عطر فاخر 100 مل 25 د.ك"
    }
]

# Columns:
# 1. اسم الصنف (إجباري)
# 2. الباركود
# 3. القسم
# 4. المورد
# 5. سعر التكلفة
# 6. سعر البيع
# 7. سعر الجملة
# 8. الحد الأدنى
# 9. الكمية
# 10. المخزن
# 11. وحدة القياس الأساسية
# 12. وحدة البيع
# 13. وحدة الشراء
# 14. اسم وحدة إضافية
# 15. معامل الوحدة الإضافية
# 16. باركود الوحدة الإضافية
# 17. ملاحظات

for item in products_data:
    row = [
        item["name"],          # اسم الصنف (إجباري)
        item["barcode"],       # الباركود
        item["category"],      # القسم
        "المورد الرئيسي",      # المورد
        item["cost"],          # سعر التكلفة
        item["price"],         # سعر البيع
        item["wholesale"],     # سعر الجملة
        item["min_qty"],       # الحد الأدنى
        item["qty"],           # الكمية
        item["warehouse"],     # المخزن
        item["unit"],          # وحدة القياس الأساسية
        item["unit"],          # وحدة البيع
        item["unit"],          # وحدة الشراء
        None,                  # اسم وحدة إضافية
        None,                  # معامل الوحدة الإضافية
        None,                  # باركود الوحدة الإضافية
        item["notes"]          # ملاحظات
    ]
    ws.append(row)

# Save both into original file and a dedicated named copy
wb.save(file_path)
ready_path = r"C:\Users\Mahmoud\Downloads\products_kuwait_ready.xlsx"
wb.save(ready_path)

print(f"Successfully populated {len(products_data)} products into:")
print(f"1. {file_path}")
print(f"2. {ready_path}")
