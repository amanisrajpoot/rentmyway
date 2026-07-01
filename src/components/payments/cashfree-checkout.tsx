'use client';

import { useState } from 'react';
import { cashfree } from '@/lib/cashfree-client'; // We'll need a client wrapper
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CashfreeCheckoutProps {
  scheduleId: string;
  amount: number;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CashfreeCheckout({ scheduleId, amount, onSuccess, variant = 'default', size = 'sm' }: CashfreeCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      // 1. Create order on server
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // 2. Initialize Cashfree Checkout
      // Note: We need a client-side wrapper since Cashfree JS is loaded dynamically
      const cf = await cashfree.initialize();
      
      if (cf) {
        let checkoutOptions = {
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_modal",
        };
        cf.checkout(checkoutOptions).then((result: any) => {
          if (result.error) {
            toast.error(result.error.message);
          }
          if (result.redirect) {
            // User will be redirected
          }
          if (result.paymentDetails) {
            toast.success('Payment successful!');
            if (onSuccess) onSuccess();
          }
        });
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handlePay} 
      disabled={loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      Pay Online (₹{amount.toLocaleString('en-IN')})
    </Button>
  );
}
