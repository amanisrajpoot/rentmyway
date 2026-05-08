import { getUtilityBills } from '@/lib/actions/utility-bills';
import { UtilityBillsClient } from './utility-bills-client';

export default async function UtilityBillsPage() {
  const bills = await getUtilityBills();
  return <UtilityBillsClient initialBills={bills as any} />;
}
