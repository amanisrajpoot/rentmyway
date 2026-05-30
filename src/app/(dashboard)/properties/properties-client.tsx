'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Property } from '@/types/database';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  IndianRupee,
  MoreVertical,
  Armchair,
  Download,
  Share2,
  FileSpreadsheet,
} from 'lucide-react';
import { exportToCSV } from '@/lib/utils/export';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { markPropertyAsRented, markPropertyAsAvailable, deleteProperty, getProperties } from '@/lib/actions/properties';
import { toast } from 'sonner';
import { MediaDisplay } from '@/components/ui/media-display';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rented: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

interface PropertiesClientProps {
  initialProperties: Property[];
  userRole: string;
  initialFilters: {
    status: string;
    type: string;
    search: string;
    minRent: string;
    maxRent: string;
  };
}

export function PropertiesClient({ initialProperties, userRole, initialFilters }: PropertiesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local filter states for immediate input responsiveness
  const [search, setSearch] = useState(initialFilters.search);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);
  const [typeFilter, setTypeFilter] = useState(initialFilters.type);
  const [minRent, setMinRent] = useState(initialFilters.minRent);
  const [maxRent, setMaxRent] = useState(initialFilters.maxRent);

  // Infinite Scroll state
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialProperties.length >= 12);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if initialProperties changes (from a server-side filter change)
  useEffect(() => {
    setProperties(initialProperties);
    setPage(0);
    setHasMore(initialProperties.length >= 12);
  }, [initialProperties]);

  // Debounce search/filter parameter updates to prevent rapid server fetches
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (search) params.set('search', search);
      else params.delete('search');

      if (statusFilter !== 'all') params.set('status', statusFilter);
      else params.delete('status');

      if (typeFilter !== 'all') params.set('type', typeFilter);
      else params.delete('type');

      if (minRent) params.set('minRent', minRent);
      else params.delete('minRent');

      if (maxRent) params.set('maxRent', maxRent);
      else params.delete('maxRent');

      router.replace(`${pathname}?${params.toString()}`);
    }, 400);

    return () => clearTimeout(handler);
  }, [search, statusFilter, typeFilter, minRent, maxRent, router, pathname, searchParams]);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const nextPropertiesRes = await getProperties({
        status: statusFilter,
        type: typeFilter,
        search: search,
        minRent: minRent ? parseInt(minRent, 10) : undefined,
        maxRent: maxRent ? parseInt(maxRent, 10) : undefined,
        page: nextPage,
        limit: 12,
      });

      if ('error' in nextPropertiesRes && nextPropertiesRes.error) {
        toast.error(nextPropertiesRes.error);
        return;
      }

      const nextProperties = 'data' in nextPropertiesRes && nextPropertiesRes.data ? nextPropertiesRes.data : [];

      if (nextProperties.length < 12) {
        setHasMore(false);
      }
      setProperties((prev) => [...prev, ...nextProperties]);
      setPage(nextPage);
    } catch {
      toast.error('Failed to load more properties due to an unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  async function handleStatusChange(id: string, action: 'rent' | 'available') {
    try {
      if (action === 'rent') {
        const res = await markPropertyAsRented(id);
        if ('error' in res && res.error) throw new Error(res.error);
        toast.success('Property marked as rented');
      } else {
        const res = await markPropertyAsAvailable(id);
        if ('error' in res && res.error) throw new Error(res.error);
        toast.success('Property marked as available');
      }
      // Re-trigger server updates
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update property status');
    }
  }

  const handleExportCSV = () => {
    const dataToExport = properties.map((p) => ({
      Title: p.title,
      Status: p.status,
      Type: PROPERTY_TYPE_LABELS[p.property_type as keyof typeof PROPERTY_TYPE_LABELS] || p.property_type,
      Rent: p.rent,
      Deposit: p.deposit,
      Furnishing: FURNISHING_LABELS[p.furnishing as keyof typeof FURNISHING_LABELS] || p.furnishing,
      Locality: p.locality,
      City: p.city,
      Address: p.address,
      AreaSqFt: p.area_sqft || '',
    }));
    exportToCSV(dataToExport, `Properties_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <PageLayout>
      <PageHeader 
        title="Properties" 
        description="Manage your real estate listings"
      >
        <Button 
          onClick={handleExportCSV}
          variant="outline"
          className="border-primary/20 hover:bg-primary/5 text-primary w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        {userRole === 'broker' && (
          <Link 
            href="/properties/new" 
            className={cn(buttonVariants({ size: 'default' }), "w-full sm:w-auto bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white shadow-lg shadow-primary/20")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Link>
        )}
      </PageHeader>

      <PageToolbar>
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search Mumbai, layout name, locality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-[130px] sm:w-[140px] bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
            <SelectTrigger className="w-[130px] sm:w-[160px] bg-card">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="number"
                placeholder="Min Rent"
                value={minRent}
                onChange={(e) => setMinRent(e.target.value)}
                className="w-[110px] pl-8 bg-card"
              />
            </div>
            <span className="text-muted-foreground text-sm">-</span>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="number"
                placeholder="Max Rent"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="w-[110px] pl-8 bg-card"
              />
            </div>
          </div>
        </div>
      </PageToolbar>

      <PageContent>
      {properties.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg">No properties found</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
              Try adjusting your filters to find what you're looking for.
            </p>
            {userRole === 'broker' && (
              <Link 
                href="/properties/new" 
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "inline-flex mt-4")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {properties.map((property) => (
              <Card
                key={property.id}
                className="border-border/50 group overflow-hidden"
              >
                {/* Image area */}
                <Link href={`/properties/${property.id}`}>
                  <div className="h-36 sm:h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-chart-2/10 flex items-center justify-center relative cursor-pointer overflow-hidden">
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
                    <Badge className={`absolute top-3 right-3 ${statusColors[property.status]} text-[11px]`}>
                      {property.status}
                    </Badge>
                  </div>
                </Link>

                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/properties/${property.id}`} className="min-w-0 flex-1 group/link">
                      <h3 className="font-semibold truncate group-hover/link:text-primary transition-colors">{property.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{property.locality}, {property.city}</span>
                      </p>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.location.href = `/properties/${property.id}`}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const shareUrl = `${window.location.origin}/listings/${property.id}`;
                          navigator.clipboard.writeText(shareUrl);
                          toast.success('Public listing link copied to clipboard!');
                        }}>
                          Share Public Link
                        </DropdownMenuItem>
                        {userRole === 'broker' && (
                          <>
                            <DropdownMenuItem onClick={() => window.location.href = `/properties/${property.id}/edit`}>
                              Edit Property
                            </DropdownMenuItem>
                            {property.status === 'available' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(property.id, 'rent')}>
                                Mark as Rented
                              </DropdownMenuItem>
                            )}
                            {property.status === 'rented' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(property.id, 'available')}>
                                Mark as Available
                              </DropdownMenuItem>
                            )}
                            <ConfirmDialog
                              trigger={
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  Delete
                                </DropdownMenuItem>
                              }
                              title="Delete Property"
                              description={`Are you sure you want to permanently delete "${property.title}"? This action cannot be undone.`}
                              confirmLabel="Delete Property"
                              onConfirm={async () => {
                                try {
                                  const res = await deleteProperty(property.id);
                                  if ('error' in res && res.error) throw new Error(res.error);
                                  toast.success('Property deleted');
                                  router.refresh();
                                } catch (err: unknown) {
                                  toast.error(err instanceof Error ? err.message : 'Failed to delete property');
                                }
                              }}
                            />
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
            loadingText="Loading more properties..."
            endText="All properties loaded"
          />
        </div>
      )}
      </PageContent>
    </PageLayout>
  );
}

