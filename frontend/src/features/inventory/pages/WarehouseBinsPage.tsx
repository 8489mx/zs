import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { inventoryApi } from '@/shared/api/inventory.api';
import {
  warehouseBinsApi,
  WarehouseBin,
  CreateBinPayload,
  ScanAuditResponse,
} from '../api/warehouse-bins.api';

export const WarehouseBinsPage: FC = () => {
  const [bins, setBins] = useState<WarehouseBin[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'audit'>('directory');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<WarehouseBin | null>(null);
  const [formLocationId, setFormLocationId] = useState<number | ''>('');
  const [formCode, setFormCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formAisle, setFormAisle] = useState('');
  const [formRack, setFormRack] = useState('');
  const [formShelf, setFormShelf] = useState('');
  const [formBin, setFormBin] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  // Barcode Audit State
  const [scanQuery, setScanQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [auditResult, setAuditResult] = useState<ScanAuditResponse | null>(null);
  const [auditInputs, setAuditInputs] = useState<Record<number, number>>({});
  const [auditFeedback, setAuditFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    loadBins();
  }, [selectedLocationId, search]);

  const loadLocations = async () => {
    try {
      const locs = await inventoryApi.locations();
      setLocations(locs || []);
      if (locs && locs.length > 0 && !formLocationId) {
        setFormLocationId(Number(locs[0].id));
      }
    } catch {
      setLocations([]);
    }
  };

  const loadBins = async () => {
    setLoading(true);
    try {
      const res = await warehouseBinsApi.list({
        locationId: selectedLocationId ? Number(selectedLocationId) : undefined,
        search: search.trim() || undefined,
      });
      setBins(res || []);
    } catch {
      setBins([]);
    } finally {
      setLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBin(null);
    setFormCode('');
    setFormBarcode('');
    setFormAisle('');
    setFormRack('');
    setFormShelf('');
    setFormBin('');
    setFormCapacity('');
    setFormNotes('');
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (bin: WarehouseBin) => {
    setEditingBin(bin);
    setFormLocationId(bin.locationId);
    setFormCode(bin.code);
    setFormBarcode(bin.barcode);
    setFormAisle(bin.aisle || '');
    setFormRack(bin.rack || '');
    setFormShelf(bin.shelf || '');
    setFormBin(bin.bin || '');
    setFormCapacity(bin.capacity ? String(bin.capacity) : '');
    setFormNotes(bin.notes || '');
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  // Save Bin
  const handleSaveBin = async () => {
    if (!formLocationId || !formCode.trim()) {
      setModalFeedback({ text: 'يرجى اختيار المستودع وإدخال رمز الرف/المكان', error: true });
      return;
    }

    setSaving(true);
    setModalFeedback(null);
    try {
      if (editingBin) {
        await warehouseBinsApi.update(editingBin.id, {
          code: formCode.trim(),
          barcode: formBarcode.trim() || undefined,
          aisle: formAisle.trim() || undefined,
          rack: formRack.trim() || undefined,
          shelf: formShelf.trim() || undefined,
          bin: formBin.trim() || undefined,
          capacity: formCapacity ? Number(formCapacity) : undefined,
          notes: formNotes.trim() || undefined,
        });
      } else {
        const payload: CreateBinPayload = {
          locationId: Number(formLocationId),
          code: formCode.trim(),
          barcode: formBarcode.trim() || undefined,
          aisle: formAisle.trim() || undefined,
          rack: formRack.trim() || undefined,
          shelf: formShelf.trim() || undefined,
          bin: formBin.trim() || undefined,
          capacity: formCapacity ? Number(formCapacity) : undefined,
          notes: formNotes.trim() || undefined,
        };
        await warehouseBinsApi.create(payload);
      }
      setIsModalOpen(false);
      loadBins();
    } catch (err: any) {
      setModalFeedback({ text: err?.message || 'تعذر حفظ مكان التخزين', error: true });
    } finally {
      setSaving(false);
    }
  };

  // Delete Bin
  const handleDeleteBin = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف مكان التخزين؟ لا يمكن الحذف إذا كانت هناك أصناف مخزنة به.')) return;
    try {
      await warehouseBinsApi.remove(id);
      loadBins();
    } catch (err: any) {
      alert(err?.message || 'تعذر حذف مكان التخزين');
    }
  };

  // Run Barcode Scan
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanQuery.trim()) return;

    setScanning(true);
    setAuditFeedback(null);
    try {
      const res = await warehouseBinsApi.scanAudit(scanQuery.trim());
      setAuditResult(res);
      // Initialize inputs for bin audit items
      if (res.type === 'bin' && res.items) {
        const inputs: Record<number, number> = {};
        res.items.forEach((item) => {
          inputs[item.productId] = item.quantity;
        });
        setAuditInputs(inputs);
      }
    } catch (err: any) {
      setAuditResult(null);
      setAuditFeedback({ text: err?.message || 'لم يتم العثور على رف أو صنف يطابق هذا الباركود', error: true });
    } finally {
      setScanning(false);
    }
  };

  // Update physical count on a specific item in bin
  const handleSaveAuditItem = async (productId: number) => {
    if (!auditResult || !auditResult.bin) return;
    const counted = auditInputs[productId] ?? 0;
    try {
      const res = await warehouseBinsApi.quickAuditUpdate({
        binId: auditResult.bin.id,
        productId,
        countedQty: counted,
      });
      setAuditFeedback({ text: res.message });
      // Refresh scan
      handleScanSubmit();
    } catch (err: any) {
      setAuditFeedback({ text: err?.message || 'تعذر تحديث رصيد الرف', error: true });
    }
  };

  // Summary Metrics
  const totalBinsCount = bins.length;
  const totalProductsStored = bins.reduce((sum, b) => sum + b.productsCount, 0);
  const totalQuantityStored = bins.reduce((sum, b) => sum + b.totalQuantityStored, 0);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="أماكن التخزين والأرفف (Warehouse Bins & Shelves)"
          description="إدارة الهيكل التفصيلي للمستودعات (الممرات، الأرفف، الأعين) مع فاحص وجرد الباركود المباشر عبر الماسح اللاسلكي أو الهاتف."
          badge={<span className="nav-pill">إدارة المستودعات المتقدمة</span>}
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <AppIcons.Plus size={16} />
              إضافة مكان تخزين جديد (New Bin)
            </button>
          }
        />

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي أماكن التخزين (الأرفف)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#170e5e', marginTop: '6px' }}>{totalBinsCount}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>أعين وأرفف مسجلة في النظام</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>الأصناف المربوطة بالأرفف</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>{totalProductsStored}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>صنف مخزن بمكان محدد</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي القطع المخزنة بالأرفف</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>{totalQuantityStored}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>إجمالي الكمية الفعلية داخل الأماكن</div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              backgroundColor: activeTab === 'directory' ? '#170e5e' : 'transparent',
              color: activeTab === 'directory' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AppIcons.Box size={16} />
            سجل الأرفف وأماكن التخزين (Bins Directory)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              backgroundColor: activeTab === 'audit' ? '#170e5e' : 'transparent',
              color: activeTab === 'audit' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AppIcons.Barcode size={16} />
            فاحص وجرد الباركود السريع (Quick Barcode Audit)
          </button>
        </div>

        {/* Tab 1: Directory */}
        {activeTab === 'directory' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Filters */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ width: '260px' }}>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- كل المستودعات والفروع --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برمز الرف، الباركود، الممر، أو الحامل..."
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
                جاري تحميل أماكن التخزين...
              </div>
            ) : bins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                <AppIcons.Box size={40} color="#cbd5e1" />
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginTop: '12px' }}>
                  لا توجد أماكن تخزين مسجلة حتى الآن
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  اضغط على زر "إضافة مكان تخزين جديد" للبدء في تنظيم رفوف المستودع.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'right' }}>
                      <th style={{ padding: '10px 12px' }}>رمز الرف (Code)</th>
                      <th style={{ padding: '10px 12px' }}>المستودع</th>
                      <th style={{ padding: '10px 12px' }}>الممر (Aisle)</th>
                      <th style={{ padding: '10px 12px' }}>الحامل (Rack)</th>
                      <th style={{ padding: '10px 12px' }}>المستوى (Shelf)</th>
                      <th style={{ padding: '10px 12px' }}>العين (Bin)</th>
                      <th style={{ padding: '10px 12px' }}>الباركود</th>
                      <th style={{ padding: '10px 12px' }}>الأصناف</th>
                      <th style={{ padding: '10px 12px' }}>الكمية المخزنة</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bins.map((bin) => (
                      <tr key={bin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#170e5e' }}>
                          {bin.code}
                        </td>
                        <td style={{ padding: '12px', color: '#334155' }}>
                          {bin.locationName}
                        </td>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {bin.aisle || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {bin.rack || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {bin.shelf || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {bin.bin || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              backgroundColor: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#334155',
                            }}
                          >
                            {bin.barcode}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>
                          {bin.productsCount} صنف
                        </td>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#059669' }}>
                          {bin.totalQuantityStored}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setScanQuery(bin.barcode);
                                setActiveTab('audit');
                                setTimeout(() => {
                                  warehouseBinsApi.scanAudit(bin.barcode).then((res) => {
                                    setAuditResult(res);
                                    if (res.items) {
                                      const inputs: Record<number, number> = {};
                                      res.items.forEach((item) => {
                                        inputs[item.productId] = item.quantity;
                                      });
                                      setAuditInputs(inputs);
                                    }
                                  });
                                }, 50);
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #3b82f6',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              فحص الرف
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(bin)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBin(bin.id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Quick Barcode Scanner & Audit */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Scanner Input Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <form onSubmit={handleScanSubmit}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                  امسح باركود الرف أو باركود الصنف (Scan Barcode)
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      value={scanQuery}
                      onChange={(e) => setScanQuery(e.target.value)}
                      placeholder="امسح باركود الرف (مثل BIN-1-A01) أو باركود الصنف..."
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid #170e5e',
                        fontSize: '15px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={scanning || !scanQuery.trim()}
                    style={{
                      padding: '12px 28px',
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AppIcons.Barcode size={18} />
                    {scanning ? 'جاري الفحص...' : 'فحص وجرد (Scan)'}
                  </button>
                </div>
              </form>

              {auditFeedback && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: auditFeedback.error ? '#fef2f2' : '#f0fdf4',
                    color: auditFeedback.error ? '#991b1b' : '#166534',
                    border: `1px solid ${auditFeedback.error ? '#fecaca' : '#bbf7d0'}`,
                  }}
                >
                  {auditFeedback.text}
                </div>
              )}
            </div>

            {/* Scan Result Display */}
            {auditResult && auditResult.type === 'bin' && auditResult.bin && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>مكان التخزين المفحوص</span>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#170e5e', margin: '4px 0 0 0' }}>
                      {auditResult.bin.code}
                    </h2>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                      المستودع: <strong>{auditResult.bin.locationName}</strong> | الممر: <strong>{auditResult.bin.aisle || '-'}</strong> | الحامل: <strong>{auditResult.bin.rack || '-'}</strong> | المستوى: <strong>{auditResult.bin.shelf || '-'}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: 800,
                        fontSize: '12px',
                      }}
                    >
                      باركود الرف: {auditResult.bin.barcode}
                    </span>
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                  الأصناف المتواجدة بهذا الرف حالياً ({auditResult.items?.length || 0} صنف)
                </h4>

                {(!auditResult.items || auditResult.items.length === 0) ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    هذا الرف فارغ ولا توجد به أصناف مسجلة حالياً.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'right' }}>
                          <th style={{ padding: '10px' }}>اسم الصنف</th>
                          <th style={{ padding: '10px' }}>الباركود</th>
                          <th style={{ padding: '10px' }}>الكمية المسجلة</th>
                          <th style={{ padding: '10px', width: '140px' }}>الكمية الفعلية (الجرد)</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>فارق الجرد</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>تحديث</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditResult.items.map((item) => {
                          const countedVal = auditInputs[item.productId] ?? item.quantity;
                          const variance = countedVal - item.quantity;
                          return (
                            <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px', fontWeight: 700, color: '#1e293b' }}>
                                {item.productName}
                              </td>
                              <td style={{ padding: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                                {item.productBarcode || '-'}
                              </td>
                              <td style={{ padding: '12px', fontWeight: 700, color: '#334155' }}>
                                {item.quantity}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <input
                                  type="number"
                                  step="1"
                                  value={countedVal}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setAuditInputs((prev) => ({ ...prev, [item.productId]: val }));
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    textAlign: 'center',
                                    outline: 'none',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {variance === 0 ? (
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 700, fontSize: '11px' }}>
                                    مطابق (0)
                                  </span>
                                ) : variance > 0 ? (
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '11px' }}>
                                    زيادة (+{variance})
                                  </span>
                                ) : (
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '11px' }}>
                                    عجز ({variance})
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveAuditItem(item.productId)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: '#170e5e',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  حفظ الرصيد
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* If product was scanned */}
            {auditResult && auditResult.type === 'product' && auditResult.product && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>نتيجة فحص الصنف</span>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#170e5e', margin: '4px 0 0 0' }}>
                    {auditResult.product.name}
                  </h2>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                    الباركود: <strong>{auditResult.product.barcode}</strong> | إجمالي المخزون الكلي: <strong>{auditResult.product.stockQty}</strong>
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                  الأرفف وأماكن التخزين المسجل بها هذا الصنف:
                </h4>

                {(!auditResult.allocatedBins || auditResult.allocatedBins.length === 0) ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    هذا الصنف غير مربوط بأي رف محدد في المستودعات حتى الآن.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {auditResult.allocatedBins.map((b) => (
                      <div
                        key={b.binId}
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '14px', color: '#170e5e' }}>{b.binCode}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{b.locationName}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                          الممر: {b.aisle || '-'} | الحامل: {b.rack || '-'} | المستوى: {b.shelf || '-'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginTop: '6px' }}>
                          الكمية في هذا الرف: {b.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal: Create / Edit Bin */}
        <StandardDialog
          isOpen={isModalOpen}
          onClose={() => {
            if (!saving) setIsModalOpen(false);
          }}
          title={editingBin ? 'تعديل مكان التخزين (Edit Bin)' : 'إضافة مكان تخزين جديد (New Bin)'}
          subtitle="تحديد المستودع، رمز المكان، الممر، الحامل، والباركود لسهولة التوجيه والجرد"
          width="560px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveBin}
                disabled={saving || !formCode.trim()}
                style={{
                  padding: '8px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ مكان التخزين'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' }} dir="rtl">
            {modalFeedback && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor: modalFeedback.error ? '#fef2f2' : '#f0fdf4',
                  color: modalFeedback.error ? '#991b1b' : '#166534',
                  border: `1px solid ${modalFeedback.error ? '#fecaca' : '#bbf7d0'}`,
                }}
              >
                {modalFeedback.text}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                المستودع / مكان التخزين الرئيسي <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={formLocationId}
                onChange={(e) => setFormLocationId(Number(e.target.value))}
                disabled={Boolean(editingBin)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: editingBin ? '#f1f5f9' : '#ffffff',
                }}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  رمز مكان التخزين (Code) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="مثال: A1-R02-S3-B05"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  الباركود (Barcode)
                </label>
                <input
                  type="text"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  placeholder="اتركه فارغاً للتوليد التلقائي..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  الممر (Aisle)
                </label>
                <input
                  type="text"
                  value={formAisle}
                  onChange={(e) => setFormAisle(e.target.value)}
                  placeholder="A, B, 01..."
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  الحامل (Rack)
                </label>
                <input
                  type="text"
                  value={formRack}
                  onChange={(e) => setFormRack(e.target.value)}
                  placeholder="R1, R2..."
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  المستوى (Shelf)
                </label>
                <input
                  type="text"
                  value={formShelf}
                  onChange={(e) => setFormShelf(e.target.value)}
                  placeholder="S1, S2..."
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  العين (Bin)
                </label>
                <input
                  type="text"
                  value={formBin}
                  onChange={(e) => setFormBin(e.target.value)}
                  placeholder="B01, B02..."
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                ملاحظات
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="ملاحظات أو مواصفات خاصة بمكان التخزين..."
                rows={2}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>
        </StandardDialog>
      </main>
    </div>
  );
};
