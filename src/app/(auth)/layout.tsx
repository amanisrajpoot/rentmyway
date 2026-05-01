export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient background — deeper, more dimension */}
      <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.13_0.03_265)] via-[oklch(0.10_0.01_260)] to-[oklch(0.12_0.02_200)]" />

      {/* Animated gradient orbs — slower, more diffuse */}
      <div className="absolute top-1/4 -left-32 w-[28rem] h-[28rem] bg-[oklch(0.40_0.2_265)] rounded-full blur-[160px] opacity-15 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 -right-32 w-[28rem] h-[28rem] bg-[oklch(0.45_0.19_160)] rounded-full blur-[160px] opacity-10 animate-pulse" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
      <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-[oklch(0.50_0.15_330)] rounded-full blur-[120px] opacity-[0.07] animate-pulse" style={{ animationDuration: '6s', animationDelay: '3s' }} />

      {/* Subtle grain texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] mb-4 shadow-lg shadow-primary/20">
            <span className="text-xl font-bold text-white">R</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
              Rent
            </span>
            <span className="text-foreground">MyWay</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Property Management, Simplified.
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
