import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Paperclip,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { ProcurementDecide } from "@/components/procurement/procurement-decide";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  Procurement,
  ProcurementStatus,
  ProcurementVendor,
} from "@/lib/procurement";
import { formatCurrency as formatMoney, formatDate } from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";
import {
  getTenantCurrency,
  getTenantLocale,
  getTranslator,
} from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("procurement.title") };
}

const STATUS_VARIANT: Record<
  ProcurementStatus,
  "success" | "warning" | "destructive"
> = {
  PENDING: "warning",
  APPROVED: "success",
  DECLINED: "destructive",
};

function statusLabel(
  status: ProcurementStatus,
  t: (key: TranslationKey) => string,
): string {
  const key =
    status === "PENDING"
      ? "procurement.statusPending"
      : status === "APPROVED"
        ? "procurement.statusApproved"
        : "procurement.statusDeclined";
  return t(key);
}

export default async function ProcurementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const procurement = await apiGet<Procurement>(
    `/api/procurements/${id}`,
  ).catch(() => null);
  if (!procurement) notFound();

  const t = await getTranslator();
  const currency = await getTenantCurrency();
  const locale = await getTenantLocale();
  const formatCurrency = (value: number) => formatMoney(value, currency);

  const canDecide =
    user?.role === "admin" || user?.role === "hr"
      ? procurement.status === "PENDING"
      : false;

  const total = procurement.vendors.reduce(
    (sum, vendor) => sum + vendor.amount,
    0,
  );

  return (
    <>
      <Link
        href="/procurements"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {t("procurement.title")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {procurement.title}
          </h1>
          <Badge variant={STATUS_VARIANT[procurement.status]}>
            {statusLabel(procurement.status, t)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("procurement.totalAmount")}:{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(total)}
          </span>
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {/* Request / decision meta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              {t("procurement.detailsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("procurement.requestedBy")}
              </p>
              {procurement.requestedBy ? (
                <div className="mt-1.5 flex items-center gap-2.5">
                  <Avatar name={procurement.requestedBy.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {procurement.requestedBy.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {procurement.requestedBy.email}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("common.date")}
              </p>
              <p className="mt-1.5 font-medium">
                {formatDate(procurement.createdAt.slice(0, 10), locale)}
              </p>
            </div>
            {procurement.approvedBy && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("procurement.decidedBy")}
                </p>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <Avatar name={procurement.approvedBy.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {procurement.approvedBy.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {procurement.approvedBy.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {procurement.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                {t("procurement.descriptionField")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {procurement.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Vendor quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-muted-foreground" />
              {t("procurement.vendors")}
            </CardTitle>
            <CardDescription>
              {t("procurement.newRequestDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("procurement.vendorField")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("procurement.amountField")}
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                      {t("procurement.documentField")}
                    </th>
                    <th className="py-2.5 pl-4 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {procurement.vendors.map(
                    (vendor: ProcurementVendor, index: number) => (
                      <tr
                        key={vendor.id ?? `${vendor.name}-${index}`}
                        className={
                          procurement.approvedVendorIndex === index
                            ? "border-b border-border bg-success/5 last:border-0"
                            : "border-b border-border last:border-0"
                        }
                      >
                        <td className="py-3 pr-4 font-medium">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{vendor.name}</td>
                        <td className="px-4 py-3">
                          {formatCurrency(vendor.amount)}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {vendor.doc ? (
                            <Link
                              href={`/api/files/${vendor.doc}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary hover:underline"
                            >
                              <Paperclip className="size-3.5" />
                              {t("procurement.viewDoc")}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">
                              {t("procurement.noDoc")}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          {procurement.approvedVendorIndex === index && (
                            <Badge variant="success">
                              {t("procurement.awarded")}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Decision (approvers only, while pending) */}
        {(user?.role === "admin" || user?.role === "hr") &&
          (canDecide ? (
            <ProcurementDecide
              id={procurement.id}
              vendors={procurement.vendors}
              status={procurement.status}
              currency={currency}
            />
          ) : (
            <div className="rounded-lg border border-border bg-background/50 p-3 text-sm text-muted-foreground">
              {t("procurement.decidedNotice")}
            </div>
          ))}
      </div>
    </>
  );
}
