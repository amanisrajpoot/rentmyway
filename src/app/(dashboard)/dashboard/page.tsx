import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Building2, Users, UserCheck, MessageSquareWarning, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
          Here&apos;s what&apos;s happening with your properties today.
        </p>
      </div>

      {/* Stats Grid */}
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

      {/* Quick actions for brokers */}
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

      {/* Owner & Tenant dashboard */}
      {profile.role !== 'broker' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">My Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Welcome to your unified {profile.role} portal. Navigate using the sidebar to view your detailed dashboard.
              </p>
              <Link href={profile.role === 'owner' ? '/owner/properties' : '/tenant/property'}>
                <Badge variant="default" className="text-sm py-1 cursor-pointer hover:bg-primary/90 transition-colors">
                  {profile.role === 'owner' ? 'View My Properties' : 'View My Rental Details'}
                </Badge>
              </Link>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5 text-muted-foreground" />
                Support & Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Have an issue? Raise a complaint directly through your dashboard.
              </p>
              <Link href="/complaints">
                <Badge variant="outline" className="text-sm py-1 cursor-pointer hover:bg-accent transition-colors">
                  View Complaints
                </Badge>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent activity */}
      {profile.role === 'broker' && (
        <Card className="border-border/50 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs mt-1 text-muted-foreground/70">Activity will appear here as you use the platform.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
