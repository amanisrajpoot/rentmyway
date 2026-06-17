'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Complaint } from '@/types/database';
import { COMPLAINT_STATUS_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateComplaint, getComplaints } from '@/lib/actions/complaints';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  MessageSquareWarning, Building2, User, Wrench, AlertTriangle,
  Clock, CheckCircle, XCircle, Plus, Search,
} from 'lucide-react';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  open: 'bg-red-500/15 text-red-400 border-red-500/20',
  in_progress: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  closed: 'bg-muted text-muted-foreground',
};

const priorityColors: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

type ComplaintWithJoins = Complaint & {
  tenant?: { name: string; phone: string } | null;
  property?: { title: string; locality: string } | null;
  utility?: { name: string; location: string | null } | null;
};

export function ComplaintsClient({ 
  initialComplaints,
  initialFilters
}: { 
  initialComplaints: ComplaintWithJoins[];
  initialFilters: {
    search: string;
    status: string;
  };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);

  // Paginated state
  const [complaints, setComplaints] = useState<ComplaintWithJoins[]>(initialComplaints);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialComplaints.length >= 12);
  const [loading, setLoading] = useState(false);

  // Sync if initial server props change
  useEffect(() => {
    setComplaints(initialComplaints);
    setPage(0);
    setHasMore(initialComplaints.length >= 12);
  }, [initialComplaints]);

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

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const nextComplaintsRes = await getComplaints({
        search,
        status: statusFilter,
        page: nextPage,
        limit: 12,
      });

      if ('error' in nextComplaintsRes && nextComplaintsRes.error) {
        toast.error(nextComplaintsRes.error);
        return;
      }
      
      const nextComplaints = 'data' in nextComplaintsRes && nextComplaintsRes.data ? nextComplaintsRes.data : [];

      if (nextComplaints.length < 12) {
        setHasMore(false);
      }
      setComplaints((prev) => [...prev, ...(nextComplaints as ComplaintWithJoins[])]);
      setPage(nextPage);
    } catch {
      toast.error('Failed to load more complaints');
    } finally {
      setLoading(false);
    }
  };

  async function handleStatusUpdate(id: string, newStatus: string) {
    try {
      const res = await updateComplaint(id, { status: newStatus });
      if (res && 'error' in res && res.error) throw new Error(res.error);
      toast.success(`Status updated to ${COMPLAINT_STATUS_LABELS[newStatus as keyof typeof COMPLAINT_STATUS_LABELS]}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Complaints"
        description="Track maintenance issues and complaints"
      >
        <Link 
          href="/complaints/new" 
          className={cn(buttonVariants({ size: 'default' }), "w-full sm:w-auto flex-1 sm:flex-initial bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white")}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Complaint
        </Link>
      </PageHeader>

      <PageToolbar>
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search complaints by title, tenant or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-[160px] bg-card">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageToolbar>

      <PageContent>
      {complaints.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <MessageSquareWarning className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No complaints</h3>
            <p className="text-muted-foreground text-sm mt-1">All clear! No issues reported.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <Card key={complaint.id} className="border-border/50 animate-slide-up">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-muted ${priorityColors[complaint.priority]}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{complaint.title}</h3>
                          {complaint.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{complaint.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {complaint.auto_delegated && (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Auto-Delegated</Badge>
                          )}
                          <Badge className={statusColors[complaint.status]}>
                            {COMPLAINT_STATUS_LABELS[complaint.status]}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {complaint.category || 'Other'}
                        </Badge>
                        {complaint.tenant && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {complaint.tenant.name}
                          </span>
                        )}
                        {complaint.property && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {complaint.property.title}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {format(new Date(complaint.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>

                      {complaint.assigned_to ? (
                        <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-muted-foreground">Assigned to:</span>
                            <span className="font-medium text-foreground">{complaint.assigned_to}</span>
                          </div>
                          {complaint.assigned_phone && (
                            <a href={`tel:${complaint.assigned_phone}`} className="text-[10px] text-primary hover:underline">
                              Call Vendor
                            </a>
                          )}
                        </div>
                      ) : (
                        complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-dashed border-border/40">
                            <p className="text-[10px] text-muted-foreground flex-1">No vendor assigned</p>
                            <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-primary">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      )}

                      {complaint.status !== 'closed' && (
                        <div className="flex gap-2 pt-1">
                          {complaint.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleStatusUpdate(complaint.id, 'in_progress')}
                            >
                              Mark In Progress
                            </Button>
                          )}
                          {complaint.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-emerald-400"
                              onClick={() => handleStatusUpdate(complaint.id, 'resolved')}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
                            </Button>
                          )}
                          {complaint.status === 'resolved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleStatusUpdate(complaint.id, 'closed')}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Close
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <InfiniteScroll
            hasMore={hasMore}
            isLoading={loading}
            onLoadMore={loadMore}
            loadingText="Loading more complaints..."
            endText="All complaints loaded"
          />
        </div>
      )}
      </PageContent>
    </PageLayout>
  );
}
