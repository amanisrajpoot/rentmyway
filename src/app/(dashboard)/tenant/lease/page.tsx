import { getUserProfile } from '@/lib/actions/auth';
import { getLeases } from '@/lib/actions/leases';
import { getRentSchedule } from '@/lib/actions/rent-schedule';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays } from 'date-fns';
import {
  ScrollText, IndianRupee, Calendar, TrendingUp, Clock,
  Shield, Building2, AlertTriangle, CheckCircle, CalendarClock,
} from 'lucide-react';
import { LEASE_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types/database';
import { LeaseDownloadButton } from '@/components/tenant/lease-button';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  expiring: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  expired: 'bg-red-500/15 text-red-400 border-red-500/20',
  renewed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  terminated: 'bg-muted text-muted-foreground/70',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  paid: 'bg-emerald-500/15 text-emerald-400',
  partial: 'bg-amber-500/15 text-amber-400',
  overdue: 'bg-red-500/15 text-red-400',
  waived: 'bg-blue-500/15 text-blue-400',
};

export default async function TenantLeasePage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const leases = await getLeases();
  const lease = leases.find((l: any) => ['active', 'expiring'].includes(l.status)) || leases[0];

  // Get rent schedule for this tenant
  const schedule = await getRentSchedule();

  if (!lease) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <ScrollText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Active Lease Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn&apos;t find an active lease agreement linked to your account. Please contact your broker.
        </p>
      </div>
    );
  }

  const daysLeft = differenceInDays(new Date(lease.end_date), new Date());
  const weeksLeft = Math.max(0, Math.floor(daysLeft / 7));
  const remainingDays = Math.max(0, daysLeft % 7);
  const isExpiring = daysLeft <= 30 && daysLeft >= 0;
  const leaseDurationMonths = Math.round(differenceInDays(new Date(lease.end_date), new Date(lease.start_date)) / 30);

  // Calculate escalation schedule
  const escalationSchedule: { date: string; rent: number }[] = [];
  if (lease.escalation_percent > 0 && lease.escalation_frequency_months > 0) {
    let currentRent = lease.monthly_rent;
    const startDate = new Date(lease.start_date);
    const endDate = new Date(lease.end_date);
    let nextEscalation = new Date(startDate);
    nextEscalation.setMonth(nextEscalation.getMonth() + lease.escalation_frequency_months);

    while (nextEscalation <= endDate) {
      currentRent = Math.round(currentRent * (1 + lease.escalation_percent / 100));
      escalationSchedule.push({
        date: nextEscalation.toISOString().split('T')[0],
        rent: currentRent,
      });
      nextEscalation.setMonth(nextEscalation.getMonth() + lease.escalation_frequency_months);
    }
  }

  // Upcoming payments
  const upcoming = (schedule as any[]).filter((s: any) =>
    s.status === 'pending' && new Date(s.due_date) >= new Date()
  ).slice(0, 3);

  const overdue = (schedule as any[]).filter((s: any) =>
    s.status === 'overdue' || (s.status === 'pending' && new Date(s.due_date) < new Date())
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Lease</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your current lease agreement details and payment schedule.
        </p>
      </div>

      {/* Expiry Warning */}
      {isExpiring && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-100">Your lease expires in {daysLeft} days</p>
            <p className="text-xs text-amber-200/70 mt-1">
              Please contact your broker to discuss renewal options.
            </p>
          </div>
        </div>
      )}

      {/* Overdue Warning */}
      {overdue.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-red-100">
              {overdue.length} overdue payment{overdue.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-200/70 mt-1">
              Please clear your pending dues to avoid late fees.
            </p>
          </div>
        </div>
      )}

      {/* Countdown Timer Card */}
      <Card className="border-primary/20 bg-primary/5 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CalendarClock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Lease Countdown</h3>
              <p className="text-sm text-muted-foreground">Time remaining until lease expiration</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="bg-background border rounded-xl p-3 min-w-[80px]">
                <p className="text-2xl font-bold text-primary">{weeksLeft}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Weeks</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-background border rounded-xl p-3 min-w-[80px]">
                <p className="text-2xl font-bold text-primary">{remainingDays}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Days</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lease Summary */}
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" />
                  Lease Agreement
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[lease.status as string]}>
                    {LEASE_STATUS_LABELS[lease.status as keyof typeof LEASE_STATUS_LABELS]}
                  </Badge>
                  <LeaseDownloadButton lease={lease} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Property</p>
                  <p className="font-medium text-sm flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {(lease as any).property?.title}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium text-sm">{leaseDurationMonths} months</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                  <p className={`font-medium text-sm ${daysLeft <= 30 ? 'text-amber-400' : ''}`}>
                    {daysLeft > 0 ? `${weeksLeft}w ${remainingDays}d` : 'Expired'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Period</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {format(new Date(lease.start_date), 'dd MMM yy')} → {format(new Date(lease.end_date), 'dd MMM yy')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lock-in</p>
                  <p className="text-sm flex items-center gap-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    {lease.lock_in_months} months
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notice Period</p>
                  <p className="text-sm">{lease.notice_period_days} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escalation Schedule */}
          {escalationSchedule.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Rent Escalation Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Rent</p>
                    <p className="font-bold text-emerald-400">₹{lease.monthly_rent.toLocaleString('en-IN')}/mo</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                {escalationSchedule.map((esc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div>
                      <p className="text-xs text-muted-foreground">From {format(new Date(esc.date), 'dd MMM yyyy')}</p>
                      <p className="font-semibold">₹{esc.rent.toLocaleString('en-IN')}/mo</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">+{lease.escalation_percent}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <span className="font-bold text-lg">₹{lease.monthly_rent.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deposit</span>
                <span className="font-semibold">₹{lease.security_deposit.toLocaleString('en-IN')}</span>
              </div>
              {lease.maintenance_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maintenance</span>
                  <span className="font-semibold">₹{lease.maintenance_charge.toLocaleString('en-IN')}/mo</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Payments */}
          {upcoming.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Upcoming Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcoming.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{item.month_year}</p>
                      <p className="text-xs text-muted-foreground">Due: {format(new Date(item.due_date), 'dd MMM')}</p>
                    </div>
                    <span className="font-semibold text-sm">₹{item.expected_amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
