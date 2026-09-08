import { useState, useEffect, type FC } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { inventoryApi } from '@/shared/api/inventory.api';
import {
  warehouseBinsApi,
  WarehouseBin,
  CreateBinPayload,
  ScanAuditResponse,
} from '../api/warehouse-bins.api';
import { BinKpiCards } from '../components/bins/BinKpiCards';
import { BinsDirectoryTable } from '../components/bins/BinsDirectoryTable';
import { BinBarcodeAuditPanel } from '../components/bins/BinBarcodeAuditPanel';
import { CreateEditBinModal } from '../components/bins/CreateEditBinModal';

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

  const handleDeleteBin = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف مكان التخزين؟ لا يمكن الحذف إذا كانت هناك أصناف مخزنة به.')) return;
    try {
      await warehouseBinsApi.remove(id);
      loadBins();
    } catch (err: any) {
      alert(err?.message || 'تعذر حذف مكان التخزين');
    }
  };

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanQuery.trim()) return;

    setScanning(true);
    setAuditFeedback(null);
    try {
      const res = await warehouseBinsApi.scanAudit(scanQuery.trim());
      setAuditResult(res);
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
      handleScanSubmit();
    } catch (err: any) {
      setAuditFeedback({ text: err?.message || 'تعذر تحديث رصيد الرف', error: true });
    }
  };

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
        <BinKpiCards
          totalBinsCount={totalBinsCount}
          totalProductsStored={totalProductsStored}
          totalQuantityStored={totalQuantityStored}
        />

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
          <BinsDirectoryTable
            bins={bins}
            loading={loading}
            locations={locations}
            selectedLocationId={selectedLocationId}
            onSelectLocationId={setSelectedLocationId}
            search={search}
            onSearchChange={setSearch}
            onInspectBin={(bin) => {
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
            onEditBin={handleOpenEdit}
            onDeleteBin={handleDeleteBin}
          />
        )}

        {/* Tab 2: Quick Barcode Scanner & Audit */}
        {activeTab === 'audit' && (
          <BinBarcodeAuditPanel
            scanQuery={scanQuery}
            onScanQueryChange={setScanQuery}
            onScanSubmit={handleScanSubmit}
            scanning={scanning}
            auditFeedback={auditFeedback}
            auditResult={auditResult}
            auditInputs={auditInputs}
            onAuditInputChange={(pId, val) => setAuditInputs((prev) => ({ ...prev, [pId]: val }))}
            onSaveAuditItem={handleSaveAuditItem}
          />
        )}

        {/* Modal: Create / Edit Bin */}
        <CreateEditBinModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingBin={editingBin}
          locations={locations}
          formLocationId={formLocationId}
          setFormLocationId={setFormLocationId}
          formCode={formCode}
          setFormCode={setFormCode}
          formBarcode={formBarcode}
          setFormBarcode={setFormBarcode}
          formAisle={formAisle}
          setFormAisle={setFormAisle}
          formRack={formRack}
          setFormRack={setFormRack}
          formShelf={formShelf}
          setFormShelf={setFormShelf}
          formBin={formBin}
          setFormBin={setFormBin}
          formNotes={formNotes}
          setFormNotes={setFormNotes}
          saving={saving}
          modalFeedback={modalFeedback}
          onSave={handleSaveBin}
        />
      </main>
    </div>
  );
};
export default WarehouseBinsPage;
