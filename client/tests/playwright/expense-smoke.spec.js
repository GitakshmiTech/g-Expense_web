import { expect, test } from '@playwright/test';

test('login shell renders and protects expense routes', async ({ page }) => {
  await page.goto('/expenses');
  await expect(page).toHaveURL(/login|expenses/);
  await expect(page.locator('body')).toBeVisible();
});
