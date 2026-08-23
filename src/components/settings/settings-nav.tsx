"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  FileClock,
  Mail,
  Palette,
  Settings2,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/settings/general", label: "General", icon: Settings2 },
  { href: "/settings/branding", label: "Branding & Theme", icon: Palette },
  { href: "/settings/users", label: "Users", icon: Users },
  { href: "/settings/departments", label: "Departments", icon: Building2 },
  {
    href: "/settings/employee-config",
    label: "Employee Config",
    icon: UserCog,
  },
  { href: "/settings/payroll", label: "Payroll", icon: Wallet },
  { href: "/settings/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/settings/email", label: "Email", icon: Mail },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto pb-2 lg:w-56 lg:flex-col lg:pb-0">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
  );
}
