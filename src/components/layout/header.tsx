'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavForRole } from '@/lib/nav-config';
import type { Profile } from '@/types/database';
import { NotificationBell } from './notification-bell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Menu, LogOut, ChevronDown, Settings } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

export function Header({ profile }: { profile: Profile }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const navGroups = getNavForRole(profile.role);

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const Logo = () => (
    <Link href="/dashboard" className="flex items-center gap-2 group mr-6">
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-primary/15">
        R
      </div>
      <span className="font-bold text-lg tracking-tight hidden sm:block">
        <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
          Rent
        </span>
        <span className="text-foreground">MyWay</span>
      </span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 sm:px-6 mx-auto max-w-[1400px]">
        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden mr-2" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b text-left">
              <SheetTitle render={<Logo />} />
            </SheetHeader>
            <div className="overflow-auto py-2 flex-1">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-4">
                  <h4 className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {group.label}
                  </h4>
                  <nav className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                            isActive 
                              ? "text-primary bg-primary/10 border-r-2 border-primary" 
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navGroups.map((group) => {
            // If group has only 1 item (like Overview -> Dashboard), render it as a direct link
            if (group.items.length === 1) {
              const item = group.items[0];
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.title}
                </Link>
              );
            }

            // Otherwise render as a dropdown
            const isGroupActive = group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
            return (
              <DropdownMenu key={group.label}>
                <DropdownMenuTrigger render={<Button variant="ghost" className={cn("px-4 py-2 h-auto font-medium", isGroupActive ? "bg-muted text-foreground" : "text-muted-foreground")} />}>
                  {group.label}
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <DropdownMenuItem key={item.href} render={<Link href={item.href} className={cn("flex items-center cursor-pointer", isActive && "bg-muted")} />}>
                        <Icon className="mr-2 h-4 w-4 opacity-70" />
                        <span>{item.title}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-auto">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2" />}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-primary/25 to-chart-2/25 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {profile.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/settings" className="cursor-pointer" />}>
                <Settings className="mr-2 h-4 w-4 opacity-70" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOut} className="w-full">
                {/* @ts-ignore - Base UI nativeButton prop to suppress warning */}
                <DropdownMenuItem nativeButton render={<button type="submit" className="flex w-full items-center text-destructive cursor-pointer" />}>
                  <LogOut className="mr-2 h-4 w-4 opacity-70" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
