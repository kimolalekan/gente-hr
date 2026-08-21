"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  CalendarCheck,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings,
  Star,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ThemeInfo } from "@/components/theme/theme-info";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/" },
  { id: "employees", label: "Employees", icon: Users, href: "/employees" },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    href: "/attendance",
  },
  { id: "payroll", label: "Payroll", icon: Wallet, href: "/payroll" },
  { id: "leave", label: "Leave", icon: CalendarDays, href: "/leave" },
  {
    id: "performance",
    label: "Performance",
    icon: Star,
    href: "/performance",
  },
  { id: "onboarding", label: "Onboarding", icon: LogIn, href: "/onboarding" },
  {
    id: "offboarding",
    label: "Offboarding",
    icon: LogOut,
    href: "/offboarding",
  },
  { id: "reports", label: "Reports", icon: FileText, href: "/reports" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <>
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg px-2 py-2.5"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sm">
          G
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold">Gente</p>
          <p className="text-[11px] text-muted-foreground">HR Platform</p>
        </div>
      </Link>

      <nav className="mt-4 flex-1 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-border pt-3">
        <Link
          href="/settings/general"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <ThemeInfo />
      </div>
    </>
  );
}

/**
 * App sidebar: static on desktop (`md+`), an off-canvas drawer on mobile.
 * The drawer is controlled by the parent shell (`open`/`onClose`), closes on
 * navigation or Escape, and dims the page behind it with a backdrop.
 */
export function AppSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Close the mobile drawer after navigating to a new route.
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // While the drawer is open (mobile): close on Escape and lock page scroll.
  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {/* Desktop static sidebar (always visible on md+) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card/40 p-3 md:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile off-canvas drawer */}
      <aside
        id="app-sidebar"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-card p-3 shadow-xl transition-transform duration-200 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
