import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { getUserProfile } from '@/lib/actions/auth';

export default async function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Effects matching landing page */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.13_0.03_265)] via-[oklch(0.10_0.01_260)] to-[oklch(0.12_0.02_200)]" />
        <div className="absolute top-1/4 -left-32 w-[32rem] h-[32rem] bg-[oklch(0.40_0.2_265)] rounded-full blur-[200px] opacity-15 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 right-1/4 w-[32rem] h-[32rem] bg-[oklch(0.45_0.19_160)] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />
      </div>

      <PublicHeader profile={profile} />
      
      <main className="relative z-10 flex-1 w-full animate-fade-in">
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}
