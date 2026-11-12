import { expect, test } from '@playwright/test';
import { fixturePath, grantRights } from './helpers';

test.describe('responsive, accessibility and privacy smoke', () => {
  test('fits a 375 px viewport and exposes labelled controls', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Remove watermarks. Keep the frame.' })).toBeVisible();
    await grantRights(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'the page must not scroll horizontally at 375 px').toBeLessThanOrEqual(1);

    const unnamedButtons = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('button')).filter(
          (button) => !(button.textContent?.trim() || button.getAttribute('aria-label') || button.getAttribute('title')),
        ).length,
    );
    expect(unnamedButtons).toBe(0);

    await page.getByTestId('image-input').setInputFiles(fixturePath('watermarked-640x480.png'));
    await expect(page.getByRole('button', { name: 'Remove watermark', exact: true })).toBeEnabled({ timeout: 60_000 });

    const imagesWithoutAlt = await page.evaluate(
      () => Array.from(document.images).filter((image) => !image.hasAttribute('alt')).length,
    );
    expect(imagesWithoutAlt).toBe(0);

    await page.getByRole('button', { name: 'Remove watermark', exact: true }).click();
    await expect(page.getByText('Response received').first()).toBeVisible({ timeout: 30_000 });

    const postOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(postOverflow).toBeLessThanOrEqual(1);
  });

  test('posts only to the same-origin removal API and makes no third-party requests', async ({ page }) => {
    test.setTimeout(120_000);
    const requests: Array<{ url: string; method: string }> = [];
    page.on('request', (request) => requests.push({ url: request.url(), method: request.method() }));

    await page.goto('/');
    await grantRights(page);
    await page.getByTestId('image-input').setInputFiles(fixturePath('watermarked-640x480.png'));
    await expect(page.getByRole('button', { name: 'Remove watermark', exact: true })).toBeEnabled({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Remove watermark', exact: true }).click();
    await expect(page.getByText('Response received').first()).toBeVisible({ timeout: 30_000 });

    const base = new URL(page.url()).origin;
    const uploads = requests.filter((request) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
    expect(uploads, 'the image is posted only to the removal endpoint').toEqual([
      { url: `${base}/api/remove-watermark`, method: 'POST' },
    ]);

    const external = requests.filter((request) => {
      if (request.url.startsWith('blob:') || request.url.startsWith('data:')) return false;
      if (!request.url.startsWith('http')) return false;
      return new URL(request.url).origin !== base;
    });
    expect(external, 'no third-party runtime requests').toEqual([]);
  });
});
