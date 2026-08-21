"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Mail, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invite an admin user (full name + email). Admins get access to every
 * organization. Demo only — simulates sending the invite.
 */
export function InviteUserModal({ existingEmails }: { existingEmails: string[] }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setFullName("");
    setEmail("");
    setError(null);
    setSent(false);
    setOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (existingEmails.some((item) => item.toLowerCase() === trimmedEmail)) {
      setError("That email already has an account.");
      return;
    }
    setBusy(true);
    setError(null);
    // Simulate sending the invite; wire to a users API route later.
    window.setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 800);
  };

  return (
    <>
      <Button onClick={openModal}>
        <UserPlus className="size-4" />
        Invite user
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={sent ? "Invite sent" : "Invite admin user"}
        description={
          sent ? undefined : "Company admins get access to every organization."
        }
        footer={
          sent ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="invite-user-form" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {busy ? "Sending…" : "Send invite"}
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">Invite sent</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fullName} will receive an email at{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                to set up their admin account.
              </p>
            </div>
          </div>
        ) : (
          <form id="invite-user-form" onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Grace Hopper"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              The invite grants admin access to all organizations.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}
