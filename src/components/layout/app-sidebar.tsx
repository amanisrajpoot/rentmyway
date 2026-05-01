'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavForRole } from '@/lib/nav-config';
import type { Profile } from '@/types/database';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';

interface AppSidebarProps {
  profile: Profile;
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname();
  const navGroups = getNavForRole(profile.role);

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-primary/15">
            R
          </div>
          <span className="font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden">
            <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
              Rent
            </span>
            <span className="text-foreground">MyWay</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      className={
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground transition-colors'
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-primary/25 to-chart-2/25 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-[11px] text-muted-foreground/70 capitalize">{profile.role}</p>
          </div>
          <form action={signOut} className="group-data-[collapsible=icon]:hidden">
            <button
              type="submit"
              className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground/60 hover:text-foreground transition-all duration-200"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
