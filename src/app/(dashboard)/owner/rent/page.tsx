import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, IndianRupee, MapPin } from 'lucide-react';

export default async function OwnerRentPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'owner') redirect('/dashboard');

  const supabase = await createClient();

  const { data: owners } = await supabase
    .from('owners')
    .select('id')
    .eq('email', profile.email);

  const ownerIds = owners?.map(o => o.id) || [];

  // Fetch properties and their active tenants
  const { data: properties } = await supabase
    .from('properties')
    .select(`
      id, title, locality, city, rent,
      tenant:tenants(name, phone, move_in_date, is_active)
    `)
    .in('owner_id', ownerIds)
    .eq('status', 'rented');

  const rentedProps = properties || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Rent Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track rent and occupancy across your portfolio.
        </p>
      </div>

      {rentedProps.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <IndianRupee className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg">No active rentals</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
              You currently have no properties marked as rented.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {rentedProps.map((prop) => {
            // Because tenant can be an array in Supabase one-to-many join
            const tenants = Array.isArray(prop.tenant) ? prop.tenant : [prop.tenant];
            const activeTenant = tenants.find((t: any) => t?.is_active);

            return (
              <Card key={prop.id} className="border-border/50">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{prop.title}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{prop.locality}, {prop.city}</span>
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shrink-0">
                      Rented
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Monthly Rent</p>
                      <p className="text-xl font-bold flex items-center">
                        <IndianRupee className="h-4 w-4 text-muted-foreground mr-0.5" />
                        {prop.rent.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {activeTenant ? (
                    <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Current Tenant</p>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <UserCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{activeTenant.name}</p>
                          <p className="text-xs text-muted-foreground">Moved in: {new Date(activeTenant.move_in_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No active tenant found.</p>
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
