import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Building2, MapPin, CheckCircle, Bed, Users, ShieldAlert, Utensils } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function PublicPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: property } = await supabase.from('properties').select('*, owner:owners(*)').eq('id', id).single();
  
  if (!property) return notFound();

  // Fetch PG details if it's a PG
  let rooms = [];
  let menu = [];
  let rules = [];
  
  if (property.property_type === 'pg') {
    const [roomsData, menuData, rulesData] = await Promise.all([
      supabase.from('pg_rooms').select('*').eq('property_id', property.id).eq('is_active', true),
      supabase.from('pg_food_menu').select('*').eq('property_id', property.id).eq('is_active', true),
      supabase.from('pg_rules').select('*').eq('property_id', property.id).eq('is_active', true)
    ]);
    rooms = roomsData.data || [];
    menu = menuData.data || [];
    rules = rulesData.data || [];
  }

  const brandName = property.pg_brand_name || property.title;
  const tagline = property.pg_tagline || 'Your home away from home';

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero Section */}
      <div className="relative w-full h-[400px] sm:h-[500px]">
        {property.images && property.images.length > 0 ? (
          <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover brightness-75" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Building2 className="h-20 w-20 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {property.pg_logo_url && (
              <img src={property.pg_logo_url} alt="Logo" className="h-16 w-16 sm:h-24 sm:w-24 rounded-2xl shadow-xl bg-background border-4 border-background object-cover" />
            )}
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
                {brandName}
              </h1>
              <p className="text-white/90 text-lg sm:text-xl font-medium mt-1 drop-shadow">
                {tagline}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1 text-sm">
              <MapPin className="h-4 w-4 mr-1.5" />
              {property.locality}, {property.city}
            </Badge>
            {property.gender_preference && property.gender_preference !== 'coed' && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground border-0 shadow-lg px-3 py-1 text-sm capitalize">
                <Users className="h-4 w-4 mr-1.5" />
                {property.gender_preference} Only
              </Badge>
            )}
            {property.meal_plan_included && (
              <Badge variant="secondary" className="bg-emerald-500 text-white border-0 shadow-lg px-3 py-1 text-sm">
                <Utensils className="h-4 w-4 mr-1.5" />
                Meals Included
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-10 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* About */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">About the Property</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {property.description || 'Welcome to our premium living space designed for comfort and convenience.'}
            </p>
          </section>

          {/* Rooms */}
          {property.property_type === 'pg' && rooms.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Available Options</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* deduplicate room types for display */}
                {Array.from(new Set(rooms.map(r => r.room_type))).map(type => {
                  const rTypeRooms = rooms.filter(r => r.room_type === type);
                  const minRent = Math.min(...rTypeRooms.map(r => r.rent_per_bed));
                  return (
                    <Card key={type} className="border-border/50 bg-gradient-to-br from-card to-muted/20">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-primary/10">
                            <Bed className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg capitalize">{type} Sharing</h3>
                            <p className="text-sm text-muted-foreground">Starts from ₹{minRent.toLocaleString('en-IN')}/mo</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {/* Rules */}
          {property.property_type === 'pg' && rules.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">House Rules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-start gap-2.5 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{rule.title}</p>
                      {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/50 sticky top-24 shadow-xl shadow-primary/5">
            <CardContent className="p-6 text-center space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                <div className="text-4xl font-extrabold text-primary">₹{(property.property_type === 'pg' && rooms.length > 0 ? Math.min(...rooms.map(r => r.rent_per_bed)) : property.rent).toLocaleString('en-IN')}</div>
                <p className="text-sm text-muted-foreground mt-1">per month</p>
              </div>
              
              <a href={`tel:${property.owner?.phone}`} className="w-full block">
                <Button className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-xl transition-all" size="lg">
                  Contact Us
                </Button>
              </a>
              
              <p className="text-xs text-muted-foreground">Powered by RentMyWay</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
