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

  const [payments, payouts, stats, schedules] = await Promise.all([
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
