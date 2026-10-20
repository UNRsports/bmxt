/**
 * EN: Seed browser tabs for extension E2E (https pages for content scripts).
 * JA: 拡張 E2E 用タブシード（CS 向け https）。
 */

import type { BrowserContext, Page } from "@playwright/test"

const DEFAULT_HTTPS_URL = "https://example.com/"

/**
 * EN: Open an https page in the extension context (same profile as BMXt).
 * JA: 拡張と同じプロファイルで https ページを開く。
 */
export async function seedHttpsTab(
  context: BrowserContext,
  url: string = DEFAULT_HTTPS_URL
): Promise<Page> {
  const page = await context.newPage()
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 })
  return page
}

/** EN: Open `count` https tabs (same URL). */
export async function seedHttpsTabs(
  context: BrowserContext,
  count: number,
  url: string = DEFAULT_HTTPS_URL
): Promise<Page[]> {
  const pages: Page[] = []
  for (let i = 0; i < count; i += 1) {
    pages.push(await seedHttpsTab(context, url))
  }
  return pages
}
