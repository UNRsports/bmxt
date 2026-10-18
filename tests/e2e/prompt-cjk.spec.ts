/**
 * EN: Prompt E2E — CJK caret motion must not wipe the controlled prompt line.
 * JA: プロンプト E2E — CJK 上のキャレット移動で制御付きプロンプト行が消えないこと。
 */

import { expect, test } from "./fixtures.ts"

const CJK_COMMAND = "search -list --all リスト | browse"
const ASCII_COMMAND = "search -list --all test | browse"

async function focusPrompt(page: import("@playwright/test").Page): Promise<void> {
  const ime = page.locator(".bmxt-prompt-ime").first()
  await ime.click({ force: true })
  await expect(ime).toBeFocused()
}

async function setPromptLine(
  page: import("@playwright/test").Page,
  line: string
): Promise<void> {
  await focusPrompt(page)
  const ime = page.locator(".bmxt-prompt-ime").first()
  // EN: Select-all + type replaces the controlled value through React onInput.
  await ime.press(process.platform === "darwin" ? "Meta+a" : "Control+a")
  await ime.press("Backspace")
  await ime.type(line, { delay: 15 })
  await expect.poll(async () => ime.inputValue()).toBe(line)
}

test.describe("prompt CJK caret stability", () => {
  test("ArrowLeft through リスト keeps the full command line", async ({ bmxtPage }) => {
    await setPromptLine(bmxtPage, CJK_COMMAND)
    const ime = bmxtPage.locator(".bmxt-prompt-ime").first()
    const steps = CJK_COMMAND.length - CJK_COMMAND.indexOf("リ")
    for (let i = 0; i < steps + 2; i += 1) {
      await ime.press("ArrowLeft")
      const value = await ime.inputValue()
      expect(value, `after ${i + 1} ArrowLeft`).toBe(CJK_COMMAND)
    }
    const mirror = bmxtPage.locator(".bmxt-prompt-mirror").first()
    await expect(mirror).toContainText("リスト")
  })

  test("Delete inside リスト removes one character, not the whole line", async ({
    bmxtPage
  }) => {
    await setPromptLine(bmxtPage, CJK_COMMAND)
    const ime = bmxtPage.locator(".bmxt-prompt-ime").first()
    // EN: Move onto the first kana, then Delete once.
    const fromEnd = CJK_COMMAND.length - CJK_COMMAND.indexOf("リ")
    for (let i = 0; i < fromEnd; i += 1) {
      await ime.press("ArrowLeft")
    }
    await ime.press("Delete")
    const value = await ime.inputValue()
    expect(value.includes("search -list --all")).toBe(true)
    expect(value.includes("| browse")).toBe(true)
    expect(value).not.toBe("")
    expect(value.length).toBe(CJK_COMMAND.length - 1)
  })

  test("ASCII pattern line still allows free caret motion", async ({ bmxtPage }) => {
    await setPromptLine(bmxtPage, ASCII_COMMAND)
    const ime = bmxtPage.locator(".bmxt-prompt-ime").first()
    for (let i = 0; i < 8; i += 1) {
      await ime.press("ArrowLeft")
      expect(await ime.inputValue()).toBe(ASCII_COMMAND)
    }
  })
})
