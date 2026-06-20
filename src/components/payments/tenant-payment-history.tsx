'use client';

import { useState, useEffect } from 'react';
import { getPaymentsByTenant } from '@/lib/actions/payments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { History, Loader2, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TenantPaymentHistoryProps {
  tenantId: string;
  tenantName: string;
  trigger?: React.ReactNode;
}

const modeColors: Record<string, string> = {
  cash: 'bg-emerald-500/15 text-emerald-400',
  upi: 'bg-purple-500/15 text-purple-400',
  bank_transfer: 'bg-blue-500/15 text-blue-400',
  cheque: 'bg-amber-500/15 text-amber-400',
  other: 'bg-muted text-muted-foreground',
};

export function TenantPaymentHistory({ tenantId, tenantName, trigger }: TenantPaymentHistoryProps) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tenantId) {
      loadHistory();
    }
  }, [open, tenantId]);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await getPaymentsByTenant(tenantId);
      if (res.data) setPayments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <History className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment History: {tenantName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No payments found for this tenant.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border border-border/50">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>For Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {format(new Date(p.payment_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {p.month_year}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-emerald-500 tabular-nums flex items-center">
                        <IndianRupee className="h-3 w-3 mr-0.5" />
                        {p.amount.toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${modeColors[p.payment_mode] || modeColors.other}`}>
                        {p.payment_mode.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {p.status || 'Completed'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
