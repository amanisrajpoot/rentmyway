'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LeaseAgreement } from '@/types/database';
import { LEASE_STATUS_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, isPast } from 'date-fns';
import {
  ScrollText, Plus, Search, Building2, User, Calendar,
  IndianRupee, AlertTriangle, ArrowRight, TrendingUp,
  Clock, CheckCircle, XCircle, RefreshCw,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  expiring: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  expired: 'bg-red-500/15 text-red-400 border-red-500/20',
  renewed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  terminated: 'bg-muted text-muted-foreground/70',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  draft: Clock,
  active: CheckCircle,
  expiring: AlertTriangle,
  expired: XCircle,
  renewed: RefreshCw,
  terminated: XCircle,
};

type LeaseWithJoins = LeaseAgreement & {
  tenant?: { id: string; name: string; phone: string; email: string | null } | null;
  property?: { id: string; title: string; locality: string; city: string; rent: number } | null;
};

export function LeasesClient({ initialLeases }: { initialLeases: LeaseWithJoins[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = initialLeases.filter((lease) => {
    const matchesSearch = !search ||
      lease.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
      lease.property?.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lease.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const activeCount = initialLeases.filter(l => l.status === 'active').length;
  const expiringCount = initialLeases.filter(l => {
    if (l.status !== 'active') return false;
    const daysLeft = differenceInDays(new Date(l.end_date), new Date());
    return daysLeft <= 30 && daysLeft >= 0;
  }).length;
  const totalMonthlyRent = initialLeases
    .filter(l => ['active', 'expiring'].includes(l.status))
    .reduce((sum, l) => sum + l.monthly_rent, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lease Agreements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage lease lifecycle, renewals and escalations
          </p>
        </div>
        <Link href="/leases/new">
          <Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Lease
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.60_0.19_160)] to-[oklch(0.55_0.18_180)] opacity-[0.06]" />
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[oklch(0.60_0.19_160)] to-[oklch(0.55_0.18_180)]">
              <ScrollText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Leases</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.15_80)] to-[oklch(0.60_0.14_60)] opacity-[0.06]" />
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.15_80)] to-[oklch(0.60_0.14_60)]">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-2xl font-bold">₹{totalMonthlyRent.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 relative overflow-hidden ${expiringCount > 0 ? 'ring-1 ring-amber-500/30' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.60_0.2_25)] to-[oklch(0.55_0.19_10)] opacity-[0.06]" />
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[oklch(0.60_0.2_25)] to-[oklch(0.55_0.19_10)]">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expiring (30d)</p>
              <p className="text-2xl font-bold">{expiringCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tenant or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(LEASE_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lease List */}
      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No leases found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create a new lease agreement to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map((lease) => {
            const daysLeft = differenceInDays(new Date(lease.end_date), new Date());
            const isExpiringSoon = daysLeft <= 30 && daysLeft >= 0 && lease.status === 'active';
            const isExpired = isPast(new Date(lease.end_date)) && lease.status === 'active';
            const StatusIcon = statusIcons[lease.status] || Clock;

            return (
              <Link key={lease.id} href={`/leases/${lease.id}`}>
                <Card className={`border-border/50 cursor-pointer group hover:border-primary/30 transition-all duration-300 ${
                  isExpiringSoon ? 'ring-1 ring-amber-500/20' : ''
                } ${isExpired ? 'ring-1 ring-red-500/20' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={`p-2 rounded-lg bg-muted shrink-0 ${
                        isExpiringSoon ? 'text-amber-400' :
                        isExpired ? 'text-red-400' :
                        lease.status === 'active' ? 'text-emerald-400' :
                        'text-muted-foreground'
                      }`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold group-hover:text-primary transition-colors">
                              {lease.tenant?.name || 'Unknown Tenant'}
                            </h3>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                              {lease.property && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {lease.property.title}, {lease.property.locality}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {lease.monthly_rent.toLocaleString('en-IN')}/mo
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={statusColors[lease.status]}>
                              {isExpiringSoon ? 'Expiring Soon' :
                               isExpired ? 'Expired' :
                               LEASE_STATUS_LABELS[lease.status]}
                            </Badge>
                          </div>
                        </div>

                        {/* Lease Period */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(lease.start_date), 'dd MMM yy')} → {format(new Date(lease.end_date), 'dd MMM yy')}
                          </span>
                          {lease.status === 'active' && (
                            <span className={`flex items-center gap-1 font-medium ${
                              daysLeft <= 7 ? 'text-red-400' :
                              daysLeft <= 30 ? 'text-amber-400' :
                              'text-muted-foreground'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                            </span>
                          )}
                          {lease.escalation_percent > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {lease.escalation_percent}% annual escalation
                            </span>
                          )}
                        </div>
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
