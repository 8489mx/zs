import { useTranslation } from 'react-i18next';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { DialogShell } from '@/shared/components/dialog-shell';
import { CameraBarcodeScannerModal } from '@/shared/components/CameraBarcodeScannerModal';
import { inventoryApi } from '@/shared/api/inventory.api';
import { useAuthStore, isAdminUser } from '@/stores/auth-store';
import { triggerHaptic } from '@/shared/utils/haptics';
import type { Product, Location } from '@/types/domain';

interface PriceStockCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarcode?: string;
}

export function PriceStockCheckerModal({
  isOpen,
  onClose,
  initialBarcode = '',
}: PriceStockCheckerModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canSeeCost = isAdminUser(user);

  const [query, setQuery] = useState(initialBarcode);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationStocks, setLocationStocks] = useState<Record<string, number>>({});
  const [hasSearched, setHasSearched] = useState(false);

  // Load locations on open
  useEffect(() => {
    if (isOpen) {
      inventoryApi.locations().then(setLocations).catch(() => {});
    }
  }, [isOpen]);

  const loadProductLocationStocks = useCallback(async (productId: string) => {
    try {
      const allStocks = await inventoryApi.locationStocks();
      const productStocks: Record<string, number> = {};
      allStocks.forEach((item) => {
        if (String(item.productId) === String(productId)) {
          productStocks[String(item.locationId)] = Number(item.qty || 0);
        }
      });
      setLocationStocks(productStocks);
    } catch {
      // Ignore
    }
  }, []);

  const handleSelectProduct = useCallback((prod: Product) => {
    setSelectedProduct(prod);
    setSearchResults([]);
    triggerHaptic('selection');
    loadProductLocationStocks(prod.id);
  }, [loadProductLocationStocks]);

  const performSearch = useCallback(async (searchQuery: string) => {
    const term = searchQuery.trim();
    if (!term) return;

    setIsLoading(true);
    setHasSearched(true);
    setSelectedProduct(null);

    try {
      const products = await inventoryApi.searchProducts(term);
      startTransition(() => {
        if (products.length === 1) {
          handleSelectProduct(products[0]);
          triggerHaptic('success');
        } else if (products.length > 1) {
          // Check exact barcode match first
          const exact = products.find(
            (p) =>
              p.barcode?.toLowerCase() === term.toLowerCase() ||
              p.sku?.toLowerCase() === term.toLowerCase()
          );
          if (exact) {
            handleSelectProduct(exact);
            triggerHaptic('success');
          } else {
            setSearchResults(products);
            triggerHaptic('light');
          }
        } else {
          setSearchResults([]);
          triggerHaptic('warning');
        }
      });
    } catch (e) {
      console.error('Search error in price checker:', e);
      setSearchResults([]);
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  }, [handleSelectProduct]);

  useEffect(() => {
    if (isOpen && initialBarcode) {
      setQuery(initialBarcode);
      performSearch(initialBarcode);
    }
    if (!isOpen) {
      setQuery('');
      setSelectedProduct(null);
      setSearchResults([]);
      setHasSearched(false);
      setCameraOpen(false);
    }
  }, [isOpen, initialBarcode, performSearch]);

  const handleBarcodeScanned = (scannedCode: string) => {
    setCameraOpen(false);
    setQuery(scannedCode);
    performSearch(scannedCode);
  };

  const handleGoToPos = (prod: Product) => {
    onClose();
    // Navigate to POS with the scanned barcode or product ID
    navigate(`/pos?scan=${encodeURIComponent(prod.barcode || prod.id)}`);
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setSearchResults([]);
    setHasSearched(false);
    setQuery('');
    triggerHaptic('light');
  };

  return (
    <>
      <DialogShell
        open={isOpen}
        onClose={onClose}
        width="min(520px, 95vw)"
        shellClassName="price-checker-dialog-shell"
      >
        <div className="price-checker-modal" dir="rtl">
          {/* Header */}
          <div className="price-checker-header">
            <div className="price-checker-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
            </div>
            <div>
              <h3 className="price-checker-title">{t('shared.price_stock_checker_modal.s0', "فاحص الأسعار والمخزون")}</h3>
              <p className="price-checker-subtitle">{t('shared.price_stock_checker_modal.s1', "امسح الباركود بالكاميرا أو ابحث باسم الصنف")}</p>
            </div>
          </div>

          {/* Search Controls */}
          <div className="price-checker-search-bar">
            <div className="price-checker-input-wrapper">
              <input
                type="text"
                className="price-checker-input"
                placeholder={t('shared.price_stock_checker_modal.s2', "اكتب الباركود أو اسم الصنف...")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    performSearch(query);
                  }
                }}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="price-checker-clear-btn"
                  onClick={() => setQuery('')}
                  aria-label={t('shared.price_stock_checker_modal.s3', "مسح")}
                ><XIcon size={15} /></button>
              )}
            </div>

            <button
              type="button"
              className="price-checker-btn-search"
              onClick={() => performSearch(query)}
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <span className="price-checker-spinner-sm" />
              ) : (
                t('shared.price_stock_checker_modal.s4', "بحث")
              )}
            </button>

            <button
              type="button"
              className="price-checker-btn-camera"
              onClick={() => {
                triggerHaptic('medium');
                setCameraOpen(true);
              }}
              title={t('shared.price_stock_checker_modal.s5', "مسح بالكاميرا")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>{t('shared.price_stock_checker_modal.s6', "كاميرا")}</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="price-checker-content">
            {/* 1. Selected Product View */}
            {selectedProduct && (
              <div className="price-checker-card">
                <div className="price-checker-card-top">
                  <div className="price-checker-prod-info">
                    <h4 className="price-checker-prod-name">{selectedProduct.name}</h4>
                    <div className="price-checker-badges-row">
                      {selectedProduct.barcode && (
                        <span className="price-checker-badge barcode" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/>
                          </svg>
                          <span>{selectedProduct.barcode}</span>
                        </span>
                      )}
                      {selectedProduct.sku && (
                        <span className="price-checker-badge sku">
                          SKU: {selectedProduct.sku}
                        </span>
                      )}
                      {selectedProduct.itemKind && (
                        <span className="price-checker-badge kind">
                          {selectedProduct.itemKind === 'fashion' ? t('shared.price_stock_checker_modal.s7', "أزياء / مقاسات") : t('shared.price_stock_checker_modal.s8', "صنف قياسي")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div
                    className={`price-checker-stock-pill ${
                      (selectedProduct.stock || 0) <= 0
                        ? 'out-of-stock'
                        : (selectedProduct.stock || 0) <= (selectedProduct.minStock || 5)
                        ? 'low-stock'
                        : 'in-stock'
                    }`}
                  >
                    <strong>{selectedProduct.stock || 0}</strong>
                    <span>
                      {(selectedProduct.stock || 0) <= 0
                        ? t('shared.price_stock_checker_modal.s9', "نافذ من المخزون")
                        : (selectedProduct.stock || 0) <= (selectedProduct.minStock || 5)
                        ? t('shared.price_stock_checker_modal.s10', "رصيد منخفض")
                        : t('shared.price_stock_checker_modal.s11', "متوفر")}
                    </span>
                  </div>
                </div>

                {/* Pricing Grid */}
                <div className="price-checker-prices-grid">
                  <div className="price-box retail">
                    <span className="price-box-label">{t('shared.price_stock_checker_modal.s12', "سعر البيع (قطاعي)")}</span>
                    <strong className="price-box-val">
                      {(selectedProduct.retailPrice || 0).toLocaleString()} <small><CurrencySymbol /></small>
                    </strong>
                  </div>

                  <div className="price-box wholesale">
                    <span className="price-box-label">{t('shared.price_stock_checker_modal.s13', "سعر الجملة")}</span>
                    <strong className="price-box-val">
                      {(selectedProduct.wholesalePrice || 0).toLocaleString()} <small><CurrencySymbol /></small>
                    </strong>
                  </div>

                  {canSeeCost && (
                    <div className="price-box cost">
                      <span className="price-box-label">{t('shared.price_stock_checker_modal.s14', "سعر التكلفة")}</span>
                      <strong className="price-box-val">
                        {(selectedProduct.costPrice || 0).toLocaleString()} <small><CurrencySymbol /></small>
                      </strong>
                    </div>
                  )}
                </div>

                {/* Units List if available */}
                {selectedProduct.units && selectedProduct.units.length > 0 && (
                  <div className="price-checker-section">
                    <h5 className="price-checker-section-title">{t('shared.price_stock_checker_modal.s15', "الوحدات والعبوات")}</h5>
                    <div className="price-checker-units-list">
                      {selectedProduct.units.map((unit, idx) => {
                        const unitPrice = (selectedProduct.retailPrice || 0) * (unit.multiplier || 1);
                        return (
                          <div key={unit.id || idx} className="price-checker-unit-row">
                            <span className="unit-name">{unit.name} {t('shared.price_stock_checker_modal.s16', "(معامل")} {unit.multiplier})</span>
                            <span className="unit-price">
                              {unitPrice.toLocaleString()} <CurrencySymbol />
                            </span>
                            {unit.barcode && <span className="unit-barcode">{unit.barcode}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Warehouse Location Breakdown */}
                <div className="price-checker-section">
                  <h5 className="price-checker-section-title">{t('shared.price_stock_checker_modal.s17', "الرصيد في المخازن والفروع")}</h5>
                  <div className="price-checker-locations-grid">
                    {locations.length > 0 ? (
                      locations.map((loc) => {
                        const qty = locationStocks[String(loc.id)] ?? 0;
                        return (
                          <div key={loc.id} className="price-checker-loc-item">
                            <span className="loc-name">{loc.name}</span>
                            <span className={`loc-qty ${qty > 0 ? 'has-stock' : 'zero-stock'}`}>
                              {qty} {t('shared.price_stock_checker_modal.s18', "قطعة")}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="price-checker-loc-item">
                        <span className="loc-name">{t('shared.price_stock_checker_modal.s19', "المخزن الرئيسي")}</span>
                        <span className="loc-qty has-stock">{selectedProduct.stock || 0} {t('shared.price_stock_checker_modal.s20', "قطعة")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="price-checker-card-actions">
                  <button
                    type="button"
                    className="price-checker-btn-pos"
                    onClick={() => handleGoToPos(selectedProduct)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span>{t('shared.price_stock_checker_modal.s21', "بيع فوري في الكاشير (POS)")}</span>
                  </button>

                  <button
                    type="button"
                    className="price-checker-btn-reset"
                    onClick={handleReset}
                  >
                    {t('shared.price_stock_checker_modal.s22', "فحص صنف آخر")}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Multiple Results Selection */}
            {!selectedProduct && searchResults.length > 0 && (
              <div className="price-checker-results-list">
                <p className="price-checker-results-header">
                  {t('shared.price_stock_checker_modal.s23', "تم العثور على")} {searchResults.length} {t('shared.price_stock_checker_modal.s24', "أصناف، اضغط على الصنف لعرض تفاصيله:")}
                </p>
                <div className="price-checker-results-scroll">
                  {searchResults.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      className="price-checker-result-item"
                      onClick={() => handleSelectProduct(prod)}
                    >
                      <div className="result-item-main">
                        <strong className="result-item-name">{prod.name}</strong>
                        <span className="result-item-meta">
                          {prod.barcode ? `باركود: ${prod.barcode}` : `كود: ${prod.id}`}
                        </span>
                      </div>
                      <div className="result-item-end">
                        <span className="result-item-price">
                          {(prod.retailPrice || 0).toLocaleString()} <CurrencySymbol />
                        </span>
                        <span className="result-item-stock">
                          {t('shared.price_stock_checker_modal.s25', "المتاح:")} {prod.stock || 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Empty State / Not Found */}
            {!selectedProduct && searchResults.length === 0 && hasSearched && !isLoading && (
              <div className="price-checker-empty-state">
                <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: '#94a3b8' }}>
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <h4>{t('shared.price_stock_checker_modal.s26', "لم يتم العثور على أي صنف")}</h4>
                <p>{t('shared.price_stock_checker_modal.s27', "تأكد من كتابة الاسم أو الباركود بشكل صحيح، أو اضغط على الكاميرا للمسح المباشر.")}</p>
              </div>
            )}

            {/* 4. Initial Prompt State */}
            {!selectedProduct && searchResults.length === 0 && !hasSearched && !isLoading && (
              <div className="price-checker-initial-state">
                <div className="initial-scan-card" onClick={() => setCameraOpen(true)}>
                  <div className="initial-scan-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>
                  <strong>{t('shared.price_stock_checker_modal.s28', "اضغط لفتح كاميرا الهاتف ومسح الباركود فوراً")}</strong>
                  <span>{t('shared.price_stock_checker_modal.s29', "أو اكتب اسم الصنف في مربع البحث أعلاه")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogShell>

      {/* Embedded Barcode Scanner */}
      {cameraOpen && (
        <CameraBarcodeScannerModal
          isOpen={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onScan={handleBarcodeScanned}
          title={t('shared.price_stock_checker_modal.s30', "مسح باركود الصنف لفحص السعر والمخزون")}
        />
      )}
    </>
  );
}
