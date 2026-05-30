import { getProperties } from '@/lib/actions/properties';
import { getUserProfile } from '@/lib/actions/auth';
import { PropertiesClient } from './properties-client';

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    minRent?: string;
    maxRent?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const status = resolvedParams.status ?? 'all';
  const type = resolvedParams.type ?? 'all';
  const search = resolvedParams.search ?? '';
  const minRent = resolvedParams.minRent ? parseInt(resolvedParams.minRent, 10) : undefined;
  const maxRent = resolvedParams.maxRent ? parseInt(resolvedParams.maxRent, 10) : undefined;

  const [propertiesRes, profile] = await Promise.all([
    getProperties({
      status,
      type,
      search,
      minRent,
      maxRent,
      page: 0,
      limit: 12, // Let's use 12 for grid alignment
    }),
    getUserProfile(),
  ]);

  const properties = 'data' in propertiesRes && propertiesRes.data ? propertiesRes.data : [];

  return (
    <PropertiesClient
      initialProperties={properties}
      userRole={profile?.role || 'tenant'}
      initialFilters={{
        status,
        type,
        search,
        minRent: resolvedParams.minRent ?? '',
        maxRent: resolvedParams.maxRent ?? '',
      }}
    />
  );
}
