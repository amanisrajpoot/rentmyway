'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Compass, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';

export function PublicHeader({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  
  const isExplore = pathname.startsWith('/explore');
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] shadow-lg shadow-primary/20 shrink-0">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">
              <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
                Rent
              </span>
              <span>MyWay</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              href="/explore" 
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/5 flex items-center gap-2",
                isExplore ? "text-foreground bg-white/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Compass className="h-4 w-4" />
              Explore Properties
            </Link>
            <Link 
              href="/#features" 
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:bg-white/5"
            >
              Features
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {profile ? (
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-md transition-all">
                Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-block">
                Log in
              </Link>
              <Link href="/signup">
                <Button className="rounded-full bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white shadow-lg shadow-primary/20 transition-all">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
