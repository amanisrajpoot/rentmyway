import { getUtilityBills, getUtilityBillStats } from '@/lib/actions/utility-bills';
import { UtilityBillsClient } from './utility-bills-client';

export default async function UtilityBillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    type?: string;
    status?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search ?? '';
  const billType = resolvedParams.type ?? 'all';
  const status = resolvedParams.status ?? 'all';

  const [bills, stats] = await Promise.all([
    getUtilityBills({
      search,
      billType,
      status,
      page: 0,
      limit: 12,
    }),
    getUtilityBillStats(),
  ]);

  return (
    <UtilityBillsClient
      initialBills={bills as any}
      stats={stats}
      initialFilters={{
        search,
        billType,
        status,
      }}
    />
  );
}
