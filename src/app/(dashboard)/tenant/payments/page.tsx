import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { IndianRupee, Banknote, Building2 } from 'lucide-react';

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

export default async function TenantPaymentsPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const supabase = await createClient();

  // Find active tenant record by email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('email', profile.email)
    .single();

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Banknote className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Rent Profile Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn't find your tenant record.
        </p>
      </div>
    );
  }

  const { data: payments } = await supabase
    .from('rent_payments')
    .select('*, property:properties(title)')
    .eq('tenant_id', tenant.id)
    .order('payment_date', { ascending: false });

  const pastPayments = payments || [];
  const totalPaid = pastPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your past rent payments.
        </p>
      </div>

      <Card className="border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.15_80)] to-[oklch(0.60_0.14_60)] opacity-[0.06]" />
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.15_80)] to-[oklch(0.60_0.14_60)]">
              <Banknote className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold flex items-center gap-0.5">
                <IndianRupee className="h-5 w-5" />
                {totalPaid.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{pastPayments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {pastPayments.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No payments yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Your rent payment history will appear here once recorded by your broker.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastPayments.map((payment) => (
                <TableRow key={payment.id} className="animate-fade-in">
                  <TableCell className="font-medium">{payment.month_year}</TableCell>
                  <TableCell>
                    {payment.property && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{(payment.property as any).title}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold flex items-center gap-0.5 text-emerald-500">
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
