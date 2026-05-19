import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Armchair, Calendar, IndianRupee, Phone, Mail, Wrench, Zap, MessageSquareWarning } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MoveOutDialog } from '@/components/tenant/move-out-dialog';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { MediaDisplay } from '@/components/ui/media-display';

export default async function TenantPropertyPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const supabase = await createClient();

  // Find active tenant record by email
  const { data: tenant } = await supabase
    .from('tenants')
    .select(`
      *, 
      property:properties(*, broker:profiles!properties_broker_id_fkey(full_name, phone, email)),
      leases:lease_agreements(*)
    `)
    .eq('email', profile.email)
    .eq('is_active', true)
    .single();

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

  // Fetch maintenance schedule connected to this property
  const { data: maintenance } = await supabase
    .from('maintenance_schedule')
    .select('*')
    .eq('property_id', property.id)
    .order('next_due', { ascending: true });

  const maintenanceList = maintenance || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Property</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Details about your current rental.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* Left Column: Property Info & Maintenance */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 overflow-hidden">
            <div className="h-48 sm:h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-chart-2/10 flex items-center justify-center relative">
              {property.images && property.images.length > 0 ? (
                <MediaDisplay 
                  url={property.images[0]} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                  autoPlayHover={true}
                  controls={true}
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

          {/* Maintenance & Service Schedules */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary animate-pulse" />
                Property Maintenance & Service Schedules
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {maintenanceList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No maintenance schedules are currently listed for this property.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {maintenanceList.map((item: any) => {
                    const isOverdue = new Date(item.next_due) < new Date();
                    return (
                      <div key={item.id} className="flex items-start sm:items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/30 gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm capitalize">{item.title || item.task_type || 'Maintenance Task'}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description || 'No description provided.'}</p>
                          <div className="flex items-center gap-2.5 mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Scheduled: {new Date(item.next_due).toLocaleDateString()}
                            </span>
                            {item.last_completed && (
                              <span className="text-[10px] text-emerald-400">
                                Last completed: {new Date(item.last_completed).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-xs px-2.5 py-0.5 capitalize ${
                          isOverdue 
                            ? 'bg-red-500/10 text-red-400 border-red-500/25' 
                            : 'bg-primary/10 text-primary border-primary/25'
                        }`}>
                          {isOverdue ? 'overdue' : 'scheduled'}
                        </Badge>
                      </div>
                    );
                  })}
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

          {/* Emergency Contacts */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  Plumber
                </div>
                <a href="tel:+" className="text-sm text-primary font-bold hover:underline">Call Now</a>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  Electrician
                </div>
                <a href="tel:+" className="text-sm text-primary font-bold hover:underline">Call Now</a>
              </div>
              <div className="p-2 rounded-lg bg-muted/20 border border-dashed border-border/60 text-center">
                <p className="text-[10px] text-muted-foreground">Ask broker to add more contacts</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Link href="/complaints/new">
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
                <MessageSquareWarning className="h-4 w-4" />
                File a Complaint
              </Button>
            </Link>
            <MoveOutDialog 
              tenantId={tenant.id}
              propertyId={property.id}
              brokerId={property.broker_id}
              noticePeriodDays={(tenant.leases as any[])?.find(l => l.status === 'active')?.notice_period_days || 30}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
