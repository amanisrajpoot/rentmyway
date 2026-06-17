import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { RoomsClient } from './rooms-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function RoomsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  // Load properties to let user select which PG to manage
  const { data: properties } = await getProperties({ type: 'pg' });

  return (
    <PageLayout>
      <PageHeader title="Rooms & Beds" description="Manage PG rooms, beds, and occupancy" />
      <RoomsClient properties={properties as any} />
    </PageLayout>
  );
}
