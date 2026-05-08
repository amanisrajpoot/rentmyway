'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Loader2, LogOut } from 'lucide-react';
import { createMoveOutRequest } from '@/lib/actions/tenant-self-service';
import { toast } from 'sonner';

interface MoveOutDialogProps {
  tenantId: string;
  propertyId: string;
  brokerId: string;
  noticePeriodDays: number;
}

export function MoveOutDialog({ tenantId, propertyId, brokerId, noticePeriodDays }: MoveOutDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + noticePeriodDays);
  const minDateStr = minDate.toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      await createMoveOutRequest({
        tenant_id: tenantId,
        property_id: propertyId,
        broker_id: brokerId,
        requested_date: fd.get('requested_date') as string,
        notice_served_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        broker_notes: fd.get('reason') as string || null,
        keys_returned: false,
        property_inspected: false,
        dues_cleared: false,
        deposit_refunded: false,
        deposit_refund_amount: null,
        deductions: 0,
        deduction_reason: null,
      });
      toast.success('Move-out request submitted');
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full text-red-400 hover:text-red-500 hover:bg-red-500/5 border-red-500/20" />}>
        <LogOut className="h-4 w-4 mr-2" />
        Request Move-out
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Move-out</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200/80 leading-relaxed">
            Note: Your lease requires a <strong>{noticePeriodDays} day notice period</strong>. 
            The earliest you can request to move out is {minDate.toLocaleDateString()}.
          </div>
          <div className="space-y-2">
            <Label>Requested Move-out Date *</Label>
            <Input 
              name="requested_date" 
              type="date" 
              required 
              min={minDateStr}
              defaultValue={minDateStr}
            />
          </div>
          <div className="space-y-2">
            <Label>Reason for Leaving (Optional)</Label>
            <Textarea 
              name="reason" 
              placeholder="e.g. Relocating for work, buying own house..." 
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-red-500 hover:bg-red-600 text-white">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
