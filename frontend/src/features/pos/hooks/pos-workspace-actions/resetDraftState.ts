import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { clearDraftSnapshot } from '@/features/pos/lib/pos.persistence';
import type { PosWorkspaceActionParams } from '@/features/pos/hooks/usePosWorkspaceActionGroups';

export function resetDraftState(params: PosWorkspaceActionParams) {
  params.setCart([]);
  params.setSelectedLineKey('');
  params.setCustomerId('');
  params.setDiscount(0);
  params.setDiscountApprovalGranted(false);
  params.setDiscountApprovalSecret('');
  params.setCashAmount(0);
  params.setCardAmount(0);
  params.setTransferAmount(0);
  params.setPaymentType('cash');
  params.setPaymentChannel('cash');
  params.setNote('');
  params.setSearch('');
  params.setPriceType('retail');
  params.setBranchId(SINGLE_STORE_MODE ? String(params.branches[0]?.id || '') : '');
  params.setLocationId(SINGLE_STORE_MODE ? String(params.locations[0]?.id || '') : '');
  params.setQuickAddCode('');
  params.setScannerMessage('');
  params.setLastAddedLineKey('');
  params.setSubmitMessage('');
  params.setPostSaleSaleKey('');
  clearDraftSnapshot();
  params.requestBarcodeFocus();
}
