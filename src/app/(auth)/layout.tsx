export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.13_0.03_265)] via-[oklch(0.11_0.01_260)] to-[oklch(0.13_0.02_200)]" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[oklch(0.45_0.2_265)] rounded-full blur-[128px] opacity-20 animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[oklch(0.50_0.19_160)] rounded-full blur-[128px] opacity-15 animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
              Rent
            </span>
            <span className="text-foreground">MyWay</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Property Management, Simplified.
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
