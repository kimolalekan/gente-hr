import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Onboarding, offboarding, leave & attendance", () => {
  test("onboarding lists the new-hire plans", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { level: 1, name: "Onboarding" }),
    ).toBeVisible();
    await expect(
      page.getByText("James O'Brien", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Aisha Bello", { exact: true })).toBeVisible();
  });

  test("offboarding lists exit processes", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/offboarding");

    await expect(
      page.getByRole("heading", { name: "Offboarding" }),
    ).toBeVisible();
    await expect(page.getByText("Lucas Meyer", { exact: true })).toBeVisible();
  });

  test("leave shows the calendar and requests tabs", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/leave");

    await expect(
      page.getByRole("heading", { level: 1, name: "Leave" }),
    ).toBeVisible();
    await expect(
      page.getByText("Leave calendar", { exact: false }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Requests" }).click();
    await expect(
      page.getByRole("heading", { name: "All requests" }),
    ).toBeVisible();
  });

  test("attendance shows today's summary", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/attendance");

    await expect(
      page.getByRole("heading", { level: 1, name: "Attendance" }),
    ).toBeVisible();
    await expect(page.getByText("Present", { exact: true })).toBeVisible();
    await expect(page.getByText("On leave", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Today's attendance", { exact: true }),
    ).toBeVisible();
  });
});
