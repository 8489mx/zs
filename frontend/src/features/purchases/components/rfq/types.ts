export const getRfqStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return { label: 'مسودة أولية', bg: '#f1f5f9', color: '#475569' };
    case 'sent':
      return { label: 'تم الإرسال للموردين', bg: '#e0e7ff', color: '#170e5e' };
    case 'bids_received':
      return { label: 'تم استلام عروض أسعار', bg: '#fef3c7', color: '#92400e' };
    case 'converted_to_po':
      return { label: 'معتمد ومحول لأمر شراء', bg: '#dcfce7', color: '#166534' };
    case 'cancelled':
      return { label: 'ملغي', bg: '#fee2e2', color: '#991b1b' };
    default:
      return { label: status, bg: '#f1f5f9', color: '#475569' };
  }
};
