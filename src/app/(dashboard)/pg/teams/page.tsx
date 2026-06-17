import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { TeamsClient } from './teams-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function TeamsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const { data: properties } = await getProperties({ type: 'pg' });

  return (
    <PageLayout>
      <PageHeader title="Maintenance Teams" description="Manage maintenance teams for auto-delegation" />
      <TeamsClient properties={properties as any} />
    </PageLayout>
  );
}
