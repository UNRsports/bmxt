/**
 * EN: Prompt UI integrity — mechanical breakage classes (not command combinatorics).
 * JA: プロンプト UI 健全性 — 破綻クラスの機械検査（コマンド組合せではない）。
 *
 * Dimensions (sparse): input kind × key × mode.
 * See plan: wipe / mirror / busy-idle / picker / history / focus.
 */

import { expect, test } from "./fixtures.ts"
import { outLines } from "./helpers/log.ts"
import {
  focusPrompt,
  moveCaretLeft,
  promptIme,
  runPromptLine,
  setPromptLine,
  waitPromptIdle
} from "./helpers/prompt.ts"

const ASCII_LINE = "search -list --all test | browse"
const CJK_LINE = "search -list --all リスト | browse"
const TAB_INCOMPLETE = "tab "

test.describe("prompt UI integrity", () => {
  test("Home then End keeps the full ASCII line", async ({ bmxtPage }) => {
    await setPromptLine(bmxtPage, ASCII_LINE)
    const ime = promptIme(bmxtPage)
    await ime.press("Home")
    expect(await ime.inputValue()).toBe(ASCII_LINE)
    await ime.press("End")
    expect(await ime.inputValue()).toBe(ASCII_LINE)
    const mirror = bmxtPage.locator(".bmxt-prompt-mirror").first()
    await expect(mirror).toContainText("search")
  })

  test("ArrowLeft across CJK does not wipe the line (integrity)", async ({ bmxtPage }) => {
    await setPromptLine(bmxtPage, CJK_LINE)
    const ime = promptIme(bmxtPage)
    const steps = CJK_LINE.length - CJK_LINE.indexOf("リ")
    await moveCaretLeft(bmxtPage, steps + 2)
    expect(await ime.inputValue()).toBe(CJK_LINE)
  })

  test("Tab after first token opens subcmd picker", async ({ bmxtPage }) => {
    // EN: Candidate menu opens on Tab (not auto on type) for second-token tier.
    await focusPrompt(bmxtPage)
    const ime = promptIme(bmxtPage)
    await ime.fill("")
    await ime.type("tab ", { delay: 40 })
    await expect.poll(async () => ime.inputValue()).toBe(TAB_INCOMPLETE)
    await ime.press("Tab")
    await expect(bmxtPage.locator(".bmxt-subcmd-picker").first()).toBeVisible({
      timeout: 15_000
    })
  })

  test("ArrowDown in picker moves highlight; Esc dismisses without wiping line", async ({
    bmxtPage
  }) => {
    await focusPrompt(bmxtPage)
    const ime = promptIme(bmxtPage)
    await ime.fill("")
    await ime.type("tab ", { delay: 40 })
    await ime.press("Tab")
    const picker = bmxtPage.locator(".bmxt-subcmd-picker").first()
    await expect(picker).toBeVisible({ timeout: 15_000 })
    await ime.press("ArrowDown")
    await expect(bmxtPage.locator(".bmxt-subcmd-picker-item--hi").first()).toBeVisible()
    await ime.press("Escape")
    await expect(picker).toHaveCount(0)
    expect(await ime.inputValue()).toBe(TAB_INCOMPLETE)
  })

  test("help Enter returns to idle editable prompt", async ({ bmxtPage }) => {
    await runPromptLine(bmxtPage, "help")
    await waitPromptIdle(bmxtPage)
    const ime = promptIme(bmxtPage)
    await expect(ime).not.toHaveClass(/bmxt-prompt-ime--busy-lock/)
    await expect(bmxtPage.locator(".bmxt-prompt-line--busy")).toHaveCount(0)
    await focusPrompt(bmxtPage)
    await setPromptLine(bmxtPage, "clear")
    expect(await ime.inputValue()).toBe("clear")
  })

  test("history ArrowUp restores last submitted command", async ({ bmxtPage }) => {
    await runPromptLine(bmxtPage, "help")
    await waitPromptIdle(bmxtPage)
    await setPromptLine(bmxtPage, "")
    const ime = promptIme(bmxtPage)
    await ime.press("ArrowUp")
    await expect.poll(async () => ime.inputValue()).toBe("help")
  })

  test("clicking a log line then focusing prompt keeps line editable", async ({ bmxtPage }) => {
    await runPromptLine(bmxtPage, "help")
    await expect(outLines(bmxtPage).first()).toBeVisible()
    await outLines(bmxtPage).first().click()
    await focusPrompt(bmxtPage)
    await setPromptLine(bmxtPage, ASCII_LINE)
    expect(await promptIme(bmxtPage).inputValue()).toBe(ASCII_LINE)
    const mirror = bmxtPage.locator(".bmxt-prompt-mirror").first()
    await expect(mirror).toContainText("browse")
  })

  test("Backspace at end of ASCII shortens by one, does not wipe", async ({ bmxtPage }) => {
    await setPromptLine(bmxtPage, ASCII_LINE)
    const ime = promptIme(bmxtPage)
    await ime.press("Backspace")
    const value = await ime.inputValue()
    expect(value.length).toBe(ASCII_LINE.length - 1)
    expect(value.startsWith("search -list")).toBe(true)
    expect(value).not.toBe("")
  })
})
