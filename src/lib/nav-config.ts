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
  Receipt,
  Bell,
  Zap,
  CalendarClock,
  Wallet,
  Megaphone,
  BarChart3,
  PieChart,
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
        roles: ['broker', 'tenant'],
      },
      {
        title: 'Owners',
        href: '/owners',
        icon: Users,
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
        title: 'Leases',
        href: '/leases',
        icon: ScrollText,
        roles: ['broker'],
      },
      {
        title: 'Payments',
        href: '/payments',
        icon: IndianRupee,
        roles: ['broker'],
      },
      {
        title: 'Maintenance',
        href: '/maintenance',
        icon: Wrench,
        roles: ['broker'],
      },
      {
        title: 'Complaints',
        href: '/complaints',
        icon: MessageSquareWarning,
        roles: ['broker', 'owner', 'tenant'],
      },
      {
        title: 'Utility Bills',
        href: '/utility-bills',
        icon: Zap,
        roles: ['broker'],
      },
      // Owner operations
      {
        title: 'Leases',
        href: '/owner/leases',
        icon: ScrollText,
        roles: ['owner'],
      },
      {
        title: 'Financials',
        href: '/owner/financials',
        icon: Wallet,
        roles: ['owner'],
      },
      {
        title: 'Documents',
        href: '/owner/documents',
        icon: FileText,
        roles: ['owner'],
      },
      {
        title: 'Maintenance',
        href: '/owner/maintenance',
        icon: Wrench,
        roles: ['owner'],
      },
      // Tenant operations
      {
        title: 'Lease',
        href: '/tenant/lease',
        icon: ScrollText,
        roles: ['tenant'],
      },
      {
        title: 'Payments',
        href: '/tenant/payments',
        icon: IndianRupee,
        roles: ['tenant'],
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
    label: 'Communication',
    items: [
      {
        title: 'Announcements',
        href: '/announcements',
        icon: Megaphone,
        roles: ['broker'],
      },
    ],
  },
  {
    label: 'Business',
    items: [
      {
        title: 'Commissions',
        href: '/commissions',
        icon: PieChart,
        roles: ['broker'],
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
