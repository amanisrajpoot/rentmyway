'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { MaintenanceSchedule } from '@/types/database';
import { COMPLAINT_CATEGORY_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { format, isPast, addMonths, addYears, addDays } from 'date-fns';
import {
  Wrench, CalendarClock, Plus, Search, Building2, Phone, User,
  CheckCircle, AlertTriangle, IndianRupee, Loader2, MoreVertical,
} from 'lucide-react';
import { createMaintenanceSchedule, completeMaintenanceTask } from '@/lib/actions/maintenance';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const categoryIcons: Record<string, any> = {
  plumbing: 'Droplets',
  electrical: 'Zap',
  appliance: 'Cpu',
  cleaning: 'Wind',
  pest_control: 'Bug',
  painting: 'Paintbrush',
  security: 'Shield',
  structural: 'Home',
  other: 'Wrench',
};

export function MaintenanceClient({ initialSchedule }: { initialSchedule: MaintenanceSchedule[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('properties').select('id, title').order('title');
      setProperties(data || []);
    }
    load();
  }, []);

  const filtered = initialSchedule.filter((item) =>
    !search ||
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.property?.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      await createMaintenanceSchedule({
        property_id: selectedProperty,
        broker_id: '', // Set by action
        title: fd.get('title') as string,
        description: fd.get('description') as string || null,
        category: fd.get('category') as any || 'other',
        frequency: fd.get('frequency') as any,
        next_due: fd.get('next_due') as string,
        estimated_cost: parseFloat(fd.get('estimated_cost') as string) || null,
        vendor_name: fd.get('vendor_name') as string || null,
        vendor_phone: fd.get('vendor_phone') as string || null,
        is_active: true,
        last_completed: null,
        custom_days: fd.get('custom_days') ? parseInt(fd.get('custom_days') as string) : null,
      });
      toast.success('Maintenance task scheduled');
      setDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(item: MaintenanceSchedule) {
    const nextDue = new Date(item.next_due);
    let newDate;
    switch (item.frequency) {
      case 'monthly': newDate = addMonths(nextDue, 1); break;
      case 'quarterly': newDate = addMonths(nextDue, 3); break;
      case 'half_yearly': newDate = addMonths(nextDue, 6); break;
      case 'yearly': newDate = addYears(nextDue, 1); break;
      case 'custom': newDate = addDays(nextDue, item.custom_days || 30); break;
      default: newDate = addMonths(nextDue, 1);
    }

    try {
      await completeMaintenanceTask(item.id, item.estimated_cost || 0, newDate.toISOString().split('T')[0]);
      toast.success('Task marked as completed');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage recurring property maintenance and inspections
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Task
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Maintenance Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select value={selectedProperty} onValueChange={(val) => setSelectedProperty(val ?? '')} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Title *</Label>
                  <Input name="title" required placeholder="A/C Servicing" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select name="frequency" defaultValue="monthly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half_yearly">Half Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="custom">Custom Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Next Due Date *</Label>
                  <Input name="next_due" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Est. Cost (₹)</Label>
                  <Input name="estimated_cost" type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Vendor Name</Label>
                  <Input name="vendor_name" placeholder="Contact person" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" placeholder="Notes for the vendor" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Schedule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Tasks</p>
              <p className="text-xl font-bold">{initialSchedule.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Due Soon</p>
              <p className="text-xl font-bold">
                {initialSchedule.filter(i => {
                  const days = Math.floor((new Date(i.next_due).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  return days >= 0 && days <= 7;
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overdue</p>
              <p className="text-xl font-bold">
                {initialSchedule.filter(i => isPast(new Date(i.next_due))).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by task or property..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Schedule List */}
      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No maintenance tasks scheduled</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add recurring maintenance tasks to stay on top of property health.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 stagger-children">
          {filtered.map((item) => {
            const overdue = isPast(new Date(item.next_due));
            return (
              <Card key={item.id} className={`border-border/50 hover:border-primary/20 transition-all ${overdue ? 'ring-1 ring-red-500/10' : ''}`}>
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl bg-muted shrink-0 ${overdue ? 'text-red-400' : 'text-primary'}`}>
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{item.title}</h3>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {item.frequency}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {item.property?.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 sm:text-right">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Next Due</p>
                        <p className={`font-semibold ${overdue ? 'text-red-400' : 'text-foreground'}`}>
                          {format(new Date(item.next_due), 'dd MMM yyyy')}
                        </p>
                      </div>
                      {item.vendor_name && (
                        <div className="space-y-0.5 hidden md:block">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Vendor</p>
                          <p className="text-sm font-medium">{item.vendor_name}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => handleComplete(item)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
