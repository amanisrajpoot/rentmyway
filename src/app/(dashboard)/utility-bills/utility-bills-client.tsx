'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UtilityBill } from '@/types/database';
import { BILL_TYPE_LABELS } from '@/types/database';
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
import {
  Zap, Droplets, Flame, Wifi, Wrench, Building2, Plus, Loader2,
  IndianRupee,
} from 'lucide-react';
import { createUtilityBill, updateUtilityBill } from '@/lib/actions/utility-bills';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const billIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  electricity: Zap,
  water: Droplets,
  gas: Flame,
  internet: Wifi,
  maintenance: Wrench,
  society: Building2,
  other: IndianRupee,
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  paid: 'bg-emerald-500/15 text-emerald-400',
  overdue: 'bg-red-500/15 text-red-400',
};

type BillWithJoins = UtilityBill & {
  property?: { id: string; title: string; locality: string } | null;
  tenant?: { id: string; name: string } | null;
};

export function UtilityBillsClient({ initialBills }: { initialBills: BillWithJoins[] }) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string; property_id: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedBillType, setSelectedBillType] = useState('electricity');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [propRes, tenantRes] = await Promise.all([
        supabase.from('properties').select('id, title').order('title'),
        supabase.from('tenants').select('id, name, property_id').eq('is_active', true).order('name'),
      ]);
      setProperties(propRes.data || []);
      setTenants(tenantRes.data || []);
    }
    load();
  }, []);

  const filtered = initialBills.filter((b) => {
    const matchType = typeFilter === 'all' || b.bill_type === typeFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchType && matchStatus;
  });

  const totalAmount = initialBills.reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = initialBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + b.amount, 0);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const matchedTenant = tenants.find(t => t.property_id === selectedProperty);

    try {
      await createUtilityBill({
        property_id: selectedProperty,
        tenant_id: matchedTenant?.id || null,
        broker_id: '',
        bill_type: selectedBillType as any,
        amount: parseFloat(fd.get('amount') as string),
        bill_date: fd.get('bill_date') as string,
        due_date: (fd.get('due_date') as string) || null,
        bill_month: fd.get('bill_month') as string,
        status: 'pending',
        paid_by: null,
        bill_image_url: null,
        notes: (fd.get('notes') as string) || null,
      });
      toast.success('Bill recorded');
      setDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record bill');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await updateUtilityBill(id, { status: 'paid' });
      toast.success('Bill marked as paid');
      router.refresh();
    } catch {
      toast.error('Failed to update');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utility Bills</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track utility expenses across properties
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bill
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Utility Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property *</Label>
                  <Select value={selectedProperty} onValueChange={(val) => setSelectedProperty(val ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bill Type *</Label>
                  <Select value={selectedBillType} onValueChange={(val) => setSelectedBillType(val ?? 'electricity')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BILL_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input name="amount" type="number" required placeholder="1500" />
                </div>
                <div className="space-y-2">
                  <Label>Bill Month *</Label>
                  <Input name="bill_month" required placeholder="May 2026" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bill Date *</Label>
                  <Input name="bill_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input name="due_date" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input name="notes" placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !selectedProperty}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Record
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] opacity-[0.06]" />
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)]">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bills</p>
              <p className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/50 relative overflow-hidden ${pendingAmount > 0 ? 'ring-1 ring-amber-500/20' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.60_0.2_25)] to-[oklch(0.55_0.19_10)] opacity-[0.06]" />
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[oklch(0.60_0.2_25)] to-[oklch(0.55_0.19_10)]">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">₹{pendingAmount.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
          <SelectTrigger className="w-[150px] bg-card">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(BILL_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-[130px] bg-card">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No utility bills</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Start tracking utility expenses using the &quot;Add Bill&quot; button.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bill) => {
                const BillIcon = billIcons[bill.bill_type] || Zap;
                return (
                  <TableRow key={bill.id} className="animate-fade-in">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BillIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{BILL_TYPE_LABELS[bill.bill_type]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bill.property && (
                        <span className="text-sm">{bill.property.title}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{bill.bill_month}</TableCell>
                    <TableCell>
                      <span className="font-semibold flex items-center gap-0.5">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {bill.amount.toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[bill.status]}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bill.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleMarkPaid(bill.id)}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
