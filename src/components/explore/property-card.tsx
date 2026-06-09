'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Property } from '@/types/database';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, IndianRupee, Armchair, Building2, Heart } from 'lucide-react';
import { MediaDisplay } from '@/components/ui/media-display';
import { EnquiryModal } from './enquiry-modal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Initialize saved state from localStorage
  useEffect(() => {
    const savedProperties = JSON.parse(localStorage.getItem('rentmyway_saved_properties') || '[]');
    setIsSaved(savedProperties.includes(property.id));
  }, [property.id]);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const savedProperties = JSON.parse(localStorage.getItem('rentmyway_saved_properties') || '[]');
    
    if (isSaved) {
      const newSaved = savedProperties.filter((id: string) => id !== property.id);
      localStorage.setItem('rentmyway_saved_properties', JSON.stringify(newSaved));
      setIsSaved(false);
      toast.success('Removed from saved properties');
    } else {
      savedProperties.push(property.id);
      localStorage.setItem('rentmyway_saved_properties', JSON.stringify(savedProperties));
      setIsSaved(true);
      toast.success('Property saved!');
    }
  };

  return (
    <>
      <Card className="border-border/50 group overflow-hidden bg-card/40 backdrop-blur hover:bg-card/60 transition-colors">
        <Link href={`/property/${property.id}`} className="block">
          <div className="h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-chart-2/10 flex items-center justify-center relative cursor-pointer overflow-hidden">
            {property.images && property.images.length > 0 ? (
              <MediaDisplay 
                url={property.images[0]} 
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                autoPlayHover={true}
              />
            ) : (
              <Building2 className="h-10 w-10 text-muted-foreground/15" />
            )}
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs font-medium">
                {PROPERTY_TYPE_LABELS[property.property_type as keyof typeof PROPERTY_TYPE_LABELS] || property.property_type}
              </Badge>
            </div>

            {/* Save Button */}
            <button 
              onClick={toggleSave}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/50 backdrop-blur hover:bg-background flex items-center justify-center transition-all shadow-sm"
              aria-label={isSaved ? "Remove from saved" : "Save property"}
            >
              <Heart className={cn("h-4 w-4 transition-colors", isSaved ? "fill-destructive text-destructive" : "text-foreground")} />
            </button>
          </div>

          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{property.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{property.locality}, {property.city}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[11px] border-border/50 bg-background/50">
                <Armchair className="h-3 w-3 mr-1 text-muted-foreground" />
                {FURNISHING_LABELS[property.furnishing as keyof typeof FURNISHING_LABELS] || property.furnishing}
              </Badge>
              {property.area_sqft && (
                <Badge variant="outline" className="text-[11px] border-border/50 bg-background/50">
                  <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                  {property.area_sqft} sqft
                </Badge>
              )}
            </div>

            <div className="flex items-end justify-between pt-4 border-t border-border/40">
              <div>
                <div className="flex items-baseline gap-0.5">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xl tabular-nums text-foreground">
                    {property.rent.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/mo</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Deposit ₹{property.deposit.toLocaleString('en-IN')}
                </div>
              </div>
              
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                variant="default" 
                size="sm"
                className="bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none rounded-full px-4 transition-colors"
              >
                Enquire
              </Button>
            </div>
          </CardContent>
        </Link>
      </Card>

      <EnquiryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        propertyId={property.id}
        propertyTitle={property.title}
        brokerId={property.broker_id}
      />
    </>
  );
}
