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

  test("create a job posting with a screening question", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/ats/jobs/new");

    await expect(page.getByRole("heading", { name: "New job" })).toBeVisible();
    await page.getByLabel("Job title").fill("QA Engineer");
    await page.getByLabel("Location").fill("Lagos, Nigeria");
    // Description is a rich-text (HTML) editor — fill works on contentEditable.
    await page
      .locator("#job-description")
      .fill("<p>Own QA tooling across the organization.</p>");
    // Add a dynamic screening question.
    await page.getByRole("button", { name: "Add question" }).click();
    await page
      .getByLabel("Question 1", { exact: true })
      .fill("How many years of QA experience do you have?");
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

  test("create a screening quiz", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/ats/quizzes");

    await expect(
      page.getByRole("heading", { level: 1, name: "Quizzes" }),
    ).toBeVisible();
    await expect(
      page.getByText("Design fundamentals", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "New quiz" }).click();
    await page.getByLabel("Quiz name").fill("QA fundamentals");
    await page
      .getByLabel("Question 1", { exact: true })
      .fill("Which testing level runs first?");
    await page.getByLabel("Question 1 option 1").fill("Unit");
    await page.getByLabel("Question 1 option 2").fill("Integration");
    await page.getByRole("button", { name: "Save quiz" }).click();

    await expect(
      page.getByText("QA fundamentals", { exact: true }),
    ).toBeVisible();
  });

  test("public apply flow: resume, country/state, questions and quiz", async ({
    page,
  }) => {
    // No sign-in — the apply page is public.
    await page.goto(`/apply/${DESIGNER_JOB_ID}`);

    await expect(
      page.getByRole("heading", { name: "Senior Product Designer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "About Acme Inc." }),
    ).toBeVisible();

    // Details step: contact info, country/state, resume file upload and the
    // job's screening question.
    await page.getByLabel("Full name").fill("Grace Okafor");
    await page.getByLabel("Email").fill("grace.okafor@example.com");
    await page.getByLabel("Country").click();
    await page.getByRole("option", { name: "Nigeria" }).click();
    await page.getByLabel("State / Province").click();
    await page.getByRole("option", { name: "Lagos" }).click();
    await page.locator("#apply-resume").setInputFiles({
      name: "grace-resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("demo resume"),
    });
    await page
      .getByLabel("How many years of product design experience do you have?")
      .fill("5 years");

    // The job has a screening quiz → continue to the assessment step.
    await page.getByRole("button", { name: "Continue to assessment" }).click();
    await expect(
      page.getByText("Design fundamentals", { exact: true }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Color contrast" }).check();
    await page.getByRole("radio", { name: "Figma" }).check();
    await page.getByRole("button", { name: "Submit application" }).click();

    await expect(
      page.getByText("Application received", { exact: true }),
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
