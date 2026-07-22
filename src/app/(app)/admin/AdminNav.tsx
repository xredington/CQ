"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/hive-tree", label: "Hive tree" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/solutions", label: "Solutions" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/spotlights", label: "Spotlights" },
  { href: "/admin/discussions", label: "Discussions" },
  { href: "/admin/interests", label: "Interests" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto border-b border-line-soft"
    >
      {ITEMS.map(({ href, label }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors ${
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
