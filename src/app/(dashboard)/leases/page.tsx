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

  const [leases, stats] = await Promise.all([
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
      initialLeases={leases as any}
      stats={stats}
      initialFilters={{
        search,
        status,
      }}
    />
  );
}
