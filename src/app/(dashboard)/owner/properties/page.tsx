import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Armchair } from 'lucide-react';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS, type Property } from '@/types/database';
import { MediaDisplay } from '@/components/ui/media-display';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rented: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

export default async function OwnerPropertiesPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'owner') redirect('/dashboard');

  const supabase = await createClient();

  // Find owner record by email
  const { data: owners } = await supabase
    .from('owners')
    .select('id')
    .eq('email', profile.email);

  if (!owners || owners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Properties Found</h2>
        <p className="text-muted-foreground">We couldn't link your email to any owner records.</p>
      </div>
    );
  }

  const ownerIds = owners.map(o => o.id);

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .in('owner_id', ownerIds)
    .order('created_at', { ascending: false });

  const props = properties as Property[] || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Properties</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View all properties registered under your name.
        </p>
      </div>

      {props.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg">No properties yet</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
              Your broker has not added any properties for you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {props.map((property) => (
            <Card key={property.id} className="border-border/50 overflow-hidden group">
              <div className="h-36 sm:h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-chart-2/10 flex items-center justify-center relative overflow-hidden">
                {property.images && property.images.length > 0 ? (
                  <MediaDisplay 
                    url={property.images[0]} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                    autoPlayHover={true}
                  />
                ) : (
                  <Building2 className="h-10 w-10 text-muted-foreground/15" />
                )}
                <Badge className={`absolute top-3 right-3 ${statusColors[property.status]} text-[11px]`}>
                  {property.status}
                </Badge>
              </div>
              <CardContent className="pt-4 space-y-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{property.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{property.locality}, {property.city}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[11px]">
                    {PROPERTY_TYPE_LABELS[property.property_type]}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    <Armchair className="h-3 w-3 mr-1" />
                    {FURNISHING_LABELS[property.furnishing]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-border/40">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <span className="font-bold text-lg tabular-nums">
                      {property.rent.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Deposit ₹{property.deposit.toLocaleString('en-IN')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
