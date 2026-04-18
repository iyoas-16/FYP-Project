import { test, expect } from "@playwright/test";

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const signupEmail = process.env.E2E_SIGNUP_EMAIL;
const signupPassword = process.env.E2E_SIGNUP_PASSWORD;
const scanUrl = process.env.E2E_SCAN_URL || "https://example.com/login";

test.describe("Phishing detection platform", () => {
  test("signup, login, scan URL, and view history", async ({ page }) => {
    test.skip(
      !signupEmail || !signupPassword || !userEmail || !userPassword,
      "Set E2E_SIGNUP_EMAIL, E2E_SIGNUP_PASSWORD, E2E_USER_EMAIL, and E2E_USER_PASSWORD to run auth flow tests.",
    );

    await page.goto("/signup");
    await page.getByLabel("Email").fill(signupEmail!);
    await page.getByLabel("Password").fill(signupPassword!);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.goto("/login");
    await page.getByLabel("Email").fill(userEmail!);
    await page.getByLabel("Password").fill(userPassword!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /scan a suspicious url/i })).toBeVisible();
    await page.getByPlaceholder("https://example.com/login").fill(scanUrl);
    await page.getByRole("button", { name: /run scan/i }).click();
    await expect(page.getByText(/confidence/i)).toBeVisible();

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: /scan history/i })).toBeVisible();
    await expect(page.getByText(scanUrl)).toBeVisible();
  });

  test("admin analytics access", async ({ page }) => {
    test.skip(
      !adminEmail || !adminPassword,
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin analytics tests.",
    );

    await page.goto("/login");
    await page.getByLabel("Email").fill(adminEmail!);
    await page.getByLabel("Password").fill(adminPassword!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /admin analytics/i })).toBeVisible();
    await expect(page.getByText(/total scans/i)).toBeVisible();
  });
});
