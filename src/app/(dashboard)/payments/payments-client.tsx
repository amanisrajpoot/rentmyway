'use client';

import { useState, useEffect } from 'react';
import type { RentPayment } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { IndianRupee, Banknote, Building2, User, Plus, Loader2 } from 'lucide-react';
import { recordPayment } from '@/lib/actions/payments';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<{ id: string; name: string; property_id: string; rent_amount: number; property?: { title: string } | { title: string }[] }[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('tenants')
        .select('id, name, property_id, rent_amount, property:properties(title)')
        .eq('is_active', true)
        .order('name');
      setTenants(data || []);
    }
    load();
  }, []);

  const activeTenant = tenants.find(t => t.id === selectedTenant);

  async function handleRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTenant || !activeTenant) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      await recordPayment({
        tenant_id: selectedTenant,
        property_id: activeTenant.property_id,
        amount: parseFloat(fd.get('amount') as string),
        payment_date: fd.get('payment_date') as string,
        payment_mode: paymentMode as any,
        month_year: fd.get('month_year') as string,
        notes: (fd.get('notes') as string) || null,
      });
      toast.success('Payment recorded');
      setDialogOpen(false);
      // Refresh
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rent Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track rent collection history
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Rent Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecord} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Tenant *</Label>
                <Select value={selectedTenant} onValueChange={(val) => setSelectedTenant(val ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {Array.isArray(t.property) ? t.property[0]?.title : (t.property as any)?.title || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    name="amount"
                    type="number"
                    required
                    defaultValue={activeTenant?.rent_amount || ''}
                    placeholder="25000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Month/Year *</Label>
                  <Input name="month_year" required placeholder="May 2026" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input name="payment_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={paymentMode} onValueChange={(val) => setPaymentMode(val ?? 'upi')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(modeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input name="notes" placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Record
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              Use the &quot;Record Payment&quot; button to log your first rent collection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
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
