import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Homepage", () => {
  test("redirects unauthenticated visitors to the login page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Sign in", exact: false }),
    ).toBeVisible();
  });

  test("shows the admin dashboard for a signed-in admin", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/");

    // Greeting from the session user's first name.
    await expect(
      page.getByRole("heading", { name: "Good morning, Ada" }),
    ).toBeVisible();

    // Sidebar reflects the admin's allowed links.
    await expect(page.getByRole("link", { name: "Employees" })).toBeVisible();

    // Org switcher shows the user's real (seeded) organization.
    await expect(
      page.getByRole("button", { name: "Switch organization" }),
    ).toBeVisible();
    await expect(page.getByText("Acme Inc.", { exact: true })).toBeVisible();

    // Dashboard stat cards load real data from the API.
    await expect(page.getByText("Total employees", { exact: true })).toBeVisible();
    await expect(page.getByText("On leave today", { exact: true })).toBeVisible();
  });
});
