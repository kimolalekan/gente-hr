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
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

const ITEMS: Array<{
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}> = [
  {
    href: "/settings/general",
    labelKey: "settings.general.title",
    icon: Settings2,
  },
  {
    href: "/settings/branding",
    labelKey: "settings.branding.title",
    icon: Palette,
  },
  { href: "/settings/users", labelKey: "settings.users.title", icon: Users },
  {
    href: "/settings/departments",
    labelKey: "settings.departments.title",
    icon: Building2,
  },
  {
    href: "/settings/employee-config",
    labelKey: "settings.employeeConfig.title",
    icon: UserCog,
  },
  {
    href: "/settings/payroll",
    labelKey: "settings.payroll.title",
    icon: Wallet,
  },
  {
    href: "/settings/audit-logs",
    labelKey: "settings.auditLogs.title",
    icon: FileClock,
  },
  { href: "/settings/email", labelKey: "settings.email.title", icon: Mail },
  {
    href: "/settings/notifications",
    labelKey: "settings.notifications.title",
    icon: Bell,
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { t } = useTranslations();

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
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
