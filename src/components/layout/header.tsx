'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';

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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-5" />
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumb.parent && (
          <>
            <span className="text-muted-foreground">{breadcrumb.parent}</span>
            <span className="text-muted-foreground/50">/</span>
          </>
        )}
        <span className="font-medium">{breadcrumb.current}</span>
      </nav>
    </header>
  );
}
