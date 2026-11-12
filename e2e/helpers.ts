import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));

export function fixturePath(name: string): string {
  return `${FIXTURES}${name}`;
}

export async function grantRights(page: Page): Promise<void> {
  await page.getByRole('checkbox', { name: 'I own this media or have permission to modify it' }).click();
}
