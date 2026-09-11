import {
  UniversalBoqItemModal,
  UniversalBoqItemModalProps,
  DEFAULT_TRADE_MARGINS,
  TRADE_PREFIXES,
  getNextItemCode,
  calculatePriceFromMargin,
  calculateMarginFromPrice,
} from './UniversalBoqItemModal';

export {
  DEFAULT_TRADE_MARGINS,
  TRADE_PREFIXES,
  getNextItemCode,
  calculatePriceFromMargin,
  calculateMarginFromPrice,
};

export function CreateMasterBoqItemModal(props: Omit<UniversalBoqItemModalProps, 'mode'>) {
  return <UniversalBoqItemModal {...props} mode="master" />;
}
