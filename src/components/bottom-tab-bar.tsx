"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Search, Heart, Home, User, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect } from "react";

const publicTabs = [
  { href: "/", icon: Film, label: "Reels" },
  { href: "/busca", icon: Search, label: "Busca IA" },
  { href: "/login", icon: User, label: "Entrar" },
];

const authedTabs = [
  { href: "/", icon: Film, label: "Reels" },
  { href: "/busca", icon: Search, label: "Busca IA" },
  { href: "/mensagens", icon: MessageCircle, label: "Mensagens" },
  { href: "/vender/meus-imoveis", icon: Home, label: "Meus Imoveis" },
  { href: "/favoritos", icon: Heart, label: "Favoritos" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadMsgCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/conversations/unread");
        if (res.ok) {
          const data = await res.json();
          setUnreadMsgCount(data.unread_count || 0);
        }
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const tabs = !loading && user ? authedTabs : publicTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
                isActive ? "text-emerald-500" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "text-emerald-500" : ""}`} />
                {tab.href === "/mensagens" && unreadMsgCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none">
                    {unreadMsgCount > 99 ? "99" : unreadMsgCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
