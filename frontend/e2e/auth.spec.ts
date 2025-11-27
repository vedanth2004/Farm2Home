import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should sign in as admin", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.fill('[name="email"]', "admin@farm2home.com");
    await page.fill('[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard/admin");
    await expect(page.locator("h1")).toContainText("Admin Dashboard");
  });

  test("should sign in as farmer", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.fill('[name="email"]', "farmer@farm2home.com");
    await page.fill('[name="password"]', "farmer123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard/farmer");
    await expect(page.locator("h1")).toContainText("Farmer Dashboard");
  });

  test("should sign in as customer", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.fill('[name="email"]', "customer@farm2home.com");
    await page.fill('[name="password"]', "customer123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard/customer");
    await expect(page.locator("h1")).toContainText("Customer Dashboard");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.fill('[name="email"]', "invalid@example.com");
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator(".text-red-600")).toContainText(
      "Invalid credentials",
    );
  });
});
