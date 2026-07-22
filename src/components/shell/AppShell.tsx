"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Layers,
  LogOut,
  Menu,
  MessagesSquare,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/members", label: "Members", icon: Users },
  { href: "/discussions", label: "Discussions", icon: MessagesSquare },
  { href: "/solutions", label: "Solutions", icon: Layers },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/spotlights", label: "Spotlights", icon: Star },
] as const;

interface ShellMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "member" | "admin";
}

function NavLinks({
  member,
  onNavigate,
}: {
  member: ShellMember;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Primary">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            isActive(href)
              ? "bg-ink/5 text-ink"
              : "text-ink/60 hover:bg-ink/5 hover:text-ink"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${isActive(href) ? "text-accent" : ""}`}
            aria-hidden
          />
          {label}
        </Link>
      ))}
      {member.role === "admin" && (
        <>
          <div className="mt-5 mb-1 flex items-center gap-2 px-3">
            <span className="hex-marker" aria-hidden />
            <span className="text-xs uppercase tracking-[0.15em] text-ink/40">
              Admin
            </span>
          </div>
          <Link
            href="/admin"
            onClick={onNavigate}
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-ink/5 text-ink"
                : "text-ink/60 hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <ShieldCheck
              className={`h-4 w-4 ${pathname.startsWith("/admin") ? "text-accent" : ""}`}
              aria-hidden
            />
            Admin
          </Link>
        </>
      )}
    </nav>
  );
}

function MemberFooter({ member }: { member: ShellMember }) {
  return (
    <div className="flex items-center gap-3 border-t border-line-soft pt-4">
      <Link
        href={`/members/${member.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar name={member.full_name} src={member.avatar_url} size="sm" />
        <span className="truncate text-sm text-ink/80">{member.full_name}</span>
      </Link>
      <a
        href="/auth/signout"
        aria-label="Sign out"
        title="Sign out"
        className="rounded p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="block">
      <span className="font-display text-2xl tracking-tight">CodeHive</span>
      <span className="mt-0.5 block text-[0.6rem] uppercase tracking-[0.25em] text-ink/40">
        Stacked by Redington
      </span>
    </Link>
  );
}

export function AppShell({
  member,
  children,
}: {
  member: ShellMember;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-svh lg:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 hidden w-60 flex-col border-r border-line-soft bg-surface/40 px-4 py-6 lg:flex">
        <div className="mb-8 px-3">
          <Wordmark />
        </div>
        <NavLinks member={member} />
        <MemberFooter member={member} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line-soft bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
        <Wordmark />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-ink/70 hover:bg-ink/5"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface px-4 py-6">
            <div className="mb-8 flex items-center justify-between px-3">
              <Wordmark />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-2 text-ink/70 hover:bg-ink/5"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <NavLinks member={member} onNavigate={() => setOpen(false)} />
            <MemberFooter member={member} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 lg:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
