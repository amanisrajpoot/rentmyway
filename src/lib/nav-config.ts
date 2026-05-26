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
  ScrollText,
  Bell,
  Zap,
  Wallet,
  Megaphone,
  BarChart3,
  PieChart
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
      {
        title: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        roles: ['broker', 'owner'],
      },
    ],
  },
  {
    label: 'Properties',
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
      {
        title: 'Leases',
        href: '/leases',
        icon: ScrollText,
        roles: ['broker'],
      },
      {
        title: 'Leases',
        href: '/owner/leases',
        icon: ScrollText,
        roles: ['owner'],
      },
      {
        title: 'My Lease',
        href: '/tenant/lease',
        icon: ScrollText,
        roles: ['tenant'],
      },
    ],
  },
  {
    label: 'People',
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
      {
        title: 'Owners',
        href: '/owners',
        icon: Users,
        roles: ['broker'],
      },
    ],
  },
  {
    label: 'Financials',
    items: [
      {
        title: 'Payments',
        href: '/payments',
        icon: IndianRupee,
        roles: ['broker', 'tenant'],
      },
      {
        title: 'Utility Bills',
        href: '/utility-bills',
        icon: Zap,
        roles: ['broker'],
      },
      {
        title: 'Commissions',
        href: '/commissions',
        icon: PieChart,
        roles: ['broker'],
      },
      {
        title: 'Financials',
        href: '/owner/financials',
        icon: Wallet,
        roles: ['owner'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        title: 'Maintenance',
        href: '/maintenance',
        icon: Wrench,
        roles: ['broker'],
      },
      {
        title: 'Maintenance',
        href: '/owner/maintenance',
        icon: Wrench,
        roles: ['owner'],
      },
      {
        title: 'Complaints',
        href: '/complaints',
        icon: MessageSquareWarning,
        roles: ['broker', 'owner', 'tenant'],
      },
      {
        title: 'Announcements',
        href: '/announcements',
        icon: Megaphone,
        roles: ['broker'],
      },
      {
        title: 'Documents',
        href: '/owner/documents',
        icon: FileText,
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
        title: 'Notifications',
        href: '/notifications',
        icon: Bell,
        roles: ['broker', 'owner', 'tenant'],
      },
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
