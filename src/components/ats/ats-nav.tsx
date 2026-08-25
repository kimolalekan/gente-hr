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

const ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/ats/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/ats/applications", label: "Applications", icon: ClipboardList },
  { href: "/ats/quizzes", label: "Quizzes", icon: ListChecks },
];

/** Recruiting sub-navigation — jobs and the application pipeline. */
export function AtsNav() {
  const pathname = usePathname();

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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
