import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { MarketingClient } from './marketing-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function MarketingPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const { data: properties } = await getProperties({ type: 'pg' });

  return (
    <PageLayout>
      <PageHeader 
        title="Marketing & Branding"
        description="Generate business cards and view public microsites for your PG properties."
      />
      <div className="p-0 sm:p-6 w-full">
        <MarketingClient properties={properties as any} />
      </div>
    </PageLayout>
  );
}
