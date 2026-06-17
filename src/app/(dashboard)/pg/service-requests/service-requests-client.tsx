'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getPgServiceRequests, updatePgServiceRequest } from '@/lib/actions/pg-service-requests';
import { Loader2, User, MapPin, AlertTriangle, Clock, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Property, PgServiceRequest } from '@/types/database';

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  in_progress: Wrench,
  completed: CheckCircle2,
  rejected: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function ServiceRequestsClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requests, setRequests] = useState<(PgServiceRequest & { roomInfo?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Update State Dialog
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PgServiceRequest | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [selectedPropertyId, statusFilter]);

  async function loadRequests() {
    setLoading(true);
    const filters: any = {};
    if (selectedPropertyId !== 'all') filters.property_id = selectedPropertyId;
    if (statusFilter !== 'all') filters.status = statusFilter;

    const { data } = await getPgServiceRequests(filters);
    setRequests(data as any || []);
    setLoading(false);
  }

  function openUpdateDialog(req: PgServiceRequest, status: string) {
    setSelectedRequest(req);
    setUpdateStatus(status);
    setResolutionNotes(req.resolution_notes || '');
    setIsUpdateDialogOpen(true);
  }

  async function handleUpdateStatus() {
    if (!selectedRequest) return;
    setUpdateLoading(true);
    
    const result = await updatePgServiceRequest(selectedRequest.id, {
      status: updateStatus as any,
      resolution_notes: resolutionNotes || null,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Request updated');
      setIsUpdateDialogOpen(false);
      loadRequests();
    }
    setUpdateLoading(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedPropertyId} onValueChange={(v) => setSelectedPropertyId(v || '')}>
          <SelectTrigger className="w-[200px] sm:w-[250px]">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || '')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No service requests found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {requests.map(req => {
            const StatusIcon = STATUS_ICONS[req.status] || Clock;
            return (
              <Card key={req.id} className="border-border/50 flex flex-col h-full">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="capitalize">
                          {req.category.replace('_', ' ')}
                        </Badge>
                        {req.urgency === 'urgent' && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 px-1">
                            <AlertTriangle className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3" />
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`capitalize flex items-center gap-1 ${STATUS_COLORS[req.status]}`}>
                      <StatusIcon className="h-3 w-3" />
                      {req.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col">
                  <p className="text-sm font-medium mb-3">"{req.description}"</p>
                  
                  <div className="mt-auto space-y-2 pt-4 border-t border-border/40 bg-muted/20 -mx-6 -mb-6 p-4">
                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold">{req.tenant?.name || 'Unknown'}</span>
                      <span className="text-muted-foreground text-xs">({req.tenant?.phone})</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pl-6">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {req.property?.title}
                      </span>
                      {req.roomInfo && <span className="font-medium text-primary ml-4">{req.roomInfo}</span>}
                    </div>

                    {req.resolution_notes && (
                      <div className="mt-2 text-xs italic text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
                        "{req.resolution_notes}"
                      </div>
                    )}

                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-3">
                        <Button size="sm" className="flex-1" onClick={() => openUpdateDialog(req, 'in_progress')}>Accept</Button>
                        <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 flex-1" onClick={() => openUpdateDialog(req, 'rejected')}>Reject</Button>
                      </div>
                    )}
                    {req.status === 'in_progress' && (
                      <div className="pt-3">
                        <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => openUpdateDialog(req, 'completed')}>Mark Completed</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <div className="font-medium capitalize text-lg">
                Mark as: {updateStatus.replace('_', ' ')}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resolution Notes (Optional)</Label>
              <Textarea 
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the resolution or reason for rejection..." 
                className="resize-none" 
                rows={3} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={updateLoading}>
              {updateLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
