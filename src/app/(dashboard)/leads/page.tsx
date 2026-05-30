import { getLeads, getBrokerSiteVisits } from '@/lib/actions/leads';
import { LeadsClient } from './leads-client';

export default async function LeadsPage({
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

  const [leadsRes, siteVisitsRes] = await Promise.all([
    getLeads({
      search,
      status,
      page: 0,
      limit: 12,
    }),
    getBrokerSiteVisits()
  ]);

  const leads = 'data' in leadsRes && leadsRes.data ? leadsRes.data : [];
  const siteVisits = 'data' in siteVisitsRes && siteVisitsRes.data ? siteVisitsRes.data : [];

  return (
    <LeadsClient
      initialLeads={leads}
      initialSiteVisits={siteVisits as any[]}
      initialFilters={{
        search,
        status,
      }}
    />
  );
}
