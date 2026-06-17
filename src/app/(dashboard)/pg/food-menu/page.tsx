import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { FoodMenuClient } from './food-menu-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function FoodMenuPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const { data: properties } = await getProperties({ type: 'pg' });

  return (
    <PageLayout>
      <PageHeader title="Food Menu" description="Manage weekly meal plans" />
      <FoodMenuClient properties={properties as any} />
    </PageLayout>
  );
}
