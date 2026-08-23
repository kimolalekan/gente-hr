import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

/** Priya Sharma's August 2026 payslip (see db/seed.ts). */
const PRIYA_PAYSLIP_ID = "00000000-0000-0000-0000-000000000832";

test.describe("Payroll", () => {
  test("payroll overview loads", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/payroll");

    await expect(
      page.getByRole("heading", { level: 1, name: "Payroll" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Loans" })).toBeVisible();
  });

  test("payslips list shows the current period with all employees", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/payroll/payslips");

    await expect(
      page.getByRole("heading", { level: 1, name: "Payslips" }),
    ).toBeVisible();
    await expect(
      page.getByText("August 2026", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Priya Sharma", { exact: true })).toBeVisible();
    await expect(page.getByText("Marco Rossi", { exact: true })).toBeVisible();
  });

  test("payslip detail shows the earnings and deductions breakdown", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(`/payroll/payslips/${PRIYA_PAYSLIP_ID}`);

    await expect(
      page.getByRole("heading", { name: "Payslip — August 2026" }),
    ).toBeVisible();
    await expect(page.getByText("Earnings", { exact: true })).toBeVisible();
    await expect(page.getByText("Deductions", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Transport allowance", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Net pay", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download PDF" }),
    ).toBeVisible();
  });

  test("loans list shows seeded loans", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/payroll/loans");

    await expect(
      page.getByRole("heading", { level: 1, name: "Loans" }),
    ).toBeVisible();
    await expect(page.getByText("Marco Rossi", { exact: true })).toBeVisible();
  });
});
