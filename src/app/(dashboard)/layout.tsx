import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/auth';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header profile={profile} />
      <main className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in overflow-x-hidden bg-muted/20">
        <div className="mx-auto max-w-[1400px] w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
