import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

/** Priya Sharma — seeded employee id (see db/seed.ts). */
const PRIYA_ID = "00000000-0000-0000-0000-000000000101";

test.describe("Employees", () => {
  test("directory lists the seeded roster", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/employees");

    await expect(
      page.getByRole("heading", { name: "Employees" }),
    ).toBeVisible();
    await expect(
      page.getByText("Priya Sharma", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Marco Rossi", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Ada Admin", { exact: true }),
    ).toBeVisible();
  });

  test("employee detail shows the profile and annual salary", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(`/employees/${PRIYA_ID}`);

    await expect(
      page.getByRole("heading", { name: "Priya Sharma" }),
    ).toBeVisible();
    await expect(page.getByText("$185,000", { exact: true })).toBeVisible();
    await expect(page.getByText("Documents", { exact: true })).toBeVisible();
    await expect(page.getByText("Leave history", { exact: true })).toBeVisible();
  });

  test("edit form renders the salary breakdown from the payroll config", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(`/employees/${PRIYA_ID}/edit`);

    await expect(
      page.getByRole("heading", { name: "Edit Priya's details" }),
    ).toBeVisible();

    // Salary breakdown section — components come from the settings config.
    await expect(
      page.getByText("Salary breakdown", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Basic salary")).toHaveValue("111000");
    await expect(page.getByLabel("HRA")).toHaveValue("27750");
    await expect(
      page.getByLabel("Transport allowance"),
    ).toHaveValue("18500");
    await expect(page.getByLabel("Income tax")).toHaveValue("46250");
    await expect(page.getByText("$185,000", { exact: true })).toBeVisible();
  });
});
