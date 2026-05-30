import { getProperty } from '@/lib/actions/properties';
import { createClient } from '@/lib/supabase/server';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, IndianRupee, Phone, Shield, Armchair, Bath, BedDouble, Check } from 'lucide-react';
import Link from 'next/link';

export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const propertyId = resolvedParams.id;

  let property: any = null;
  let broker: any = null;
  let errorMsg = '';

  try {
    const propertyRes = await getProperty(propertyId);
    if ('data' in propertyRes && propertyRes.data) {
      property = propertyRes.data;
      const supabase = await createClient();
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', property.broker_id)
        .single();
      broker = data;
    } else if ('error' in propertyRes && propertyRes.error) {
      errorMsg = propertyRes.error;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Property not found';
  }

  if (errorMsg || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-border/50">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-bold">Listing Unavailable</h2>
            <p className="text-muted-foreground text-sm mt-2">
              This property listing is either draft, deleted, or no longer available.
            </p>
            <Link href="/" className="inline-block mt-6">
              <Button>Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brokerPhone = broker?.phone ? broker.phone.replace(/[^0-9]/g, '') : '';
  const message = `Hi ${broker?.full_name || 'there'}, I am interested in your property listing '${property.title}' at ${property.locality}. Is it still available?`;
  const waUrl = `https://wa.me/${brokerPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-background pb-16 font-sans">
      {/* Navbar header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <span className="font-bold text-lg">
              <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
                Rent
              </span>
              MyWay
            </span>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-3 py-1">
            Active Listing
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
        {/* Title and location summary */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/20 text-primary capitalize font-normal text-xs px-2.5 py-0.5">
              {PROPERTY_TYPE_LABELS[property.property_type as keyof typeof PROPERTY_TYPE_LABELS] || property.property_type}
            </Badge>
            <Badge variant="outline" className="border-border/50 text-muted-foreground capitalize font-normal text-xs px-2.5 py-0.5">
              {FURNISHING_LABELS[property.furnishing as keyof typeof FURNISHING_LABELS] || property.furnishing}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-4xl">{property.title}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 text-base">
            <MapPin className="h-4.5 w-4.5 text-primary shrink-0" />
            {property.address}, {property.locality}, {property.city}
          </p>
        </div>

        {/* Dynamic Image Grid */}
        {property.images && property.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[300px] md:h-[450px]">
            {/* Primary Main Image */}
            <div className="md:col-span-2 relative rounded-2xl overflow-hidden group bg-muted border border-border/40">
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
                <div className="flex-1 rounded-xl bg-card border border-border/30 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/20" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Highlights ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-card border border-border/40">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Monthly Rent</span>
                <span className="font-bold text-xl sm:text-2xl flex items-center gap-0.5 text-primary">
                  <IndianRupee className="h-5 w-5" />
                  {property.rent.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Security Deposit</span>
                <span className="font-bold text-xl sm:text-2xl flex items-center gap-0.5">
                  <IndianRupee className="h-5 w-5" />
                  {property.deposit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Furnishing</span>
                <span className="font-semibold text-sm flex items-center gap-1.5 pt-1">
                  <Armchair className="h-4.5 w-4.5 text-muted-foreground" />
                  {FURNISHING_LABELS[property.furnishing as keyof typeof FURNISHING_LABELS] || property.furnishing}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Area / Size</span>
                <span className="font-semibold text-sm flex items-center gap-1.5 pt-1">
                  <Building2 className="h-4.5 w-4.5 text-muted-foreground" />
                  {property.area_sqft ? `${property.area_sqft} Sq.Ft.` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Property Description</h2>
              <div className="text-muted-foreground text-sm sm:text-base leading-relaxed whitespace-pre-line bg-card/30 p-5 rounded-xl border border-border/20">
                {property.description || "Beautifully built property situated in prime locality. Highly accessible to local transits, schools, and shopping centers. Managed professionally by our property partners."}
              </div>
            </div>

            {/* Premium Specifications */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Features & Amenities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Premium Vitrified Flooring",
                  "24x7 Water Supply",
                  "Modular Kitchen setup",
                  "High security lock systems",
                  "Excellent natural ventilation",
                  "Power backup connection ready"
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Broker CTA Card */}
          <div className="space-y-6 sticky top-24">
            <Card className="border-border/50 relative overflow-hidden bg-card/60 backdrop-blur shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] opacity-[0.04]" />
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest block font-medium">Primary Contact</span>
                  <h3 className="font-bold text-lg">{broker?.full_name || 'RentMyWay Property Broker'}</h3>
                  <p className="text-xs text-muted-foreground">Licensed Professional Broker Associate</p>
                </div>

                <div className="h-[1px] bg-border/40" />

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Shield className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Verified Broker Listing</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Building2 className="h-4.5 w-4.5 text-primary shrink-0" />
                    <span>Direct Site Visits Arranged</span>
                  </div>
                </div>

                <a 
                  href={waUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block"
                >
                  <Button className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all hover:scale-[1.01] gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Broker on WhatsApp
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
