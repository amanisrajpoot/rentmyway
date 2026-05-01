import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
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
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <SidebarInset>
        <Header />
        <div className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in overflow-x-hidden">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
