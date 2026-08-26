"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { CheckCircle2, FileUp, Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/provider";
import { COUNTRY_NAMES, REGIONS, getStatesFor } from "@/lib/regions";

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
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
  const { t } = useTranslations();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            ({t("common.optional")})
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
  pensionProvider: "",
  pensionId: "",
};

/**
 * Self-service onboarding form — reached from the invite email link. The
 * employee fills in passport, signed offer letter, bank, government ID,
 * emergency contact, tax and pension, then submits to
 * `PUT /api/onboarding/complete` (authorized by the signed invite token).
 * Health coverage is company-managed and set by HR/admin instead.
 */
export function EmployeeOnboardingForm({
  initialName,
  initialEmail,
  initialToken,
}: {
  initialName?: string;
  initialEmail?: string;
  initialToken?: string;
}) {
  const { t } = useTranslations();
  const [values, setValues] = useState(INITIAL);
  const [passportPhoto, setPassportPhoto] = useState<string>();
  const [signedOffer, setSignedOffer] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update =
    (key: keyof typeof INITIAL) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // The invite token comes from the signed completion link (query param).
    const token =
      initialToken ??
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("token")
        : null);
    if (!token) {
      setError(t("onboarding.missingToken"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          phone: values.phone,
          address: values.address,
          state: values.state,
          country: values.country,
          bankDetails: {
            bankName: values.bankName,
            accountNumber: values.accountNumber,
            accountName: values.accountName,
            swift: values.swift,
            routing: values.routing,
          },
          governmentId: {
            idName: values.idName,
            idValue: values.idValue,
          },
          emergencyContact: {
            name: values.ecName,
            email: values.ecEmail,
            phone: values.ecPhone,
          },
          pension: {
            provider: values.pensionProvider,
            id: values.pensionId,
          },
          taxId: values.taxId,
          passportPhoto,
          signedOfferLetter: signedOffer,
        }),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("onboarding.submitFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <div>
          <p className="text-lg font-semibold">Details submitted</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {t("onboarding.welcomeAboard", { name: initialName ?? "" })}
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
        title={t("employees.contact")}
        description={t("onboarding.personalHint")}
      >
        <Field
          id="phone"
          label={t("common.phone")}
          type="tel"
          placeholder={t("employees.phonePlaceholder")}
          value={values.phone}
          onChange={update("phone")}
        />
        <Field
          id="address"
          label={t("common.address")}
          placeholder={t("common.streetAddress")}
          value={values.address}
          onChange={update("address")}
        />
        <div className="space-y-1.5">
          <Label htmlFor="country">{t("employees.country")}</Label>
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
            placeholder={t("employees.selectCountry")}
            searchPlaceholder={t("employees.searchCountries")}
            renderOption={(option) => {
              const region = REGIONS.find((item) => item.name === option.value);
              return region ? <CountryFlag code={region.iso2} /> : null;
            }}
          >
            {COUNTRY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">{t("employees.state")}</Label>
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
                      ? t("employees.noStates")
                      : t("employees.selectCountryFirst")
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
                placeholder={t("employees.selectState")}
                searchPlaceholder={t("employees.searchStates")}
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

      <Section
        title={t("onboarding.personal")}
        description={t("onboarding.personalDescription")}
      >
        <div className="space-y-1.5">
          <Label htmlFor="passport-photo">
            {t("onboarding.passportPhoto")}
          </Label>
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
                {t("onboarding.passportPhotoHint")}
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
          <Label htmlFor="signed-offer">
            {t("onboarding.signedOfferLetter")}
          </Label>
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
                {t("onboarding.offerLetterUpload")}
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

      <Section
        title={t("employees.bankDetails")}
        description={t("onboarding.bankDetailsHint")}
      >
        <Field
          id="bank-name"
          label={t("employees.bankName")}
          placeholder={t("employees.bankNamePlaceholder")}
          value={values.bankName}
          onChange={update("bankName")}
        />
        <Field
          id="account-number"
          label={t("employees.accountNumber")}
          placeholder={t("employees.accountNumberPlaceholder")}
          value={values.accountNumber}
          onChange={update("accountNumber")}
        />
        <Field
          id="account-name"
          label={t("employees.accountName")}
          placeholder={t("employees.nameOnAccount")}
          value={values.accountName}
          onChange={update("accountName")}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="swift"
            label={t("employees.swiftNumber")}
            optional
            placeholder={t("employees.swiftPlaceholder")}
            value={values.swift}
            onChange={update("swift")}
          />
          <Field
            id="routing"
            label={t("employees.routingNumber")}
            optional
            placeholder={t("employees.routingPlaceholder")}
            value={values.routing}
            onChange={update("routing")}
          />
        </div>
      </Section>

      <Section
        title={t("employees.governmentId")}
        description={t("onboarding.officialId")}
      >
        <Field
          id="id-name"
          label={t("employees.idName")}
          placeholder={t("employees.idNamePlaceholder")}
          value={values.idName}
          onChange={update("idName")}
        />
        <Field
          id="id-value"
          label={t("employees.idValue")}
          placeholder={t("employees.idValuePlaceholder")}
          value={values.idValue}
          onChange={update("idValue")}
        />
      </Section>

      <Section
        title={t("employees.emergencyContact")}
        description={t("employees.emergencyContactDescription")}
      >
        <Field
          id="ec-name"
          label={t("common.name")}
          placeholder={t("employees.contactNamePlaceholder")}
          value={values.ecName}
          onChange={update("ecName")}
        />
        <Field
          id="ec-email"
          label={t("common.email")}
          type="email"
          placeholder={t("employees.contactEmailPlaceholder")}
          value={values.ecEmail}
          onChange={update("ecEmail")}
        />
        <Field
          id="ec-phone"
          label={t("common.phone")}
          type="tel"
          placeholder={t("employees.phonePlaceholder")}
          value={values.ecPhone}
          onChange={update("ecPhone")}
        />
      </Section>

      <Section
        title={t("employees.taxId")}
        description={t("employees.taxIdDescription")}
      >
        <Field
          id="tax-id"
          label={t("employees.taxId")}
          placeholder={t("employees.taxIdPlaceholder")}
          value={values.taxId}
          onChange={update("taxId")}
        />
      </Section>

      <Section
        title={t("employees.pension")}
        description={t("employees.pensionDescription")}
      >
        <Field
          id="pension-provider"
          label={t("employees.providerName")}
          placeholder={t("employees.pensionProviderPlaceholder")}
          value={values.pensionProvider}
          onChange={update("pensionProvider")}
        />
        <Field
          id="pension-id"
          label={t("employees.pensionId")}
          placeholder={t("employees.pensionIdPlaceholder")}
          value={values.pensionId}
          onChange={update("pensionId")}
        />
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {saving ? t("common.submitting") : t("onboarding.submitDetails")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
