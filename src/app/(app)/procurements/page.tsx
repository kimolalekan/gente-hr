import Link from "next/link";
import { ArrowRight, Plus, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/hr/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Procurement, ProcurementStatus } from "@/lib/procurement";
import { formatDate } from "@/lib/hr-data";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
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

/** Procurement requests list — admin/HR: every tenant request; member: own. */
export default async function ProcurementsPage() {
  const t = await getTranslator();
  const locale = await getTenantLocale();

  const data = await apiGet<Paginated<Procurement>>("/api/procurements");
  const procurements = data.items;

  return (
    <>
      <PageHeader
        title={t("procurement.title")}
        description={t("procurement.description")}
      >
        <Link href="/procurements/new">
          <Button>
            <Plus className="size-4" />
            {t("procurement.newRequest")}
          </Button>
        </Link>
      </PageHeader>

      {procurements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="size-5" />
            </span>
            <h2 className="mt-3 text-base font-semibold">
              {t("procurement.empty")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("procurement.emptyDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("procurement.title")}</CardTitle>
            <CardDescription>{t("procurement.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">
                      {t("procurement.titleField")}
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                      {t("procurement.requestedBy")}
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      {t("procurement.vendors")}
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      {t("common.date")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("common.status")}
                    </th>
                    <th className="py-2.5 pl-4 text-right font-medium">
                      {t("common.details")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {procurements.map((procurement) => (
                    <tr
                      key={procurement.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {procurement.title}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {procurement.requestedBy ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={procurement.requestedBy.name}
                              size="sm"
                            />
                            <span className="truncate">
                              {procurement.requestedBy.name}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {procurement.vendors.length}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDate(procurement.createdAt.slice(0, 10), locale)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[procurement.status]}>
                          {statusLabel(procurement.status, t)}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/procurements/${procurement.id}`}>
                          <Button variant="outline" size="sm">
                            <ArrowRight className="size-3.5" />
                            {t("common.details")}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
