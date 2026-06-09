import { getPublicProperty } from '@/lib/actions/enquiries';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, IndianRupee, Phone, Shield, Armchair, Check, Share2 } from 'lucide-react';
import Link from 'next/link';
import { PropertyDetailClient } from './property-detail-client';
import MapViewWrapper from '@/components/ui/map-view-wrapper';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const propertyRes = await getPublicProperty(resolvedParams.id);
  
  if (!propertyRes.data) return { title: 'Property Not Found' };
  
  return {
    title: `${propertyRes.data.title} | RentMyWay`,
    description: propertyRes.data.description || `Check out this ${propertyRes.data.property_type} in ${propertyRes.data.locality}`,
  };
}

export default async function PublicPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const propertyId = resolvedParams.id;

  const { data: property, error } = await getPublicProperty(propertyId);

  if (error || !property) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-bold">Listing Unavailable</h2>
            <p className="text-muted-foreground text-sm mt-2">
              This property may have been rented out or is no longer available.
            </p>
            <Link href="/explore" className="inline-block mt-6">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90">
                Browse Other Properties
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-16 font-sans">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Title and location summary */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors capitalize font-medium px-3 py-1">
              {PROPERTY_TYPE_LABELS[property.property_type as keyof typeof PROPERTY_TYPE_LABELS] || property.property_type}
            </Badge>
            <Badge variant="outline" className="border-border/50 bg-background/50 backdrop-blur capitalize font-medium px-3 py-1 text-muted-foreground">
              {FURNISHING_LABELS[property.furnishing as keyof typeof FURNISHING_LABELS] || property.furnishing}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-4xl leading-tight">
            {property.title}
          </h1>
          <p className="text-muted-foreground flex items-center gap-1.5 text-base sm:text-lg">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            {property.address}, {property.locality}, {property.city}
          </p>
        </div>

        {/* Dynamic Image Grid */}
        {property.images && property.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-1 gap-4 h-[300px] md:h-[500px]">
            {/* Primary Main Image */}
            <div className="md:col-span-3 relative rounded-2xl overflow-hidden group bg-muted border border-border/40">
              <img 
                src={property.images[0]} 
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
              />
            </div>
            {/* Side Grid Images */}
            <div className="hidden md:flex flex-col gap-4 h-full">
              {property.images.slice(1, 3).map((imgUrl: string, idx: number) => (
                <div key={idx} className="flex-1 relative rounded-xl overflow-hidden group bg-muted border border-border/40">
                  <img 
                    src={imgUrl} 
                    alt={`${property.title} - ${idx + 2}`} 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              ))}
              {property.images.length < 3 && (
                <div className="flex-1 rounded-xl bg-card/30 border border-border/30 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/20" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Highlights ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-2xl bg-card/40 backdrop-blur-md border border-white/5 shadow-xl shadow-black/5">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Monthly Rent</span>
                <span className="font-bold text-2xl flex items-center gap-0.5 text-foreground">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  {property.rent.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Deposit</span>
                <span className="font-bold text-2xl flex items-center gap-0.5 text-foreground">
                  <IndianRupee className="h-5 w-5" />
                  {property.deposit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Furnishing</span>
                <span className="font-semibold text-base flex items-center gap-2 pt-1 text-foreground">
                  <Armchair className="h-5 w-5 text-muted-foreground" />
                  {FURNISHING_LABELS[property.furnishing as keyof typeof FURNISHING_LABELS] || property.furnishing}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Area / Size</span>
                <span className="font-semibold text-base flex items-center gap-2 pt-1 text-foreground">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  {property.area_sqft ? `${property.area_sqft} sqft` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">About this property</h2>
              <div className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">
                {property.description || "Beautifully built property situated in prime locality. Highly accessible to local transits, schools, and shopping centers. Managed professionally."}
              </div>
            </div>

            {/* Premium Specifications */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Features & Rules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-base text-foreground bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  Parking: {property.parking ? 'Available' : 'Not Available'}
                </div>
                <div className="flex items-center gap-3 text-base text-foreground bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  Pets: {property.pet_friendly ? 'Allowed' : 'Not Allowed'}
                </div>
                <div className="flex items-center gap-3 text-base text-foreground bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  Bachelors: {property.bachelor_allowed ? 'Allowed' : 'Not Allowed'}
                </div>
                <div className="flex items-center gap-3 text-base text-foreground bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  Non-Veg: {property.non_veg_allowed ? 'Allowed' : 'Not Allowed'}
                </div>
              </div>
            </div>

            {/* Map Location */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Location</h2>
              <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-white/10 relative z-0">
                <MapViewWrapper 
                  address={property.address}
                  locality={property.locality}
                  city={property.city}
                />
              </div>
            </div>
            
          </div>

          {/* Sticky Sidebar / Bottom Bar Client Component */}
          <PropertyDetailClient 
            propertyId={property.id} 
            propertyTitle={property.title} 
            brokerId={property.broker_id} 
          />

        </div>
      </main>
    </div>
  );
}
