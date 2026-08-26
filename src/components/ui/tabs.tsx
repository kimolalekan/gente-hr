"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Minimal accessible tabs: content is passed in as children from the server. */
export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: Tab[];
  defaultTab?: string;
}) {
  const { t } = useTranslations();
  const [activeId, setActiveId] = useState(defaultTab ?? tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("common.sections")}
        className="flex gap-1 border-b border-border"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-4">
        {active?.content}
      </div>
    </div>
  );
}
