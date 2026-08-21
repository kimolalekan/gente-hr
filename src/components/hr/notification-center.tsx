"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  Clock,
  FileText,
  HandCoins,
  LogIn,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NOTIFICATIONS,
  NOTIFICATION_TYPE_LABELS,
  type AppNotification,
} from "@/lib/hr-data";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<AppNotification["type"], typeof Bell> = {
  leave: CalendarCheck,
  onboarding: LogIn,
  payroll: FileText,
  loan: HandCoins,
  performance: Star,
  system: Bell,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (id: string) => void;
}) {
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
          {timeAgo(notification.time)} ·{" "}
          {NOTIFICATION_TYPE_LABELS[notification.type]}
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
  const [items, setItems] = useState(NOTIFICATIONS);

  const unread = items.filter((item) => !item.read).length;

  const markAllRead = () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  };

  const markRead = (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unread > 0 ? `${unread} unread` : "All caught up"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unread === 0}
        >
          <CheckCheck />
          Mark all read
        </Button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onOpen={markRead}
          />
        ))}
      </div>
    </div>
  );
}
