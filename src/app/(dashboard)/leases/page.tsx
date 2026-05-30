import { getLeases, getLeaseStats } from '@/lib/actions/leases';
import { LeasesClient } from './leases-client';

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search ?? '';
  const status = resolvedParams.status ?? 'all';

  const [leasesRes, statsRes] = await Promise.all([
    getLeases({
      search,
      status,
      page: 0,
      limit: 12,
    }),
    getLeaseStats(),
  ]);

  return (
    <LeasesClient
      initialLeases={(leasesRes as any).data || []}
      stats={(statsRes as any).data || { activeCount: 0, totalMonthlyRent: 0, expiringCount: 0 }}
      initialFilters={{
        search,
        status,
      }}
    />
  );
}
