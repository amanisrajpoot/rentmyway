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
  Wallet, CheckCircle2, Clock, Search, Phone
} from 'lucide-react';
import { recordPayment, getPayments } from '@/lib/actions/payments';
import { markPayoutAsPaid, getOwnerPayouts } from '@/lib/actions/owner-payouts';
import { runRentAutomation } from '@/lib/actions/rent-schedule';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PDFGenerator } from '@/lib/utils/pdf-generator';
import { cn } from '@/lib/utils';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { exportToCSV } from '@/lib/utils/export';
import { TenantFormDialog } from '@/components/tenant/tenant-form-dialog';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkImportDialog } from '@/components/ui/bulk-import-dialog';
import { bulkRecordPayments } from '@/lib/actions/payments';
import { TenantPaymentHistory } from '@/components/payments/tenant-payment-history';
import { CollectionSummary } from '@/components/payments/collection-summary';

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
  initialPayouts,
  stats,
  initialSchedules,
  initialFilters
}: { 
  initialPayments: PaymentWithJoins[];
  initialPayouts: any[];
  stats: {
    totalCollected: number;
    totalPayouts: number;
    pendingPayouts: number;
    totalCollectionsCount: number;
    totalPayoutsCount: number;
  };
  initialSchedules: any[];
  initialFilters: {
    search: string;
    status: string;
  };
}) {
  const router = useRouter();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('collections');
  const [tenants, setTenants] = useState<{ id: string; name: string; property_id: string; rent_amount: number; property?: { title: string } | { title: string }[] }[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [isPartial, setIsPartial] = useState(false);

  // URL search and status state
  const [search, setSearch] = useState(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);

  // Collections paginated/accumulated state
  const [payments, setPayments] = useState<PaymentWithJoins[]>(initialPayments);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [paymentsHasMore, setPaymentsHasMore] = useState(initialPayments.length >= 12);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Payouts paginated/accumulated state
  const [payouts, setPayouts] = useState<any[]>(initialPayouts);
  const [payoutsPage, setPayoutsPage] = useState(0);
  const [payoutsHasMore, setPayoutsHasMore] = useState(initialPayouts.length >= 12);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  // Rent Schedules state
  const [schedules, setSchedules] = useState<any[]>(initialSchedules || []);
  const [runningAutomation, setRunningAutomation] = useState(false);

  // Load active tenants for "Record Payment" modal
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

  // Sync states if server-side props change
  useEffect(() => {
    setPayments(initialPayments);
    setPaymentsPage(0);
    setPaymentsHasMore(initialPayments.length >= 12);
  }, [initialPayments]);

  useEffect(() => {
    setPayouts(initialPayouts);
    setPayoutsPage(0);
    setPayoutsHasMore(initialPayouts.length >= 12);
  }, [initialPayouts]);

  useEffect(() => {
    setSchedules(initialSchedules || []);
  }, [initialSchedules]);

  async function handleRunAutomation() {
    setRunningAutomation(true);
    try {
      const res = await runRentAutomation();
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      toast.success(`Automation scan completed! ${res.data?.updatedCount || 0} schedule(s) marked overdue and notifications sent.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger reminders automation scan');
    } finally {
      setRunningAutomation(false);
    }
  }

  const handleExportCSV = () => {
    if (activeTab === 'collections') {
      const dataToExport = payments.map((p) => ({
        Month: p.month_year,
        Tenant: p.tenant?.name || 'N/A',
        Property: p.property?.title || 'N/A',
        Amount: p.amount,
        Mode: p.payment_mode || 'other',
        Date: p.payment_date,
        Notes: p.notes || '',
      }));
      exportToCSV(dataToExport, `Rent_Collections_Report_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeTab === 'payouts') {
      const dataToExport = payouts.map((p) => ({
        Month: p.for_month,
        Owner: p.owner?.name || 'N/A',
        Property: p.property?.title || 'N/A',
        Amount: p.amount,
        Status: p.status,
        Date: p.payment_date || 'N/A',
      }));
      exportToCSV(dataToExport, `Owner_Payouts_Report_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const dataToExport = schedules.map((s) => ({
        Month: s.month_year,
        Tenant: s.tenant?.name || 'N/A',
        Property: s.property?.title || 'N/A',
        ExpectedAmount: s.expected_amount,
        DueDate: s.due_date,
        Status: s.status,
      }));
      exportToCSV(dataToExport, `Rent_Schedules_Report_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  // Debounced URL updates
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      
      if (search) params.set('search', search);
      else params.delete('search');

      if (statusFilter !== 'all') params.set('status', statusFilter);
      else params.delete('status');

      router.replace(`${window.location.pathname}?${params.toString()}`);
    }, 400);

    return () => clearTimeout(handler);
  }, [search, statusFilter, router]);

  const loadMorePayments = async () => {
    if (paymentsLoading) return;
    setPaymentsLoading(true);
    try {
      const nextPage = paymentsPage + 1;
      const nextPaymentsRes = await getPayments({
        search,
        page: nextPage,
        limit: 12,
      });

      if ('error' in nextPaymentsRes && nextPaymentsRes.error) {
        toast.error(nextPaymentsRes.error);
        return;
      }
      const nextPayments = 'data' in nextPaymentsRes && nextPaymentsRes.data ? nextPaymentsRes.data : [];

      if (nextPayments.length < 12) {
        setPaymentsHasMore(false);
      }
      setPayments((prev) => [...prev, ...(nextPayments as PaymentWithJoins[])]);
      setPaymentsPage(nextPage);
    } catch {
      toast.error('Failed to load more payments due to an unexpected error');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadMorePayouts = async () => {
    if (payoutsLoading) return;
    setPayoutsLoading(true);
    try {
      const nextPage = payoutsPage + 1;
      const nextPayoutsRes = await getOwnerPayouts({
        search,
        status: statusFilter,
        page: nextPage,
        limit: 12,
      });

      if ('error' in nextPayoutsRes && nextPayoutsRes.error) {
        toast.error(nextPayoutsRes.error);
        return;
      }
      
      const nextPayouts = 'data' in nextPayoutsRes && nextPayoutsRes.data ? nextPayoutsRes.data : [];

      if (nextPayouts.length < 12) {
        setPayoutsHasMore(false);
      }
      setPayouts((prev) => [...prev, ...nextPayouts]);
      setPayoutsPage(nextPage);
    } catch {
      toast.error('Failed to load more payouts due to an unexpected error');
    } finally {
      setPayoutsLoading(false);
    }
  };

  const activeTenant = tenants.find(t => t.id === selectedTenant);

  const handleTenantCreated = (tenant: any) => {
    // Add to tenants and select
    setTenants(prev => [...prev, {
      id: tenant.id,
      name: tenant.name,
      property_id: tenant.property_id,
      rent_amount: tenant.rent_amount,
      property: { title: 'New Tenant (Reload Required)' }
    }]);
    setSelectedTenant(tenant.id);
  };

  async function handleRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTenant || !activeTenant) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await recordPayment({
        tenant_id: selectedTenant,
        property_id: activeTenant.property_id,
        amount: parseFloat(fd.get('amount') as string),
        payment_date: fd.get('payment_date') as string,
        payment_mode: paymentMode as any,
        month_year: fd.get('month_year') as string,
        notes: (fd.get('notes') as string) + (isPartial ? ' [Partial Payment]' : '') || null,
        status: isPartial ? 'partial' : 'paid',
      });
      
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      
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
      const res = await markPayoutAsPaid(id, date, 'bank_transfer');
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      toast.success('Payout marked as paid');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Financial Management"
        description="Track rent collections and owner settlements"
      >
        <Button 
          onClick={handleRunAutomation}
          disabled={runningAutomation}
          variant="outline"
          className="border-primary/20 hover:bg-primary/5 text-primary w-full sm:w-auto"
        >
          {runningAutomation ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Clock className="h-4 w-4 mr-2" />
          )}
          Scan & Remind
        </Button>

        <Button 
          onClick={handleExportCSV}
          variant="outline"
          className="border-primary/20 hover:bg-primary/5 text-primary w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>

        <BulkImportDialog
          title="Import Payments"
          description="Upload a CSV file to bulk record rent payments."
          templateHeaders={['tenant_id', 'property_id', 'amount', 'payment_date', 'payment_mode', 'reference_number', 'notes']}
          templateData={[
            { tenant_id: '123e4567-e89b-12d3-a456-426614174000', property_id: 'optional-property-id', amount: '25000', payment_date: '2026-05-01', payment_mode: 'upi', reference_number: 'UPI12345678', notes: 'May rent' }
          ]}
          templateFilename="payments_import_template.csv"
          onImport={bulkRecordPayments}
          onSuccess={() => {
            setPaymentsPage(0);
            setPaymentsHasMore(true);
            router.refresh();
          }}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Plus className="h-4 w-4 mr-2" />
            Record Rent Payment
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Rent Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecord} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Tenant *</Label>
                <div className="flex gap-2">
                  <Select value={selectedTenant} onValueChange={(val) => setSelectedTenant(val ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tenant">
                        {(value) => {
                          if (!value) return null;
                          const t = tenants.find(x => x.id === value);
                          if (!t) return null;
                          const propTitle = (t.property as any)?.title || 'No Property';
                          return `${t.name} (${propTitle})`;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => {
                      const propTitle = (t.property as any)?.title || 'No Property';
                      return (
                        <SelectItem key={t.id} value={t.id} label={`${t.name} (${propTitle})`}>
                          {`${t.name} (${propTitle})`}
                        </SelectItem>
                      );
                    })}
                    </SelectContent>
                  </Select>
                  <TenantFormDialog onSuccess={handleTenantCreated} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input key={`amount-${activeTenant?.id || 'empty'}`} name="amount" type="number" required defaultValue={activeTenant?.rent_amount || ''} />
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
              <div className="flex items-center space-x-2 pt-1 pb-2">
                <Checkbox id="partial" checked={isPartial} onCheckedChange={(checked) => setIsPartial(!!checked)} />
                <Label htmlFor="partial" className="font-normal text-sm">This is a partial payment</Label>
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
      </PageHeader>

      <PageToolbar>
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search financial records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        {activeTab === 'payouts' && (
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-full sm:w-[160px] bg-card">
              <SelectValue placeholder="All Payout Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payout Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        )}
      </PageToolbar>

      <PageContent>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border/50 p-1 flex w-full overflow-x-auto sm:w-auto h-auto">
          <TabsTrigger value="collections" className="px-6 py-2 flex-1 sm:flex-none whitespace-nowrap">Rent Collections</TabsTrigger>
          <TabsTrigger value="payouts" className="px-6 py-2 flex-1 sm:flex-none whitespace-nowrap">Owner Payouts</TabsTrigger>
          <TabsTrigger value="schedules" className="px-6 py-2 flex-1 sm:flex-none whitespace-nowrap">Rent Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-6 outline-none">
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
                      {stats.totalCollected.toLocaleString('en-IN')}
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
                    <p className="text-2xl font-bold">{stats.totalCollectionsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {payments.length === 0 ? (
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
            <div className="space-y-4">
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
                    {payments.map((p) => (
                      <TableRow key={p.id} className="animate-fade-in group">
                        <TableCell className="font-medium">{p.month_year}</TableCell>
                        <TableCell>
                          {p.tenant && (
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{p.tenant.name || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground">{p.tenant.phone}</span>
                            </div>
                          )}
                          {p.tenant_id && <TenantPaymentHistory tenantId={p.tenant_id} tenantName={p.tenant?.name || 'Unknown'} />}
                        </TableCell>
                        <TableCell>
                          {p.property && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{p.property.title}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold flex items-center gap-0.5">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {p.amount.toLocaleString('en-IN')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize font-normal", modeColors[p.payment_mode || 'other'])}>
                            {(p.payment_mode || 'other').replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(p.payment_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon-xs" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => PDFGenerator.generateRentReceipt({
                              receiptNo: p.id.slice(0, 8).toUpperCase(),
                              date: format(new Date(p.payment_date), 'dd MMM yyyy'),
                              tenantName: p.tenant?.name || 'N/A',
                              propertyName: p.property?.title || 'N/A',
                              propertyAddress: (p as any).property?.locality || 'N/A',
                              amount: p.amount,
                              monthYear: p.month_year,
                              paymentMode: p.payment_mode || 'other',
                              notes: p.notes || undefined
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

              <InfiniteScroll
                hasMore={paymentsHasMore}
                isLoading={paymentsLoading}
                onLoadMore={loadMorePayments}
                loadingText="Loading more collections..."
                endText="All collections loaded"
              />
            </div>
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
                      {stats.totalPayouts.toLocaleString('en-IN')}
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
                      {stats.pendingPayouts.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {payouts.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-20 text-center">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg">No payouts history</h3>
                <p className="text-muted-foreground text-sm mt-1">Payouts are generated automatically when rent is collected.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
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
                    {payouts.map((p) => (
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

              <InfiniteScroll
                hasMore={payoutsHasMore}
                isLoading={payoutsLoading}
                onLoadMore={loadMorePayouts}
                loadingText="Loading more payouts..."
                endText="All payouts loaded"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.06]" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Schedules</p>
                    <p className="text-2xl font-bold">{schedules.filter(s => s.status === 'pending').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 relative overflow-hidden ring-1 ring-red-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-[0.06]" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-600">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue Schedules</p>
                    <p className="text-2xl font-bold text-red-600">{schedules.filter(s => s.status === 'overdue').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.06]" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Schedules</p>
                    <p className="text-2xl font-bold text-emerald-600">{schedules.filter(s => s.status === 'paid').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {schedules.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-20 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg">No rent schedules found</h3>
                <p className="text-muted-foreground text-sm mt-1">Schedules are generated automatically when active leases are created.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>For Month</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Expected Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((s) => {
                      const tenantName = s.tenant?.name || 'Tenant';
                      const phone = s.tenant?.phone ? s.tenant.phone.replace(/[^0-9]/g, '') : '';
                      const propertyTitle = s.property?.title || 'your property';
                      const amount = s.expected_amount;
                      const month = s.month_year;
                      
                      const message = `Hi ${tenantName}, this is a friendly reminder from RentMyWay that the rent of ₹${amount.toLocaleString('en-IN')} for the month of ${month} at ${propertyTitle} is overdue. Please make the payment at your earliest convenience. Thank you!`;
                      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

                      return (
                        <TableRow key={s.id} className="animate-fade-in group">
                          <TableCell className="font-medium uppercase">{month}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{tenantName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{propertyTitle}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold flex items-center gap-0.5">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {amount.toLocaleString('en-IN')}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(s.due_date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.status === 'paid' ? 'default' : 'outline'} className={cn(
                              s.status === 'paid' ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-none' :
                              s.status === 'overdue' ? 'bg-rose-500/15 text-rose-500 hover:bg-rose-500/20 border-none' :
                              'text-amber-500 border-amber-500/20'
                            )}>
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {s.status !== 'paid' && (
                              <div className="flex items-center justify-end gap-2">
                                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 gap-1.5"
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                    Remind
                                  </Button>
                                </a>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setSelectedTenant(s.tenant_id);
                                    setPaymentMode('upi');
                                    setDialogOpen(true);
                                  }}
                                >
                                  Collect
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </PageContent>
    </PageLayout>
  );
}
