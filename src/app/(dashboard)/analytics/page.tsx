import { getBrokerAnalytics, getOwnerAnalytics } from '@/lib/actions/analytics';
import { AnalyticsClient } from './analytics-client';
import { getUserProfile } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';

export default async function AnalyticsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  const data = profile.role === 'broker' 
    ? await getBrokerAnalytics() 
    : await getOwnerAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {profile.role === 'broker' 
            ? "Business overview, revenue trends, and conversion funnel." 
            : "Property performance, ROI analysis, and cashflow tracking."}
        </p>
      </div>
      <AnalyticsClient initialData={data} role={profile.role} />
    </div>
  );
}
