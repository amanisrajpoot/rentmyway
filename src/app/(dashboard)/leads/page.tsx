import { getLeads } from '@/lib/actions/leads';
import { LeadsClient } from './leads-client';

export default async function LeadsPage() {
  const leads = await getLeads();

  return <LeadsClient initialLeads={leads} />;
}
