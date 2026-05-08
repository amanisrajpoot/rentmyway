'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { 
  IndianRupee, Banknote, Building2, User, Plus, Loader2, Download,
  Wallet, CheckCircle2, Clock
} from 'lucide-react';
import { recordPayment } from '@/lib/actions/payments';
import { markPayoutAsPaid } from '@/lib/actions/owner-payouts';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PDFGenerator } from '@/lib/utils/pdf-generator';
import { cn } from '@/lib/utils';

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

export function PaymentsClient({ 
  initialPayments, 
  initialPayouts 
}: { 
  initialPayments: PaymentWithJoins[],
  initialPayouts: any[]
}) {
  const router = useRouter();
  const totalCollected = initialPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPayouts = initialPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = initialPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('collections');
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
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPayoutPaid(id: string) {
    if (!confirm('Mark this payout as completed?')) return;
    try {
      const date = new Date().toISOString().split('T')[0];
      await markPayoutAsPaid(id, date, 'bank_transfer');
      toast.success('Payout marked as paid');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track rent collections and owner settlements
          </p>
        </div>
        <div className="flex gap-2">
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
                          {t.name} ({(t.property as any)?.title || 'No Property'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (₹) *</Label>
                    <Input name="amount" type="number" required defaultValue={activeTenant?.rent_amount || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>For Month *</Label>
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border/50 p-1">
          <TabsTrigger value="collections" className="px-6">Rent Collections</TabsTrigger>
          <TabsTrigger value="payouts" className="px-6">Owner Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-6 outline-none">
          {/* Summary card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.60_0.2_140)] to-[oklch(0.65_0.19_160)] opacity-[0.06]" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[oklch(0.60_0.2_140)] to-[oklch(0.65_0.19_160)]">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-bold">{initialPayments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments table */}
          {initialPayments.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-20 text-center">
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
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialPayments.map((payment) => (
                    <TableRow key={payment.id} className="animate-fade-in group">
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
                        <Badge className={cn("capitalize font-normal", modeColors[payment.payment_mode || 'other'])}>
                          {(payment.payment_mode || 'other').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon-xs" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => PDFGenerator.generateRentReceipt({
                            receiptNo: payment.id.slice(0, 8).toUpperCase(),
                            date: format(new Date(payment.payment_date), 'dd MMM yyyy'),
                            tenantName: payment.tenant?.name || 'N/A',
                            propertyName: payment.property?.title || 'N/A',
                            propertyAddress: (payment as any).property?.locality || 'N/A',
                            amount: payment.amount,
                            monthYear: payment.month_year,
                            paymentMode: payment.payment_mode,
                            notes: payment.notes || undefined
                          })}
                          title="Download Receipt"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.60_0.2_140)] to-[oklch(0.65_0.19_160)] opacity-[0.06]" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[oklch(0.60_0.2_140)] to-[oklch(0.65_0.19_160)]">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid to Owners</p>
                    <p className="text-2xl font-bold flex items-center gap-0.5">
                      <IndianRupee className="h-5 w-5" />
                      {totalPayouts.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 relative overflow-hidden ring-1 ring-amber-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.06]" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Settlements</p>
                    <p className="text-2xl font-bold flex items-center gap-0.5 text-amber-600">
                      <IndianRupee className="h-5 w-5" />
                      {pendingPayouts.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {initialPayouts.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-20 text-center">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg">No payouts history</h3>
                <p className="text-muted-foreground text-sm mt-1">Payouts are generated automatically when rent is collected.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>For Month</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialPayouts.map((p) => (
                    <TableRow key={p.id} className="animate-fade-in group">
                      <TableCell className="font-medium uppercase">{p.for_month}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{p.owner?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{p.property?.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold flex items-center gap-0.5">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {p.amount.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className={cn(
                          p.status === 'paid' ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-none' : 'text-amber-500 border-amber-500/20'
                        )}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === 'pending' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                            onClick={() => handleMarkPayoutPaid(p.id)}
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Paid on {p.payment_date ? format(new Date(p.payment_date), 'dd MMM') : 'N/A'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
