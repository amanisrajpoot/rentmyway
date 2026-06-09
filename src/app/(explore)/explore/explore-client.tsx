'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PropertyCard } from '@/components/explore/property-card';
import { getPublicProperties } from '@/lib/actions/enquiries';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import type { Property } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, Map as MapIcon, LayoutGrid, SlidersHorizontal, Navigation, Loader2 } from 'lucide-react';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import MultiMapViewWrapper from '@/components/ui/multi-map-view-wrapper';
import { toast } from 'sonner';

interface ExploreClientProps {
  initialProperties: Property[];
  initialFilters: {
    city?: string;
    locality?: string;
    type?: string;
    furnishing?: string;
    minRent?: number;
    maxRent?: number;
    parking?: boolean;
    petFriendly?: boolean;
    bachelorAllowed?: boolean;
    nonVegAllowed?: boolean;
  };
}

export function ExploreClient({ initialProperties, initialFilters }: ExploreClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialProperties.length >= 12);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&email=contact@rentmyway.com`);
          const data = await res.json();
          
          if (data && data.address) {
            const detectedCity = data.address.city || data.address.town || data.address.state_district || 'Mumbai';
            const detectedLocality = data.address.suburb || data.address.neighbourhood || data.address.village || '';
            
            setCity(detectedCity);
            if (detectedLocality) setLocality(detectedLocality);
            
            toast.success(`Location found: ${detectedLocality ? detectedLocality + ', ' : ''}${detectedCity}`);
          }
        } catch (err) {
          toast.error('Failed to determine location details');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        toast.error('Could not get your location');
        setIsLocating(false);
      }
    );
  };

  // Filter states
  const [city, setCity] = useState(initialFilters.city || 'Mumbai');
  const [locality, setLocality] = useState(initialFilters.locality || '');
  const [typeFilter, setTypeFilter] = useState(initialFilters.type || 'all');
  const [furnishingFilter, setFurnishingFilter] = useState(initialFilters.furnishing || 'all');
  const [minRent, setMinRent] = useState(initialFilters.minRent?.toString() || '');
  const [maxRent, setMaxRent] = useState(initialFilters.maxRent?.toString() || '');
  
  const [parking, setParking] = useState(initialFilters.parking || false);
  const [petFriendly, setPetFriendly] = useState(initialFilters.petFriendly || false);
  const [bachelorAllowed, setBachelorAllowed] = useState(initialFilters.bachelorAllowed || false);
  const [nonVegAllowed, setNonVegAllowed] = useState(initialFilters.nonVegAllowed || false);

  // Sync state if initialProperties changes
  useEffect(() => {
    setProperties(initialProperties);
    setPage(0);
    setHasMore(initialProperties.length >= 12);
  }, [initialProperties]);

  // Debounce filters to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      let hasChanges = false;

      const setParam = (key: string, value: string) => {
        if (value) {
          if (params.get(key) !== value) {
            params.set(key, value);
            hasChanges = true;
          }
        } else {
          if (params.has(key)) {
            params.delete(key);
            hasChanges = true;
          }
        }
      };

      setParam('city', city);
      setParam('locality', locality);
      setParam('type', typeFilter === 'all' ? '' : typeFilter);
      setParam('furnishing', furnishingFilter === 'all' ? '' : furnishingFilter);
      setParam('minRent', minRent);
      setParam('maxRent', maxRent);
      setParam('parking', parking ? 'true' : '');
      setParam('petFriendly', petFriendly ? 'true' : '');
      setParam('bachelorAllowed', bachelorAllowed ? 'true' : '');
      setParam('nonVegAllowed', nonVegAllowed ? 'true' : '');

      if (hasChanges) {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [city, locality, typeFilter, furnishingFilter, minRent, maxRent, parking, petFriendly, bachelorAllowed, nonVegAllowed, router, pathname, searchParams]);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const res = await getPublicProperties({
        city,
        locality: locality || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        furnishing: furnishingFilter !== 'all' ? furnishingFilter : undefined,
        minRent: minRent ? parseInt(minRent, 10) : undefined,
        maxRent: maxRent ? parseInt(maxRent, 10) : undefined,
        parking: parking || undefined,
        pet_friendly: petFriendly || undefined,
        bachelor_allowed: bachelorAllowed || undefined,
        non_veg_allowed: nonVegAllowed || undefined,
        page: nextPage,
        limit: 12,
      });

      const nextProps = 'data' in res && res.data ? res.data : [];
      if (nextProps.length < 12) setHasMore(false);
      setProperties(prev => [...prev, ...nextProps]);
      setPage(nextPage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Search Header */}
      <div className="bg-background/80 backdrop-blur-xl border-b border-white/5 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Properties in {city}
            </h1>
            
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Primary Search */}
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 flex">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Locality, landmark, or builder..." 
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      className="pl-9 h-12 rounded-r-none bg-white/5 border-white/10 focus-visible:ring-primary/50 text-base"
                    />
                  </div>
                  <Button
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    variant="outline"
                    className="h-12 rounded-l-none border-l-0 bg-white/5 border-white/10 hover:bg-white/10 px-3 shrink-0"
                    title="Use my current location"
                  >
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Navigation className="h-4 w-4 text-primary" />}
                  </Button>
                </div>
                <Select value={city} onValueChange={(val) => { if (val) setCity(val); }}>
                  <SelectTrigger className="w-full sm:w-[180px] h-12 bg-white/5 border-white/10">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Pune">Pune</SelectItem>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Toggle */}
              <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 shrink-0 self-start">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? "bg-white/10 shadow-sm" : "hover:bg-white/5"}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" /> Grid
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('map')}
                  className={viewMode === 'map' ? "bg-white/10 shadow-sm" : "hover:bg-white/5"}
                >
                  <MapIcon className="h-4 w-4 mr-2" /> Map
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Select value={typeFilter} onValueChange={(val) => { if (val) setTypeFilter(val); }}>
                <SelectTrigger className="w-auto h-9 bg-white/5 border-white/10 text-sm gap-2">
                  <SelectValue placeholder="BHK Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any BHK</SelectItem>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={furnishingFilter} onValueChange={(val) => { if (val) setFurnishingFilter(val); }}>
                <SelectTrigger className="w-auto h-9 bg-white/5 border-white/10 text-sm gap-2">
                  <SelectValue placeholder="Furnishing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Furnishing</SelectItem>
                  {Object.entries(FURNISHING_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-white/5 rounded-md border border-white/10 p-1">
                <Input 
                  type="number" 
                  placeholder="Min ₹" 
                  value={minRent}
                  onChange={(e) => setMinRent(e.target.value)}
                  className="w-20 h-7 text-xs bg-transparent border-none focus-visible:ring-0 px-2"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input 
                  type="number" 
                  placeholder="Max ₹" 
                  value={maxRent}
                  onChange={(e) => setMaxRent(e.target.value)}
                  className="w-20 h-7 text-xs bg-transparent border-none focus-visible:ring-0 px-2"
                />
              </div>

              <Popover>
                <PopoverTrigger className={buttonVariants({ variant: 'ghost', size: 'sm', className: "h-9 text-muted-foreground hover:text-foreground border border-white/10 bg-white/5" })}>
                  <SlidersHorizontal className="h-4 w-4 mr-2" /> More Filters
                  {(parking || petFriendly || bachelorAllowed || nonVegAllowed) && (
                    <span className="ml-2 flex h-2 w-2 rounded-full bg-primary"></span>
                  )}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-4 border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-foreground mb-3">Amenities & Rules</h4>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="filter-parking" checked={parking} onCheckedChange={(c) => setParking(!!c)} />
                      <Label htmlFor="filter-parking" className="text-sm font-medium leading-none cursor-pointer">Parking Available</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="filter-pets" checked={petFriendly} onCheckedChange={(c) => setPetFriendly(!!c)} />
                      <Label htmlFor="filter-pets" className="text-sm font-medium leading-none cursor-pointer">Pet Friendly</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="filter-bachelors" checked={bachelorAllowed} onCheckedChange={(c) => setBachelorAllowed(!!c)} />
                      <Label htmlFor="filter-bachelors" className="text-sm font-medium leading-none cursor-pointer">Bachelors Allowed</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="filter-nonveg" checked={nonVegAllowed} onCheckedChange={(c) => setNonVegAllowed(!!c)} />
                      <Label htmlFor="filter-nonveg" className="text-sm font-medium leading-none cursor-pointer">Non-Veg Allowed</Label>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setParking(false);
                        setPetFriendly(false);
                        setBachelorAllowed(false);
                        setNonVegAllowed(false);
                      }} className="text-xs h-7 text-muted-foreground hover:text-foreground">
                        Clear All
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-black/10">
        {viewMode === 'grid' ? (
          <div className="max-w-7xl mx-auto px-6 py-8">
            {properties.length === 0 ? (
              <div className="text-center py-20 bg-card/30 rounded-2xl border border-white/5">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No properties found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search in a different locality.</p>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground mb-6">Showing {properties.length} properties</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                  {properties.map(property => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
                <InfiniteScroll
                  hasMore={hasMore}
                  isLoading={isLoading}
                  onLoadMore={loadMore}
                  loadingText="Loading more properties..."
                  endText="All properties loaded"
                />
              </>
            )}
          </div>
        ) : (
          <div className="h-[calc(100vh-14rem)] w-full relative">
            <MultiMapViewWrapper 
              properties={properties}
              city={city}
            />
            {/* Overlay property cards could go here */}
          </div>
        )}
      </div>
    </div>
  );
}
