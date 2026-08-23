import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

/** Seeded ids (see db/seed.ts). */
const DESIGNER_JOB_ID = "00000000-0000-0000-0000-000000000721";
const ZAINAB_APP_ID = "00000000-0000-0000-0000-000000000731";

test.describe("ATS — recruitment", () => {
  test("jobs list shows seeded postings and stats", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/ats/jobs");

    await expect(
      page.getByRole("heading", { level: 1, name: "Jobs" }),
    ).toBeVisible();
    await expect(
      page.getByText("Senior Product Designer", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Staff Engineer", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Open jobs", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "New job" })).toBeVisible();
  });

  test("create a job posting", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/ats/jobs/new");

    await expect(page.getByRole("heading", { name: "New job" })).toBeVisible();
    await page.getByLabel("Job title").fill("QA Engineer");
    await page.getByLabel("Location").fill("Lagos, Nigeria");
    await page.getByRole("button", { name: "Save job" }).click();

    // First compile of the POST route can be slow under parallel dev load.
    await expect(page).toHaveURL(/\/ats\/jobs$/, { timeout: 20_000 });
    await expect(page.getByText("QA Engineer", { exact: true })).toBeVisible();
  });

  test("job detail shows the posting and its applications", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(`/ats/jobs/${DESIGNER_JOB_ID}`);

    await expect(
      page.getByRole("heading", { name: "Senior Product Designer" }),
    ).toBeVisible();
    await expect(
      page.getByText("Zainab Adeyemi", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Oliver Bennett", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Mei Lin", { exact: true })).toBeVisible();
  });

  test("pipeline board shows candidates across all stages", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/ats/applications");

    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();
    await expect(
      page.getByText("Zainab Adeyemi", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Mei Lin", { exact: true })).toBeVisible();
    await expect(page.getByText("Ravi Patel", { exact: true })).toBeVisible();
    await expect(
      page.getByText("James O'Brien", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Diana Prince", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add candidate" }),
    ).toBeVisible();
  });

  test("advance an application through the pipeline", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`/ats/applications/${ZAINAB_APP_ID}`);

    await expect(
      page.getByRole("heading", { name: "Zainab Adeyemi" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Advance to Screening" }).click();
    await expect(
      page.getByRole("heading", { name: "Move to Screening" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Move candidate" }).click();

    // The pipeline moved: the next action is now "Advance to Interview".
    await expect(
      page.getByRole("button", { name: "Advance to Interview" }),
    ).toBeVisible();
    // Timeline records the stage change.
    await expect(
      page.getByText("new → screening", { exact: true }),
    ).toBeVisible();
  });
});
