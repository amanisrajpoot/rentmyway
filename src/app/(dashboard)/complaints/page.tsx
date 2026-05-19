import { getComplaints } from '@/lib/actions/complaints';
import { ComplaintsClient } from './complaints-client';

export default async function ComplaintsPage({
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

  const complaints = await getComplaints({
    search,
    status,
    page: 0,
    limit: 12,
  });

  return (
    <ComplaintsClient
      initialComplaints={complaints}
      initialFilters={{
        search,
        status,
      }}
    />
  );
}
