const fs = require('fs');
let code = fs.readFileSync('src/features/inventory/pages/InventoryTreePage.tsx', 'utf-8');

// 1. Add ModalType 'consolidate'
code = code.replace(/type ModalType = 'transfer' \| 'assign' \| 'categoryTransfer' \| null;/, "type ModalType = 'transfer' | 'assign' | 'categoryTransfer' | 'consolidate' | null;");

// 2. Add openConsolidate function
code = code.replace(/const openCategoryTransfer = [^\n]+;/, "$&\n  const openConsolidate = (products: ProductRow[]) => { setModalProducts(products); setActiveModal('consolidate'); };");

// 3. Add onConsolidate to BulkActionBar props
code = code.replace(/onAssign: \(\) => void;\n  onTransfer: \(\) => void;/, "onAssign: () => void;\n  onTransfer: () => void;\n  onConsolidate: () => void;");

// 4. Add onConsolidate button to BulkActionBar
code = code.replace(/<button onClick=\{onTransfer\}[^>]+>\s*نقل سريع\s*<\/button>/, `$&
      <button onClick={onConsolidate} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
        توحيد المخازن
      </button>`);

// 5. Add onConsolidate to ProductTreeRow props
code = code.replace(/onTransfer: \(p: ProductRow\) => void;\n  onAssign: \(p: ProductRow\) => void;/, "onTransfer: (p: ProductRow) => void;\n  onAssign: (p: ProductRow) => void;\n  onConsolidate: (p: ProductRow) => void;");

// 6. Add onConsolidate button to ProductTreeRow
code = code.replace(/<button onClick=\{\(\) => onTransfer\(product\)\}[^>]+>\s*نقل ↔\s*<\/button>/, `$&
            <button onClick={() => onConsolidate(product)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>
              توحيد
            </button>`);

// 7. Add onConsolidate to CategorySection props
code = code.replace(/onTransfer: \(p: ProductRow\) => void;\n  onAssign: \(p: ProductRow\) => void;/, "onTransfer: (p: ProductRow) => void;\n  onAssign: (p: ProductRow) => void;\n  onConsolidate: (p: ProductRow) => void;");

// 8. Pass onConsolidate from CategorySection to ProductTreeRow
code = code.replace(/onTransfer=\{onTransfer\}\n\s*onAssign=\{onAssign\}/g, "onTransfer={onTransfer}\n                onAssign={onAssign}\n                onConsolidate={onConsolidate}");

// 9. Pass onConsolidate from InventoryTreePage to CategorySection
code = code.replace(/onTransfer=\{\(p\) => openTransfer\(\[p\]\)\}\n\s*onAssign=\{\(p\) => openAssign\(\[p\]\)\}/g, "onTransfer={(p) => openTransfer([p])}\n              onAssign={(p) => openAssign([p])}\n              onConsolidate={(p) => openConsolidate([p])}");

// 10. Add onConsolidate to BulkActionBar usage
code = code.replace(/onAssign=\{\(\) => openAssign\(selectedProducts\)\}\n\s*onTransfer=\{\(\) => openTransfer\(selectedProducts\)\}/, "onAssign={() => openAssign(selectedProducts)}\n            onTransfer={() => openTransfer(selectedProducts)}\n            onConsolidate={() => openConsolidate(selectedProducts)}");

// 11. Add QuickConsolidateModal definition
const consolidateModalCode = `
// ————— Quick Consolidate Modal ———————————————————————————————————————————
function QuickConsolidateModal({
  products,
  locations,
  onClose,
  onDone,
}: {
  products: ProductRow[];
  locations: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const isSingle = products.length === 1;
  const [toLocationId, setToLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validTo = locations.filter((l) => !l.name.includes('(محذوف)'));

  const handle = async () => {
    setError('');
    if (!toLocationId) { setError('اختر المخزن الجديد للتوحيد'); return; }

    setLoading(true);
    try {
      for (const p of products) {
        // First ensure it's assigned to target
        await inventoryApi.assignProductsToLocation(Number(toLocationId), [Number(p.id)]);

        // Now transfer any stock from other locations and delete them
        for (const stock of p.locationStocks) {
          if (String(stock.locationId) === String(toLocationId)) continue;
          
          if (stock.qty > 0) {
            await inventoryApi.internalTransferProducts({
              fromLocationId: Number(stock.locationId),
              toLocationId: Number(toLocationId),
              items: [{ productId: Number(p.id), qty: stock.qty }],
              note: 'توحيد مخازن الصنف',
            });
          }
          // Delete old location link
          await inventoryApi.removeProductFromLocation(Number(stock.locationId), Number(p.id));
        }
      }
      onDone();
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء التوحيد');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color, #e5e7eb)',
    fontSize: '14px',
    background: '#fff',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title={isSingle ? \`توحيد مخازن — \${products[0].name}\` : \`توحيد \${products.length} أصناف\`} onClose={onClose} />

      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#dc2626' }}>
        <strong>تنبيه:</strong> سيتم نقل كل رصيد هذه الأصناف إلى المخزن الذي ستختاره الآن، وسيتم <strong>حذف</strong> هذه الأصناف من كافة المخازن الأخرى نهائياً.
      </div>

      <FieldLabel>المخزن الموحد (الهدف)</FieldLabel>
      <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} style={selectStyle}>
        <option value="">اختر المخزن...</option>
        {validTo.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {error && <ErrorBox msg={error} />}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button onClick={handle} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'جاري التوحيد...' : 'تأكيد التوحيد'}
        </button>
        <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>إلغاء</button>
      </div>
    </ModalBackdrop>
  );
}
`;

code = code.replace(/function CategoryTransferModal/, consolidateModalCode + "\nfunction CategoryTransferModal");

// 12. Add QuickConsolidateModal usage
code = code.replace(/\{activeModal === 'transfer' && \([\s\S]*?<\/QuickTransferModal>\s*\n\s*\)\}/, `$&
        {activeModal === 'consolidate' && (
          <QuickConsolidateModal
            products={modalProducts}
            locations={locations as any}
            onClose={() => setActiveModal(null)}
            onDone={handleDone}
          />
        )}`);

fs.writeFileSync('src/features/inventory/pages/InventoryTreePage.tsx', code);
console.log('Patch applied.');
