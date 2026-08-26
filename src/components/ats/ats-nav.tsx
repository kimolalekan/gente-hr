"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  ClipboardList,
  ListChecks,
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
  { href: "/ats/jobs", labelKey: "ats.jobs.title", icon: BriefcaseBusiness },
  {
    href: "/ats/applications",
    labelKey: "ats.applications.title",
    icon: ClipboardList,
  },
  { href: "/ats/quizzes", labelKey: "ats.quizzes.title", icon: ListChecks },
];

/** Recruiting sub-navigation — jobs and the application pipeline. */
export function AtsNav() {
  const pathname = usePathname();
  const { t } = useTranslations();

  return (
    <nav className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto pb-2 lg:w-52 lg:flex-col lg:pb-0">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
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
