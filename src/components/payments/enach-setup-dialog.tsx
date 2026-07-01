'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createMandate } from '@/lib/actions/enach';
import { Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cashfree } from '@/lib/cashfree-client';

interface EnachSetupDialogProps {
  tenantId: string;
  tenantName: string;
  maxAmount: number;
}

export function EnachSetupDialog({ tenantId, tenantName, maxAmount }: EnachSetupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await createMandate(tenantId, maxAmount);
      if (res.error) throw new Error(res.error);

      if (res.isMock) {
        toast.success('Test Mandate Initiated! (Mock Mode)');
        setOpen(false);
        return;
      }

      const cf = await cashfree.initialize();
      if (cf && res.paymentSessionId) {
        let checkoutOptions = {
          paymentSessionId: res.paymentSessionId,
          redirectTarget: "_modal",
        };
        cf.checkout(checkoutOptions).then((result: any) => {
          if (result.error) {
            toast.error(result.error.message);
          }
          if (result.paymentDetails) {
            toast.success('Auto-pay setup successful!');
            setOpen(false);
          }
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to setup auto-pay');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <RefreshCcw className="w-4 h-4 text-blue-600" />
        Setup Auto-Pay
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setup Auto-Pay (E-NACH)</DialogTitle>
          <DialogDescription>
            Register a mandate to automatically debit rent from {tenantName}'s bank account every month.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-blue-50 text-blue-900 p-4 rounded-md text-sm border border-blue-100">
            <p className="font-semibold mb-1">Mandate Details</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Max Debit Limit: <strong>₹{maxAmount.toLocaleString('en-IN')}</strong></li>
              <li>Frequency: <strong>Monthly</strong></li>
              <li>Purpose: Rent Payment</li>
            </ul>
          </div>
          
          <Button onClick={handleSetup} disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Proceed to Bank Auth
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
