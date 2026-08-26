"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCheck,
  Clock,
  FileText,
  HandCoins,
  LogIn,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/lib/hr-data";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<AppNotification["type"], typeof Bell> = {
  leave: CalendarCheck,
  onboarding: LogIn,
  payroll: FileText,
  loan: HandCoins,
  performance: Star,
  interview: CalendarClock,
  system: Bell,
};

/** Raw row shape from `GET /api/notifications`. */
interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

function toAppNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as AppNotification["type"],
    title: row.title,
    body: row.body ?? "",
    time: row.createdAt,
    read: row.read,
    href: row.href ?? undefined,
  };
}

function timeAgo(
  iso: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return t("common.justNow");
  if (hours < 24) return t("common.hoursAgo", { h: hours });
  return t("common.daysAgo", { d: Math.floor(hours / 24) });
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslations();
  const Icon = TYPE_ICONS[notification.type];

  const body = (
    <div className="flex w-full items-start gap-3 p-4 text-left">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          notification.read
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-sm",
              notification.read ? "font-medium" : "font-semibold",
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {notification.body}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/80">
          <Clock className="size-3" />
          {timeAgo(notification.time, t)} ·{" "}
          {t(
            `statusLabels.notificationType.${notification.type}` as TranslationKey,
          )}
        </p>
      </div>
    </div>
  );

  if (notification.href) {
    return (
      <Link
        href={notification.href}
        onClick={() => onOpen(notification.id)}
        className="block transition-colors hover:bg-muted/40"
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(notification.id)}
      className="block w-full transition-colors hover:bg-muted/40"
    >
      {body}
    </button>
  );
}

export function NotificationCenter() {
  const { t } = useTranslations();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [listResponse, countResponse] = await Promise.all([
          fetch("/api/notifications?pageSize=50"),
          fetch("/api/notifications/unread-count"),
        ]);
        if (cancelled) return;
        const list = (await listResponse.json()) as {
          ok: boolean;
          data?: { items?: NotificationRow[] };
        };
        if (list.ok && list.data?.items) {
          setItems(list.data.items.map(toAppNotification));
        }
        const count = (await countResponse.json()) as {
          ok: boolean;
          data?: { count?: number };
        };
        if (count.ok && typeof count.data?.count === "number") {
          setUnread(count.data.count);
        }
      } catch {
        // Fetch/parse failure: leave the list empty rather than crash.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const markAllRead = () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
    void fetch("/api/notifications/read-all", { method: "POST" }).catch(
      () => {},
    );
  };

  const markRead = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (target && !target.read) {
      setUnread((current) => Math.max(0, current - 1));
    }
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    void fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(
      () => {},
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading
            ? t("common.loading")
            : unread > 0
              ? t("notifications.unreadCount", { n: unread })
              : t("notifications.empty")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unread === 0}
        >
          <CheckCheck />
          {t("notifications.markAllRead")}
        </Button>
      </div>

      {loading ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("notifications.loading")}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("notifications.emptyList")}
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onOpen={markRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
