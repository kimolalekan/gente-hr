import { and, eq, sql } from "drizzle-orm";
import { ApiError, getDb, ok, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const TIER_PRICE: Record<string, number> = { free: 0, growth: 4, enterprise: 9 };

interface DemoInvoice {
  id: string;
  period: string;
  amount: number;
  status: "paid" | "pending";
  issuedAt: string;
  dueAt: string;
  lineItems: Array<{ description: string; quantity: number; amount: number }>;
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

/** Generate demo invoices for the last 3 months based on the plan + headcount. */
function demoInvoices(tier: string, employeeCount: number): DemoInvoice[] {
  const price = TIER_PRICE[tier] ?? TIER_PRICE.growth;
  const now = new Date();
  const invoices: DemoInvoice[] = [];
  for (let i = 0; i < 3; i++) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const period = `${MONTHS[month.getUTCMonth()]} ${month.getUTCFullYear()}`;
    const amount = tier === "free" ? 0 : employeeCount * price;
    const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
    invoices.push({
      id: `inv_${month.getUTCFullYear()}${String(month.getUTCMonth() + 1).padStart(2, "0")}`,
      period,
      amount,
      status: i === 0 ? "pending" : "paid",
      issuedAt: month.toISOString().slice(0, 10),
      dueAt: lastDay.toISOString().slice(0, 10),
      lineItems: [
        {
          description: `${capitalize(tier)} plan — ${employeeCount} employees × $${price}`,
          quantity: employeeCount,
          amount: tier === "free" ? 0 : employeeCount * price,
        },
      ],
    });
  }
  return invoices;
}

/** Invoice detail (admin) — saved invoices, or demo invoices when empty. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { tenants, employees } = await import("@db/schema");
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      if (!tenant) throw new ApiError(404, "Tenant not found");

      const settings = tenant.settings ?? {};
      const saved = Array.isArray(settings.invoices) ? settings.invoices : [];
      let invoices: unknown[] = saved;
      if (!invoices.length) {
        const [count] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(employees)
          .where(
            and(
              eq(employees.tenantId, user.tenantId),
              eq(employees.status, "active"),
            ),
          );
        invoices = demoInvoices(tenant.subscriptionTier, count?.count ?? 0);
      }
      const invoice = (invoices as Array<Record<string, unknown>>).find(
        (inv) => inv.id === id,
      );
      if (!invoice) throw new ApiError(404, "Invoice not found");
      return ok(invoice);
    } finally {
      await pool.end();
    }
  },
);
