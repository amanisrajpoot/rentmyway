import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  MessageSquareWarning,
  IndianRupee,
  Settings,
  FileText,
  Home,
  Wrench,
} from 'lucide-react';
import { type UserRole } from '@/types/database';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navConfig: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['broker', 'owner', 'tenant'],
      },
    ],
  },
  {
    label: 'Property Management',
    items: [
      {
        title: 'Properties',
        href: '/properties',
        icon: Building2,
        roles: ['broker'],
      },
      {
        title: 'My Properties',
        href: '/owner/properties',
        icon: Home,
        roles: ['owner'],
      },
      {
        title: 'My Property',
        href: '/tenant/property',
        icon: Home,
        roles: ['tenant'],
      },
    ],
  },
  {
    label: 'CRM',
    items: [
      {
        title: 'Leads',
        href: '/leads',
        icon: Users,
        roles: ['broker'],
      },
      {
        title: 'Tenants',
        href: '/tenants',
        icon: UserCheck,
        roles: ['broker'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        title: 'Complaints',
        href: '/complaints',
        icon: MessageSquareWarning,
        roles: ['broker', 'owner', 'tenant'],
      },
      {
        title: 'Payments',
        href: '/payments',
        icon: IndianRupee,
        roles: ['broker'],
      },
      {
        title: 'Rent',
        href: '/owner/rent',
        icon: IndianRupee,
        roles: ['owner'],
      },
      {
        title: 'Maintenance',
        href: '/owner/maintenance',
        icon: Wrench,
        roles: ['owner'],
      },
      {
        title: 'Documents',
        href: '/tenant/documents',
        icon: FileText,
        roles: ['tenant'],
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['broker', 'owner', 'tenant'],
      },
    ],
  },
];

export function getNavForRole(role: UserRole): NavGroup[] {
  return navConfig
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}
