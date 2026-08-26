import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Settings", () => {
  test("general settings show the company profile with a language dropdown", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/settings/general");

    await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveValue("Acme Inc.");
    await expect(page.getByLabel("Employee ID prefix")).toHaveValue("EMP");
    // About is a rich-text editor — matched by id, not label.
    await expect(page.locator("#about")).toBeVisible();
    await expect(page.getByLabel("Timezone")).toBeVisible();
    await expect(page.getByLabel("Language")).toBeVisible();
  });

  test("language dropdown offers the four supported languages", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/settings/general");

    await page.getByLabel("Language").click();
    await expect(page.getByRole("option", { name: "English" })).toBeVisible();
    await expect(page.getByRole("option", { name: "French" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Portuguese" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Spanish" })).toBeVisible();
  });

  test("changing the language saves and persists", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/settings/general");

    await page.getByLabel("Language").click();
    await page.getByRole("option", { name: "French" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    // The app re-renders in the new language immediately after saving.
    await expect(page.getByText("Enregistré", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Langue")).toContainText("Français");

    // Restore the default so re-runs stay deterministic.
    await page.getByLabel("Langue").click();
    await page.getByRole("option", { name: "Anglais" }).click();
    await page
      .getByRole("button", { name: "Enregistrer les modifications" })
      .click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("employee config shows the profile field groups", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/settings/employee-config");

    await expect(
      page.getByRole("heading", { name: "Employee config" }),
    ).toBeVisible();
    await expect(page.getByText("Bank account", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Government ID", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Pension", { exact: true })).toBeVisible();
  });

  test("payroll breakdown settings lists earnings and deductions", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/settings/payroll");

    await expect(page.getByRole("heading", { name: "Payroll" })).toBeVisible();
    await expect(
      page.getByText("Payslip breakdown", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('input[value="Transport allowance"]'),
    ).toBeVisible();
    await expect(page.locator('input[value="Basic salary"]')).toBeVisible();
    await expect(page.locator('input[value="Income tax"]')).toBeVisible();
    await expect(page.locator('input[value="Loan EMI"]')).toBeVisible();
  });
});
