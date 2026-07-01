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
  PieChart,
  Bed,
  Utensils,
  UsersRound,
  Globe,
  Settings2,
  Landmark,
  ReceiptText,
  BookOpen,
  CalendarDays,
  Camera,
  DoorOpen,
  CheckSquare,
  ShieldAlert
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
        roles: ['broker', 'owner', 'tenant', 'pg_owner'],
      },
      {
        title: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        roles: ['broker', 'owner', 'pg_owner'],
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
        href: '/broker/commissions',
        icon: PieChart,
        roles: ['broker'],
      },
      {
        title: 'Settlements',
        href: '/settlements',
        icon: Landmark,
        roles: ['broker'],
      },
      {
        title: 'Tax & Compliance',
        href: '/tax-settings',
        icon: ReceiptText,
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
        roles: ['broker', 'owner', 'tenant', 'pg_owner'],
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
    label: 'PG Operations',
    items: [
      {
        title: 'Rooms & Beds',
        href: '/pg/rooms',
        icon: Bed,
        roles: ['broker', 'pg_owner'],
      },
      {
        title: 'My Room',
        href: '/tenant/pg-room',
        icon: Bed,
        roles: ['tenant'],
      },
      {
        title: 'Food Menu',
        href: '/pg/food-menu',
        icon: Utensils,
        roles: ['broker', 'pg_owner', 'tenant'],
      },
      {
        title: 'Rules & Policies',
        href: '/pg/rules',
        icon: ShieldAlert,
        roles: ['broker', 'pg_owner', 'tenant'],
      },
      {
        title: 'Maintenance Teams',
        href: '/pg/teams',
        icon: Wrench,
        roles: ['broker', 'pg_owner'],
      },
      {
        title: 'Service Requests',
        href: '/tenant/service-requests',
        icon: Wrench,
        roles: ['tenant'],
      },
      {
        title: 'Service Requests',
        href: '/pg/service-requests',
        icon: Wrench,
        roles: ['broker', 'pg_owner'],
      },
      {
        title: 'Bulk Onboarding',
        href: '/pg/onboarding',
        icon: UsersRound,
        roles: ['broker', 'pg_owner'],
      },
      {
        title: 'Marketing & Branding',
        href: '/pg/marketing',
        icon: Globe,
        roles: ['broker', 'pg_owner'],
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
        roles: ['broker', 'owner', 'tenant', 'pg_owner'],
      },
      {
        title: 'Gateway Settings',
        href: '/settings/gateway',
        icon: Settings2,
        roles: ['broker'],
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['broker', 'owner', 'tenant', 'pg_owner'],
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
