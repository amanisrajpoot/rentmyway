'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Complaint } from '@/types/database';
import { COMPLAINT_STATUS_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateComplaintStatus } from '@/lib/actions/complaints';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  MessageSquareWarning, Building2, User, Wrench, AlertTriangle,
  Clock, CheckCircle, XCircle, Plus,
} from 'lucide-react';

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

export function ComplaintsClient({ initialComplaints }: { initialComplaints: ComplaintWithJoins[] }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = initialComplaints.filter((c) =>
    statusFilter === 'all' || c.status === statusFilter
  );

  async function handleStatusUpdate(id: string, newStatus: string) {
    try {
      await updateComplaintStatus(id, newStatus as Complaint['status']);
      toast.success(`Status updated to ${COMPLAINT_STATUS_LABELS[newStatus as keyof typeof COMPLAINT_STATUS_LABELS]}`);
    } catch {
      toast.error('Failed to update');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaints</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track maintenance issues and complaints
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/complaints/new">
            <Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Complaint
            </Button>
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <MessageSquareWarning className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No complaints</h3>
            <p className="text-muted-foreground text-sm mt-1">All clear! No issues reported.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((complaint) => (
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
                      <Badge className={statusColors[complaint.status]}>
                        {COMPLAINT_STATUS_LABELS[complaint.status]}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                      {complaint.utility && (
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" /> {complaint.utility.name}
                          {complaint.utility.location && ` (${complaint.utility.location})`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {format(new Date(complaint.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>

                    {complaint.images && complaint.images.length > 0 && (
                      <div className="flex gap-2 py-1 overflow-x-auto">
                        {complaint.images.map((url, i) => (
                          <div key={i} className="h-16 w-24 shrink-0 rounded border overflow-hidden bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
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
                            <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                          </Button>
                        )}
                        {complaint.status === 'resolved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleStatusUpdate(complaint.id, 'closed')}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Close
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
      )}
    </div>
  );
}
