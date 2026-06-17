import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { ServiceRequestsClient } from './service-requests-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function BrokerServiceRequestsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const { data: properties } = await getProperties({ type: 'pg' });

  return (
    <PageLayout>
      <PageHeader 
        title="PG Service Requests" 
        description="Manage tenant requests for cleaning, laundry, maintenance, etc." 
      />
      <ServiceRequestsClient properties={properties as any} />
    </PageLayout>
  );
}
