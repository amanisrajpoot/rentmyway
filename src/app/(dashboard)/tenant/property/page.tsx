import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Armchair, Calendar, IndianRupee, Phone, Mail } from 'lucide-react';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';

export default async function TenantPropertyPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const supabase = await createClient();

  // Find active tenant record by email
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, property:properties(*, broker:profiles!properties_broker_id_fkey(full_name, phone, email))')
    .eq('email', profile.email)
    .eq('is_active', true)
    .single();

  const tenant = tenants;

  if (!tenant || !tenant.property) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Active Rental Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn't find an active rental agreement linked to your email. If you recently moved in, please ask your broker to update the system.
        </p>
      </div>
    );
  }

  const property = tenant.property;
  // Use the broker profile that was joined with the property
  const broker = property.broker;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Property</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Details about your current rental.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* Left Column: Property Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 overflow-hidden">
            <div className="h-48 sm:h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-chart-2/10 flex items-center justify-center relative">
              {property.images && property.images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={property.images[0]} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-16 w-16 text-muted-foreground/15" />
              )}
            </div>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{property.title}</h2>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {property.address}, {property.locality}, {property.city}, {property.state} - {property.pincode}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Property Type</p>
                  <p className="font-medium">{PROPERTY_TYPE_LABELS[property.property_type as keyof typeof PROPERTY_TYPE_LABELS]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Furnishing</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Armchair className="h-4 w-4 text-muted-foreground" />
                    {FURNISHING_LABELS[property.furnishing as keyof typeof FURNISHING_LABELS]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Floor</p>
                  <p className="font-medium">{property.floor_number ? `${property.floor_number} of ${property.total_floors}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Area</p>
                  <p className="font-medium">{property.area_sqft ? `${property.area_sqft} sq.ft` : 'N/A'}</p>
                </div>
              </div>

              {property.description && (
                <div className="mt-6 pt-6 border-t border-border/40">
                  <h3 className="font-semibold mb-2 text-sm">Description</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {property.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Lease & Broker Info */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Lease Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monthly Rent</p>
                <p className="text-2xl font-bold flex items-center">
                  <IndianRupee className="h-5 w-5 text-muted-foreground mr-0.5" />
                  {tenant.rent_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Security Deposit</p>
                <p className="font-medium">₹{tenant.deposit_amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="pt-3 border-t border-border/40 flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Move-in Date</p>
                  <p className="text-sm font-medium">{new Date(tenant.move_in_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Lease Ends</p>
                  <p className="text-sm font-medium">
                    {tenant.lease_end_date ? new Date(tenant.lease_end_date).toLocaleDateString() : 'Ongoing'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {broker && (
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base">Broker Contact</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {broker.full_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{broker.full_name}</p>
                    <p className="text-xs text-muted-foreground">Property Manager</p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 text-sm">
                  {broker.phone && (
                    <a href={`tel:${broker.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="h-4 w-4" /> {broker.phone}
                    </a>
                  )}
                  {broker.email && (
                    <a href={`mailto:${broker.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-4 w-4" /> {broker.email}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
