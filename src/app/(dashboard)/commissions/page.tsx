import { getCommissions, getCommissionStats } from '@/lib/actions/commissions';
import { CommissionsClient } from './commissions-client';
import { getUserProfile } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';

export default async function CommissionsPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'broker') redirect('/dashboard');

  const [commissions, stats] = await Promise.all([
    getCommissions(),
    getCommissionStats()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commissions & Revenue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your earnings, pending payouts, and deal pipeline.
        </p>
      </div>
      <CommissionsClient initialCommissions={commissions} stats={stats} />
    </div>
  );
}
