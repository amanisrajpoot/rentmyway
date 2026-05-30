import { getLeases } from '@/lib/actions/leases';
import { getUserProfile } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ScrollText, Building2, IndianRupee, Calendar, User, Clock, TrendingUp } from 'lucide-react';
import { LEASE_STATUS_LABELS } from '@/types/database';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  expiring: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  expired: 'bg-red-500/15 text-red-400 border-red-500/20',
  renewed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  terminated: 'bg-muted text-muted-foreground/70',
};

export default async function OwnerLeasesPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'owner') redirect('/dashboard');

  const res = await getLeases();
  const leases = 'data' in res && res.data ? res.data : [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lease Agreements</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View lease details for your properties.
        </p>
      </div>

      {leases.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ScrollText className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg">No lease agreements</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
              No lease agreements have been created for your properties yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {leases.map((lease: any) => {
            const daysLeft = differenceInDays(new Date(lease.end_date), new Date());
            return (
              <Card key={lease.id} className="border-border/50">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{lease.property?.title || 'Property'}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lease.property?.locality}, {lease.property?.city}</span>
                      </p>
                    </div>
                    <Badge className={`shrink-0 ${statusColors[lease.status]}`}>
                      {LEASE_STATUS_LABELS[lease.status as keyof typeof LEASE_STATUS_LABELS]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tenant</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {lease.tenant?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Monthly Rent</p>
                      <p className="text-sm font-bold flex items-center">
                        <IndianRupee className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
                        {lease.monthly_rent.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(lease.start_date), 'dd MMM yy')} → {format(new Date(lease.end_date), 'dd MMM yy')}
                    </span>
                    {lease.status === 'active' && (
                      <span className={`flex items-center gap-1 font-medium ${
                        daysLeft <= 30 ? 'text-amber-400' : ''
                      }`}>
                        <Clock className="h-3 w-3" />
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                      </span>
                    )}
                  </div>

                  {lease.escalation_percent > 0 && (
                    <div className="pt-3 border-t border-border/40 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {lease.escalation_percent}% annual escalation
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
