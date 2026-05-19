import { getProperty } from '@/lib/actions/properties';
import { notFound } from 'next/navigation';
import type { PropertyType, FurnishingType } from '@/types/database';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  Building2, MapPin, IndianRupee, Edit, ArrowLeft,
  Ruler, Layers, Compass, Car, PawPrint, Utensils, Users,
} from 'lucide-react';
import MapViewWrapper from '@/components/ui/map-view-wrapper';
import { MediaDisplay } from '@/components/ui/media-display';
import { PropertyGallery } from '@/components/properties/property-gallery';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rented: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let property;
  try {
    property = await getProperty(id);
  } catch {
    notFound();
  }

  if (!property) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{property.title}</h1>
            <Badge className={statusColors[property.status]}>{property.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {property.locality}, {property.city}, {property.state}
          </p>
        </div>
        <Link href={`/properties/${id}/edit`}>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 overflow-hidden">
            {property.images && property.images.length > 0 ? (
              <PropertyGallery images={property.images} title={property.title} />
            ) : (
              <div className="h-64 bg-gradient-to-br from-primary/10 to-chart-2/10 flex items-center justify-center relative">
                <Building2 className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}
          </Card>

          {/* Property Details */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { icon: Building2, label: 'Type', value: PROPERTY_TYPE_LABELS[property.property_type as PropertyType] },
                  { icon: Building2, label: 'Furnishing', value: FURNISHING_LABELS[property.furnishing as FurnishingType] },
                  { icon: Ruler, label: 'Area', value: property.area_sqft ? `${property.area_sqft} sq.ft` : 'N/A' },
                  { icon: Layers, label: 'Floor', value: property.floor_number ? `${property.floor_number} of ${property.total_floors}` : 'N/A' },
                  { icon: Compass, label: 'Facing', value: property.facing || 'N/A' },
                  { icon: Users, label: 'Preferred', value: property.preferred_tenant || 'Any' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium capitalize">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap gap-3">
                {property.parking && (
                  <Badge variant="outline" className="gap-1"><Car className="h-3 w-3" /> Parking</Badge>
                )}
                {property.pet_friendly && (
                  <Badge variant="outline" className="gap-1"><PawPrint className="h-3 w-3" /> Pet Friendly</Badge>
                )}
                {property.non_veg_allowed && (
                  <Badge variant="outline" className="gap-1"><Utensils className="h-3 w-3" /> Non-Veg</Badge>
                )}
                {property.bachelor_allowed && (
                  <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> Bachelor</Badge>
                )}
              </div>

              {property.description && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{property.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm">{property.address}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {property.locality}, {property.city}, {property.state}
                  {property.pincode && ` - ${property.pincode}`}
                </p>
              </div>
              <MapViewWrapper address={property.address} locality={property.locality} city={property.city} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rent</span>
                <span className="font-bold text-lg">₹{property.rent.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deposit</span>
                <span className="font-semibold">₹{property.deposit.toLocaleString('en-IN')}</span>
              </div>
              {property.maintenance_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maintenance</span>
                  <span className="font-semibold">₹{property.maintenance_charge.toLocaleString('en-IN')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owner */}
          {property.owner && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Owner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{property.owner.name}</p>
                <p className="text-sm text-muted-foreground">{property.owner.phone}</p>
                {property.owner.email && (
                  <p className="text-sm text-muted-foreground">{property.owner.email}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
