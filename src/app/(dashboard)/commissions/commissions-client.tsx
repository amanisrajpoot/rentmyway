'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PieChart, Plus, Trash2, Search, Building2, User, 
  Users, Loader2, Calendar, IndianRupee, Wallet,
  TrendingUp, Clock, CheckCircle2, MoreVertical,
  ChevronRight,
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { createCommission, updateCommission, deleteCommission } from '@/lib/actions/commissions';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PDFGenerator } from '@/lib/utils/pdf-generator';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';

export function CommissionsClient({ initialCommissions, stats }: { initialCommissions: any[], stats: any }) {
  const router = useRouter();
  const [commissions, setCommissions] = useState(initialCommissions);

  useEffect(() => {
    setCommissions(initialCommissions);
  }, [initialCommissions]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  const [selectedProperty, setSelectedProperty] = useState('');
  const [commType, setCommType] = useState('one_month_rent');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: props },
        { data: tens },
        { data: owns }
      ] = await Promise.all([
        supabase.from('properties').select('id, title, owner_id').order('title'),
        supabase.from('tenants').select('id, name').order('name'),
        supabase.from('owners').select('id, name').order('name')
      ]);
      setProperties(props || []);
      setTenants(tens || []);
      setOwners(owns || []);
    }
    load();
  }, []);

  const filtered = commissions.filter(c => 
    !search || 
    c.tenant?.name.toLowerCase().includes(search.toLowerCase()) ||
    c.property?.title.toLowerCase().includes(search.toLowerCase()) ||
    c.owner?.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const prop = properties.find(p => p.id === fd.get('property_id'));
      
      const data = {
        property_id: fd.get('property_id') as string,
        tenant_id: fd.get('tenant_id') as string,
        owner_id: prop?.owner_id,
        commission_type: fd.get('commission_type') as any,
        commission_value: parseFloat(fd.get('commission_value') as string),
        computed_amount: parseFloat(fd.get('computed_amount') as string),
        deal_date: fd.get('deal_date') as string,
        notes: fd.get('notes') as string || null,
        status: 'pending',
      };

      await createCommission(data as any);
      toast.success('Commission recorded');
      setDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    try {
      await updateCommission(id, { status: status as any });
      toast.success('Status updated');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteCommission(id);
      toast.success('Record deleted');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Broker Commissions"
        description="Track and manage deal commissions and payouts"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Plus className="h-4 w-4 mr-2" />
            Record Commission
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record New Deal Commission</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property *</Label>
                  <Select name="property_id" onValueChange={(val: string | null) => setSelectedProperty(val || '')} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property">
                        {(value) => {
                          if (!value) return null;
                          const prop = properties.find(p => p.id === value);
                          return prop ? prop.title : null;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tenant *</Label>
                  <Select name="tenant_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant">
                        {(value) => {
                          if (!value) return null;
                          const t = tenants.find(x => x.id === value);
                          return t ? t.name : null;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Comm. Type</Label>
                  <Select name="commission_type" value={commType} onValueChange={(val: string | null) => setCommType(val || 'one_month_rent')}>
                    <SelectTrigger>
                      <SelectValue>
                        {(value) => {
                          if (!value) return null;
                          const types: Record<string, string> = {
                            one_month_rent: 'One Month Rent',
                            percentage: 'Percentage (%)',
                            fixed: 'Fixed Amount'
                          };
                          return types[value] || null;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_month_rent">One Month Rent</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deal Date</Label>
                  <Input name="deal_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{commType === 'percentage' ? 'Percentage (%)' : 'Comm. Value'}</Label>
                  <Input name="commission_value" type="number" step="0.01" required placeholder="e.g. 15000" />
                </div>
                <div className="space-y-2">
                  <Label>Computed Amount (₹) *</Label>
                  <Input name="computed_amount" type="number" required placeholder="Total ₹ to receive" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input name="notes" placeholder="Deal specifics, payout terms..." />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Record Deal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <PageContent>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">₹{stats.total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Received</p>
              <p className="text-xl font-bold">₹{stats.received.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Pending Payouts</p>
              <p className="text-xl font-bold">₹{stats.pending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      </PageContent>

      <PageToolbar>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search deals..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
        </div>
      </PageToolbar>

      <PageContent className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-20 text-center">
              <PieChart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">No deals recorded yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Record your first commission to start tracking revenue.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((c) => (
            <Card key={c.id} className="border-border/50 group hover:border-primary/20 transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 rounded-xl bg-muted shrink-0 text-primary">
                      <IndianRupee className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">₹{c.computed_amount.toLocaleString()}</h3>
                        <Badge variant={c.status === 'received' ? 'default' : 'secondary'} className={cn(
                          "text-[10px] uppercase h-4 px-1.5",
                          c.status === 'received' ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-none' : ''
                        )}>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          {c.property?.title}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          {c.tenant?.name}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(c.deal_date), 'dd MMM yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-none pt-4 md:pt-0">
                    <div className="hidden lg:block text-right mr-4">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Commission Type</p>
                      <p className="text-sm font-medium capitalize">{c.commission_type.replace(/_/g, ' ')}</p>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon-xs"
                      onClick={() => PDFGenerator.generateCommissionInvoice({
                        invoiceNo: c.id.slice(0, 8).toUpperCase(),
                        date: format(new Date(), 'dd MMM yyyy'),
                        ownerName: (c as any).owner?.name || 'N/A',
                        propertyName: c.property?.title || 'N/A',
                        tenantName: c.tenant?.name || 'N/A',
                        commissionType: c.commission_type,
                        commissionValue: c.commission_value,
                        computedAmount: c.computed_amount,
                        dealDate: format(new Date(c.deal_date), 'dd MMM yyyy'),
                        notes: c.notes || undefined
                      })}
                      title="Download Invoice"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="outline" size="sm" className="ml-auto md:ml-0 h-8 gap-2">
                          Manage Status
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusUpdate(c.id, 'received')}>
                          Mark as Received
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusUpdate(c.id, 'invoiced')}>
                          Mark as Invoiced
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusUpdate(c.id, 'pending')}>
                          Mark as Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(c.id)}
                          className="text-red-400 focus:text-red-400"
                        >
                          Delete Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </PageContent>
    </PageLayout>
  );
}
