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

  const [billsRes, statsRes] = await Promise.all([
    getUtilityBills({
      search,
      billType,
      status,
      page: 0,
      limit: 12,
    }),
    getUtilityBillStats(),
  ]);

  const bills = 'data' in billsRes && billsRes.data ? billsRes.data : [];
  const stats = 'data' in statsRes && statsRes.data ? statsRes.data : { totalAmount: 0, pendingAmount: 0 };

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
