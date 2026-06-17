import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ServiceRequestsClient } from './service-requests-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';

export default async function TenantServiceRequestsPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, property:properties(id, title, broker_id)')
    .eq('email', profile.email)
    .eq('is_active', true)
    .single();

  if (!tenant || !tenant.property) {
    return (
      <PageLayout>
        <div className="text-center py-20 text-muted-foreground">
          No active PG property found.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Service Requests" 
        description="Raise and track maintenance or service issues for your PG" 
      />
      <ServiceRequestsClient 
        tenantId={tenant.id} 
        propertyId={tenant.property.id} 
        brokerId={tenant.property.broker_id} 
      />
    </PageLayout>
  );
}
