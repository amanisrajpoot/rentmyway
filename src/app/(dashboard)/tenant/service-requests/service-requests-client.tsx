'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getPgServiceRequests, createPgServiceRequest, deletePgServiceRequest } from '@/lib/actions/pg-service-requests';
import { Loader2, Wrench, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { PgServiceRequest } from '@/types/database';

const CATEGORIES = [
  { value: 'room_cleaning', label: 'Room Cleaning' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'guest_entry', label: 'Guest Entry' },
  { value: 'wifi_issue', label: 'WiFi Issue' },
  { value: 'food_complaint', label: 'Food Complaint' },
  { value: 'water_issue', label: 'Water Issue' },
  { value: 'ac_repair', label: 'AC/Appliance Repair' },
  { value: 'furniture_repair', label: 'Furniture Repair' },
  { value: 'key_duplicate', label: 'Key Duplicate' },
  { value: 'other', label: 'Other' },
];

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

export function ServiceRequestsClient({ tenantId, propertyId, brokerId }: { tenantId: string, propertyId: string, brokerId: string }) {
  const [requests, setRequests] = useState<PgServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    const { data } = await getPgServiceRequests();
    setRequests(data as any || []);
    setLoading(false);
  }

  async function handleAddRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await createPgServiceRequest({
      tenant_id: tenantId,
      property_id: propertyId,
      broker_id: brokerId,
      category: formData.get('category') as any,
      description: formData.get('description') as string,
      urgency: formData.get('urgent') === 'on' ? 'urgent' : 'normal',
      status: 'pending',
      resolution_notes: null,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Request submitted successfully');
      setIsAddDialogOpen(false);
      loadRequests();
    }
    setAddLoading(false);
  }

  async function handleCancelRequest(id: string) {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    const result = await deletePgServiceRequest(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Request cancelled');
      loadRequests();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={() => setIsAddDialogOpen(true)}>New Request</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No service requests yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {requests.map(req => {
            const StatusIcon = STATUS_ICONS[req.status] || Clock;
            return (
              <Card key={req.id} className="border-border/50">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {req.category.replace('_', ' ')}
                        </Badge>
                        {req.urgency === 'urgent' && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-foreground/80 mt-2">
                        {req.description || 'No description provided.'}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                        {req.status === 'pending' && (
                          <button 
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-red-500 hover:underline"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                      
                      {req.resolution_notes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm border border-border/50">
                          <span className="font-semibold text-xs text-muted-foreground block mb-1">Resolution Note:</span>
                          {req.resolution_notes}
                        </div>
                      )}
                    </div>

                    <div className={`shrink-0 flex items-center justify-center p-2 rounded-full ${STATUS_COLORS[req.status]}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Service Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRequest} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select name="category" required>
                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" placeholder="Provide details about your request..." required className="resize-none" rows={3} />
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3">
              <Switch id="urgent" name="urgent" />
              <Label htmlFor="urgent" className="cursor-pointer">Mark as Urgent (Emergency only)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
