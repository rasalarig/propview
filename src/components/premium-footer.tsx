import { Crown } from "lucide-react";

export function PremiumFooter() {
  return (
    <footer className="hidden md:block border-t border-amber-500/10 bg-[hsl(220,20%,4%)]/80">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="text-lg font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              PropView Premium
            </span>
          </div>
          <p className="text-xs text-amber-100/30">
            &copy; 2026 PropView Premium. Imóveis de alto padrão.
          </p>
        </div>
      </div>
    </footer>
  );
}
