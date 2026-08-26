"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/use-locale";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

export interface AuditLogItem {
  id: string;
  actorName: string | null;
  action: string;
  target: string | null;
  category: string;
  createdAt: string;
}

const CATEGORY_VARIANT: Record<
  string,
  "default" | "info" | "secondary" | "warning" | "success"
> = {
  auth: "info",
  payroll: "warning",
  leave: "secondary",
  employee: "default",
  email: "success",
  settings: "warning",
  onboarding: "info",
  offboarding: "secondary",
  attendance: "secondary",
  performance: "default",
};

export function AuditLogTable({ logs }: { logs: AuditLogItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const locale = useLocale();
  const { t } = useTranslations();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2.5 pr-4 font-medium">{t("common.time")}</th>
            <th className="px-4 py-2.5 font-medium">
              {t("settings.auditLogs.actor")}
            </th>
            <th className="px-4 py-2.5 font-medium">
              {t("settings.auditLogs.action")}
            </th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">
              {t("settings.auditLogs.target")}
            </th>
            <th className="px-4 py-2.5 font-medium">
              {t("settings.auditLogs.category")}
            </th>
            <th className="py-2.5 pl-4 text-right font-medium">
              {t("common.details")}
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const open = expanded === log.id;
            return (
              <Fragment key={log.id}>
                <tr className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString(locale, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{log.actorName ?? "—"}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {log.target ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={CATEGORY_VARIANT[log.category] ?? "secondary"}
                    >
                      {t(
                        `statusLabels.auditCategory.${log.category}` as TranslationKey,
                      )}
                    </Badge>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpanded(open ? null : log.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {open ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                      {open ? t("common.hide") : t("common.view")}
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr
                    key={`${log.id}_detail`}
                    className="border-b border-border bg-muted/20"
                  >
                    <td colSpan={6} className="px-4 py-3">
                      <dl className="grid gap-1.5 text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-muted-foreground">
                            {t("settings.auditLogs.eventId")}
                          </dt>
                          <dd className="font-mono">{log.id.toUpperCase()}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            {t("settings.auditLogs.timestamp")}
                          </dt>
                          <dd>
                            {new Date(log.createdAt).toLocaleString(locale)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            {t("settings.auditLogs.actor")}
                          </dt>
                          <dd>{log.actorName ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            {t("settings.auditLogs.action")}
                          </dt>
                          <dd>{log.action}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">
                            {t("settings.auditLogs.target")}
                          </dt>
                          <dd>{log.target ?? "—"}</dd>
                        </div>
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
