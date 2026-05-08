import { getLeases } from '@/lib/actions/leases';
import { LeasesClient } from './leases-client';

export default async function LeasesPage() {
  const leases = await getLeases();
  return <LeasesClient initialLeases={leases as any} />;
}
