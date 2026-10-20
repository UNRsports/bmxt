/**
 * EN: Prompt UI integrity — mechanical breakage classes (not command combinatorics).
 * JA: プロンプト UI 健全性 — 破綻クラスの機械検査（コマンド組合せではない）。
 *
 * Dimensions (sparse): input kind × key × mode.
 * See plan: wipe / mirror / busy-idle / picker / history / focus.
 *
 * Ported from edit20261019 Playwright `tests/e2e/prompt-integrity.spec.ts`.
 */

import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import { By, Key } from "selenium-webdriver"
import {
  clearAndTypePrompt,
  focusPrompt,
  launchBmxtSession,
  mirrorText,
  moveCaretLeft,
  openBmxtPage,
  pressPromptKey,
  promptIme,
  promptValue,
  runPromptLine,
  setPromptLine,
  waitPromptIdle,
  type BmxtSession
} from "./harness.ts"
import { waitForOutLine } from "./helpers/log.ts"

const ASCII_LINE = "search -list --all test | browse"
const CJK_LINE = "search -list --all リスト | browse"
const TAB_INCOMPLETE = "tab "

describe("prompt UI integrity", () => {
  let session: BmxtSession

  beforeEach(async () => {
    session = await launchBmxtSession()
    await openBmxtPage(session)
  })

  afterEach(async () => {
    if (session) {
      await session.quit()
    }
  })

  it("Home then End keeps the full ASCII line", async () => {
    const { driver } = session
    await setPromptLine(driver, ASCII_LINE)
    await pressPromptKey(driver, Key.HOME)
    assert.equal(await promptValue(driver), ASCII_LINE)
    await pressPromptKey(driver, Key.END)
    assert.equal(await promptValue(driver), ASCII_LINE)
    const mirror = await mirrorText(driver)
    assert.match(mirror, /search/)
  })

  it("ArrowLeft across CJK does not wipe the line (integrity)", async () => {
    const { driver } = session
    await setPromptLine(driver, CJK_LINE)
    const steps = CJK_LINE.length - CJK_LINE.indexOf("リ")
    await moveCaretLeft(driver, steps + 2)
    assert.equal(await promptValue(driver), CJK_LINE)
  })

  it("Tab after first token opens subcmd picker", async () => {
    // EN: Candidate menu opens on Tab (not auto on type) for second-token tier.
    const { driver } = session
    await focusPrompt(driver)
    await clearAndTypePrompt(driver, TAB_INCOMPLETE)
    assert.equal(await promptValue(driver), TAB_INCOMPLETE)
    await pressPromptKey(driver, Key.TAB)
    await driver.wait(async () => {
      const els = await driver.findElements(By.css(".bmxt-subcmd-picker"))
      return els.length > 0
    }, 15_000)
  })

  it("ArrowDown in picker moves highlight; Esc dismisses without wiping line", async () => {
    const { driver } = session
    await focusPrompt(driver)
    await clearAndTypePrompt(driver, TAB_INCOMPLETE)
    await pressPromptKey(driver, Key.TAB)
    await driver.wait(async () => {
      const els = await driver.findElements(By.css(".bmxt-subcmd-picker"))
      return els.length > 0
    }, 15_000)
    await pressPromptKey(driver, Key.ARROW_DOWN)
    await driver.wait(async () => {
      const els = await driver.findElements(By.css(".bmxt-subcmd-picker-item--hi"))
      return els.length > 0
    }, 15_000)
    await pressPromptKey(driver, Key.ESCAPE)
    await driver.wait(async () => {
      const els = await driver.findElements(By.css(".bmxt-subcmd-picker"))
      return els.length === 0
    }, 15_000)
    assert.equal(await promptValue(driver), TAB_INCOMPLETE)
  })

  it("help Enter returns to idle editable prompt", async () => {
    const { driver } = session
    await runPromptLine(driver, "help")
    await waitPromptIdle(driver)
    const ime = await promptIme(driver)
    const className = (await ime.getAttribute("class")) ?? ""
    assert.equal(className.includes("bmxt-prompt-ime--busy-lock"), false)
    const busy = await driver.findElements(By.css(".bmxt-prompt-line--busy"))
    assert.equal(busy.length, 0)
    await focusPrompt(driver)
    await setPromptLine(driver, "clear")
    assert.equal(await promptValue(driver), "clear")
  })

  it("history ArrowUp restores last submitted command", async () => {
    const { driver } = session
    await runPromptLine(driver, "help")
    await waitPromptIdle(driver)
    await setPromptLine(driver, "")
    await pressPromptKey(driver, Key.ARROW_UP)
    await driver.wait(async () => (await promptValue(driver)) === "help", 15_000)
  })

  it("clicking a log line then focusing prompt keeps line editable", async () => {
    const { driver } = session
    await runPromptLine(driver, "help")
    await waitForOutLine(driver)
    const first = (await driver.findElements(By.css(".bmxt-out-line")))[0]
    assert.ok(first, "expected at least one log line")
    await first.click()
    await focusPrompt(driver)
    await setPromptLine(driver, ASCII_LINE)
    assert.equal(await promptValue(driver), ASCII_LINE)
    const mirror = await mirrorText(driver)
    assert.match(mirror, /browse/)
  })

  it("Backspace at end of ASCII shortens by one, does not wipe", async () => {
    const { driver } = session
    await setPromptLine(driver, ASCII_LINE)
    await pressPromptKey(driver, Key.BACK_SPACE)
    const value = await promptValue(driver)
    assert.equal(value.length, ASCII_LINE.length - 1)
    assert.equal(value.startsWith("search -list"), true)
    assert.notEqual(value, "")
  })
})
