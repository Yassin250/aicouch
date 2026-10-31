"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Sparkles,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { BrandLockup, BrandMark } from "@/components/brand";
import { cn, initials } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
  exact?: boolean;
};

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Study",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "AI Assistant", href: "/assistant", icon: Sparkles },
      { label: "Materials", href: "/materials", icon: FileText },
    ],
  },
  {
    section: "Practice",
    items: [
      { label: "Quizzes", href: "/quizzes", icon: ListChecks },
      { label: "Study Planner", href: "/planner", icon: CalendarDays },
      { label: "Progress", href: "/progress", icon: TrendingUp },
    ],
  },
];

const ADMIN_NAV: { section: string; items: NavItem[] } = {
  section: "Administration",
  items: [
    { label: "Overview", href: "/admin", icon: Gauge, exact: true },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Programmes & Courses", href: "/admin/courses", icon: BookOpen },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student",
  LECTURER: "Lecturer",
  ADMIN: "Administrator",
};

export function AppShell({
  user,
  aiConfigured,
  children,
}: {
  user: {
    fullName: string;
    email: string;
    role: string;
    programmeName?: string | null;
    yearOfStudy?: number | null;
  };
  aiConfigured: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const subtitle =
    user.role === "STUDENT" && user.programmeName
      ? `${user.programmeName}${user.yearOfStudy ? ` · Year ${user.yearOfStudy}` : ""}`
      : ROLE_LABEL[user.role] ?? "Member";

  const navGroups =
    user.role === "ADMIN" ? [...NAV, ADMIN_NAV] : NAV;

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.section}>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
            {group.section}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if (item.soon) {
                return (
                  <li key={item.href}>
                    <span className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-muted/70">
                      <Icon size={16} strokeWidth={1.9} />
                      <span className="flex-1">{item.label}</span>
                      <span className="chip border-line bg-surface-muted text-[9.5px] text-muted">
                        Soon
                      </span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand-dark"
                        : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                    )}
                  >
                    <Icon
                      size={16}
                      strokeWidth={active ? 2.2 : 1.9}
                      className={active ? "text-brand" : "text-muted group-hover:text-ink-soft"}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-brand-dark">
          {initials(user.fullName)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-medium text-ink">
            {user.fullName}
          </div>
          <div className="truncate text-[11px] text-muted">{subtitle}</div>
        </div>
        <button
          onClick={signOut}
          title="Sign out"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-rose-soft hover:text-rose"
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-4">
          <Link href="/dashboard" className="outline-none">
            <BrandLockup subtitle="MKU · Study Coach" compact />
          </Link>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="animate-rise absolute inset-y-0 left-0 flex w-[268px] flex-col border-r border-line bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <BrandLockup subtitle="MKU · Study Coach" compact />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-muted hover:bg-surface-muted"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-ink-soft hover:bg-surface-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <Link href="/dashboard" className="lg:hidden">
            <BrandMark size={28} />
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <span
              className={cn(
                "chip",
                aiConfigured
                  ? "border-emerald-soft bg-emerald-soft text-emerald"
                  : "border-amber-soft bg-amber-soft text-amber",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  aiConfigured ? "bg-emerald" : "bg-amber",
                )}
              />
              {aiConfigured ? "Live AI connected" : "Offline demo mode"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/assistant"
              className="btn btn-subtle hidden text-[13px] sm:inline-flex"
            >
              <Sparkles size={14} />
              Ask the coach
            </Link>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pr-2 pl-1 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-muted"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-soft text-[11px] font-semibold text-brand-dark">
                  {initials(user.fullName)}
                </span>
                <span className="hidden max-w-[120px] truncate sm:block">
                  {user.fullName.split(" ")[0]}
                </span>
                <ChevronDown size={14} className="text-muted" />
              </button>

              {menuOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="animate-rise absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-lg shadow-ink/5">
                    <div className="border-b border-line px-3.5 py-3">
                      <div className="truncate text-[13px] font-medium text-ink">
                        {user.fullName}
                      </div>
                      <div className="truncate text-[11.5px] text-muted">
                        {user.email}
                      </div>
                      <div className="mt-1.5 chip border-brand-ring bg-brand-soft text-brand-dark">
                        {ROLE_LABEL[user.role] ?? user.role}
                      </div>
                    </div>
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-surface-muted hover:text-rose"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
