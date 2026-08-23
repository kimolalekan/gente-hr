"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TIMEZONES } from "@/components/setup/setup-wizard";
import { CountryFlag } from "@/components/ui/country-flag";
import { CURRENCY_OPTIONS, getCurrencyMeta } from "@/lib/currencies";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Slug derived from an org name, mirroring the server-side slugify. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CreatedTenant {
  id: string;
  name: string;
  slug: string;
}

/**
 * Create-a-tenant modal for platform super-admins. Submits to
 * `POST /api/tenants`, which provisions the org and adds the creator as an
 * admin member so they can switch into it from the header switcher.
 */
export function TenantCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: CreatedTenant) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");
  const [adminEmail, setAdminEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setTimezone("UTC");
    setCurrency("USD");
    setAdminEmail("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-suggest the slug until the user edits it themselves.
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }
    if (adminEmail.trim() && !EMAIL_RE.test(adminEmail.trim())) {
      setError("Enter a valid admin email, or leave it blank.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          timezone,
          currency,
          adminEmail: adminEmail.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: { id?: string; name?: string; slug?: string };
      } | null;
      if (!response.ok || !body?.ok) {
        setError(body?.error ?? "Could not create the organization.");
        return;
      }
      onCreated({
        id: body.data?.id ?? "",
        name: body.data?.name ?? name.trim(),
        slug: body.data?.slug ?? slug.trim(),
      });
      reset();
      onClose();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New organization"
      description="Create a company workspace. You'll be added as an admin and can switch to it right away."
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="tenant-create-form" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {busy ? "Creating…" : "Create organization"}
          </Button>
        </>
      }
    >
      <form
        id="tenant-create-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="tenant-name">Organization name</Label>
          <Input
            id="tenant-name"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="e.g. Acme Inc."
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-slug">Slug</Label>
            <Input
              id="tenant-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="auto-generated from the name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant-timezone">Timezone</Label>
            <Select
              id="tenant-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tenant-currency">Base currency</Label>
          <Select
            id="tenant-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            searchPlaceholder="Search currency or country…"
            renderOption={(option) => {
              const meta = getCurrencyMeta(option.value);
              return meta ? <CountryFlag code={meta.flag} /> : null;
            }}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                data-search={option.search}
              >
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tenant-admin-email">Admin email (optional)</Label>
          <Input
            id="tenant-admin-email"
            type="email"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
            placeholder="admin@newcompany.com"
          />
          <p className="text-xs text-muted-foreground">
            Who should run this organization? Leave blank and you&apos;ll be the
            only admin for now.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
