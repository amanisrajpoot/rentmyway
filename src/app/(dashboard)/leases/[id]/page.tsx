import { getLease } from '@/lib/actions/leases';
import { getRentSchedule } from '@/lib/actions/rent-schedule';
import { getUserProfile } from '@/lib/actions/auth';
import { LeaseActionsWorkspace } from '@/components/leases/lease-actions-workspace';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import {
  ArrowLeft, ScrollText, Building2, User, IndianRupee, Calendar,
  TrendingUp, Clock, Shield, FileText, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { LEASE_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';

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

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let lease;
  let schedule;
  let profile;
  try {
    const leaseRes = await getLease(id);
    lease = 'data' in leaseRes ? leaseRes.data : null;
    if (!lease) throw new Error('Not found');
    const [scheduleRes, profileRes] = await Promise.all([
      getRentSchedule({ tenantId: lease.tenant_id }),
      getUserProfile(),
    ]);
    schedule = 'data' in scheduleRes && scheduleRes.data ? scheduleRes.data : [];
    profile = profileRes;
  } catch {
    notFound();
  }

  if (!lease) notFound();

  const daysLeft = differenceInDays(new Date(lease.end_date), new Date());
  const isExpiring = daysLeft <= 30 && daysLeft >= 0;
  const leaseDurationMonths = differenceInDays(new Date(lease.end_date), new Date(lease.start_date)) / 30;

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

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leases" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Lease — {(lease.tenant as any)?.name || 'Tenant'}
            </h1>
            <Badge className={statusColors[lease.status]}>
              {isExpiring ? 'Expiring Soon' : LEASE_STATUS_LABELS[lease.status as keyof typeof LEASE_STATUS_LABELS]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {(lease.property as any)?.title} • {(lease.property as any)?.locality}, {(lease.property as any)?.city}
          </p>
        </div>
      </div>

      {/* Expiry Warning */}
      {isExpiring && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-100">Lease expiring in {daysLeft} days</p>
            <p className="text-xs text-amber-200/70 mt-1">
              Consider initiating a renewal or having a conversation with the tenant about their plans.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lease Terms */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" />
                Lease Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                  <p className="font-medium">{format(new Date(lease.start_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">End Date</p>
                  <p className="font-medium">{format(new Date(lease.end_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium">{Math.round(leaseDurationMonths)} months</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
                  <p className={`font-medium ${daysLeft <= 30 ? 'text-amber-400' : daysLeft <= 0 ? 'text-red-400' : ''}`}>
                    {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lock-in Period</p>
                  <p className="font-medium flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    {lease.lock_in_months} months
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notice Period</p>
                  <p className="font-medium">{lease.notice_period_days} days</p>
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
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div>
                      <p className="text-xs text-muted-foreground">Starting Rent</p>
                      <p className="font-semibold">₹{lease.monthly_rent.toLocaleString('en-IN')}/mo</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  </div>
                  {escalationSchedule.map((esc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div>
                        <p className="text-xs text-muted-foreground">From {format(new Date(esc.date), 'dd MMM yyyy')}</p>
                        <p className="font-semibold">₹{esc.rent.toLocaleString('en-IN')}/mo</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        +{lease.escalation_percent}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rent Schedule */}
          {schedule && schedule.length > 0 && (
            <Card className="border-border/50 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Rent Schedule ({schedule.length} months)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.slice(0, 12).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.month_year}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.due_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-0.5 font-semibold">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {item.expected_amount.toLocaleString('en-IN')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={paymentStatusColors[item.status]}>
                            {PAYMENT_STATUS_LABELS[item.status as keyof typeof PAYMENT_STATUS_LABELS]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {schedule.length > 12 && (
                  <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/40">
                    Showing 12 of {schedule.length} months
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <span className="font-bold text-lg">₹{lease.monthly_rent.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Security Deposit</span>
                <span className="font-semibold">₹{lease.security_deposit.toLocaleString('en-IN')}</span>
              </div>
              {lease.maintenance_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maintenance</span>
                  <span className="font-semibold">₹{lease.maintenance_charge.toLocaleString('en-IN')}/mo</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Escalation</span>
                <span className="text-sm font-medium">{lease.escalation_percent}% every {lease.escalation_frequency_months} mo</span>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{(lease.tenant as any)?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{(lease.tenant as any)?.phone}</p>
              {(lease.tenant as any)?.email && (
                <p className="text-sm text-muted-foreground">{(lease.tenant as any)?.email}</p>
              )}
              <Link
                href={`/tenants/${lease.tenant_id}`}
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                View tenant details →
              </Link>
            </CardContent>
          </Card>

          {/* Property */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{(lease.property as any)?.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(lease.property as any)?.address}
              </p>
              <p className="text-sm text-muted-foreground">
                {(lease.property as any)?.locality}, {(lease.property as any)?.city}
              </p>
              <Link
                href={`/properties/${lease.property_id}`}
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                View property details →
              </Link>
            </CardContent>
          </Card>

          {/* Agreement Workspace */}
          <LeaseActionsWorkspace lease={lease} userRole={profile?.role || 'tenant'} />
        </div>
      </div>
    </div>
  );
}
