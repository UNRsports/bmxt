/**
 * EN: Prompt E2E — CJK caret motion must not wipe the controlled prompt line.
 * JA: プロンプト E2E — CJK 上のキャレット移動で制御付きプロンプト行が消えないこと。
 */

import { expect, test } from "./fixtures.ts"
import { moveCaretLeft, promptIme, setPromptLine } from "./helpers/prompt.ts"

const CJK_COMMAND = "search -list --all リスト | browse"
const ASCII_COMMAND = "search -list --all test | browse"

test.describe("prompt CJK caret stability", () => {
  test("ArrowLeft through リスト keeps the full command line", async ({ bmxtPage }) => {
    await setPromptLine(bmxtPage, CJK_COMMAND)
    const ime = promptIme(bmxtPage)
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
    const ime = promptIme(bmxtPage)
    const fromEnd = CJK_COMMAND.length - CJK_COMMAND.indexOf("リ")
    await moveCaretLeft(bmxtPage, fromEnd)
    await ime.press("Delete")
    const value = await ime.inputValue()
    expect(value.includes("search -list --all")).toBe(true)
    expect(value.includes("| browse")).toBe(true)
    expect(value).not.toBe("")
    expect(value.length).toBe(CJK_COMMAND.length - 1)
  })

  test("ASCII pattern line still allows free caret motion", async ({ bmxtPage }) => {
    await setPromptLine(bmxtPage, ASCII_COMMAND)
    const ime = promptIme(bmxtPage)
    for (let i = 0; i < 8; i += 1) {
      await ime.press("ArrowLeft")
      expect(await ime.inputValue()).toBe(ASCII_COMMAND)
    }
  })
})
