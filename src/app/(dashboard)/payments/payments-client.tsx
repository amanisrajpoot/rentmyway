'use client';

import type { RentPayment } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { IndianRupee, Banknote, Building2, User } from 'lucide-react';

type PaymentWithJoins = RentPayment & {
  tenant?: { name: string; phone: string } | null;
  property?: { title: string; locality: string } | null;
};

const modeLabels: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
};

const modeColors: Record<string, string> = {
  cash: 'bg-emerald-500/15 text-emerald-400',
  upi: 'bg-purple-500/15 text-purple-400',
  bank_transfer: 'bg-blue-500/15 text-blue-400',
  cheque: 'bg-amber-500/15 text-amber-400',
  other: 'bg-muted text-muted-foreground',
};

export function PaymentsClient({ initialPayments }: { initialPayments: PaymentWithJoins[] }) {
  const totalCollected = initialPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rent Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track rent collection history
        </p>
      </div>

      {/* Summary card */}
      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] opacity-[0.06]" />
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)]">
              <Banknote className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold flex items-center gap-0.5">
                <IndianRupee className="h-5 w-5" />
                {totalCollected.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{initialPayments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments table */}
      {initialPayments.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No payments recorded</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Record rent payments from the tenant detail page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialPayments.map((payment) => (
                <TableRow key={payment.id} className="animate-fade-in">
                  <TableCell className="font-medium">{payment.month_year}</TableCell>
                  <TableCell>
                    {payment.tenant && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{payment.tenant.name}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.property && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{payment.property.title}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold flex items-center gap-0.5">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {payment.amount.toLocaleString('en-IN')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {payment.payment_mode && (
                      <Badge className={modeColors[payment.payment_mode]}>
                        {modeLabels[payment.payment_mode]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
