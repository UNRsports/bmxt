/**
 * EN: Terminal log assertions for extension E2E.
 * JA: 拡張 E2E 用ターミナルログアサート。
 */

import { expect, type Page } from "@playwright/test"

export function outLines(page: Page) {
  return page.locator(".bmxt-out-line")
}

export function stderrLines(page: Page) {
  return page.locator(".bmxt-out-line--stderr")
}

export async function readOutLineTexts(page: Page): Promise<string[]> {
  return outLines(page).allTextContents()
}

export async function expectNoStderr(page: Page): Promise<void> {
  await expect(stderrLines(page)).toHaveCount(0)
}

/** EN: At least one log line contains the substring (locale-stable prefixes OK). */
export async function expectLogContains(page: Page, substring: string): Promise<void> {
  await expect
    .poll(async () => {
      const texts = await readOutLineTexts(page)
      return texts.some((t) => t.includes(substring))
    })
    .toBe(true)
}

/** EN: No log line contains the substring. */
export async function expectLogNotContains(page: Page, substring: string): Promise<void> {
  const texts = await readOutLineTexts(page)
  expect(texts.some((t) => t.includes(substring))).toBe(false)
}
