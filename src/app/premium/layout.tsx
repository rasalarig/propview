import type { Metadata } from "next";
import { PremiumNavbar } from "@/components/premium-navbar";
import { PremiumFooter } from "@/components/premium-footer";
import { PremiumBottomTabBar } from "@/components/premium-bottom-tab-bar";

export const metadata: Metadata = {
  title: "MelhorMetro Premium | Imóveis de Alto Padrão",
  description: "Plataforma exclusiva para imobiliárias premium. Imóveis acima de R$10 milhões.",
};

export default function PremiumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="premium min-h-screen flex flex-col bg-[hsl(220,20%,4%)]">
      <PremiumNavbar />
      <main className="flex-1">{children}</main>
      <PremiumFooter />
      <PremiumBottomTabBar />
    </div>
  );
}
