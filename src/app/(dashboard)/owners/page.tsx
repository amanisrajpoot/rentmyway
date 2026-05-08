import { getOwners } from '@/lib/actions/properties';
import { OwnersClient } from './owners-client';

export default async function OwnersPage() {
  const owners = await getOwners();
  return <OwnersClient initialOwners={owners as any} />;
}
