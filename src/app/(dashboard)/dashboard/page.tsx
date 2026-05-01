import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Building2, Users, UserCheck, MessageSquareWarning, IndianRupee, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  },
  {
    title: 'Leads',
    key: 'totalLeads' as const,
    subtitle: 'activeLeads' as const,
    subtitleLabel: 'active',
    icon: Users,
    gradient: 'from-[oklch(0.60_0.19_160)] to-[oklch(0.55_0.18_180)]',
  },
  {
    title: 'Active Tenants',
    key: 'activeTenants' as const,
    subtitle: 'convertedLeads' as const,
    subtitleLabel: 'converted',
    icon: UserCheck,
    gradient: 'from-[oklch(0.65_0.15_80)] to-[oklch(0.60_0.14_60)]',
  },
  {
    title: 'Open Complaints',
    key: 'openComplaints' as const,
    subtitle: 'rentedProperties' as const,
    subtitleLabel: 'rented',
    icon: MessageSquareWarning,
    gradient: 'from-[oklch(0.60_0.2_25)] to-[oklch(0.55_0.19_10)]',
  },
];

export default async function DashboardPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  // For now, broker dashboard. Owner/tenant views come in Phase 3
  const stats = profile.role === 'broker' ? await getBrokerStats(profile.id) : null;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your properties today.
        </p>
      </div>

      {/* Stats Grid */}
      {stats && profile.role === 'broker' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="relative overflow-hidden border-border/50 animate-slide-up">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.06]`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats[card.key]}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-primary font-medium">{stats[card.subtitle]}</span>{' '}
                    {card.subtitleLabel}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick actions for brokers */}
      {profile.role === 'broker' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <a href="/properties/new" className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Property</h3>
                  <p className="text-sm text-muted-foreground">List a new property</p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <a href="/leads/new" className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-chart-2/10 group-hover:bg-chart-2/20 transition-colors">
                  <Users className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Lead</h3>
                  <p className="text-sm text-muted-foreground">Create a new inquiry</p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <a href="/complaints" className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-chart-3/10 group-hover:bg-chart-3/20 transition-colors">
                  <MessageSquareWarning className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <h3 className="font-semibold">View Complaints</h3>
                  <p className="text-sm text-muted-foreground">Check open issues</p>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Owner & Tenant basic dashboard */}
      {profile.role !== 'broker' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">My Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Welcome to your unified {profile.role} portal. Navigate using the sidebar to view your detailed dashboard.
              </p>
              <a href={profile.role === 'owner' ? '/owner/properties' : '/tenant/property'}>
                <Badge variant="default" className="text-sm py-1 cursor-pointer hover:bg-primary/90">
                  {profile.role === 'owner' ? 'View My Properties' : 'View My Rental Details'}
                </Badge>
              </a>
            </CardContent>
          </Card>
          <Card className="border-border/50 hover:border-border transition-colors">
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
              <a href="/complaints">
                <Badge variant="outline" className="text-sm py-1 cursor-pointer hover:bg-accent">
                  View Complaints
                </Badge>
              </a>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent activity placeholder */}
      {profile.role === 'broker' && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Activity will appear here as you use the platform.</p>
              <p className="text-xs mt-1">Start by adding a property or creating a lead.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
