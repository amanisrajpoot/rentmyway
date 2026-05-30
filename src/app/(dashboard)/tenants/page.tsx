import { getTenants } from '@/lib/actions/tenants';
import { TenantsClient } from './tenants-client';

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    active?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search ?? '';
  const active = resolvedParams.active !== 'false'; // defaults to true if not explicitly 'false'

  const tenantsRes = await getTenants({
    search,
    active,
    page: 0,
    limit: 12,
  });

  const tenants = 'data' in tenantsRes && tenantsRes.data ? tenantsRes.data : [];

  return (
    <TenantsClient
      initialTenants={tenants}
      initialFilters={{
        search,
        active,
      }}
    />
  );
}
