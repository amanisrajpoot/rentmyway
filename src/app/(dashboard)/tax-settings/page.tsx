import { PageHeader } from '@/components/layout/page-layout';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { TaxSettings } from '@/components/payments/tax-settings';

export default async function TaxSettingsPage() {
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile || profile.role !== 'broker') {
    return <div className="p-6">Unauthorized. Only brokers can manage tax settings.</div>;
  }

  // Fetch properties managed by this broker
  const { data: properties } = await supabase
    .from('properties')
    .select('id, title')
    .eq('broker_id', profile.id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader 
        title="Tax & Compliance" 
        description="Configure GST and TDS settings for your properties."
      />

      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <h2 className="text-lg font-semibold mb-2">Showing config for:</h2>
            <p className="text-sm text-gray-600">Property: {properties[0].title}</p>
          </div>
          <TaxSettings propertyId={properties[0].id} />
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
          <p className="text-gray-500">You need to add properties before configuring tax rules.</p>
        </div>
      )}
    </div>
  );
}
