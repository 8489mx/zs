
function createAccountingGuards({ db }) {
  function hasInvoiceReturns(returnType, invoiceId) {
    return Number((db.prepare('SELECT COUNT(*) AS c FROM returns WHERE return_type = ? AND invoice_id = ?').get(returnType, invoiceId) || {}).c || 0) > 0;
  }

  function hasDependentCustomerPayments(customerId, createdAt) {
    if (!customerId || !createdAt) return false;
    return Number((db.prepare('SELECT COUNT(*) AS c FROM customer_payments WHERE customer_id = ? AND created_at >= ?').get(customerId, createdAt) || {}).c || 0) > 0;
  }

  function hasDependentSupplierPayments(supplierId, createdAt) {
    if (!supplierId || !createdAt) return false;
    return Number((db.prepare('SELECT COUNT(*) AS c FROM supplier_payments WHERE supplier_id = ? AND created_at >= ?').get(supplierId, createdAt) || {}).c || 0) > 0;
  }

  function assertSaleMutationAllowed(sale, mode) {
    if (!sale) throw new Error('Sale not found');
    if (sale.status === 'cancelled') throw new Error('Sale already cancelled');
    if (hasInvoiceReturns('sale', sale.id)) {
      throw new Error(`Sale cannot be ${mode} after returns have been posted`);
    }
    if (sale.payment_type === 'credit' && sale.customer_id && hasDependentCustomerPayments(sale.customer_id, sale.created_at || sale.updated_at || new Date().toISOString())) {
      throw new Error(`Credit sale cannot be ${mode} after customer payments exist`);
    }
  }

  function assertPurchaseMutationAllowed(purchase, mode) {
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status === 'cancelled') throw new Error('Purchase already cancelled');
    if (hasInvoiceReturns('purchase', purchase.id)) {
      throw new Error(`Purchase cannot be ${mode} after returns have been posted`);
    }
    if (purchase.payment_type === 'credit' && purchase.supplier_id && hasDependentSupplierPayments(purchase.supplier_id, purchase.created_at || purchase.updated_at || new Date().toISOString())) {
      throw new Error(`Credit purchase cannot be ${mode} after supplier payments exist`);
    }
  }

  return {
    hasInvoiceReturns,
    hasDependentCustomerPayments,
    hasDependentSupplierPayments,
    assertSaleMutationAllowed,
    assertPurchaseMutationAllowed
  };
}

module.exports = { createAccountingGuards };
