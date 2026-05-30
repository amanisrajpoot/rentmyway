import { getOwners } from '@/lib/actions/properties';
import { OwnersClient } from './owners-client';

export default async function OwnersPage() {
  const ownersRes = await getOwners();
  const owners = 'data' in ownersRes && ownersRes.data ? ownersRes.data : [];
  return <OwnersClient initialOwners={owners as any} />;
}
