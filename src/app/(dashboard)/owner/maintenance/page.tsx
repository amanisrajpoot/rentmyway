import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquareWarning, MapPin, Calendar, Wrench } from 'lucide-react';
import { COMPLAINT_STATUS_LABELS } from '@/types/database';

const statusColors: Record<string, string> = {
  open: 'bg-red-500/15 text-red-400 border-red-500/20',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  resolved: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  closed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

const priorityColors: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-400',
  high: 'text-orange-400',
  urgent: 'text-red-500',
};

export default async function OwnerMaintenancePage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'owner') redirect('/dashboard');

  const supabase = await createClient();

  const { data: owners } = await supabase
    .from('owners')
    .select('id')
    .eq('email', profile.email);

  const ownerIds = owners?.map(o => o.id) || [];

  // Fetch properties owned by the owner to get their IDs
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .in('owner_id', ownerIds);

  const propertyIds = properties?.map(p => p.id) || [];

  // Fetch complaints for those properties
  const { data: complaints } = await supabase
    .from('complaints')
    .select('*, property:properties(title, locality, city)')
    .in('property_id', propertyIds)
    .order('created_at', { ascending: false });

  const issues = complaints || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor maintenance requests and issues across your properties.
        </p>
      </div>

      {issues.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg">No maintenance requests</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
              Your properties currently have no logged complaints or maintenance issues.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {issues.map((issue) => (
            <Card key={issue.id} className="border-border/50">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base truncate leading-snug">{issue.title}</CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{issue.property?.title}</span>
                    </p>
                  </div>
                  <Badge className={`shrink-0 ${statusColors[issue.status]}`}>
                    {COMPLAINT_STATUS_LABELS[issue.status as keyof typeof COMPLAINT_STATUS_LABELS]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {issue.description && (
                  <p className="text-sm text-foreground/80 line-clamp-3">
                    {issue.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MessageSquareWarning className={`h-3.5 w-3.5 ${priorityColors[issue.priority]}`} />
                    <span className="capitalize">{issue.priority} Priority</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Reported: {new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {issue.cost && (
                  <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Estimated/Actual Cost</span>
                    <span className="font-semibold tabular-nums">₹{issue.cost.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
