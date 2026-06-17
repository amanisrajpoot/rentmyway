import { getUserProfile } from '@/lib/actions/auth';
import { getProperties } from '@/lib/actions/properties';
import { redirect } from 'next/navigation';
import { RulesClient } from './rules-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function RulesPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  let propertiesData = [];
  
  if (profile.role === 'tenant') {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: tenant } = await supabase.from('tenants').select('property:properties(*)').eq('email', profile.email).eq('is_active', true).single();
    if (tenant?.property) propertiesData = [tenant.property];
  } else {
    const { data } = await getProperties({ type: 'pg' });
    propertiesData = data || [];
  }

  return (
    <PageLayout>
      <PageHeader title="Rules & Policies" description={profile.role === 'tenant' ? 'View PG rules and notice periods' : 'Manage PG rules and notice periods'} />
      <RulesClient properties={propertiesData as any} readOnly={profile.role === 'tenant'} />
    </PageLayout>
  );
}
