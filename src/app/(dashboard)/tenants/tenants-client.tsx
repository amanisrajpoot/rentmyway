'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Tenant } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Eye, UserCheck, IndianRupee, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { PhoneLink } from '@/components/ui/phone-link';
import { getTenants } from '@/lib/actions/tenants';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { toast } from 'sonner';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';
import { TenantFormDialog } from '@/components/tenant/tenant-form-dialog';

type TenantWithProperty = Tenant & { property?: { id: string; title: string; locality: string; city: string } };

interface TenantsClientProps {
  initialTenants: TenantWithProperty[];
  initialFilters: {
    search: string;
    active: boolean;
  };
}

export function TenantsClient({ initialTenants, initialFilters }: TenantsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local filter states
  const [search, setSearch] = useState(initialFilters.search);
  const [showActive, setShowActive] = useState(initialFilters.active);

  // Paginated/accumulated items
  const [tenants, setTenants] = useState<TenantWithProperty[]>(initialTenants);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialTenants.length >= 12);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if initialTenants changes (i.e. due to a server-side filter change)
  useEffect(() => {
    setTenants(initialTenants);
    setPage(0);
    setHasMore(initialTenants.length >= 12);
  }, [initialTenants]);

  // Debounce search parameters
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (search) params.set('search', search);
      else params.delete('search');

      if (!showActive) params.set('active', 'false');
      else params.delete('active');

      router.replace(`${pathname}?${params.toString()}`);
    }, 400);

    return () => clearTimeout(handler);
  }, [search, showActive, router, pathname, searchParams]);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const nextTenantsRes = await getTenants({
        search,
        active: showActive,
        page: nextPage,
        limit: 12,
      });

      if ('error' in nextTenantsRes && nextTenantsRes.error) {
        toast.error(nextTenantsRes.error);
        return;
      }

      const nextTenants = 'data' in nextTenantsRes && nextTenantsRes.data ? nextTenantsRes.data : [];

      if (nextTenants.length < 12) {
        setHasMore(false);
      }
      setTenants((prev) => [...prev, ...(nextTenants as TenantWithProperty[])]);
      setPage(nextPage);
    } catch {
      toast.error('Failed to load more tenants due to an unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader 
        title="Tenants"
        description="Manage your tenants"
      >
        <Button
          variant={showActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowActive(true)}
          className="flex-1 sm:flex-none"
        >
          Active
        </Button>
        <Button
          variant={!showActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowActive(false)}
          className="flex-1 sm:flex-none"
        >
          Past
        </Button>
        <TenantFormDialog onSuccess={() => window.location.reload()} />
      </PageHeader>

      <PageToolbar>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
      </PageToolbar>

      <PageContent>
      {tenants.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No tenants found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add a new tenant manually or by converting a lead.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Move-in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} className="animate-fade-in">
                    <TableCell>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <PhoneLink phone={tenant.phone} />
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.property && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{tenant.property.title}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-0.5">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {tenant.rent_amount.toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(tenant.move_in_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
            loadingText="Loading more tenants..."
            endText="All tenants loaded"
          />
        </div>
      )}
      </PageContent>
    </PageLayout>
  );
}
