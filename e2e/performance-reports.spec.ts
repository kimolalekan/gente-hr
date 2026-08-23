import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Performance, reports & notifications", () => {
  test("performance reviews shows cycles, stats and reviews", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/performance");

    await expect(
      page.getByRole("heading", { name: "Performance reviews" }),
    ).toBeVisible();
    await expect(
      page.getByText("Open cycles", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Q3 2026", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Templates" }),
    ).toBeVisible();
  });

  test("performance templates lists the seeded templates", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/performance/templates");

    await expect(
      page.getByRole("heading", { name: "Performance templates" }),
    ).toBeVisible();
    await expect(
      page.getByText("Standard review", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Engineering deep-dive", { exact: true }),
    ).toBeVisible();
  });

  test("reports dashboard loads", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/reports");

    await expect(
      page.getByRole("heading", { name: "Reports" }),
    ).toBeVisible();
  });

  test("notifications show recent activity", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/notifications");

    await expect(
      page.getByRole("heading", { name: "Notifications" }),
    ).toBeVisible();
    await expect(
      page.getByText("New leave request", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Payslips ready", { exact: true }),
    ).toBeVisible();
  });
});
