# Demo Data Pack

## Commands
- `npm run seed:demo` يشغّل seeded demo على قاعدة جديدة أو فارغة.
- `npm run reset:demo` يمسح قاعدة البيانات الحالية ثم يعيد بناء بيانات الديمو بالكامل.

## Local demo accounts
- `admin / Admin@12345`
- `cashier.main / Cashier@12345`
- `branch.manager / BranchMgr@12345`

## What gets created
- 2 branches
- 3 locations
- 3 users بأدوار وصلاحيات مختلفة
- 4 categories
- 4 suppliers
- 6 customers
- 12 products مع units/offers/customer pricing
- purchases / sales / returns / payments / expenses
- one closed cashier shift
- one stock transfer
- one posted stock count session
- one damaged stock record
- service records

## Included CSV samples
- `products-demo.csv`
- `customers-demo.csv`
- `suppliers-demo.csv`
- `opening-stock-demo.csv`

هذه الملفات مناسبة كمرجع لهيكل البيانات المحلي أو كأساس لأي import flow مستقبلي.
