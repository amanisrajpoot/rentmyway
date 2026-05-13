import { getProperties } from '@/lib/actions/properties';
import { getUserProfile } from '@/lib/actions/auth';
import { PropertiesClient } from './properties-client';

export default async function PropertiesPage() {
  const [properties, profile] = await Promise.all([
    getProperties(),
    getUserProfile(),
  ]);

  return (
    <PropertiesClient
      initialProperties={properties}
      userRole={profile?.role || 'tenant'}
    />
  );
}
