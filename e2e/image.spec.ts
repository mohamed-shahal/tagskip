import { expect, test } from '@playwright/test';
import { fixturePath, grantRights } from './helpers';

async function uploadImage(page: import('@playwright/test').Page, name = 'watermarked-640x480.png') {
  await page.getByTestId('image-input').setInputFiles(fixturePath(name));
  await expect(page.getByRole('button', { name: 'Remove watermark', exact: true })).toBeEnabled({ timeout: 60_000 });
}

test.describe('image removal', () => {
  test('uploads an image and prints the API response', async ({ page }) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await grantRights(page);
    await uploadImage(page);

    await expect(page.getByRole('definition').filter({ hasText: '640×480' })).toBeVisible();
    await expect(page.getByText('No results yet. Choose Remove watermark to see the response here.')).toBeVisible();

    await page.getByRole('button', { name: 'Remove watermark', exact: true }).click();
    await expect(page.getByText('Response received').first()).toBeVisible({ timeout: 30_000 });

    const response = page.locator('pre, img[alt="Response"]').first();
    await expect(response).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('sends a batch one image at a time', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await grantRights(page);
    await page
      .getByTestId('image-input')
      .setInputFiles([fixturePath('watermarked-640x480.png'), fixturePath('watermarked-640x480.png')]);

    await expect(page.getByRole('button', { name: 'Process all' })).toBeEnabled({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Process all' }).click();
    await expect(page.getByText('2 complete', { exact: true })).toBeVisible({ timeout: 60_000 });
  });
});
