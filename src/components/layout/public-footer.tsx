import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-12 px-6 text-center bg-black/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] shadow-lg shadow-primary/20 opacity-80">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
              Rent
            </span>
            <span className="text-muted-foreground">MyWay</span>
          </span>
        </div>
        
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Broker Login</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Owner Login</Link>
          <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
        </nav>
        
        <div className="text-sm text-muted-foreground/60">
          © {new Date().getFullYear()} RentMyWay. Built with ❤️ in Mountains of India.
        </div>
      </div>
    </footer>
  );
}
