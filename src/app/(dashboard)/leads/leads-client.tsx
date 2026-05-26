'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Lead, LeadStatus } from '@/types/database';
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS, LEAD_SOURCE_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { updateLeadStage, convertLead, getLeads } from '@/lib/actions/leads';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Phone, Eye, ChevronRight, ChevronLeft, IndianRupee, MapPin, Loader2,
  Kanban, List, Search, Download,
} from 'lucide-react';
import { PhoneLink } from '@/components/ui/phone-link';
import { Input } from '@/components/ui/input';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { exportToCSV } from '@/lib/utils/export';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';

const stageColors: Record<LeadStatus, string> = {
  new: 'border-t-blue-500',
  contacted: 'border-t-cyan-500',
  site_visit_scheduled: 'border-t-yellow-500',
  site_visit_done: 'border-t-amber-500',
  negotiation: 'border-t-orange-500',
  token_paid: 'border-t-purple-500',
  converted: 'border-t-emerald-500',
  lost: 'border-t-red-500',
};

const stageBadgeColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400',
  contacted: 'bg-cyan-500/15 text-cyan-400',
  site_visit_scheduled: 'bg-yellow-500/15 text-yellow-400',
  site_visit_done: 'bg-amber-500/15 text-amber-400',
  negotiation: 'bg-orange-500/15 text-orange-400',
  token_paid: 'bg-purple-500/15 text-purple-400',
  converted: 'bg-emerald-500/15 text-emerald-400',
  lost: 'bg-red-500/15 text-red-400',
};

interface LeadsClientProps {
  initialLeads: Lead[];
  initialSiteVisits: any[];
  initialFilters: {
    search: string;
    status: string;
  };
}

import { cn } from '@/lib/utils';
import { CalendarWorkspace } from '@/components/leads/calendar-workspace';
import { Calendar as LucideCalendar } from 'lucide-react';

