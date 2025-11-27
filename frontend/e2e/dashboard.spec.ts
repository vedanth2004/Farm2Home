import { test, expect } from "@playwright/test";

test.describe("Dashboard Navigation", () => {
  test("admin dashboard should show admin-specific content", async ({
    page,
  }) => {
    await page.goto("/auth/signin");
    await page.fill('[name="email"]', "admin@farm2home.com");
    await page.fill('[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard/admin");
    await expect(page.locator("h1")).toContainText("Admin Dashboard");
    await expect(page.locator("text=Total Users")).toBeVisible();
    await expect(page.locator("text=Product Approvals")).toBeVisible();
  });

  test("farmer dashboard should show farmer-specific content", async ({
    page,
  }) => {
    await page.goto("/auth/signin");
    await page.fill('[name="email"]', "farmer@farm2home.com");
    await page.fill('[name="password"]', "farmer123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard/farmer");
    await expect(page.locator("h1")).toContainText("Farmer Dashboard");
    await expect(page.locator("text=Active Products")).toBeVisible();
    await expect(page.locator("text=Add New Product")).toBeVisible();
  });

  test("customer dashboard should show customer-specific content", async ({
    page,
  }) => {
    await page.goto("/auth/signin");
    await page.fill('[name="email"]', "customer@farm2home.com");
    await page.fill('[name="password"]', "customer123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard/customer");
    await expect(page.locator("h1")).toContainText("Customer Dashboard");
  });

  test("should redirect unauthorized users to sign in", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL("/auth/signin");
  });
});
