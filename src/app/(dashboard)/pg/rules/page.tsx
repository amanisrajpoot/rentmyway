import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { RulesClient } from './rules-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function RulesPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const { data: properties } = await getProperties({ type: 'pg' });

  return (
    <PageLayout>
      <PageHeader title="Rules & Policies" description="Manage PG rules and notice periods" />
      <RulesClient properties={properties as any} />
    </PageLayout>
  );
}
