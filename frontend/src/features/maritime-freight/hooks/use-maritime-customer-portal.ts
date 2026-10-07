import {
  freightCustomerPortalApi,
  FreightPortalCustomer,
  FreightPortalDashboard,
} from '../api/maritime-freight.api';

export type { FreightPortalCustomer, FreightPortalDashboard };

/**
 * Custom hook wrapping maritime customer portal data access and actions.
 * Adheres to the page composition architectural invariant (no direct /api imports in pages).
 */
export function useMaritimeCustomerPortal() {
  return {
    portalApi: freightCustomerPortalApi,
    tokenLogin: freightCustomerPortalApi.tokenLogin,
    getStoredSession: freightCustomerPortalApi.getStoredSession,
    getDashboard: freightCustomerPortalApi.getDashboard,
    getShipments: freightCustomerPortalApi.getShipments,
    getQuotations: freightCustomerPortalApi.getQuotations,
    getStatement: freightCustomerPortalApi.getStatement,
    login: freightCustomerPortalApi.login,
    logout: freightCustomerPortalApi.logout,
    requestQuote: freightCustomerPortalApi.requestQuote,
    approveQuotation: freightCustomerPortalApi.approveQuotation,
  };
}
