"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { CheckCircle2, FileUp, Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COUNTRY_NAMES, getStatesFor } from "@/lib/regions";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  optional,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </Label>
      <Input id={id} {...props} />
    </div>
  );
}

const INITIAL = {
  phone: "",
  address: "",
  state: "",
  country: "",
  bankName: "",
  accountNumber: "",
  accountName: "",
  swift: "",
  routing: "",
  idName: "",
  idValue: "",
  ecName: "",
  ecEmail: "",
  ecPhone: "",
  taxId: "",
  insProvider: "",
  insId: "",
  insContactName: "",
  insContactEmail: "",
};

/**
 * Self-service onboarding form — reached from the invite email link. The
 * employee fills in passport, signed offer letter, bank, government ID,
 * emergency contact, tax and health insurance, then submits.
 */
export function EmployeeOnboardingForm({
  initialName,
  initialEmail,
}: {
  initialName?: string;
  initialEmail?: string;
}) {
  const [values, setValues] = useState(INITIAL);
  const [passportPhoto, setPassportPhoto] = useState<string>();
  const [signedOffer, setSignedOffer] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update =
    (key: keyof typeof INITIAL) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    // Simulate submitting to the onboarding record; wire to an API later.
    window.setTimeout(() => {
      setSaving(false);
      setSubmitted(true);
    }, 900);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <div>
          <p className="text-lg font-semibold">Details submitted</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Welcome aboard{initialName ? `, ${initialName}` : ""}! HR has been
            notified and your onboarding checklist will begin shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {initialName && (
        <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Invite for</span>{" "}
          <span className="font-medium">{initialName}</span>
          {initialEmail && (
            <>
              {" "}
              <span className="text-muted-foreground">·</span>{" "}
              <span className="text-muted-foreground">{initialEmail}</span>
            </>
          )}
        </div>
      )}

      <Section
        title="Contact"
        description="How to reach you and where you're based."
      >
        <Field
          id="phone"
          label="Phone"
          type="tel"
          placeholder="+44 20 7946 0958"
          value={values.phone}
          onChange={update("phone")}
        />
        <Field
          id="address"
          label="Address"
          placeholder="Street, building…"
          value={values.address}
          onChange={update("address")}
        />
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Select
            id="country"
            value={values.country}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                country: event.target.value,
                state: "",
              }))
            }
            placeholder="Select a country…"
            searchPlaceholder="Search countries…"
          >
            {COUNTRY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          {(() => {
            const states = getStatesFor(values.country);
            if (states.length === 0) {
              return (
                <Input
                  id="state"
                  value={values.state}
                  onChange={update("state")}
                  placeholder={
                    values.country
                      ? "No states listed — type if needed"
                      : "Select a country first…"
                  }
                  disabled={!values.country}
                />
              );
            }
            return (
              <Select
                id="state"
                value={values.state}
                onChange={update("state")}
                placeholder="Select a state…"
                searchPlaceholder="Search states…"
              >
                {states.map((state) => (
                  <option key={state.stateCode} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </Select>
            );
          })()}
        </div>
      </Section>

      <Section title="Personal" description="Identity and signed offer letter.">
        <div className="space-y-1.5">
          <Label htmlFor="passport-photo">Passport photograph</Label>
          <label
            htmlFor="passport-photo"
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background/50 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
          >
            <FileUp className="size-4 shrink-0 text-muted-foreground" />
            {passportPhoto ? (
              <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                <Paperclip className="size-3.5 shrink-0 text-primary" />
                {passportPhoto}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Upload your passport photograph (JPG/PNG)
              </span>
            )}
            <input
              id="passport-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) =>
                setPassportPhoto(event.target.files?.[0]?.name)
              }
            />
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signed-offer">Signed offer letter</Label>
          <label
            htmlFor="signed-offer"
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background/50 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
          >
            <FileUp className="size-4 shrink-0 text-muted-foreground" />
            {signedOffer ? (
              <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                <Paperclip className="size-3.5 shrink-0 text-primary" />
                {signedOffer}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Upload your signed offer letter (PDF)
              </span>
            )}
            <input
              id="signed-offer"
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={(event) =>
                setSignedOffer(event.target.files?.[0]?.name)
              }
            />
          </label>
        </div>
      </Section>

      <Section title="Bank account" description="Where your salary is paid.">
        <Field
          id="bank-name"
          label="Bank name"
          placeholder="e.g. Chase"
          value={values.bankName}
          onChange={update("bankName")}
        />
        <Field
          id="account-number"
          label="Account number"
          placeholder="e.g. 12345678"
          value={values.accountNumber}
          onChange={update("accountNumber")}
        />
        <Field
          id="account-name"
          label="Account name"
          placeholder="Name on the account"
          value={values.accountName}
          onChange={update("accountName")}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="swift"
            label="Swift number"
            optional
            placeholder="e.g. CHASUS33"
            value={values.swift}
            onChange={update("swift")}
          />
          <Field
            id="routing"
            label="Routing number"
            optional
            placeholder="e.g. 021000021"
            value={values.routing}
            onChange={update("routing")}
          />
        </div>
      </Section>

      <Section title="Government ID" description="Official identification.">
        <Field
          id="id-name"
          label="ID name"
          placeholder="e.g. National ID"
          value={values.idName}
          onChange={update("idName")}
        />
        <Field
          id="id-value"
          label="ID value"
          placeholder="e.g. ID number"
          value={values.idValue}
          onChange={update("idValue")}
        />
      </Section>

      <Section
        title="Emergency contact"
        description="Who to contact in an emergency."
      >
        <Field
          id="ec-name"
          label="Name"
          placeholder="e.g. Jane Doe"
          value={values.ecName}
          onChange={update("ecName")}
        />
        <Field
          id="ec-email"
          label="Email"
          type="email"
          placeholder="jane@example.com"
          value={values.ecEmail}
          onChange={update("ecEmail")}
        />
        <Field
          id="ec-phone"
          label="Phone"
          type="tel"
          placeholder="+44 20 7946 0958"
          value={values.ecPhone}
          onChange={update("ecPhone")}
        />
      </Section>

      <Section title="Tax" description="Tax document or tax ID.">
        <Field
          id="tax-id"
          label="Tax ID / document"
          placeholder="e.g. TIN number or document reference"
          value={values.taxId}
          onChange={update("taxId")}
        />
      </Section>

      <Section
        title="Health insurance"
        description="Provider details or policy file."
      >
        <Field
          id="ins-provider"
          label="Provider name"
          placeholder="e.g. Bupa"
          value={values.insProvider}
          onChange={update("insProvider")}
        />
        <Field
          id="ins-id"
          label="Insurance ID"
          placeholder="e.g. Policy number"
          value={values.insId}
          onChange={update("insId")}
        />
        <Field
          id="ins-contact-name"
          label="Contact name"
          placeholder="e.g. Alex Smith"
          value={values.insContactName}
          onChange={update("insContactName")}
        />
        <Field
          id="ins-contact-email"
          label="Contact email"
          type="email"
          placeholder="alex@bupa.com"
          value={values.insContactEmail}
          onChange={update("insContactEmail")}
        />
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {saving ? "Submitting…" : "Submit details"}
        </Button>
      </div>
    </form>
  );
}
