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
        <main className="flex-1 p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
