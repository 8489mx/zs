# Permissions Audit

## الصلاحيات الأساسية الحالية
- `sales`
- `purchases`
- `returns`
- `inventory`
- `treasury`
- `reports`
- `audit`
- `services`
- `customers`
- `suppliers`
- `products`
- `accounts`
- `cashDrawer`
- `canManageUsers`
- `canManageSettings`
- `canAdjustInventory`
- `canEditInvoices`
- `canDelete`

## المطلوب قبل البيع
- مراجعة كل شاشة حساسة مقابل صلاحيتها
- منع أي action destructive بدون permission صريح
- اعتماد `super_admin` فقط كاستثناء محدود
- توثيق الصلاحيات في handoff النهائي
