/**
 * EN: Prompt IME helpers for extension E2E.
 * JA: 拡張 E2E 用プロンプト IME ヘルパ。
 */

import { expect, type Page } from "@playwright/test"

export function promptIme(page: Page) {
  return page.locator(".bmxt-prompt-ime").first()
}

export async function focusPrompt(page: Page): Promise<void> {
  const ime = promptIme(page)
  await ime.click({ force: true })
  await expect(ime).toBeFocused()
}

/** EN: Dismiss token / session candidate menus so Enter submits the line. */
export async function dismissPromptPickers(page: Page): Promise<void> {
  const ime = promptIme(page)
  for (let i = 0; i < 3; i += 1) {
    const open = await page
      .locator(".bmxt-subcmd-picker, .bmxt-session-candidate-panel, [id^='bmxt-session-candidate']")
      .count()
    if (open === 0) {
      break
    }
    await ime.press("Escape")
  }
}

/** EN: Replace the controlled prompt line via Playwright fill + type (React onInput). */
export async function setPromptLine(page: Page, line: string): Promise<void> {
  await focusPrompt(page)
  await dismissPromptPickers(page)
  const ime = promptIme(page)
  // EN: fill("") clears more reliably than Ctrl+A when continuation text is present.
  await ime.fill("")
  if (line.length > 0) {
    await ime.type(line, { delay: 15 })
  }
  await expect.poll(async () => ime.inputValue()).toBe(line)
}

/** EN: Wait until the prompt is not in the command-busy lock state. */
export async function waitPromptIdle(page: Page): Promise<void> {
  await expect(page.locator(".bmxt-prompt-line--busy")).toHaveCount(0, {
    timeout: 60_000
  })
  const ime = promptIme(page)
  await expect(ime).not.toHaveClass(/bmxt-prompt-ime--busy-lock/)
}

/**
 * EN: Set line, dismiss pickers, press Enter, wait for busy to clear.
 * JA: 行をセットし候補を閉じてから Enter。busy 解除まで待つ。
 */
export async function runPromptLine(page: Page, line: string): Promise<void> {
  await setPromptLine(page, line)
  await dismissPromptPickers(page)
  const ime = promptIme(page)
  await ime.press("Enter")
  await waitPromptIdle(page)
}

/** EN: Move caret left `steps` times without asserting line identity. */
export async function moveCaretLeft(page: Page, steps: number): Promise<void> {
  const ime = promptIme(page)
  for (let i = 0; i < steps; i += 1) {
    await ime.press("ArrowLeft")
  }
}
