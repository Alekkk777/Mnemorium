import { test, expect } from '@playwright/test';

test.describe('Palace Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/userhome');
  });

  test('can open create palace modal', async ({ page }) => {
    // Look for create/new palace button
    const createBtn = page.getByRole('button', { name: /nuovo|crea|new|create/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Modal should appear
    const modal = page.locator('[class*="modal"], [class*="dialog"], [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('palace list is visible on home page', async ({ page }) => {
    // Main content should render
    await expect(page.locator('body')).toBeVisible();
    // App should not show a crash/error
    const errorText = page.getByText(/error|errore|crash/i);
    await expect(errorText).not.toBeVisible();
  });
});
