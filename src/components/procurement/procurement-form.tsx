"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/provider";

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

interface VendorDraft {
  key: string;
  name: string;
  amount: string;
  fileId: string | null;
  fileName: string | null;
  uploading: boolean;
}

interface EmployeeOption {
  id: string;
  name: string;
}

function toInt(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Create-a-procurement form. Members request on their own behalf; admin/HR
 * pick the requesting employee. Vendor quotes are entered inline, with an
 * optional document per vendor uploaded to `/api/files`.
 */
export function ProcurementForm({
  canChooseRequester,
  requesterId,
  requesterName,
  employees,
}: {
  canChooseRequester: boolean;
  requesterId: string | null;
  requesterName: string | null;
  employees: EmployeeOption[];
}) {
  const { t } = useTranslations();
  const router = useRouter();
  const counter = useRef(0);

  const defaultSelection =
    requesterId && employees.some((employee) => employee.id === requesterId)
      ? requesterId
      : "";
  const [requester, setRequester] = useState(defaultSelection);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [vendors, setVendors] = useState<VendorDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVendor = () => {
    counter.current += 1;
    setVendors((prev) => [
      ...prev,
      {
        key: `v_${counter.current}`,
        name: "",
        amount: "",
        fileId: null,
        fileName: null,
        uploading: false,
      },
    ]);
    setError(null);
  };

  const removeVendor = (key: string) => {
    setVendors((prev) => prev.filter((vendor) => vendor.key !== key));
  };

  const updateVendor = (
    key: string,
    patch: Partial<Pick<VendorDraft, "name" | "amount">>,
  ) => {
    setVendors((prev) =>
      prev.map((vendor) =>
        vendor.key === key ? { ...vendor, ...patch } : vendor,
      ),
    );
  };

  const uploadDoc = async (key: string, file: File) => {
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      setError(t("procurement.docTypeError"));
      return;
    }
    setVendors((prev) =>
      prev.map((vendor) =>
        vendor.key === key ? { ...vendor, uploading: true } : vendor,
      ),
    );
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "document");
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: { fileId?: string; name?: string };
      } | null;
      if (!body?.ok || !body.data?.fileId) {
        setError(body?.error ?? t("errors.somethingWentWrong"));
        return;
      }
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.key === key
            ? {
                ...vendor,
                uploading: false,
                fileId: body.data!.fileId ?? null,
                fileName: body.data?.name ?? null,
              }
            : vendor,
        ),
      );
    } catch {
      setError(t("errors.somethingWentWrong"));
    } finally {
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.key === key && vendor.uploading
            ? { ...vendor, uploading: false }
            : vendor,
        ),
      );
    }
  };

  const removeDoc = (key: string) => {
    setVendors((prev) =>
      prev.map((vendor) =>
        vendor.key === key
          ? { ...vendor, fileId: null, fileName: null }
          : vendor,
      ),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError(t("procurement.titleRequired"));
    if (canChooseRequester && !requester) {
      return setError(t("procurement.requesterRequired"));
    }
    if (vendors.length === 0) {
      return setError(t("procurement.vendorRequired"));
    }
    if (vendors.some((vendor) => !vendor.name.trim())) {
      return setError(t("procurement.vendorNameRequired"));
    }
    if (vendors.some((vendor) => !toInt(vendor.amount))) {
      return setError(t("procurement.amountError"));
    }
    if (vendors.some((vendor) => vendor.uploading)) {
      return setError(t("procurement.uploadingDoc"));
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/procurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          vendors: vendors.map((vendor) => ({
            name: vendor.name.trim(),
            amount: toInt(vendor.amount),
            ...(vendor.fileId ? { doc: vendor.fileId } : {}),
          })),
          ...(canChooseRequester ? { employeeId: requester } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: { id?: string };
      } | null;
      if (!body?.ok || !body.data?.id) {
        setError(body?.error ?? t("procurement.submitFailed"));
        return;
      }
      router.push(`/procurements/${body.data.id}`);
    } catch {
      setError(t("procurement.submitFailed"));
    } finally {
      setBusy(false);
    }
  };

  const uploading = vendors.some((vendor) => vendor.uploading);

  return (
    <>
      <div className="mb-5 flex flex-col items-start justify-between gap-2 sm:flex-row">
        <div className="flex items-center gap-3">
          <Link
            href="/procurements"
            aria-label={t("procurement.title")}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/60"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("procurement.newRequestTitle")}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("procurement.newRequestDescription")}
            </p>
          </div>
        </div>
        <Button
          type="submit"
          form="procurement-form"
          disabled={busy || uploading}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {t("common.submit")}
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <form
        id="procurement-form"
        onSubmit={handleSubmit}
        className="max-w-4xl space-y-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("procurement.detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canChooseRequester && requesterName && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium leading-none">
                  {t("procurement.requester")}
                </span>
                <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                  {requesterName}
                </p>
              </div>
            )}
            {canChooseRequester && (
              <div className="space-y-1.5">
                <Label htmlFor="procurement-requester">
                  {t("procurement.requester")}
                </Label>
                <Select
                  id="procurement-requester"
                  value={requester}
                  onChange={(event) => setRequester(event.target.value)}
                  placeholder={t("common.select")}
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="procurement-title">
                {t("procurement.titleField")}
              </Label>
              <Input
                id="procurement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("procurement.titlePlaceholder")}
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="procurement-description">
                {t("procurement.descriptionField")}
              </Label>
              <textarea
                id="procurement-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t("procurement.descriptionPlaceholder")}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t("procurement.vendors")}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVendor}
            >
              <Plus className="size-3.5" />
              {t("procurement.addVendor")}
            </Button>
          </CardHeader>
          <CardContent>
            {vendors.length === 0 ? (
              <p className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
                {t("procurement.noVendors")}
              </p>
            ) : (
              <div className="space-y-4">
                {vendors.map((vendor, index) => (
                  <div
                    key={vendor.key}
                    className="space-y-3 rounded-md border border-border p-4"
                  >
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`vendor-name-${vendor.key}`}>
                            {t("procurement.vendorField")}
                          </Label>
                          <Input
                            id={`vendor-name-${vendor.key}`}
                            value={vendor.name}
                            onChange={(event) =>
                              updateVendor(vendor.key, {
                                name: event.target.value,
                              })
                            }
                            placeholder={`${t("procurement.vendorField")} ${
                              index + 1
                            }`}
                            maxLength={160}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`vendor-amount-${vendor.key}`}>
                            {t("procurement.amountField")}
                          </Label>
                          <Input
                            id={`vendor-amount-${vendor.key}`}
                            type="number"
                            min={1}
                            step={1}
                            value={vendor.amount}
                            onChange={(event) =>
                              updateVendor(vendor.key, {
                                amount: event.target.value,
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeVendor(vendor.key)}
                        aria-label={t("procurement.removeVendor")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-sm font-medium leading-none">
                        {t("procurement.documentField")}
                      </span>
                      <div className="flex items-center gap-2">
                        {vendor.uploading ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            {t("procurement.uploadingDoc")}
                          </span>
                        ) : vendor.fileId ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <Check className="size-3" />
                              {t("procurement.uploadedDoc")}
                            </span>
                            {vendor.fileName && (
                              <span className="max-w-40 truncate text-xs text-muted-foreground">
                                {vendor.fileName}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeDoc(vendor.key)}
                              className="text-xs text-destructive hover:underline"
                            >
                              {t("procurement.removeDoc")}
                            </button>
                          </span>
                        ) : (
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent">
                            <Upload className="size-3.5" />
                            {t("procurement.uploadDoc")}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.txt"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void uploadDoc(vendor.key, file);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {t("procurement.docHint")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </>
  );
}