export function LeadsClient({ initialLeads, initialSiteVisits, initialFilters }: LeadsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [search, setSearch] = useState(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialLeads.length >= 12);
  const [isLoading, setIsLoading] = useState(false);

  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);
  const [isDraggingLeadId, setIsDraggingLeadId] = useState<string | null>(null);

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [convertLoading, setConvertLoading] = useState(false);

  useEffect(() => {
    async function loadProperties() {
      const supabase = createClient();
      const { data } = await supabase
        .from('properties')
        .select('id, title')
        .eq('status', 'available')
        .order('title');
      setProperties(data || []);
    }
    loadProperties();
  }, []);

  useEffect(() => {
    setLeads(initialLeads);
    setPage(0);
    setHasMore(initialLeads.length >= 12);
  }, [initialLeads]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (search) params.set('search', search);
      else params.delete('search');

      if (statusFilter !== 'all') params.set('status', statusFilter);
      else params.delete('status');

      router.replace(`${pathname}?${params.toString()}`);
    }, 400);

    return () => clearTimeout(handler);
  }, [search, statusFilter, router, pathname, searchParams]);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const nextLeads = await getLeads({
        search,
        status: statusFilter,
        page: nextPage,
        limit: 12,
      });

      if (nextLeads.length < 12) {
        setHasMore(false);
      }
      setLeads((prev) => [...prev, ...nextLeads]);
      setPage(nextPage);
    } catch {
      toast.error('Failed to load more leads');
    } finally {
      setIsLoading(false);
    }
  };

  async function moveLead(leadId: string, direction: 'forward' | 'backward') {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIdx = LEAD_STAGE_ORDER.indexOf(lead.status);
    const newIdx = direction === 'forward' ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= LEAD_STAGE_ORDER.length) return;

    const newStatus = LEAD_STAGE_ORDER[newIdx];

    if (newStatus === 'converted') {
      setConvertingLeadId(leadId);
      setConvertDialogOpen(true);
      return;
    }

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      await updateLeadStage(leadId, newStatus);
      toast.success(`Moved to ${LEAD_STAGE_LABELS[newStatus]}`);
    } catch {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l))
      );
      toast.error('Failed to update lead stage');
    }
  }

  async function handleConvert() {
    if (!convertingLeadId || !selectedPropertyId) {
      toast.error('Please select a property');
      return;
    }
    setConvertLoading(true);
    try {
      await convertLead(convertingLeadId, selectedPropertyId);
      setLeads((prev) =>
        prev.map((l) => (l.id === convertingLeadId ? { ...l, status: 'converted' as LeadStatus } : l))
      );
      toast.success('Lead converted to tenant successfully!');
      setConvertDialogOpen(false);
      setConvertingLeadId(null);
      setSelectedPropertyId('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setConvertLoading(false);
    }
  }

  async function handleDrop(e: React.DragEvent, targetStatus: LeadStatus) {
    setDraggedOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    if (targetStatus === 'converted') {
      setConvertingLeadId(leadId);
      setConvertDialogOpen(true);
      return;
    }

    const previousStatus = lead.status;
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l))
    );

    try {
      await updateLeadStage(leadId, targetStatus);
      toast.success(`Moved to ${LEAD_STAGE_LABELS[targetStatus]}`);
    } catch {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l))
      );
      toast.error('Failed to update lead stage');
    }
  }

  const grouped = LEAD_STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.status === stage);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const handleExportCSV = () => {
    const dataToExport = leads.map((l) => ({
      Name: l.name,
      Phone: l.phone,
      Email: l.email || '',
      Status: LEAD_STAGE_LABELS[l.status] || l.status,
      Source: LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS] || l.source || '',
      Locality: l.preferred_locality || '',
      MinBudget: l.budget_min || 0,
      MaxBudget: l.budget_max || 0,
      PreferredType: l.preferred_type || '',
      Notes: l.notes || '',
    }));
    exportToCSV(dataToExport, `Leads_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <PageLayout>
      <PageHeader 
        title="Lead Pipeline"
        description="Manage and track active sales inquiries"
      >
        <div className="flex bg-muted p-1 rounded-lg shrink-0 w-full sm:w-auto overflow-x-auto">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3 flex-1 sm:flex-none"
            onClick={() => setViewMode('kanban')}
          >
            <Kanban className="h-4 w-4 mr-1.5" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3 flex-1 sm:flex-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-1.5" />
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3 flex-1 sm:flex-none"
            onClick={() => setViewMode('calendar')}
          >
            <LucideCalendar className="h-4 w-4 mr-1.5" />
            Calendar
          </Button>
        </div>

        <Button 
          onClick={handleExportCSV}
          variant="outline"
          className="border-primary/20 hover:bg-primary/5 text-primary w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>

        <Link 
          href="/leads/new" 
          className={cn(buttonVariants({ size: 'default' }), "w-full sm:w-auto flex-1 sm:flex-initial bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white shadow-lg shadow-primary/20")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Link>
      </PageHeader>

      <PageToolbar>
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search leads by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-[160px] bg-card">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageToolbar>

      <PageContent>
      {leads.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No leads found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Try adjusting your search query or filters.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'calendar' ? (
        <CalendarWorkspace initialVisits={initialSiteVisits} />
      ) : viewMode === 'kanban' ? (
        <div className="w-full overflow-x-auto pb-4 snap-x">
          <div className="flex gap-4 min-w-max px-1">
            {LEAD_STAGE_ORDER.map((stage) => (
              <div key={stage} className="w-72 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{LEAD_STAGE_LABELS[stage]}</h3>
                  <Badge variant="secondary" className="text-xs px-1.5 h-5">
                    {grouped[stage].length}
                  </Badge>
                </div>

                <div 
                  className={cn(
                    "space-y-3 p-2 rounded-xl transition-all duration-200 min-h-[500px]",
                    draggedOverStage === stage 
                      ? "bg-primary/5 border-2 border-dashed border-primary/20 scale-[1.01]" 
                      : "border-2 border-transparent"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDragEnter={() => setDraggedOverStage(stage)}
                  onDragLeave={() => setDraggedOverStage(null)}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  {grouped[stage].length === 0 ? (
                    <div className="border border-dashed border-border/50 rounded-lg p-6 text-center">
                      <p className="text-xs text-muted-foreground">No leads</p>
                    </div>
                  ) : (
                    grouped[stage].map((lead) => (
                      <Card
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', lead.id);
                          setIsDraggingLeadId(lead.id);
                        }}
                        onDragEnd={() => setIsDraggingLeadId(null)}
                        className={cn(
                          "border-border/50 border-t-2 animate-slide-up cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
                          stageColors[stage],
                          isDraggingLeadId === lead.id && "opacity-40 scale-95"
                        )}
                      >
                        <CardContent className="pt-4 space-y-2.5">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{lead.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <PhoneLink phone={lead.phone} />
                              </p>
                            </div>
                            <Link href={`/leads/${lead.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>

                          {(lead.budget_min || lead.budget_max) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" />
                              {lead.budget_min ? `₹${lead.budget_min.toLocaleString('en-IN')}` : '—'} - {lead.budget_max ? `₹${lead.budget_max.toLocaleString('en-IN')}` : '—'}
                            </p>
                          )}

                          {lead.preferred_locality && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {lead.preferred_locality}
                            </p>
                          )}

                          {lead.source && (
                            <Badge className={`${stageBadgeColors[stage]} text-[10px]`}>
                              {LEAD_SOURCE_LABELS[lead.source]}
                            </Badge>
                          )}

                          {stage !== 'converted' && stage !== 'lost' && (
                            <div className="flex justify-between pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={stage === LEAD_STAGE_ORDER[0]}
                                onClick={() => moveLead(lead.id, 'backward')}
                              >
                                <ChevronLeft className="h-3 w-3 mr-1" /> Back
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-primary animate-pulse"
                                onClick={() => moveLead(lead.id, 'forward')}
                              >
                                Next <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Info</TableHead>
                  <TableHead>Budget Range</TableHead>
                  <TableHead>Locality</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="animate-fade-in">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <PhoneLink phone={lead.phone} />
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.budget_min || lead.budget_max ? (
                        <span className="flex items-center gap-0.5 text-sm">
                          <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                          {lead.budget_min ? lead.budget_min.toLocaleString('en-IN') : '0'} - {lead.budget_max ? lead.budget_max.toLocaleString('en-IN') : '∞'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.preferred_locality ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {lead.preferred_locality}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.source ? (
                        <Badge variant="outline" className="text-xs">
                          {LEAD_SOURCE_LABELS[lead.source]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={stageBadgeColors[lead.status]}>
                        {LEAD_STAGE_LABELS[lead.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
            loadingText="Loading more leads..."
            endText="All leads loaded"
          />
        </div>
      )}
      </PageContent>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead to Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Assign an available property to this lead. A tenant record will be created.
            </p>
            <div className="space-y-2">
              <Label>Available Property *</Label>
              <Select value={selectedPropertyId} onValueChange={(val) => setSelectedPropertyId(val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.length === 0 ? (
                    <SelectItem value="none" disabled>No available properties</SelectItem>
                  ) : (
                    properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConvert} disabled={convertLoading || !selectedPropertyId}>
                {convertLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Convert & Create Tenant
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
