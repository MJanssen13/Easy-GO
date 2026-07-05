"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {MODULES.map((m) => {
        const href = `/${m.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = m.icon;
        return (
          <Link
            key={m.slug}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-white text-primary shadow-soft"
                : "text-white/75 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
