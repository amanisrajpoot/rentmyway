import { getPayments, getFinancialStats } from '@/lib/actions/payments';
import { getOwnerPayouts } from '@/lib/actions/owner-payouts';
import { PaymentsClient } from './payments-client';
import { getRentSchedule } from '@/lib/actions/rent-schedule';

export default async function PaymentsPage({
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

  const [paymentsRes, payoutsRes, statsRes, schedulesRes] = await Promise.all([
    getPayments({
      search,
      page: 0,
      limit: 12,
    }),
    getOwnerPayouts({
      search,
      status,
      page: 0,
      limit: 12,
    }),
    getFinancialStats(),
    getRentSchedule(),
  ]);

  const payments = 'data' in paymentsRes && paymentsRes.data ? paymentsRes.data : [];
  const payouts = 'data' in payoutsRes && payoutsRes.data ? payoutsRes.data : [];
  const stats = 'data' in statsRes && statsRes.data ? statsRes.data : { totalCollected: 0, totalPayouts: 0, pendingPayouts: 0, totalCollectionsCount: 0, totalPayoutsCount: 0 };
  const schedules = 'data' in schedulesRes && schedulesRes.data ? schedulesRes.data : [];

  return (
    <PaymentsClient
      initialPayments={payments as any}
      initialPayouts={payouts}
      stats={stats}
      initialSchedules={schedules as any}
      initialFilters={{
        search,
        status,
      }}
    />
  );
}
