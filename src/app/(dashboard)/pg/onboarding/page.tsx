import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './onboarding-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function OnboardingPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const { data: properties } = await getProperties({ type: 'pg' });

  return (
    <PageLayout>
      <PageHeader title="Bulk Onboarding" description="Onboard multiple tenants and assign beds at once" />
      <OnboardingClient properties={properties as any} />
    </PageLayout>
  );
}
