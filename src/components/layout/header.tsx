'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { NotificationBell } from './notification-bell';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/properties': 'Properties',
  '/properties/new': 'Add Property',
  '/leads': 'Lead Pipeline',
  '/leads/new': 'Add Lead',
  '/tenants': 'Tenants',
  '/complaints': 'Complaints',
  '/complaints/new': 'New Complaint',
  '/payments': 'Payments',
  '/settings': 'Settings',
  '/owner/properties': 'My Properties',
  '/owner/rent': 'Rent Dashboard',
  '/owner/maintenance': 'Maintenance',
  '/owner/utilities': 'Utilities',
  '/tenant/property': 'My Property',
  '/tenant/documents': 'Documents',
};

function getBreadcrumb(pathname: string): { parent?: string; current: string } {
  // Check exact match first
  if (pageNames[pathname]) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      const parentPath = '/' + parts.slice(0, -1).join('/');
      return {
        parent: pageNames[parentPath] || parts[parts.length - 2],
        current: pageNames[pathname],
      };
    }
    return { current: pageNames[pathname] };
  }

  // Dynamic routes like /properties/[id]
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const parentPath = '/' + parts[0];
    return {
      parent: pageNames[parentPath] || parts[0],
      current: 'Details',
    };
  }

  return { current: 'Page' };
}

export function Header() {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 px-4 sm:px-6 bg-background/60 backdrop-blur-xl sticky top-0 z-10">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
      <Separator orientation="vertical" className="h-5 bg-border/60" />
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumb.parent && (
          <>
            <span className="text-muted-foreground/70 hidden sm:inline">{breadcrumb.parent}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:inline" />
          </>
        )}
        <span className="font-medium">{breadcrumb.current}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
