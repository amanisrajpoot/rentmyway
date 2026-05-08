import { getPayments } from '@/lib/actions/payments';
import { getOwnerPayouts } from '@/lib/actions/owner-payouts';
import { PaymentsClient } from './payments-client';

export default async function PaymentsPage() {
  const [payments, payouts] = await Promise.all([
    getPayments(),
    getOwnerPayouts()
  ]);

  return <PaymentsClient initialPayments={payments} initialPayouts={payouts} />;
}
