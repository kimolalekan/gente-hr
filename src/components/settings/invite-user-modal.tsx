"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Power,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/provider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteRole = "admin" | "hr";

/**
 * Invite a team member as an admin or HR user (full name + email + role).
 * Admins get access to every organization; HR members belong to the
 * current organization. Sends POST /api/users/invite.
 */
export function InviteUserModal({
  existingEmails,
}: {
  existingEmails: string[];
}) {
  const router = useRouter();
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("admin");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setFullName("");
    setEmail("");
    setRole("admin");
    setError(null);
    setSent(false);
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError(t("settings.users.fullNameRequired"));
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(t("errors.invalidEmail"));
      return;
    }
    if (existingEmails.some((item) => item.toLowerCase() === trimmedEmail)) {
      setError(t("settings.users.emailExists"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          role,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? t("settings.users.inviteFailed"));
      }
      setSent(true);
      router.refresh();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : t("settings.users.inviteFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={openModal}>
        <UserPlus className="size-4" />
        {t("settings.users.invite")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          sent ? t("settings.users.inviteSent") : t("settings.users.invite")
        }
        description={
          sent
            ? undefined
            : role === "admin"
              ? t("settings.users.inviteDescription")
              : t("settings.users.inviteDescriptionHr")
        }
        footer={
          sent ? (
            <Button onClick={() => setOpen(false)}>{t("common.done")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="invite-user-form" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {busy ? t("common.sending") : t("settings.users.sendInvite")}
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">{t("settings.users.inviteSent")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("settings.users.inviteSentDescription", {
                  name: fullName,
                  email,
                })}
              </p>
            </div>
          </div>
        ) : (
          <form id="invite-user-form" onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">{t("onboarding.fullName")}</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={t("settings.users.fullNamePlaceholder")}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">{t("common.email")}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="grace@company.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">{t("settings.users.role")}</Label>
              <Select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as InviteRole)}
              >
                <option value="admin">{t("tenant.roleAdmin")}</option>
                <option value="hr">{t("tenant.roleHr")}</option>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              {role === "admin"
                ? t("settings.users.inviteHint")
                : t("settings.users.inviteHintHr")}
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}

/** Activate / deactivate an admin user via PATCH /api/users/[id]. */
export function UserStatusToggle({
  userId,
  status,
}: {
  userId: string;
  status: "active" | "inactive";
}) {
  const router = useRouter();
  const { t } = useTranslations();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = status === "active" ? "inactive" : "active";

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? t("settings.users.statusUpdateFailed"));
      }
      router.refresh();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : t("settings.users.statusUpdateFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={toggle}
        disabled={busy}
        title={
          next === "active"
            ? t("settings.users.activateAccount")
            : t("settings.users.deactivateAccount")
        }
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Power className="size-3.5" />
        )}
        {next === "active"
          ? t("performance.activate")
          : t("performance.deactivate")}
      </Button>
      {error && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="size-3" />
          {error}
        </span>
      )}
    </span>
  );
}
