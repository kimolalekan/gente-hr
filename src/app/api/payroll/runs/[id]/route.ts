import { and, eq } from "drizzle-orm";
import {
  ApiError,
  getDb,
  ok,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Payroll run detail (admin, hr) — run + entries with employee names + totals. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { payrollRuns, payrollEntries, employees } =
        await import("@db/schema");
      const [run] = await db
        .select()
        .from(payrollRuns)
        .where(and(eq(payrollRuns.id, id), eq(payrollRuns.tenantId, user.tenantId)))
        .limit(1);
      if (!run) throw new ApiError(404, "Payroll run not found");

      const entries = await db
        .select({
          id: payrollEntries.id,
          employeeId: payrollEntries.employeeId,
          employeeName: employees.name,
          department: employees.department,
          gross: payrollEntries.gross,
          deductions: payrollEntries.deductions,
          net: payrollEntries.net,
          status: payrollEntries.status,
          createdAt: payrollEntries.createdAt,
        })
        .from(payrollEntries)
        .leftJoin(employees, eq(payrollEntries.employeeId, employees.id))
        .where(
          and(
            eq(payrollEntries.runId, run.id),
            eq(payrollEntries.tenantId, user.tenantId),
          ),
        );

      const totals = {
        gross: entries.reduce((sum, e) => sum + e.gross, 0),
        deductions: entries.reduce((sum, e) => sum + e.deductions, 0),
        net: entries.reduce((sum, e) => sum + e.net, 0),
      };
      return ok({ ...run, entries, totals });
    } finally {
      await pool.end();
    }
  },
);
