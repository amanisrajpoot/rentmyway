import Link from 'next/link';
import { ArrowRight, Building2, LayoutDashboard, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUserProfile } from '@/lib/actions/auth';

export default async function HomePage() {
  const profile = await getUserProfile();

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.13_0.03_265)] via-[oklch(0.10_0.01_260)] to-[oklch(0.12_0.02_200)]" />
        <div className="absolute top-1/4 -left-32 w-[32rem] h-[32rem] bg-[oklch(0.40_0.2_265)] rounded-full blur-[200px] opacity-15 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 right-1/4 w-[32rem] h-[32rem] bg-[oklch(0.45_0.19_160)] rounded-full blur-[200px] opacity-10 animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 w-full border-b border-white/5 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] shadow-lg shadow-primary/20">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
                Rent
              </span>
              <span>MyWay</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
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
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center animate-fade-in">
        <Badge variant="outline" className="mb-6 rounded-full border-primary/30 bg-primary/10 text-primary py-1.5 px-4 animate-slide-up">
          <Sparkles className="h-3.5 w-3.5 mr-2" />
          The future of Indian Real Estate CRM
        </Badge>

        <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          Manage properties with <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
            unmatched clarity.
          </span>
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground mb-10 animate-slide-up" style={{ animationDelay: '200ms' }}>
          RentMyWay brings brokers, owners, and tenants into a single, unified platform. Track leads, match properties instantly, and eliminate the chaos of WhatsApp groups.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <Link href={profile ? "/dashboard" : "/signup"}>
            <Button size="lg" className="h-14 px-8 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold text-base transition-transform hover:scale-105">
              {profile ? "Enter Workspace" : "Start Managing Now"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Floating App Preview */}
        <div className="w-full max-w-5xl mt-20 relative animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent blur-3xl rounded-full" />
          <div className="relative rounded-2xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-2xl overflow-hidden aspect-video">
            <div className="absolute top-0 inset-x-0 h-10 border-b border-white/5 bg-background/80 backdrop-blur flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="pt-10 p-6 flex h-full">
              {/* Mock Sidebar */}
              <div className="w-48 border-r border-white/5 h-full hidden md:block pr-6 space-y-4">
                <div className="h-8 w-full bg-white/5 rounded-md" />
                <div className="h-8 w-3/4 bg-white/5 rounded-md" />
                <div className="h-8 w-5/6 bg-white/5 rounded-md" />
              </div>
              {/* Mock Content */}
              <div className="flex-1 md:pl-6 space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 h-32 bg-gradient-to-br from-[oklch(0.55_0.2_265)]/20 to-[oklch(0.50_0.19_280)]/20 rounded-xl border border-white/5" />
                  <div className="flex-1 h-32 bg-gradient-to-br from-[oklch(0.60_0.19_160)]/20 to-[oklch(0.55_0.18_180)]/20 rounded-xl border border-white/5" />
                  <div className="flex-1 h-32 bg-white/5 rounded-xl border border-white/5 hidden sm:block" />
                </div>
                <div className="h-64 w-full bg-white/5 rounded-xl border border-white/5" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Built for modern real estate</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to scale your property management business, designed with an obsession for speed and aesthetics.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            <Card className="bg-background/40 border-white/5 backdrop-blur hover:bg-background/60 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Role-based Portals</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Dedicated experiences for Brokers, Owners, and Tenants. Everyone sees exactly what they need to see.</p>
              </CardContent>
            </Card>

            <Card className="bg-background/40 border-white/5 backdrop-blur hover:bg-background/60 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6 text-chart-2" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Intelligent Matching</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Instantly match active leads with available inventory based on budget, locality, and property type.</p>
              </CardContent>
            </Card>

            <Card className="bg-background/40 border-white/5 backdrop-blur hover:bg-background/60 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-chart-3" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Visual Pipeline</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">A buttery-smooth Kanban board to track leads from initial inquiry to final token payment and conversion.</p>
              </CardContent>
            </Card>

            <Card className="bg-background/40 border-white/5 backdrop-blur hover:bg-background/60 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Building2 className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Inventory Management</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Beautifully structured property listings with 1-click status updates and comprehensive detail tracking.</p>
              </CardContent>
            </Card>

            <Card className="bg-background/40 border-white/5 backdrop-blur hover:bg-background/60 transition-colors lg:col-span-2">
              <CardContent className="pt-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="flex-1">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6">
                    <ShieldCheck className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Built on a robust architecture ensuring your sensitive tenant documents and owner details remain strictly confidential and safely backed up.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4">Ready to transform your workflow?</h2>
          <p className="text-muted-foreground mb-8">Join the modern standard for property management.</p>
          <Link href={profile ? "/dashboard" : "/signup"}>
            <Button className="rounded-full bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] text-white shadow-lg shadow-primary/20">
              Get Started Today
            </Button>
          </Link>
        </div>
        <div className="mt-12 text-sm text-muted-foreground/60">
          © {new Date().getFullYear()} RentMyWay. Built with ❤️ in Mountains of India.
        </div>
      </footer>
    </div>
  );
}
