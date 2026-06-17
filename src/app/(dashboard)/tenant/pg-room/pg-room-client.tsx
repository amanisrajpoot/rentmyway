'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Users, IndianRupee, MapPin, Phone, Mail, Wrench, ShieldAlert, Utensils, Zap, ExternalLink, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MoveOutDialog } from '@/components/tenant/move-out-dialog';
import { MediaDisplay } from '@/components/ui/media-display';

export function PgRoomClient({ 
  tenant, 
  property, 
  bedInfo, 
  roomInfo, 
  roommates, 
  broker, 
  emergencyContacts 
}: any) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* Left Column: Room & Bed Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PG Brand Card */}
          <Card className="border-border/50 overflow-hidden bg-gradient-to-br from-primary/5 to-chart-2/5">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                {property.pg_logo_url ? (
                  <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 border-2 border-border/50 shadow-md">
                    <img src={property.pg_logo_url} alt="PG Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20 shadow-inner">
                    <Bed className="h-10 w-10 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {property.pg_brand_name || property.title}
                  </h2>
                  {property.pg_tagline && (
                    <p className="text-muted-foreground mt-1 font-medium">{property.pg_tagline}</p>
                  )}
                  <p className="text-sm text-foreground/70 flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                    <MapPin className="h-4 w-4" />
                    {property.locality}, {property.city}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room & Bed Details */}
          {roomInfo && bedInfo ? (
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bed className="h-5 w-5 text-primary" />
                  Room {roomInfo.room_number} — Bed {bedInfo.bed_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Room Type</p>
                    <p className="font-semibold capitalize flex items-center gap-1.5">
                      {roomInfo.room_type} Sharing
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Floor</p>
                    <p className="font-semibold">{roomInfo.floor_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Monthly Rent</p>
                    <p className="font-semibold flex items-center">
                      <IndianRupee className="h-4 w-4 mr-0.5 text-muted-foreground" />
                      {tenant.rent_amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Deposit Paid</p>
                    <p className="font-semibold flex items-center">
                      <IndianRupee className="h-4 w-4 mr-0.5 text-muted-foreground" />
                      {tenant.deposit_amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {roomInfo.amenities && roomInfo.amenities.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border/40">
                    <h3 className="text-sm font-semibold mb-3">Room Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {roomInfo.amenities.map((amenity: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="capitalize text-xs py-1">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Your bed assignment details are currently unavailable.</p>
              </CardContent>
            </Card>
          )}

          {/* Roommates */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Your Roommates
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {roommates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  You currently have no roommates.
                </p>
              ) : (
                <div className="space-y-3">
                  {roommates.map((rm: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {rm.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{rm.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Bed className="h-3 w-3" /> Bed {rm.bed_number}
                          </p>
                        </div>
                      </div>
                      {rm.phone && (
                        <a href={`tel:${rm.phone}`} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions & Contacts */}
        <div className="space-y-6">
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/pg/food-menu">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/30">
                <Utensils className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold whitespace-normal">Food Menu</span>
              </Button>
            </Link>
            <Link href="/pg/rules">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/30">
                <ShieldAlert className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold whitespace-normal">PG Rules</span>
              </Button>
            </Link>
            <Link href="/tenant/service-requests" className="col-span-2">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Wrench className="h-4 w-4" />
                Raise Service Request
              </Button>
            </Link>
          </div>

          <MoveOutDialog 
            tenantId={tenant.id}
            propertyId={property.id}
            brokerId={property.broker_id}
            noticePeriodDays={30} // Could be fetched from pg_notice_periods
          />

          {/* Contacts */}
          {broker && (
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold">PG Manager</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center font-bold text-chart-3">
                    {broker.full_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{broker.full_name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {broker.phone && (
                    <a href={`tel:${broker.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="h-4 w-4 shrink-0" /> {broker.phone}
                    </a>
                  )}
                  {broker.email && (
                    <a href={`mailto:${broker.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors break-all">
                      <Mail className="h-4 w-4 shrink-0" /> {broker.email}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/40 bg-red-500/5">
              <CardTitle className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency Support
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {emergencyContacts.length > 0 ? (
                emergencyContacts.map((contact: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-full bg-background border border-border/50">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{contact.role}</p>
                        <p className="text-xs text-muted-foreground capitalize">{contact.name}</p>
                      </div>
                    </div>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="h-8 w-8 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground italic bg-muted/20 rounded-lg">
                  No emergency contacts listed.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
