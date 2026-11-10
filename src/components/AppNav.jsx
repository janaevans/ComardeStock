"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Star, History, KeyRound, Info } from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stocks/search", label: "Search", icon: Search },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/history", label: "History", icon: History },
  { href: "/settings/providers", label: "API providers", icon: KeyRound },
  { href: "/about", label: "About", icon: Info },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="-mx-1 flex items-center gap-1 overflow-x-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (href === "/stocks/search" && pathname.startsWith("/stocks/")) ||
          (href === "/settings/providers" && pathname.startsWith("/settings"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              active ? "bg-panel-2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
