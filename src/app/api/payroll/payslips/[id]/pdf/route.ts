import { and, eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  ApiError,
  fail,
  getDb,
  getEmployeeForUser,
  requireUser,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN = 56;

const INK = rgb(0.16, 0.17, 0.2);
const MUTED = rgb(0.42, 0.44, 0.5);
const RULE = rgb(0.88, 0.89, 0.92);
const ACCENT = rgb(0.2, 0.45, 0.9);
const BOX = rgb(0.95, 0.97, 1);

/** Parse a `data:<mime>;base64,…` URL into raw bytes, or null. */
function parseDataUrl(
  value: string | null | undefined,
): { mime: string; data: Buffer } | null {
  if (!value) return null;
  const match = /^data:([a-z0-9/+-]+);base64,(.+)$/i.exec(value.trim());
  if (!match) return null;
  return {
    mime: match[1].toLowerCase(),
    data: Buffer.from(match[2], "base64"),
  };
}

interface PayslipPdfInput {
  companyName: string;
  logo: string | null;
  currency: string;
  employeeName: string;
  employeeEmail: string | null;
  period: string;
  status: string;
  earnings: { label: string; value: number }[];
  gross: number;
  deductions: { label: string; value: number }[];
  net: number;
}

/** Build a branded one-page payslip PDF (tenant logo + name). */
async function buildPayslipPdf(input: PayslipPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: input.currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const right = PAGE_W - MARGIN;
  let y = PAGE_H - 56;

  // Header: tenant logo (when available) + company name.
  const parsedLogo = parseDataUrl(input.logo);
  let logo: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  if (parsedLogo) {
    try {
      if (parsedLogo.mime.includes("png")) {
        logo = await doc.embedPng(parsedLogo.data);
      } else if (
        parsedLogo.mime.includes("jpeg") ||
        parsedLogo.mime.includes("jpg")
      ) {
        logo = await doc.embedJpg(parsedLogo.data);
      }
    } catch {
      // Unsupported or corrupt image — render without the logo.
      logo = null;
    }
  }

  if (logo) {
    const height = 44;
    const width = Math.min((logo.width / logo.height) * height, 120);
    page.drawImage(logo, { x: MARGIN, y: y - height, width, height });
    page.drawText(input.companyName, {
      x: MARGIN + width + 14,
      y: y - 10,
      size: 18,
      font: bold,
      color: INK,
    });
    y -= height + 22;
  } else {
    page.drawText(input.companyName, {
      x: MARGIN,
      y,
      size: 18,
      font: bold,
      color: INK,
    });
    y -= 34;
  }

  // Document title + period, right-aligned.
  const title = "PAYSLIP";
  const period = input.period;
  page.drawText(title, { x: MARGIN, y, size: 13, font: bold, color: ACCENT });
  page.drawText(period, {
    x: right - font.widthOfTextAtSize(period, 12),
    y,
    size: 12,
    font,
    color: MUTED,
  });
  y -= 18;
  page.drawText(
    `${input.employeeName}${input.employeeEmail ? ` · ${input.employeeEmail}` : ""}`,
    {
      x: MARGIN,
      y,
      size: 11,
      font,
      color: MUTED,
    },
  );
  y -= 24;

  const drawRow = (
    label: string,
    value: string,
    opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {},
  ) => {
    page.drawText(label, {
      x: MARGIN,
      y,
      size: 11,
      font: opts.bold ? bold : font,
      color: opts.color ?? INK,
    });
    page.drawText(value, {
      x: right - font.widthOfTextAtSize(value, 11),
      y,
      size: 11,
      font: opts.bold ? bold : font,
      color: opts.color ?? INK,
    });
    y -= 20;
  };

  const sectionHeader = (label: string) => {
    y -= 6;
    page.drawText(label, { x: MARGIN, y, size: 10, font: bold, color: MUTED });
    y -= 12;
  };

  const rule = () => {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: right, y },
      thickness: 1,
      color: RULE,
    });
    y -= 14;
  };

  // Earnings.
  sectionHeader("EARNINGS");
  for (const row of input.deductions)
    drawRow(row.label, `-${money(row.value)}`);
  rule();
  drawRow("Gross pay", money(input.gross), { bold: true });
  y -= 10;

  // Deductions.
  sectionHeader("DEDUCTIONS");
  for (const row of input.deductions)
    drawRow(row.label, `-${money(row.value)}`);
  const totalDeductions = input.deductions.reduce(
    (sum, row) => sum + row.value,
    0,
  );
  rule();
  drawRow("Total deductions", `-${money(totalDeductions)}`, { bold: true });
  y -= 14;

  // Net pay call-out.
  page.drawRectangle({
    x: MARGIN,
    y: y - 10,
    width: right - MARGIN,
    height: 42,
    color: BOX,
  });
  page.drawText("NET PAY", {
    x: MARGIN + 14,
    y: y + 6,
    size: 11,
    font: bold,
    color: MUTED,
  });
  page.drawText(money(input.net), {
    x: right - 14 - bold.widthOfTextAtSize(money(input.net), 20),
    y: y + 6,
    size: 20,
    font: bold,
    color: ACCENT,
  });
  y -= 68;

  // Footer.
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: right, y },
    thickness: 1,
    color: RULE,
  });
  y -= 16;
  page.drawText(
    `Generated by ${input.companyName} · Period ${input.period} · Status ${input.status}`,
    { x: MARGIN, y, size: 9, font, color: MUTED },
  );

  return doc.save();
}

/** Download a payslip PDF (admin, hr; member: own) — branded with the tenant. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireUser();
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { payslips, employees, tenants } = await import("@db/schema");
      const [payslip] = await db
        .select()
        .from(payslips)
        .where(and(eq(payslips.id, id), eq(payslips.tenantId, user.tenantId)))
        .limit(1);
      if (!payslip) return fail("Payslip not found", 404);

      if (user.role === "member") {
        const employee = await getEmployeeForUser(user.tenantId, user.id);
        if (!employee || employee.id !== payslip.employeeId) {
          return fail("You can't view this payslip", 403);
        }
      }

      const [tenant] = await db
        .select({
          name: tenants.name,
          logo: tenants.logo,
          currency: tenants.currency,
        })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      const [employee] = await db
        .select({ name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, payslip.employeeId))
        .limit(1);

      const pdf = await buildPayslipPdf({
        companyName: tenant?.name ?? "Gente HR",
        logo: tenant?.logo ?? null,
        currency: tenant?.currency ?? "USD",
        employeeName: employee?.name ?? "—",
        employeeEmail: employee?.email ?? null,
        period: payslip.period,
        status: payslip.status,
        earnings: [
          { label: "Basic salary", value: payslip.basic },
          { label: "HRA", value: payslip.hra },
          { label: "Transport allowance", value: payslip.allowances },
          { label: "Bonus", value: payslip.bonus },
        ],
        gross: payslip.gross,
        deductions: [
          { label: "Income tax", value: payslip.tax },
          { label: "Pension", value: payslip.pension },
          { label: "Insurance", value: payslip.insurance },
          ...(payslip.loanEmi > 0
            ? [{ label: "Loan EMI", value: payslip.loanEmi }]
            : []),
        ],
        net: payslip.net,
      });

      const filename = `payslip-${payslip.period.replace(/\s+/g, "-")}.pdf`;
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    console.error("[api]", error);
    return fail("Something went wrong", 500);
  }
}
