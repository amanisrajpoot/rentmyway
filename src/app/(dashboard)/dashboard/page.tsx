import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Building2, Users, UserCheck, MessageSquareWarning, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ActivityFeed } from '@/components/layout/activity-feed';

async function getBrokerStats(brokerId: string) {
  const supabase = await createClient();

  const [properties, leads, tenants, complaints] = await Promise.all([
    supabase.from('properties').select('id, status', { count: 'exact' }).eq('broker_id', brokerId),
    supabase.from('leads').select('id, status', { count: 'exact' }).eq('broker_id', brokerId),
    supabase.from('tenants').select('id, is_active', { count: 'exact' }).eq('broker_id', brokerId),
    supabase.from('complaints').select('id, status', { count: 'exact' }).eq('broker_id', brokerId),
  ]);

  const propData = properties.data || [];
  const leadData = leads.data || [];
  const tenantData = tenants.data || [];
  const complaintData = complaints.data || [];

  return {
    totalProperties: propData.length,
    availableProperties: propData.filter(p => p.status === 'available').length,
    rentedProperties: propData.filter(p => p.status === 'rented').length,
    totalLeads: leadData.length,
    activeLeads: leadData.filter(l => !['converted', 'lost'].includes(l.status)).length,
    convertedLeads: leadData.filter(l => l.status === 'converted').length,
    activeTenants: tenantData.filter(t => t.is_active).length,
    openComplaints: complaintData.filter(c => ['open', 'in_progress'].includes(c.status)).length,
  };
}

async function getOwnerStats(email: string) {
  const supabase = await createClient();
  const { data: owners } = await supabase.from('owners').select('id').eq('email', email);
  const ownerIds = owners?.map(o => o.id) || [];
  if (ownerIds.length === 0) return null;

  const { data: properties } = await supabase.from('properties').select('id, status, rent').in('owner_id', ownerIds);
  const props = properties || [];
  const propertyIds = props.map(p => p.id);
  
  const { data: complaints } = await supabase.from('complaints').select('id, status').in('property_id', propertyIds);
  const comps = complaints || [];

  return {
    totalProperties: props.length,
    rentedProperties: props.filter(p => p.status === 'rented').length,
    monthlyRent: props.filter(p => p.status === 'rented').reduce((sum, p) => sum + (p.rent || 0), 0),
    openComplaints: comps.filter(c => ['open', 'in_progress'].includes(c.status)).length,
  };
}

async function getTenantStats(email: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, rent_amount, move_in_date, lease_end_date').eq('email', email).eq('is_active', true).single();
  
  if (!tenant) return null;

  const { data: complaints } = await supabase.from('complaints').select('id, status').eq('tenant_id', tenant.id);
  const comps = complaints || [];

  return {
    rentAmount: tenant.rent_amount,
    leaseEnd: tenant.lease_end_date,
    moveIn: tenant.move_in_date,
    openComplaints: comps.filter(c => ['open', 'in_progress'].includes(c.status)).length,
  };
}

const statCards = [
  {
    title: 'Properties',
    key: 'totalProperties' as const,
    subtitle: 'availableProperties' as const,
    subtitleLabel: 'available',
    icon: Building2,
    gradient: 'from-[oklch(0.55_0.2_265)] to-[oklch(0.50_0.19_280)]',
    href: '/properties',
  },
  {
    title: 'Leads',
    key: 'totalLeads' as const,
    subtitle: 'activeLeads' as const,
    subtitleLabel: 'active',
    icon: Users,
    gradient: 'from-[oklch(0.60_0.19_160)] to-[oklch(0.55_0.18_180)]',
    href: '/leads',
  },
  {
    title: 'Active Tenants',
    key: 'activeTenants' as const,
    subtitle: 'convertedLeads' as const,
    subtitleLabel: 'converted',
    icon: UserCheck,
    gradient: 'from-[oklch(0.65_0.15_80)] to-[oklch(0.60_0.14_60)]',
    href: '/tenants',
  },
  {
    title: 'Open Complaints',
    key: 'openComplaints' as const,
    subtitle: 'rentedProperties' as const,
    subtitleLabel: 'rented',
    icon: MessageSquareWarning,
    gradient: 'from-[oklch(0.60_0.2_25)] to-[oklch(0.55_0.19_10)]',
    href: '/complaints',
  },
];

const quickActions = [
  {
    title: 'Add Property',
    desc: 'List a new rental property',
    href: '/properties/new',
    icon: Building2,
    color: 'text-primary',
    bg: 'bg-primary/10 group-hover:bg-primary/15',
  },
  {
    title: 'Add Lead',
    desc: 'Create a new inquiry',
    href: '/leads/new',
    icon: Users,
    color: 'text-chart-2',
    bg: 'bg-chart-2/10 group-hover:bg-chart-2/15',
  },
  {
    title: 'View Complaints',
    desc: 'Check open issues',
    href: '/complaints',
    icon: MessageSquareWarning,
    color: 'text-chart-3',
    bg: 'bg-chart-3/10 group-hover:bg-chart-3/15',
  },
];

export default async function DashboardPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const stats = profile.role === 'broker' ? await getBrokerStats(profile.id) : null;
  const ownerStats = profile.role === 'owner' ? await getOwnerStats(profile.email || '') : null;
  const tenantStats = profile.role === 'tenant' ? await getTenantStats(profile.email || '') : null;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
          {profile.role === 'broker' && "Here's what's happening with your properties today."}
          {profile.role === 'owner' && "Here is the summary of your property portfolio."}
          {profile.role === 'tenant' && "Here is your current rental status."}
        </p>
      </div>

      {/* Broker Stats Grid */}
      {stats && profile.role === 'broker' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href}>
                <Card className="relative overflow-hidden border-border/50 cursor-pointer group h-full">
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-500`} />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} opacity-90`}>
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold tabular-nums">{stats[card.key]}</div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                      <span className="text-primary font-medium">{stats[card.subtitle]}</span>{' '}
                      {card.subtitleLabel}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Broker Quick actions */}
      {profile.role === 'broker' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 stagger-children">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="border-border/50 cursor-pointer group h-full">
                  <CardContent className="pt-5 sm:pt-6 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${action.bg} transition-colors duration-300 shrink-0`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${action.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base">{action.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{action.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Owner Dashboard */}
      {profile.role === 'owner' && ownerStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Total Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ownerStats.totalProperties}</div>
              <p className="text-xs text-muted-foreground mt-1">{ownerStats.rentedProperties} currently rented</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-gradient-to-br from-background to-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Monthly Rent Yield</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">₹{ownerStats.monthlyRent.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">From active tenants</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {ownerStats.totalProperties > 0 ? Math.round((ownerStats.rentedProperties / ownerStats.totalProperties) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Properties filled</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Open Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{ownerStats.openComplaints}</div>
              <p className="text-xs text-muted-foreground mt-1">Issues needing attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tenant Dashboard */}
      {profile.role === 'tenant' && tenantStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          <Card className="border-border/50 bg-gradient-to-br from-background to-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Monthly Rent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">₹{tenantStats.rentAmount.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">Due next month</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Lease Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {tenantStats.leaseEnd ? new Date(tenantStats.leaseEnd).toLocaleDateString() : 'Ongoing'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Lease end date</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{tenantStats.openComplaints}</div>
              <p className="text-xs text-muted-foreground mt-1">Open tickets</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Broker Recent activity */}
      {profile.role === 'broker' && (
        <Card className="border-border/50 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
