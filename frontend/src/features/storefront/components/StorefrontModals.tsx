import type {
  CartItem,
  CreateOnlineOrderResponse,
  StorefrontProduct,
  StorefrontCategory,
  StorefrontInfo,
  OnlineOrderRecord,
} from '../types/storefront.types';
import { StorefrontCategoriesModal } from './StorefrontCategoriesModal';
import { StorefrontLiveCartDock } from './StorefrontLiveCartDock';
import { StorefrontCheckoutModal } from './StorefrontCheckoutModal';
import { StorefrontSuccessModal } from './StorefrontSuccessModal';
import { StorefrontMyOrdersModal } from './StorefrontMyOrdersModal';
import { StorefrontReviewModal } from './StorefrontReviewModal';

interface StorefrontModalsProps {
  // Categories Modal
  isCategoriesModalOpen: boolean;
  onCloseCategoriesModal: () => void;
  categories: StorefrontCategory[];
  categoryCounts: Map<number | 'all', number>;
  selectedCategory: number | 'all';
  onSelectCategory: (id: number | 'all') => void;

  // Cart Dock
  cartItems: CartItem[];
  info: StorefrontInfo;
  isCartOpen: boolean;
  onOpenCart: () => void;
  onCloseCart: () => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;

  // Checkout Modal
  isCheckoutOpen: boolean;
  onCloseCheckout: () => void;
  cleanSlug: string;
  editingOrderNumber?: string;
  tableParam: string;
  onEditSuccess: () => void;
  onOrderSuccess: (orderData: CreateOnlineOrderResponse) => void;

  // Success Modal
  confirmedOrder: CreateOnlineOrderResponse | null;
  onCloseSuccessModal: () => void;
  onTrackOrder: () => void;

  // My Orders Modal
  isMyOrdersOpen: boolean;
  onCloseMyOrders: () => void;
  onEditOrder: (order: OnlineOrderRecord) => void;

  // Review Modal
  isReviewModalOpen: boolean;
  reviewProduct: StorefrontProduct | null;
  onCloseReviewModal: () => void;
  onReviewSubmitted: () => void;
}

export function StorefrontModals({
  isCategoriesModalOpen,
  onCloseCategoriesModal,
  categories,
  categoryCounts,
  selectedCategory,
  onSelectCategory,

  cartItems,
  info,
  isCartOpen,
  onOpenCart,
  onCloseCart,
  onUpdateQuantity,
  onClearCart,
  onProceedToCheckout,

  isCheckoutOpen,
  onCloseCheckout,
  cleanSlug,
  editingOrderNumber,
  tableParam,
  onEditSuccess,
  onOrderSuccess,

  confirmedOrder,
  onCloseSuccessModal,
  onTrackOrder,

  isMyOrdersOpen,
  onCloseMyOrders,
  onEditOrder,

  isReviewModalOpen,
  reviewProduct,
  onCloseReviewModal,
  onReviewSubmitted,
}: StorefrontModalsProps) {
  return (
    <>
      {/* Categories Mega Modal (Amazon Style) */}
      <StorefrontCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={onCloseCategoriesModal}
        categories={categories}
        categoryCounts={categoryCounts}
        selectedCategoryId={selectedCategory}
        onSelectCategory={onSelectCategory}
      />

      {/* Unified Live Cart Dock */}
      <StorefrontLiveCartDock
        cartItems={cartItems}
        info={info}
        deliveryFee={info.deliveryFee}
        minOrder={info.minOrder}
        isOpen={isCartOpen}
        onOpen={onOpenCart}
        onClose={onCloseCart}
        onUpdateQuantity={onUpdateQuantity}
        onClearCart={onClearCart}
        onProceedToCheckout={onProceedToCheckout}
      />

      {/* Checkout Modal */}
      <StorefrontCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={onCloseCheckout}
        cartItems={cartItems}
        info={info}
        deliveryFee={info.deliveryFee}
        tenantSlug={cleanSlug}
        editingOrderNumber={editingOrderNumber}
        orderType={tableParam ? 'dine_in' : 'delivery'}
        tableNumber={tableParam || undefined}
        onEditSuccess={onEditSuccess}
        onOrderSuccess={onOrderSuccess}
      />

      {/* Success Modal */}
      <StorefrontSuccessModal
        isOpen={Boolean(confirmedOrder)}
        orderData={confirmedOrder}
        whatsappPhone={info.whatsappPhone}
        onClose={onCloseSuccessModal}
        onTrackOrder={onTrackOrder}
      />

      {/* Customer My Orders Modal */}
      <StorefrontMyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={onCloseMyOrders}
        slug={cleanSlug}
        info={info}
        onEditOrder={onEditOrder}
      />

      {/* Customer Product Review Modal */}
      <StorefrontReviewModal
        isOpen={isReviewModalOpen}
        product={reviewProduct}
        slug={cleanSlug}
        onClose={onCloseReviewModal}
        onReviewSubmitted={onReviewSubmitted}
      />
    </>
  );
}
