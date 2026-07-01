import { load } from '@cashfreepayments/cashfree-js';

let cashfreeInstance: any = null;

export const cashfree = {
  initialize: async () => {
    if (cashfreeInstance) return cashfreeInstance;
    
    // Replace with correct env checking if needed
    // 'sandbox' or 'production'
    cashfreeInstance = await load({
      mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox'
    });
    
    return cashfreeInstance;
  }
};
