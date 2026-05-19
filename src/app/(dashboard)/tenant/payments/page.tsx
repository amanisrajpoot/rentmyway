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
import { ReceiptDownloadButton } from '@/components/tenant/receipt-button';

const modeLabels: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card',
  other: 'Other',
};

const modeColors: Record<string, string> = {
  cash: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  upi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bank_transfer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  credit_card: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  other: 'bg-muted text-muted-foreground',
};

export default async function TenantPaymentsPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const supabase = await createClient();

  // Find active tenant record by email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('email', profile.email)
    .eq('is_active', true)
    .single();

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Banknote className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Tenant Record Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn't find an active tenant record for your account.
        </p>
      </div>
    );
  }

  const { data: payments } = await supabase
    .from('rent_payments')
    .select('*, property:properties(title, address, locality, city)')
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
            <p className="text-3xl font-bold mt-2 text-emerald-500 flex items-center">
              <IndianRupee className="h-7 w-7" />
              {totalPaid.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Transactions</p>
            <p className="text-3xl font-bold mt-2">{pastPayments.length}</p>
          </CardContent>
        </Card>
      </div>

      {pastPayments.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Banknote className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg">No payments recorded</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
              You haven't made any rent payments yet or they haven't been recorded by your broker.
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
                <TableHead className="w-[100px] text-right">Receipt</TableHead>
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
                  <TableCell className="text-right">
                    <ReceiptDownloadButton payment={payment as any} tenantName={tenant.name} />
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
