import { getGatewayConfig } from '@/lib/actions/gateway-config';
import { GatewaySettings } from '@/components/settings/gateway-settings';
import { PageHeader } from '@/components/layout/page-layout';

export default async function GatewaySettingsPage() {
  const { data: config } = await getGatewayConfig();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader 
        title="Gateway Settings" 
        description="Configure your payment gateway credentials and preferences."
      />
      <GatewaySettings initialConfig={config} />
    </div>
  );
}
